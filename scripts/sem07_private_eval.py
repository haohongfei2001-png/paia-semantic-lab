from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import sys
import time
from pathlib import Path

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("HF_DATASETS_OFFLINE", "1")
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

import numpy as np
import yaml
from sentence_transformers import SentenceTransformer

from semantic_lab.catalog import load_catalog, validate_catalog_contract
from semantic_lab.context import classification_text
from semantic_lab.embedding_adapters import CandidateSpec, apply_prompt
from semantic_lab.sem01 import TASK_INSTRUCTION
from semantic_lab.sem03 import (
    assemble_candidates,
    eligible_topics,
    lexical_ranking,
    load_sem03_config,
    topic_descriptor,
)
from semantic_lab.sem04 import route_input
from semantic_lab.sem05 import ActivationEngine
from semantic_lab.sem07 import (
    _gate_candidates,
    _gate_retrieval,
    _gate_router,
    candidate_metrics,
    capability_verdicts,
    load_sem07_config,
    retrieval_metrics,
    router_metrics,
    router_variants,
)

ROOT = Path(__file__).resolve().parents[1]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def digest(value) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def critical_slices(text: str, config: dict) -> list[str]:
    compact = text.strip()
    has_cjk = any("\u4e00" <= char <= "\u9fff" for char in compact)
    has_ascii = any("a" <= char.lower() <= "z" for char in compact)
    names = []
    if has_cjk:
        names.append("zh")
    if has_cjk and has_ascii:
        names.append("mixed")
    if len(compact) <= int(config["policy"]["short_codepoints_max"]):
        names.append("short")
    if len(compact) >= int(config["policy"]["long_codepoints_min"]):
        names.append("long")
    return names


def rank_of_pair(matrix: np.ndarray, refs: list[str], query_i: int, target_i: int) -> int:
    scores = matrix @ matrix[query_i]
    target = float(scores[target_i])
    target_ref = refs[target_i]
    better = 0
    for idx, score in enumerate(scores):
        if idx == query_i:
            continue
        value = float(score)
        if value > target or (value == target and refs[idx] < target_ref):
            better += 1
    return better + 1


def split_rows(rows: list[dict], cases: list[dict], split: str) -> list[dict]:
    return [row for row, case in zip(rows, cases) if case["split"] == split]


def cluster_mean_ci(rows: list[dict], value_key: str, *, seed: int, resamples: int):
    grouped = {}
    for row in rows:
        value = row.get(value_key)
        if value is None:
            continue
        grouped.setdefault(str(row["family_ref"]), []).append(float(value))
    families = sorted(grouped)
    if not families:
        return None
    rng = random.Random(seed)
    estimates = []
    for _ in range(resamples):
        sampled = [rng.choice(families) for _ in families]
        values = [value for family in sampled for value in grouped[family]]
        estimates.append(sum(values) / len(values))
    estimates.sort()
    lo = estimates[max(0, int(0.025 * len(estimates)) - 1)]
    hi = estimates[min(len(estimates) - 1, int(0.975 * len(estimates)))]
    return [lo, hi]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--private-dir", type=Path, required=True)
    parser.add_argument("--private-output-dir", type=Path, required=True)
    parser.add_argument("--public-output", type=Path, required=True)
    parser.add_argument("--lab-commit", default="UNCOMMITTED")
    parser.add_argument("--device", default="mps")
    args = parser.parse_args()

    config = load_sem07_config()
    private = args.private_dir
    paths = {
        "gold": private / "personal_gold_v1.json",
        "batch": private / "canonical_batch.private.json",
        "snapshot": private / "snapshot.json",
        "machine": private / "machine_summary.json",
        "lockbox": private / "sem07_lockbox_manifest.personal-gold.json",
    }
    missing = [name for name, path in paths.items() if not path.exists()]
    if missing:
        raise RuntimeError(f"missing private inputs: {missing}")
    gold = json.loads(paths["gold"].read_text(encoding="utf-8"))
    batch = json.loads(paths["batch"].read_text(encoding="utf-8"))
    snapshot = json.loads(paths["snapshot"].read_text(encoding="utf-8"))
    machine = json.loads(paths["machine"].read_text(encoding="utf-8"))
    lockbox = json.loads(paths["lockbox"].read_text(encoding="utf-8"))

    catalog = load_catalog()
    validate_catalog_contract(catalog)
    catalog_version = str(catalog["catalog_version"])
    if str(snapshot.get("catalog_version")) != catalog_version:
        raise RuntimeError("snapshot/catalog mismatch")
    if lockbox.get("frozen") is not True or str(lockbox.get("catalog_version")) != catalog_version:
        raise RuntimeError("lockbox is not frozen on current catalog")

    records = snapshot["records"]
    refs = [str(row["input_ref"]) for row in records]
    ref_index = {ref: idx for idx, ref in enumerate(refs)}
    private_by_ref = {
        str(row["input_ref"]): row for row in batch["private_context"].values()
    }
    calibration = {
        str(row["calibration_id"]): row for row in gold["calibration_records"]
    }
    gold_rows = list(gold["gold_index"])
    expected_lockbox = {
        str(row["calibration_id"]) for row in gold_rows if row["split"] == "lockbox"
    }
    if set(lockbox["calibration_ids"]) != expected_lockbox:
        raise RuntimeError("lockbox manifest mismatch")
    cases = []
    for row in gold_rows:
        cal = calibration[str(row["calibration_id"])]
        ref = str(row["input_ref"])
        item = private_by_ref.get(ref)
        if item is None or ref not in ref_index:
            raise RuntimeError(f"gold input missing from frozen snapshot: {ref}")
        final = cal["user_final_decision"]
        text = str(item["text"])
        cases.append({
            "calibration_id": str(row["calibration_id"]),
            "input_ref": ref,
            "input_revision": str(row["input_revision"]),
            "family_ref": str(row["family_ref"]),
            "split": str(row["split"]),
            "text": text,
            "allowed_context": item.get("allowed_context") or {},
            "truth_state": str(final["route_state"]),
            "truth_topics": [str(value) for value in final.get("topic_ids", [])],
            "retrieval_qrels": row.get("retrieval_qrels", []),
            "slices": critical_slices(text, config),
            "source_sent_at": (snapshot["records"][ref_index[ref]].get("source_provenance") or [{}])[0].get("source_sent_at"),
            "captured_at": (snapshot["records"][ref_index[ref]].get("source_provenance") or [{}])[0].get("captured_at"),
        })
    split_counts = {
        name: sum(case["split"] == name for case in cases)
        for name in ("calibration", "evaluation", "lockbox")
    }
    if split_counts != {"calibration": 80, "evaluation": 13, "lockbox": 35}:
        raise RuntimeError(f"unexpected split counts: {split_counts}")

    topics = eligible_topics(catalog)
    topic_ids = [str(topic["topic_id"]) for topic in topics]
    topic_docs = [topic_descriptor(topic) for topic in topics]
    sem03_config = load_sem03_config()
    variants = router_variants()
    sem01 = yaml.safe_load(
        (ROOT / "configs" / "sem01_bakeoff_v0.1.yaml").read_text(encoding="utf-8")
    )
    specs = {str(row["id"]): row for row in sem01["candidates"]}
    sem01_runtime = json.loads(
        (ROOT / "artifacts" / "sem-01" / "local-runtime-results.json").read_text(
            encoding="utf-8"
        )
    )
    resources = {
        str(row["candidate_id"]): row.get("performance", {})
        for row in sem01_runtime.get("candidates", [])
        if isinstance(row, dict) and row.get("candidate_id")
    }
    personalized = set(config["policy"]["personalized_models"])
    public_models = {}
    private_predictions = {}
    private_retrieval = {}
    for label, meta in machine["models"].items():
        model_id = str(meta["model_id"])
        if model_id not in personalized:
            continue
        raw = specs[model_id]
        spec = CandidateSpec.from_dict(raw)
        vector_path = private / "vectors" / f"{label}.npy"
        matrix = np.load(vector_path)
        if matrix.shape[0] != len(records):
            raise RuntimeError(f"vector row mismatch for {model_id}")

        started = time.perf_counter()
        model = SentenceTransformer(
            model_id,
            revision=str(raw["revision"]),
            trust_remote_code=bool(raw.get("trust_remote_code", False)),
            device=args.device,
            local_files_only=True,
        )
        model.eval()
        kwargs = {
            "batch_size": 4 if model_id == "BAAI/bge-m3" else 8,
            "show_progress_bar": False,
            "convert_to_numpy": True,
            "normalize_embeddings": True,
        }
        prepared_topics = [
            apply_prompt(spec, "document", value, TASK_INSTRUCTION) for value in topic_docs
        ]
        topic_matrix = np.asarray(model.encode(prepared_topics, **kwargs), dtype="float32")
        router_rows = {name: [] for name in variants}
        qrel_rows = []
        private_rows = []

        for case in cases:
            semantic_text = classification_text(case["text"], case["allowed_context"])
            query_i = ref_index[case["input_ref"]]
            if case["allowed_context"].get("inputs"):
                prepared = apply_prompt(spec, "query", semantic_text, TASK_INSTRUCTION)
                query_vector = np.asarray(
                    model.encode([prepared], **kwargs)[0], dtype="float32"
                )
            else:
                query_vector = np.asarray(matrix[query_i], dtype="float32")
            dense_scores = query_vector @ topic_matrix.T
            dense_order = np.argsort(-dense_scores, kind="stable")
            dense = [topic_ids[int(index)] for index in dense_order]
            lexical = lexical_ranking(semantic_text, topics)
            candidates = assemble_candidates(
                query=semantic_text,
                topics=topics,
                dense_ranking=dense,
                lexical_ids=lexical,
                profile=None,
                config=sem03_config,
            )
            candidate_ids = [str(row["topic_id"]) for row in candidates[:20]]
            private_row = {
                "calibration_id": case["calibration_id"],
                "split": case["split"],
                "candidate_ids": candidate_ids,
                "routers": {},
            }
            for variant_name, router_config in variants.items():
                decision = route_input(
                    input_ref=case["input_ref"],
                    input_revision=case["input_revision"],
                    text=case["text"],
                    catalog=catalog,
                    candidates=candidates,
                    claimed_catalog_version=catalog_version,
                    expected_input_revision=case["input_revision"],
                    allowed_context=case["allowed_context"],
                    config=router_config,
                )
                pred_topics = [
                    str(value["topic_id"]) for value in decision.get("assignments", [])
                ]
                router_rows[variant_name].append({
                    "family_ref": case["family_ref"],
                    "truth_state": case["truth_state"],
                    "truth_topics": case["truth_topics"],
                    "pred_state": str(decision["route_state"]),
                    "pred_topics": pred_topics,
                    "candidate_ids": candidate_ids,
                    "slices": case["slices"],
                })
                private_row["routers"][variant_name] = {
                    "route_state": str(decision["route_state"]),
                    "topic_ids": pred_topics,
                    "reason_codes": list(decision.get("reason_codes", [])),
                }
            private_rows.append(private_row)

            for qrel in case["retrieval_qrels"]:
                target_ref = str(qrel["candidate_ref"])
                target_i = ref_index.get(target_ref)
                rank = None
                if target_i is not None and target_i != query_i:
                    rank = rank_of_pair(matrix, refs, query_i, target_i)
                qrel_rows.append({
                    "family_ref": case["family_ref"],
                    "split": case["split"],
                    "relevant": bool(qrel["relevant"]),
                    "rank": rank,
                    "slices": case["slices"],
                })

        elapsed = time.perf_counter() - started
        model_public = {
            "model_id": model_id,
            "revision": str(raw["revision"]),
            "private_runtime_seconds": elapsed,
            "resource_reference": resources.get(model_id, {}),
            "splits": {},
        }
        for split in ("calibration", "evaluation", "lockbox"):
            split_qrels = [row for row in qrel_rows if row["split"] == split]
            retrieval_ci_rows = [
                {
                    "family_ref": row["family_ref"],
                    "hit20": float(row["rank"] is not None and row["rank"] <= 20),
                }
                for row in split_qrels if row["relevant"]
            ]
            retrieval_slices = {}
            for slice_name in ("zh", "mixed", "short", "long"):
                sliced_qrels = [row for row in split_qrels if slice_name in row["slices"]]
                retrieval_slices[slice_name] = {
                    "metrics": retrieval_metrics(sliced_qrels) if sliced_qrels else None,
                    "judged_pairs": len(sliced_qrels),
                    "interpretation": (
                        "MEASURED"
                        if len({row["family_ref"] for row in sliced_qrels}) >= int(config["policy"]["critical_slice_min_n"])
                        else "INCONCLUSIVE_LOW_N"
                    ),
                }
            entry = {
                "case_count": sum(case["split"] == split for case in cases),
                "retrieval": retrieval_metrics(split_qrels),
                "retrieval_recall_at_20_ci95_family_bootstrap": cluster_mean_ci(
                    retrieval_ci_rows, "hit20",
                    seed=int(config["policy"]["bootstrap_seed"]),
                    resamples=int(config["policy"]["bootstrap_resamples"]),
                ),
                "retrieval_critical_slices": retrieval_slices,
                "routers": {},
            }
            for variant_name, all_rows in router_rows.items():
                rows = split_rows(all_rows, cases, split)
                candidate = candidate_metrics(rows)
                router = router_metrics(rows)
                slices = {}
                for slice_name in ("zh", "mixed", "short", "long"):
                    sliced = [row for row in rows if slice_name in row["slices"]]
                    slices[slice_name] = {
                        "count": len(sliced),
                        "candidate": candidate_metrics(sliced) if sliced else None,
                        "router": router_metrics(sliced) if sliced else None,
                        "interpretation": (
                            "MEASURED"
                            if len(sliced) >= int(config["policy"]["critical_slice_min_n"])
                            else "INCONCLUSIVE_LOW_N"
                        ),
                    }
                candidate_ci_rows = []
                router_ci_rows = []
                for row in rows:
                    if row["truth_state"] == "ASSIGNED" and row["truth_topics"]:
                        truth = set(row["truth_topics"])
                        candidate_ci_rows.append({
                            "family_ref": row["family_ref"],
                            "recall20": len(truth & set(row["candidate_ids"][:20])) / len(truth),
                        })
                    router_ci_rows.append({
                        "family_ref": row["family_ref"],
                        "exact": float(
                            row["truth_state"] == row["pred_state"]
                            and set(row["truth_topics"]) == set(row["pred_topics"])
                        ),
                        "accepted": float(row["pred_state"] == "ASSIGNED"),
                    })
                entry["routers"][variant_name] = {
                    "candidate": candidate,
                    "router": router,
                    "confidence_intervals_95_family_bootstrap": {
                        "candidate_topic_recall_at_20": cluster_mean_ci(
                            candidate_ci_rows, "recall20",
                            seed=int(config["policy"]["bootstrap_seed"]),
                            resamples=int(config["policy"]["bootstrap_resamples"]),
                        ),
                        "router_exact_match_rate": cluster_mean_ci(
                            router_ci_rows, "exact",
                            seed=int(config["policy"]["bootstrap_seed"]),
                            resamples=int(config["policy"]["bootstrap_resamples"]),
                        ),
                        "accepted_coverage": cluster_mean_ci(
                            router_ci_rows, "accepted",
                            seed=int(config["policy"]["bootstrap_seed"]),
                            resamples=int(config["policy"]["bootstrap_resamples"]),
                        ),
                    },
                    "critical_slices": slices,
                }
            model_public["splits"][split] = entry
        lock = model_public["splits"]["lockbox"]
        model_public["capabilities"] = {}
        for variant_name, metrics in lock["routers"].items():
            verdicts = capability_verdicts(
                lock["retrieval"],
                metrics["candidate"],
                metrics["router"],
                config,
            )
            slice_verdicts = {}
            for slice_name in ("zh", "mixed", "short", "long"):
                route_slice = metrics["critical_slices"][slice_name]
                retrieval_slice = lock["retrieval_critical_slices"][slice_name]
                if retrieval_slice["interpretation"] == "MEASURED":
                    rv, rr = _gate_retrieval(
                        retrieval_slice["metrics"], config["acceptance"]["input_retrieval"]
                    )
                else:
                    rv, rr = "INCONCLUSIVE", ["critical slice has insufficient judged retrieval families"]
                if route_slice["interpretation"] == "MEASURED":
                    cv, cr = _gate_candidates(
                        route_slice["candidate"], config["acceptance"]["candidates"]
                    )
                    sv, sr = _gate_router(
                        route_slice["router"], config["acceptance"]["router"]
                    )
                else:
                    cv, cr = "INCONCLUSIVE", ["critical slice has insufficient cases"]
                    sv, sr = "INCONCLUSIVE", ["critical slice has insufficient cases"]
                slice_verdicts[slice_name] = {
                    "input_retrieval": {"verdict": rv, "reasons": rr},
                    "full_catalog_candidates": {"verdict": cv, "reasons": cr},
                    "router": {"verdict": sv, "reasons": sr},
                }
            verdicts["critical_slices"] = slice_verdicts
            model_public["capabilities"][variant_name] = verdicts
        public_models[model_id] = model_public
        private_predictions[model_id] = private_rows
        private_retrieval[model_id] = qrel_rows
        del model, matrix, topic_matrix

    if set(public_models) != personalized:
        raise RuntimeError(
            f"personalized model coverage mismatch: {sorted(public_models)}"
        )

    activation_events = []
    exact_time_cases = proxy_time_cases = 0
    for case in cases:
        event_time = case["source_sent_at"] or case["captured_at"]
        if case["truth_state"] != "ASSIGNED" or not event_time:
            continue
        exact_time_cases += int(bool(case["source_sent_at"]))
        proxy_time_cases += int(not bool(case["source_sent_at"]))
        for topic_id in case["truth_topics"]:
            activation_events.append({
                "kind": "assignment",
                "topic_id": topic_id,
                "input_ref": case["input_ref"],
                "input_revision": case["input_revision"],
                "conversation_id": case["family_ref"],
                "at": event_time,
                "accepted": True,
                "route_state": "ASSIGNED",
                "stale": False,
            })
    replay_a = ActivationEngine.replay(activation_events)
    replay_b = ActivationEngine.replay(activation_events)
    activation_summary = {
        "diagnostic_only": True,
        "confirmed_assignment_events": len(activation_events),
        "unique_topics": len({row["topic_id"] for row in activation_events}),
        "auto_active_count": replay_a.auto_active_count(),
        "repeat_replay_stable": digest(replay_a.snapshot()) == digest(replay_b.snapshot()),
        "exact_source_time_cases": exact_time_cases,
        "capture_time_proxy_cases": proxy_time_cases,
        "event_time_basis": "source_sent_at_else_capture_time_proxy",
        "quality_verdict": "INCONCLUSIVE_NO_GOLD_USERTOPICPROFILE_AND_PARTIAL_TIME_PROXY",
    }
    deterministic_result_digest = digest({
        "predictions": private_predictions,
        "retrieval": private_retrieval,
        "activation": activation_summary,
    })

    pareto_rows = []
    for model_id, data in public_models.items():
        perf = data["resource_reference"]
        for variant_name, metrics in data["splits"]["lockbox"]["routers"].items():
            pareto_rows.append({
                "model_id": model_id,
                "router_variant": variant_name,
                "candidate_recall_at_20": metrics["candidate"]["topic_recall_at_20"],
                "accepted_precision": metrics["router"]["accepted_precision"],
                "macro_f1": metrics["router"]["macro_f1"],
                "private_runtime_seconds": data["private_runtime_seconds"],
                "peak_rss_bytes": perf.get("peak_rss_bytes"),
            })

    def dominates(left: dict, right: dict) -> bool:
        quality = ("candidate_recall_at_20", "accepted_precision", "macro_f1")
        costs = ("private_runtime_seconds", "peak_rss_bytes")
        if any(left.get(k) is None or right.get(k) is None for k in quality + costs):
            return False
        no_worse = all(left[k] >= right[k] for k in quality) and all(
            left[k] <= right[k] for k in costs
        )
        strict = any(left[k] > right[k] for k in quality) or any(
            left[k] < right[k] for k in costs
        )
        return no_worse and strict

    comparable_keys = (
        "candidate_recall_at_20", "accepted_precision", "macro_f1",
        "private_runtime_seconds", "peak_rss_bytes",
    )
    comparable = [
        row for row in pareto_rows
        if all(row.get(key) is not None for key in comparable_keys)
    ]
    noncomparable = [
        row for row in pareto_rows
        if any(row.get(key) is None for key in comparable_keys)
    ]
    frontier = [
        row for row in comparable
        if not any(dominates(other, row) for other in comparable if other is not row)
    ]
    public_summary = {
        "round": "SEM-07",
        "benchmark_version": config["benchmark_version"],
        "lab_commit": args.lab_commit,
        "catalog_version": catalog_version,
        "source_hashes": {name: sha256_file(path) for name, path in paths.items()},
        "evaluation_code_hashes": {
            "semantic_lab/sem07.py": sha256_file(ROOT / "semantic_lab" / "sem07.py"),
            "scripts/sem07_private_eval.py": sha256_file(Path(__file__).resolve()),
            "configs/sem07_final_v0.1.yaml": sha256_file(ROOT / "configs" / "sem07_final_v0.1.yaml"),
        },
        "split_counts": split_counts,
        "owner_attention_count": 0,
        "real_input_api_egress_events": 0,
        "model_training_runs": 0,
        "deterministic_result_digest": deterministic_result_digest,
        "activation_replay": activation_summary,
        "personalized_models": public_models,
        "sem01_qualified_without_sem06_personal_vectors":
            config["policy"]["sem01_qualified_without_sem06_personal_vectors"],
        "api_candidates_not_authorized_for_real_inputs":
            config["policy"]["api_candidates"],
        "pareto_frontier": frontier,
        "pareto_noncomparable": noncomparable,
        "lockbox_consumed": True,
        "lockbox_case_count": split_counts["lockbox"],
        "activation_personal_verdict":
            "INCONCLUSIVE_NO_GOLD_PROFILE_AND_PARTIAL_TIME_PROXY",
        "inactive_topic_personal_verdict":
            "INCONCLUSIVE_NO_AUTHORIZED_PROFILE",
        "privacy": {
            "raw_text_committed": False,
            "personal_gold_committed": False,
            "private_vectors_committed": False,
            "production_paia_modified": False,
        },
    }
    public_summary["aggregate_digest"] = digest(public_summary)

    args.private_output_dir.mkdir(parents=True, exist_ok=True)
    private_path = args.private_output_dir / "personal-scorecard.private.json"
    private_payload = {
        "public_summary": public_summary,
        "predictions": private_predictions,
        "retrieval_qrels": private_retrieval,
        "activation_events": activation_events,
    }
    private_path.write_text(
        json.dumps(private_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    private_path.chmod(0o600)

    args.public_output.parent.mkdir(parents=True, exist_ok=True)
    args.public_output.write_text(
        json.dumps(public_summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "aggregate_digest": public_summary["aggregate_digest"],
        "models": sorted(public_models),
        "split_counts": split_counts,
        "lockbox_consumed": True,
        "private_output": str(private_path),
        "public_output": str(args.public_output),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
