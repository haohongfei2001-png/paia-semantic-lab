from __future__ import annotations

import hashlib
import json
import time
from copy import deepcopy
from pathlib import Path
from typing import Any, Sequence

import yaml

from .b0 import topic_document
from .catalog import load_catalog, normalize, validate_catalog_contract
from .contracts import repo_root
from .embedding_adapters import HashNgramEmbeddingAdapter, LexicalControl, cosine
from .isolation import static_runtime_isolation_audit, validate_fixture_pack
from .manifest import build_run_manifest
from .owner_attention import OwnerAttentionViolation, SEMANTIC_OWNER_TASKS, open_owner_task

DEFAULT_CONFIG_PATH = repo_root() / "configs" / "sem03_candidate_retrieval_v0.1.yaml"


def load_sem03_config(path: Path | None = None) -> dict[str, Any]:
    value = yaml.safe_load((path or DEFAULT_CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("SEM-03 config must be a mapping")
    return value


def topic_descriptor(topic: dict[str, Any]) -> str:
    parts = [topic_document(topic)]
    parts.extend(str(value) for value in topic.get("exclusion_boundary", []) if str(value).strip())
    parts.append(f"internal_domain={topic.get('internal_domain', '')}")
    parts.append(f"lifecycle={topic.get('lifecycle', '')}")
    return "\n".join(value for value in parts if value)


def _aliases(topic: dict[str, Any]) -> list[str]:
    values: list[str] = []
    names = topic.get("name", {})
    for language in ("zh", "en"):
        if names.get(language):
            values.append(str(names[language]))
        aliases = topic.get("aliases", {}).get(language, [])
        if isinstance(aliases, str):
            aliases = [aliases]
        values.extend(str(value) for value in aliases or [])
    return [value for value in values if value.strip()]


def eligible_topics(
    catalog: dict[str, Any],
    custom_topics: Sequence[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    topics: list[dict[str, Any]] = []
    for topic in catalog.get("topics", []):
        if topic.get("lifecycle") == "ACTIVE":
            topics.append(deepcopy(topic))
    for topic in custom_topics or []:
        topic_id = str(topic.get("topic_id", ""))
        if not topic_id.startswith("usr."):
            raise ValueError("Custom Topic IDs must start with usr.")
        if topic.get("lifecycle") == "DEPRECATED":
            continue
        topics.append(deepcopy(topic))
    ids = [str(topic["topic_id"]) for topic in topics]
    if len(ids) != len(set(ids)):
        raise ValueError("Eligible Topic IDs must be unique")
    return topics


def _profile_prior(profile: dict[str, Any] | None, topic_id: str) -> float:
    if not profile:
        return 0.0
    state = profile.get(topic_id, {})
    if not isinstance(state, dict):
        return 0.0
    score = 0.0
    if state.get("activity_state") == "ACTIVE":
        score += 1.0
    if state.get("pinned") is True:
        score += 2.0
    if state.get("calibration_prior") is True:
        score += 1.5
    return score


def lexical_ranking(query: str, topics: Sequence[dict[str, Any]]) -> list[str]:
    lexical = LexicalControl()
    qn = normalize(query)
    scored: list[tuple[float, str]] = []
    for topic in topics:
        topic_id = str(topic["topic_id"])
        aliases = _aliases(topic)
        exact = any(qn and qn == normalize(alias) for alias in aliases)
        contained = any(normalize(alias) and normalize(alias) in qn for alias in aliases)
        alias_score = max((lexical.score(query, alias) for alias in aliases), default=0.0)
        score = (4.0 if exact else 0.0) + (1.5 if contained else 0.0) + alias_score
        scored.append((score, topic_id))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [topic_id for _, topic_id in scored]


def _rrf(
    dense_ids: Sequence[str],
    lexical_ids: Sequence[str],
    *,
    dense_limit: int,
    lexical_limit: int,
) -> list[str]:
    scores: dict[str, float] = {}
    for rank, topic_id in enumerate(dense_ids[:dense_limit], 1):
        scores[topic_id] = scores.get(topic_id, 0.0) + 1.0 / (60 + rank)
    for rank, topic_id in enumerate(lexical_ids[:lexical_limit], 1):
        scores[topic_id] = scores.get(topic_id, 0.0) + 1.0 / (30 + rank)
    return [
        topic_id
        for topic_id, _ in sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    ]


def assemble_candidates(
    *,
    query: str,
    topics: Sequence[dict[str, Any]],
    dense_ranking: Sequence[str],
    lexical_ids: Sequence[str],
    profile: dict[str, Any] | None = None,
    config: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    cfg = config or load_sem03_config()
    policy = cfg["policy"]
    by_id = {str(topic["topic_id"]): topic for topic in topics}
    global_slots = int(policy["reserved_global_slots"])
    personal_slots = int(policy["personalized_slots_max"])
    dense_limit = int(policy["dense_top_k"])
    lexical_limit = int(policy["lexical_top_k"])
    max_candidates = int(policy["max_candidate_count"])
    custom_lane = int(policy["custom_safety_lane_max"])

    fused = _rrf(
        dense_ranking,
        lexical_ids,
        dense_limit=dense_limit,
        lexical_limit=lexical_limit,
    )
    source_map: dict[str, set[str]] = {topic_id: set() for topic_id in by_id}
    for topic_id in dense_ranking[:dense_limit]:
        if topic_id in source_map:
            source_map[topic_id].add("dense")
    for topic_id in lexical_ids[:lexical_limit]:
        if topic_id in source_map:
            source_map[topic_id].add("lexical_alias")

    qn = normalize(query)
    exact_aliases = sorted(
        topic_id
        for topic_id, topic in by_id.items()
        if any(qn and qn == normalize(alias) for alias in _aliases(topic))
    )
    global_order: list[str] = []
    for topic_id in exact_aliases + fused:
        if topic_id in by_id and topic_id not in global_order:
            global_order.append(topic_id)
            if topic_id in exact_aliases:
                source_map[topic_id].add("exact_alias")

    custom_ranked = [
        topic_id
        for topic_id in dense_ranking
        if topic_id.startswith("usr.") and topic_id in by_id
    ][:custom_lane]
    for topic_id in custom_ranked:
        source_map[topic_id].add("custom_safety_lane")
        if topic_id not in global_order:
            global_order.append(topic_id)

    seed_snapshot = list(global_order[: max(global_slots, min(len(global_order), dense_limit))])
    for topic_id in seed_snapshot:
        for neighbor in by_id[topic_id].get("confusing_neighbor_topic_ids", []) or []:
            neighbor = str(neighbor)
            if neighbor in by_id:
                source_map[neighbor].add("confusing_neighbor")
                if neighbor not in global_order:
                    global_order.append(neighbor)

    global_order = global_order[:max_candidates]
    global_rank = {topic_id: rank for rank, topic_id in enumerate(global_order, 1)}
    selected = list(global_order)

    personalized = sorted(
        (
            (_profile_prior(profile, topic_id), topic_id)
            for topic_id in by_id
            if _profile_prior(profile, topic_id) > 0 and topic_id not in selected
        ),
        key=lambda item: (-item[0], item[1]),
    )[:personal_slots]
    for _, topic_id in personalized:
        if len(selected) >= max_candidates:
            break
        selected.append(topic_id)
        source_map[topic_id].add("personalized_prior")

    result: list[dict[str, Any]] = []
    for rank, topic_id in enumerate(selected, 1):
        topic = by_id[topic_id]
        result.append(
            {
                "topic_id": topic_id,
                "rank": rank,
                "global_rank": global_rank.get(topic_id),
                "sources": sorted(source_map[topic_id]),
                "activity_prior_contribution": _profile_prior(profile, topic_id),
                "is_custom": topic_id.startswith("usr."),
                "lifecycle": str(topic.get("lifecycle", "")),
            }
        )
    if len(global_order) >= global_slots:
        assert [item["topic_id"] for item in result[:global_slots]] == global_order[:global_slots]
    return result


class HashTopicCandidateIndex:
    """Deterministic B0 control for candidate-policy engineering; not a model-quality claim."""

    def __init__(
        self,
        topics: Sequence[dict[str, Any]],
        *,
        dimensions: int = 256,
        config: dict[str, Any] | None = None,
    ):
        self.topics = list(topics)
        self.config = config or load_sem03_config()
        self.topic_ids = [str(topic["topic_id"]) for topic in self.topics]
        self.embedder = HashNgramEmbeddingAdapter(dimensions=dimensions)
        self.vectors = self.embedder.embed([topic_descriptor(topic) for topic in self.topics])

    def dense_ranking(self, query: str) -> list[str]:
        q = self.embedder.embed([query])[0]
        scored = [
            (cosine(q, vector), topic_id)
            for topic_id, vector in zip(self.topic_ids, self.vectors)
        ]
        scored.sort(key=lambda item: (-item[0], item[1]))
        return [topic_id for _, topic_id in scored]

    def query(
        self,
        text: str,
        *,
        profile: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        return assemble_candidates(
            query=text,
            topics=self.topics,
            dense_ranking=self.dense_ranking(text),
            lexical_ids=lexical_ranking(text, self.topics),
            profile=profile,
            config=self.config,
        )


def build_sem03_fixture_pack(catalog: dict[str, Any]) -> dict[str, Any]:
    active = [topic for topic in catalog.get("topics", []) if topic.get("lifecycle") == "ACTIVE"]
    cases: list[dict[str, Any]] = []
    for index, topic in enumerate(active):
        topic_id = str(topic["topic_id"])
        aliases = _aliases(topic)
        zh = str(topic["name"]["zh"])
        en = str(topic["name"]["en"])
        example = str((topic.get("representative_examples") or [zh])[0])
        samples = [
            ("zh", zh),
            ("en", en),
            ("mixed", f"{zh} / {en}: {example}"),
        ]
        if aliases:
            samples.append(("alias", aliases[-1]))
        for slice_name, text in samples:
            cases.append(
                {
                    "id": f"{topic_id}:{slice_name}",
                    "topic_id": topic_id,
                    "slice": slice_name,
                    "profile_state": "ACTIVE" if index % 2 == 0 else "INACTIVE",
                    "text": text,
                    "provenance": {
                        "evidence_class": "catalog_boundary",
                        "source": "system_topic_catalog_v0.2.yaml",
                        "contains_real_paia_input": False,
                    },
                }
            )
    pack = {"fixture_pack_version": "0.1.0", "round": "SEM-03", "cases": cases}
    validate_fixture_pack(pack)
    return pack


def _candidate_recall(rankings: Sequence[list[str]], truth: Sequence[str], k: int) -> float:
    if not truth:
        return 0.0
    return sum(target in ranked[:k] for ranked, target in zip(rankings, truth)) / len(truth)


def _mean_size(rankings: Sequence[list[str]]) -> float:
    return sum(len(row) for row in rankings) / max(1, len(rankings))


def _profile_for_topics(topics: Sequence[dict[str, Any]]) -> dict[str, Any]:
    profile: dict[str, Any] = {}
    for index, topic in enumerate(topics):
        topic_id = str(topic["topic_id"])
        profile[topic_id] = {
            "activity_state": "ACTIVE" if index % 2 == 0 else "INACTIVE",
            "pinned": index % 17 == 0,
            "calibration_prior": index % 29 == 0,
        }
    return profile


def _confusing_pair_challenges(topics: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {str(topic["topic_id"]): topic for topic in topics}
    pairs: set[tuple[str, str]] = set()
    for topic in topics:
        left = str(topic["topic_id"])
        for neighbor in topic.get("confusing_neighbor_topic_ids", []) or []:
            right = str(neighbor)
            if right in by_id and right != left:
                pairs.add(tuple(sorted((left, right))))
    if not pairs:
        by_domain: dict[str, list[str]] = {}
        for topic in topics:
            by_domain.setdefault(str(topic.get("internal_domain", "")), []).append(str(topic["topic_id"]))
        for ids in by_domain.values():
            ids = sorted(ids)
            if len(ids) >= 2:
                pairs.add((ids[0], ids[1]))
    cases: list[dict[str, Any]] = []
    for left, right in sorted(pairs)[:32]:
        lt, rt = by_id[left], by_id[right]
        cases.append(
            {
                "id": f"pair:{left}:{right}",
                "left": left,
                "right": right,
                "text": f"{lt['name']['zh']} / {rt['name']['zh']} boundary comparison",
                "declared_neighbor": right in (lt.get("confusing_neighbor_topic_ids", []) or [])
                or left in (rt.get("confusing_neighbor_topic_ids", []) or []),
            }
        )
    return cases


def _synthetic_custom_topics() -> list[dict[str, Any]]:
    result = []
    for index, (zh, en) in enumerate(
        [
            ("个人语义实验项目", "Personal Semantic Lab Project"),
            ("家庭旅行计划", "Family Trip Plan"),
            ("论文数值计算", "Thesis Numerical Calculation"),
            ("求职投递追踪", "Job Application Tracking"),
        ]
    ):
        result.append(
            {
                "topic_id": f"usr.fixture.sem03.{index:02d}",
                "name": {"zh": zh, "en": en},
                "definition": f"Synthetic custom Topic fixture for {zh}.",
                "inclusion_boundary": [f"Directly concerns {zh}."],
                "exclusion_boundary": ["Background mentions alone do not qualify."],
                "aliases": {"zh": [zh], "en": [en]},
                "representative_examples": [f"持续记录 {zh} 的事项。"],
                "confusing_neighbor_topic_ids": [],
                "internal_domain": "CUSTOM",
                "lifecycle": "ACTIVE",
                "boundary_status": "SYNTHETIC_FIXTURE",
                "introduced_in": "fixture",
            }
        )
    return result


def build_scale_topics(catalog: dict[str, Any], target: int = 1024) -> list[dict[str, Any]]:
    active = [topic for topic in catalog.get("topics", []) if topic.get("lifecycle") == "ACTIVE"]
    if not active:
        raise ValueError("Scale fixture requires active Topics")
    result: list[dict[str, Any]] = []
    for index in range(target):
        source = active[index % len(active)]
        token = f"SCALE{index:04d}"
        item = deepcopy(source)
        item["topic_id"] = f"fixture.scale.{index:04d}"
        item["name"] = {
            "zh": f"{source['name']['zh']} {token}",
            "en": f"{source['name']['en']} {token}",
        }
        item["aliases"] = {"zh": [token], "en": [token]}
        item["definition"] = f"Synthetic scale-only Topic descriptor {token}."
        item["inclusion_boundary"] = [f"Contains unique scale marker {token}."]
        item["exclusion_boundary"] = ["No marker means no match."]
        item["representative_examples"] = [f"{token} scale retrieval probe"]
        item["confusing_neighbor_topic_ids"] = []
        item["lifecycle"] = "ACTIVE"
        result.append(item)
    return result


def _ranking_digest(rankings: Sequence[list[str]]) -> str:
    return hashlib.sha256(
        json.dumps(rankings, separators=(",", ":"), ensure_ascii=False).encode()
    ).hexdigest()


def run_sem03(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    config = load_sem03_config()
    catalog = load_catalog()
    validate_catalog_contract(catalog)
    custom = _synthetic_custom_topics()
    topics = eligible_topics(catalog, custom)
    system_topics = [topic for topic in topics if not str(topic["topic_id"]).startswith("usr.")]
    pack = build_sem03_fixture_pack(catalog)
    cases = pack["cases"]
    profile = _profile_for_topics(topics)
    index = HashTopicCandidateIndex(topics, config=config)

    rankings_on: list[list[str]] = []
    rankings_off: list[list[str]] = []
    latencies: list[float] = []
    global_preserved = 0
    reserved = int(config["policy"]["reserved_global_slots"])
    for case in cases:
        start = time.perf_counter()
        on = index.query(str(case["text"]), profile=profile)
        latencies.append(time.perf_counter() - start)
        off = index.query(str(case["text"]), profile=None)
        on_ids = [item["topic_id"] for item in on]
        off_ids = [item["topic_id"] for item in off]
        rankings_on.append(on_ids)
        rankings_off.append(off_ids)
        global_preserved += int(on_ids[:reserved] == off_ids[:reserved])

    truth = [str(case["topic_id"]) for case in cases]
    recall = {f"recall_at_{k}": _candidate_recall(rankings_on, truth, k) for k in (5, 10, 20)}
    inactive_indices = [i for i, case in enumerate(cases) if case["profile_state"] == "INACTIVE"]
    active_indices = [i for i, case in enumerate(cases) if case["profile_state"] == "ACTIVE"]
    inactive_recall = _candidate_recall(
        [rankings_on[i] for i in inactive_indices],
        [truth[i] for i in inactive_indices],
        20,
    )
    active_recall = _candidate_recall(
        [rankings_on[i] for i in active_indices],
        [truth[i] for i in active_indices],
        20,
    )
    active_gap = abs(active_recall - inactive_recall)

    pair_cases = _confusing_pair_challenges(system_topics)
    pair_failures: list[str] = []
    for case in pair_cases:
        ids = [item["topic_id"] for item in index.query(case["text"], profile=profile)][:20]
        if case["left"] not in ids or case["right"] not in ids:
            pair_failures.append(case["id"])
    pair_error_rate = len(pair_failures) / max(1, len(pair_cases))

    custom_cases = [
        {"topic_id": str(topic["topic_id"]), "text": str(topic["name"]["zh"])}
        for topic in custom
    ]
    custom_recall = _candidate_recall(
        [
            [item["topic_id"] for item in index.query(case["text"], profile=None)]
            for case in custom_cases
        ],
        [case["topic_id"] for case in custom_cases],
        20,
    )

    scale_topics = build_scale_topics(catalog, int(config["scale_test"]["topic_count"]))
    scale_index = HashTopicCandidateIndex(scale_topics, dimensions=128, config=config)
    scale_cases = [
        {
            "topic_id": str(scale_topics[index]["topic_id"]),
            "text": str(scale_topics[index]["aliases"]["en"][0]),
        }
        for index in range(0, len(scale_topics), max(1, len(scale_topics) // 32))
    ][:32]
    start = time.perf_counter()
    scale_rankings = [
        [item["topic_id"] for item in scale_index.query(case["text"], profile=None)]
        for case in scale_cases
    ]
    scale_seconds = time.perf_counter() - start
    scale_recall = _candidate_recall(
        scale_rankings,
        [case["topic_id"] for case in scale_cases],
        20,
    )

    control_rankings: dict[str, list[list[str]]] = {}
    control_subset = cases[: min(96, len(cases))]
    for dimensions in config["engineering_embedding_controls"]:
        control = HashTopicCandidateIndex(topics, dimensions=int(dimensions), config=config)
        control_rankings[str(dimensions)] = [
            [item["topic_id"] for item in control.query(str(case["text"]), profile=None)][:20]
            for case in control_subset
        ]
    controls = list(control_rankings)
    disagreement_pairs = 0
    disagreement_total = 0
    for i, left in enumerate(controls):
        for right in controls[i + 1 :]:
            for a, b in zip(control_rankings[left], control_rankings[right]):
                disagreement_total += 1
                disagreement_pairs += int(a != b)

    owner_failures: list[str] = []
    for task in SEMANTIC_OWNER_TASKS:
        try:
            open_owner_task("SEM-03", task)
            owner_failures.append(task)
        except OwnerAttentionViolation:
            pass
    isolation = static_runtime_isolation_audit(repo_root())

    gates = config["acceptance"]
    engineering_pass = (
        recall["recall_at_10"] >= float(gates["candidate_recall_at_10_min"])
        and recall["recall_at_20"] >= float(gates["candidate_recall_at_20_min"])
        and inactive_recall >= float(gates["inactive_candidate_recall_at_20_min"])
        and active_gap <= float(gates["active_inactive_recall_gap_max"])
        and global_preserved == len(cases)
        and custom_recall >= float(gates["custom_topic_recall_at_20_min"])
        and pair_error_rate <= float(gates["confusing_neighbor_error_rate_max"])
        and scale_recall >= float(gates["scale_recall_at_20_min"])
    )
    g0 = not isolation and not owner_failures

    manifest = build_run_manifest(
        lab_commit=lab_commit,
        catalog_version=str(catalog["catalog_version"]),
        round_id="SEM-03",
        benchmark_version=str(config["benchmark_version"]),
        metrics_ref="artifacts/sem-03/candidate-retrieval-report.json",
    )
    disagreement_queue: list[dict[str, Any]] = []
    for idx, case in enumerate(control_subset):
        variants = {tuple(control_rankings[key][idx]) for key in controls}
        if len(variants) > 1:
            disagreement_queue.append(
                {
                    "case_id": case["id"],
                    "topic_id": case["topic_id"],
                    "text": case["text"],
                    "profile_state": case["profile_state"],
                    "provenance": case["provenance"],
                }
            )

    return {
        "round": "SEM-03",
        "manifest": manifest,
        "benchmark": {
            "version": config["benchmark_version"],
            "fixture_pack_version": pack["fixture_pack_version"],
            "case_count": len(cases),
            "system_topic_count": len(system_topics),
            "synthetic_custom_topic_count": len(custom),
            "contains_real_paia_input": False,
            "personalized_semantic_claim": "WITHHELD",
        },
        "candidate_policy": config["policy"],
        "metrics": {
            **recall,
            "inactive_candidate_recall_at_20": inactive_recall,
            "active_candidate_recall_at_20": active_recall,
            "active_inactive_recall_gap": active_gap,
            "custom_topic_recall_at_20": custom_recall,
            "confusing_neighbor_case_count": len(pair_cases),
            "confusing_neighbor_failure_count": len(pair_failures),
            "confusing_neighbor_error_rate": pair_error_rate,
            "global_slot_preservation_rate": global_preserved / max(1, len(cases)),
            "candidate_set_size_mean": _mean_size(rankings_on),
            "candidate_latency_mean_seconds": sum(latencies) / max(1, len(latencies)),
            "candidate_latency_max_seconds": max(latencies) if latencies else 0.0,
            "scale_topic_count": len(scale_topics),
            "scale_probe_count": len(scale_cases),
            "scale_recall_at_20": scale_recall,
            "scale_total_seconds": scale_seconds,
            "engineering_control_disagreement_rate": (
                disagreement_pairs / disagreement_total if disagreement_total else 0.0
            ),
            "owner_attention_policy_violations": len(owner_failures),
            "isolation_violations": len(isolation),
            "real_input_api_egress_events": 0,
            "live_api_calls": 0,
            "model_training_runs": 0,
        },
        "stability": {
            "engineering_controls": control_rankings,
            "qualified_runtime_required": True,
            "qualified_runtime_result": "PENDING_SEPARATE_PINNED_RUNTIME_WORKFLOW",
        },
        "challenge_set": {
            "machine_generated": True,
            "confusing_pairs": pair_cases,
            "failures": pair_failures,
        },
        "disagreement_queue": disagreement_queue[:200],
        "reproducibility": {
            "activity_on_digest": _ranking_digest(rankings_on),
            "activity_off_digest": _ranking_digest(rankings_off),
        },
        "findings": {
            "owner_attention_policy_violations": owner_failures,
            "isolation": isolation,
        },
        "gates": {
            "G0_isolation": "PASS" if g0 else "FAIL",
            "G4_full_catalog_candidates": "PASS" if engineering_pass else "FAIL",
            "qualified_embedding_stability": "PENDING_RUNTIME_WORKFLOW",
            "personalized_candidate_recall": "INCONCLUSIVE",
        },
        "pass": g0 and engineering_pass,
    }
