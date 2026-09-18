from __future__ import annotations

import hashlib
import json
import statistics
import time
import tracemalloc
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

import yaml

from .catalog import load_catalog, validate_catalog_contract
from .contracts import repo_root
from .isolation import static_runtime_isolation_audit
from .manifest import build_run_manifest
from .owner_attention import OwnerAttentionViolation, SEMANTIC_OWNER_TASKS, open_owner_task

DEFAULT_CONFIG_PATH = repo_root() / "configs" / "sem05_lifecycle_v0.1.yaml"


class LifecycleGuardError(ValueError):
    pass


class EgressDenied(RuntimeError):
    pass


def load_sem05_config(path: Path | None = None) -> dict[str, Any]:
    value = yaml.safe_load((path or DEFAULT_CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("SEM-05 config must be a mapping")
    return value


def _digest(value: Any) -> str:
    rendered = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(rendered.encode("utf-8")).hexdigest()


def _text_digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _dt(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _iso(value: str | datetime) -> str:
    return _dt(value).isoformat()


def _event_id(event: dict[str, Any]) -> str:
    return str(event.get("event_id") or "evt:" + _digest(event)[:24])


class IncrementalSemanticStore:
    def __init__(self, config: dict[str, Any] | None = None):
        cfg = deepcopy(config or load_sem05_config())
        inc = cfg["incremental"]
        self.private_namespace = str(inc["private_namespace"])
        self.model_fingerprint = str(inc["model_fingerprint"])
        self.representation_fingerprint = str(inc["representation_fingerprint"])
        self.bindings: dict[str, dict[str, Any]] = {}
        self.revisions: dict[str, dict[str, Any]] = {}
        self.derivatives: dict[str, dict[str, Any]] = {}
        self.applied_events: set[str] = set()
        self.catalog_lineage: list[dict[str, Any]] = []
        self.embedding_calls = 0

    def _embedding_key(self, payload_digest: str) -> str:
        return "emb:" + _digest({
            "private_namespace": self.private_namespace,
            "effective_payload_digest": payload_digest,
            "model_fingerprint": self.model_fingerprint,
            "representation_fingerprint": self.representation_fingerprint,
        })

    def _mark_ref_stale(self, input_ref: str) -> int:
        count = 0
        for record in self.revisions.values():
            if record["input_ref"] == input_ref and not record.get("stale", False):
                record["stale"] = True
                count += 1
        for derivative in self.derivatives.values():
            if derivative["input_ref"] == input_ref:
                derivative["stale"] = True
        return count

    def apply_event(self, raw_event: dict[str, Any]) -> dict[str, Any]:
        event = deepcopy(raw_event)
        event_id = _event_id(event)
        if event_id in self.applied_events:
            return {"event_id": event_id, "duplicate": True, "embedding_calls": 0}
        self.applied_events.add(event_id)
        kind = str(event["kind"])
        input_ref = str(event["input_ref"])

        if kind in {"delete", "withdraw"}:
            stale_count = self._mark_ref_stale(input_ref)
            binding = self.bindings.get(input_ref)
            if binding:
                binding["withdrawn"] = True
                binding["withdrawal_kind"] = kind
            return {"event_id": event_id, "kind": kind, "stale_revisions": stale_count,
                    "embedding_calls": 0, "purge_required": True}

        if kind == "purge":
            removed = [key for key, value in self.derivatives.items() if value["input_ref"] == input_ref]
            for key in removed:
                del self.derivatives[key]
            for value in self.revisions.values():
                if value["input_ref"] == input_ref:
                    value["purged"] = True
            return {"event_id": event_id, "kind": kind, "purged_derivatives": len(removed),
                    "embedding_calls": 0}

        if kind != "upsert":
            raise LifecycleGuardError(f"Unsupported lifecycle event kind: {kind}")

        revision = str(event["revision"])
        text = str(event.get("text", ""))
        payload_digest = _text_digest(text)
        metadata_fingerprint = str(event.get("metadata_fingerprint", ""))
        source_payload_fingerprint = str(event.get("source_payload_fingerprint", payload_digest))
        old = self.bindings.get(input_ref)

        no_op = bool(
            old
            and old["revision"] == revision
            and old["effective_payload_digest"] == payload_digest
            and old["metadata_fingerprint"] == metadata_fingerprint
            and old["source_payload_fingerprint"] == source_payload_fingerprint
            and not old.get("withdrawn", False)
        )
        if no_op:
            return {"event_id": event_id, "kind": "noop", "embedding_calls": 0}

        content_unchanged = bool(old and old["effective_payload_digest"] == payload_digest)
        metadata_only = bool(content_unchanged)
        stale_count = 0
        if old and (old["revision"] != revision or not content_unchanged):
            stale_count = self._mark_ref_stale(input_ref)

        embedding_calls = 0
        embedding_key = self._embedding_key(payload_digest)
        if embedding_key not in self.derivatives:
            self.derivatives[embedding_key] = {
                "embedding_key": embedding_key,
                "input_ref": input_ref,
                "revision": revision,
                "effective_payload_digest": payload_digest,
                "model_fingerprint": self.model_fingerprint,
                "representation_fingerprint": self.representation_fingerprint,
                "stale": False,
            }
            self.embedding_calls += 1
            embedding_calls = 1
        else:
            cached = self.derivatives[embedding_key]
            cached["input_ref"] = input_ref
            cached["revision"] = revision
            cached["stale"] = False

        revision_key = f"{input_ref}@{revision}"
        self.revisions[revision_key] = {
            "input_ref": input_ref,
            "revision": revision,
            "effective_payload_digest": payload_digest,
            "source_payload_fingerprint": source_payload_fingerprint,
            "metadata_fingerprint": metadata_fingerprint,
            "embedding_key": embedding_key,
            "stale": False,
            "purged": False,
        }
        self.bindings[input_ref] = {
            "input_ref": input_ref,
            "revision": revision,
            "effective_payload_digest": payload_digest,
            "source_payload_fingerprint": source_payload_fingerprint,
            "metadata_fingerprint": metadata_fingerprint,
            "embedding_key": embedding_key,
            "withdrawn": False,
        }
        return {
            "event_id": event_id,
            "kind": "metadata_only" if metadata_only and old else ("append" if old is None else "edit"),
            "embedding_calls": embedding_calls,
            "stale_revisions": stale_count,
            "reused_embedding": embedding_calls == 0,
        }

    def apply_catalog_change(self, change: dict[str, Any]) -> dict[str, Any]:
        change_type = str(change["change_type"]).upper()
        if change_type not in {"PATCH", "MINOR", "MAJOR"}:
            raise LifecycleGuardError(f"Unknown catalog change type: {change_type}")
        affected = sorted({str(v) for v in change.get("affected_topic_ids", [])})
        added = sorted({str(v) for v in change.get("added_topic_ids", [])})
        successors = sorted({str(v) for v in change.get("successor_topic_ids", [])})
        invalidated = sorted(set(affected + added + successors))
        result = {
            "from_version": str(change["from_version"]),
            "to_version": str(change["to_version"]),
            "change_type": change_type,
            "invalidated_topic_representation_ids": invalidated,
            "input_embedding_recomputations": 0,
            "router_artifacts_invalidated": change_type in {"MINOR", "MAJOR"},
            "historical_assignments_rewritten": False,
            "targeted_gold_migration_required": change_type == "MAJOR" and bool(successors),
        }
        self.catalog_lineage.append(deepcopy(result))
        return result

    def upgrade_model(self, new_model_fingerprint: str) -> dict[str, Any]:
        old = self.model_fingerprint
        if new_model_fingerprint == old:
            return {"changed": False, "recomputed": 0, "old_namespace": old, "new_namespace": old}
        active = self.default_records()
        self.model_fingerprint = new_model_fingerprint
        recomputed = 0
        for record in active:
            key = self._embedding_key(record["effective_payload_digest"])
            self.derivatives[key] = {
                "embedding_key": key,
                "input_ref": record["input_ref"],
                "revision": record["revision"],
                "effective_payload_digest": record["effective_payload_digest"],
                "model_fingerprint": self.model_fingerprint,
                "representation_fingerprint": self.representation_fingerprint,
                "stale": False,
            }
            self.bindings[record["input_ref"]]["embedding_key"] = key
            self.revisions[f"{record['input_ref']}@{record['revision']}"]["embedding_key"] = key
            recomputed += 1
        self.embedding_calls += recomputed
        return {"changed": True, "recomputed": recomputed, "old_namespace": old,
                "new_namespace": new_model_fingerprint}

    def default_records(self) -> list[dict[str, Any]]:
        rows = []
        for input_ref, binding in sorted(self.bindings.items()):
            if binding.get("withdrawn"):
                continue
            record = self.revisions.get(f"{input_ref}@{binding['revision']}")
            if not record or record.get("stale") or record.get("purged"):
                continue
            derivative = self.derivatives.get(binding["embedding_key"])
            if not derivative or derivative.get("stale"):
                continue
            rows.append(deepcopy(record))
        return rows

    def snapshot(self) -> dict[str, Any]:
        return {
            "private_namespace": self.private_namespace,
            "model_fingerprint": self.model_fingerprint,
            "representation_fingerprint": self.representation_fingerprint,
            "bindings": deepcopy(self.bindings),
            "revisions": deepcopy(self.revisions),
            "derivatives": deepcopy(self.derivatives),
            "applied_events": sorted(self.applied_events),
            "catalog_lineage": deepcopy(self.catalog_lineage),
            "embedding_calls": self.embedding_calls,
        }

    @classmethod
    def restore(cls, snapshot: dict[str, Any], config: dict[str, Any] | None = None) -> "IncrementalSemanticStore":
        value = cls(config)
        value.private_namespace = str(snapshot["private_namespace"])
        value.model_fingerprint = str(snapshot["model_fingerprint"])
        value.representation_fingerprint = str(snapshot["representation_fingerprint"])
        value.bindings = deepcopy(snapshot["bindings"])
        value.revisions = deepcopy(snapshot["revisions"])
        value.derivatives = deepcopy(snapshot["derivatives"])
        value.applied_events = set(snapshot["applied_events"])
        value.catalog_lineage = deepcopy(snapshot["catalog_lineage"])
        value.embedding_calls = int(snapshot["embedding_calls"])
        return value


class ActivationEngine:
    def __init__(self, config: dict[str, Any] | None = None, user_scope_ref: str = "synthetic:user"):
        cfg = deepcopy(config or load_sem05_config())
        self.policy = cfg["activation"]
        self.user_scope_ref = user_scope_ref
        self.profiles: dict[str, dict[str, Any]] = {}
        self.accepted: dict[str, list[dict[str, Any]]] = {}
        self.seen_assignment_events: set[str] = set()

    def profile(self, topic_id: str) -> dict[str, Any]:
        if topic_id not in self.profiles:
            self.profiles[topic_id] = {
                "user_scope_ref": self.user_scope_ref,
                "topic_id": topic_id,
                "activity_state": "INACTIVE",
                "visibility": "VISIBLE",
                "pinned": False,
                "activation_lock": "AUTO",
                "activation_evidence": [],
                "ever_active": False,
                "updated_at": "1970-01-01T00:00:00+00:00",
            }
        return self.profiles[topic_id]

    def manual(self, topic_id: str, *, at: str, visibility: str | None = None,
               pinned: bool | None = None, activation_lock: str | None = None,
               explicit_select: bool = False) -> None:
        profile = self.profile(topic_id)
        if visibility is not None:
            if visibility not in {"VISIBLE", "HIDDEN"}:
                raise LifecycleGuardError("Invalid visibility")
            profile["visibility"] = visibility
        if pinned is not None:
            profile["pinned"] = bool(pinned)
        if activation_lock is not None:
            if activation_lock not in {"AUTO", "FORCE_ACTIVE", "FORCE_INACTIVE"}:
                raise LifecycleGuardError("Invalid activation lock")
            profile["activation_lock"] = activation_lock
        if profile["activation_lock"] == "FORCE_ACTIVE":
            profile["activity_state"] = "ACTIVE"
            profile["ever_active"] = True
        elif profile["activation_lock"] == "FORCE_INACTIVE":
            profile["activity_state"] = "INACTIVE"
        elif explicit_select or profile["pinned"]:
            profile["activity_state"] = "ACTIVE"
            profile["ever_active"] = True
        profile["updated_at"] = _iso(at)
        self._enforce_budget()

    def accept_assignment(self, topic_id: str, *, input_ref: str, conversation_id: str,
                          at: str, input_revision: str = "r1", accepted: bool = True,
                          route_state: str = "ASSIGNED", stale: bool = False) -> None:
        event = {
            "topic_id": topic_id,
            "input_ref": input_ref,
            "conversation_id": conversation_id,
            "at": _iso(at),
            "input_revision": input_revision,
            "accepted": bool(accepted),
            "route_state": route_state,
            "stale": bool(stale),
        }
        event_id = _digest(event)
        if event_id in self.seen_assignment_events:
            return
        self.seen_assignment_events.add(event_id)
        if not accepted or route_state != "ASSIGNED" or stale:
            return
        self.accepted.setdefault(topic_id, []).append(event)
        profile = self.profile(topic_id)
        profile["activation_evidence"].append(event_id)
        profile["updated_at"] = event["at"]
        self._evaluate_topic(topic_id, _dt(at))
        self._enforce_budget()

    def _window(self, topic_id: str, now: datetime, days: int) -> list[dict[str, Any]]:
        cutoff = now - timedelta(days=days)
        return [row for row in self.accepted.get(topic_id, []) if cutoff <= _dt(row["at"]) <= now]

    def _evaluate_topic(self, topic_id: str, now: datetime) -> None:
        profile = self.profile(topic_id)
        lock = profile["activation_lock"]
        if lock == "FORCE_ACTIVE":
            profile["activity_state"] = "ACTIVE"
            profile["ever_active"] = True
            return
        if lock == "FORCE_INACTIVE":
            profile["activity_state"] = "INACTIVE"
            return
        last14 = self._window(topic_id, now, 14)
        last7 = self._window(topic_id, now, 7)
        distinct14 = {row["input_ref"] for row in last14}
        conversations14 = {row["conversation_id"] for row in last14}
        distinct7 = {row["input_ref"] for row in last7}
        if not profile["ever_active"]:
            qualifies = (
                len(distinct14) >= int(self.policy["first_time_distinct_inputs_14d"])
                and len(conversations14) >= int(self.policy["first_time_distinct_conversations_14d"])
            ) or len(distinct7) >= int(self.policy["sustained_inputs_7d"])
            if qualifies:
                profile["activity_state"] = "ACTIVE"
                profile["ever_active"] = True
        elif profile["activity_state"] == "INACTIVE":
            if len(distinct14) >= int(self.policy["reactivation_distinct_inputs_14d"]):
                profile["activity_state"] = "ACTIVE"

    def advance_time(self, now: str) -> None:
        current = _dt(now)
        for topic_id, profile in self.profiles.items():
            if profile["activation_lock"] == "FORCE_ACTIVE":
                profile["activity_state"] = "ACTIVE"
                continue
            if profile["activation_lock"] == "FORCE_INACTIVE":
                profile["activity_state"] = "INACTIVE"
                continue
            accepted = self.accepted.get(topic_id, [])
            if profile["activity_state"] == "ACTIVE" and not profile["pinned"] and accepted:
                last = max(_dt(row["at"]) for row in accepted)
                if current - last >= timedelta(days=int(self.policy["inactivity_days"])):
                    profile["activity_state"] = "INACTIVE"
                    profile["updated_at"] = current.isoformat()
        self._enforce_budget()

    def _last_assignment(self, topic_id: str) -> datetime:
        rows = self.accepted.get(topic_id, [])
        if not rows:
            return datetime(1970, 1, 1, tzinfo=timezone.utc)
        return max(_dt(row["at"]) for row in rows)

    def _enforce_budget(self) -> None:
        budget = int(self.policy["auto_active_budget"])
        auto = [
            profile for profile in self.profiles.values()
            if profile["activity_state"] == "ACTIVE"
            and profile["activation_lock"] == "AUTO"
            and not profile["pinned"]
        ]
        if len(auto) <= budget:
            return
        ranked = sorted(
            auto,
            key=lambda profile: (self._last_assignment(profile["topic_id"]), profile["topic_id"]),
            reverse=True,
        )
        keep = {profile["topic_id"] for profile in ranked[:budget]}
        for profile in auto:
            if profile["topic_id"] not in keep:
                profile["activity_state"] = "INACTIVE"

    def auto_active_count(self) -> int:
        return sum(
            profile["activity_state"] == "ACTIVE"
            and profile["activation_lock"] == "AUTO"
            and not profile["pinned"]
            for profile in self.profiles.values()
        )

    def classification_eligible(self, topic_id: str, *, catalog_lifecycle: str = "ACTIVE") -> bool:
        self.profile(topic_id)
        return catalog_lifecycle == "ACTIVE"

    def snapshot(self) -> dict[str, Any]:
        return {"profiles": deepcopy(self.profiles), "accepted": deepcopy(self.accepted)}

    @classmethod
    def replay(cls, events: Iterable[dict[str, Any]],
               config: dict[str, Any] | None = None) -> "ActivationEngine":
        engine = cls(config)
        ordered = sorted(
            (deepcopy(event) for event in events),
            key=lambda row: (_iso(row["at"]), str(row.get("event_id", "")), _digest(row)),
        )
        for event in ordered:
            kind = event["kind"]
            if kind == "assignment":
                engine.accept_assignment(
                    str(event["topic_id"]),
                    input_ref=str(event["input_ref"]),
                    conversation_id=str(event["conversation_id"]),
                    at=str(event["at"]),
                    input_revision=str(event.get("input_revision", "r1")),
                    accepted=bool(event.get("accepted", True)),
                    route_state=str(event.get("route_state", "ASSIGNED")),
                    stale=bool(event.get("stale", False)),
                )
            elif kind == "manual":
                engine.manual(
                    str(event["topic_id"]),
                    at=str(event["at"]),
                    visibility=event.get("visibility"),
                    pinned=event.get("pinned"),
                    activation_lock=event.get("activation_lock"),
                    explicit_select=bool(event.get("explicit_select", False)),
                )
            elif kind == "tick":
                engine.advance_time(str(event["at"]))
            else:
                raise LifecycleGuardError(f"Unknown activation event kind: {kind}")
        return engine


def _percentile(values: list[float], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, int(round((len(ordered) - 1) * fraction))))
    return ordered[index]


def _hash_embed(text: str, dimensions: int = 64) -> tuple[float, ...]:
    seed = hashlib.sha256(text.encode("utf-8")).digest()
    return tuple((seed[index % len(seed)] - 127.5) / 127.5 for index in range(dimensions))


def measure_local_pipeline(texts: list[str]) -> dict[str, Any]:
    tracemalloc.start()
    started = time.perf_counter()
    _hash_embed(texts[0])
    cold = time.perf_counter() - started
    latencies: list[float] = []
    vectors: list[tuple[float, ...]] = []
    batch_started = time.perf_counter()
    for text in texts:
        item_started = time.perf_counter()
        vectors.append(_hash_embed(text))
        latencies.append(time.perf_counter() - item_started)
    total = time.perf_counter() - batch_started
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {
        "mode": "local_deterministic_hash_control",
        "cold_latency_seconds": cold,
        "warm_p50_seconds": statistics.median(latencies) if latencies else 0.0,
        "warm_p95_seconds": _percentile(latencies, 0.95),
        "throughput_inputs_per_second": len(texts) / total if total else 0.0,
        "peak_memory_bytes": peak,
        "index_size_bytes_estimate": sum(len(vector) * 8 for vector in vectors),
        "input_count": len(texts),
    }


def diagnostic_clusters(items: list[dict[str, str]], threshold: float = 0.45) -> dict[str, Any]:
    def tokens(text: str) -> set[str]:
        normalized = text.casefold().replace("/", " ").replace("-", " ")
        return {part for part in normalized.split() if part}

    parent = list(range(len(items)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        a, b = find(left), find(right)
        if a != b:
            parent[max(a, b)] = min(a, b)

    token_sets = [tokens(item["text"]) for item in items]
    for left in range(len(items)):
        for right in range(left + 1, len(items)):
            union_size = len(token_sets[left] | token_sets[right])
            score = len(token_sets[left] & token_sets[right]) / union_size if union_size else 0.0
            if score >= threshold:
                union(left, right)

    grouped: dict[int, list[str]] = {}
    for index, item in enumerate(items):
        grouped.setdefault(find(index), []).append(item["id"])
    clusters = [
        {"cluster_id": f"cluster:{idx:04d}", "member_ids": sorted(members)}
        for idx, (_, members) in enumerate(sorted(grouped.items()), start=1)
    ]
    result = {
        "diagnostic_only": True,
        "formal_topic_mutations": 0,
        "cluster_count": len(clusters),
        "clusters": clusters,
    }
    result["stability_digest"] = _digest(result)
    return result


def api_tradeoff_rows(config: dict[str, Any], *, input_count: int,
                      total_tokens: int) -> list[dict[str, Any]]:
    rows = []
    for provider in config["providers"]:
        price = provider.get("price_usd_per_million_tokens")
        cost = None if price is None else float(price) * total_tokens / 1_000_000
        rows.append({
            "provider": provider["provider"],
            "model": provider["model"],
            "measurement_mode": "metadata_cost_estimate_only",
            "price_usd_per_million_tokens": price,
            "estimated_cost_for_fixture_batch_usd": cost,
            "estimated_cost_per_1000_inputs_usd": (
                None if cost is None else cost * 1000 / max(1, input_count)
            ),
            "pricing_verified_at": provider["pricing_verified_at"],
            "pricing_source": provider["pricing_source"],
            "retention_summary": provider["retention_summary"],
            "privacy_source": provider["privacy_source"],
            "qualification": provider["real_input_qualification"],
            "measured_latency": None,
            "network_calls": 0,
        })
    return rows


def external_call_allowed(*, evidence_class: str, contains_real_input: bool) -> bool:
    _ = evidence_class
    _ = contains_real_input
    return False


def qualified_local_runtime_evidence() -> dict[str, Any]:
    path = repo_root() / "artifacts" / "sem-01" / "local-runtime-results.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    candidates = []
    for item in payload.get("candidates", []):
        performance = item.get("performance", {})
        candidates.append({
            "candidate_id": item["candidate_id"],
            "revision": item["revision"],
            "source_round": "SEM-01",
            "source_workflow_run_id": payload.get("workflow_run_id"),
            "source_benchmark_fingerprint": payload.get("benchmark_fingerprint"),
            "measurement_reused": True,
            "contains_real_paia_input": bool(item.get("contains_real_paia_input", False)),
            "runtime_qualified": bool(item.get("runtime_qualified", False)),
            "cold_model_load_seconds": performance.get("model_load_seconds"),
            "first_batch_query_seconds": performance.get("query_encode_seconds"),
            "repeat_batch_query_seconds": performance.get("repeat_query_encode_seconds"),
            "throughput_inputs_per_second": performance.get("supported_query_throughput_per_second"),
            "peak_rss_bytes": performance.get("peak_rss_bytes"),
            "index_size_bytes_float32": performance.get("index_size_bytes_float32"),
            "embedding_dimensions": performance.get("embedding_dimensions"),
        })
    return {
        "source": "artifacts/sem-01/local-runtime-results.json",
        "source_workflow_run_id": payload.get("workflow_run_id"),
        "candidate_count": len(candidates),
        "all_runtime_qualified": bool(candidates) and all(row["runtime_qualified"] for row in candidates),
        "contains_real_paia_input": any(row["contains_real_paia_input"] for row in candidates),
        "candidates": candidates,
    }


def _lifecycle_fixture(config: dict[str, Any]) -> dict[str, Any]:
    events = [
        {"event_id": "e1", "kind": "upsert", "input_ref": "synthetic:1", "revision": "r1",
         "text": "alpha semantic fixture", "metadata_fingerprint": "m1",
         "source_payload_fingerprint": "s1"},
        {"event_id": "e2", "kind": "upsert", "input_ref": "synthetic:2", "revision": "r1",
         "text": "beta semantic fixture", "metadata_fingerprint": "m1",
         "source_payload_fingerprint": "s2"},
        {"event_id": "e3", "kind": "upsert", "input_ref": "synthetic:1", "revision": "r1",
         "text": "alpha semantic fixture", "metadata_fingerprint": "m1",
         "source_payload_fingerprint": "s1"},
        {"event_id": "e4", "kind": "upsert", "input_ref": "synthetic:1", "revision": "r2",
         "text": "alpha semantic fixture", "metadata_fingerprint": "m2",
         "source_payload_fingerprint": "s1-meta"},
        {"event_id": "e5", "kind": "upsert", "input_ref": "synthetic:1", "revision": "r3",
         "text": "alpha semantic fixture edited", "metadata_fingerprint": "m2",
         "source_payload_fingerprint": "s1-edit"},
        {"event_id": "e6", "kind": "delete", "input_ref": "synthetic:2"},
        {"event_id": "e7", "kind": "purge", "input_ref": "synthetic:2"},
    ]
    engine = IncrementalSemanticStore(config)
    outcomes = [engine.apply_event(event) for event in events]
    restored = IncrementalSemanticStore.restore(engine.snapshot(), config)
    duplicate = restored.apply_event(events[-1])
    default_rows = restored.default_records()
    expected = [("synthetic:1", "r3", _text_digest("alpha semantic fixture edited"))]
    actual = [
        (row["input_ref"], row["revision"], row["effective_payload_digest"])
        for row in default_rows
    ]
    stale_leaks = sum(
        row["input_ref"] == "synthetic:2" or row["revision"] != "r3"
        for row in default_rows
    )
    patch = restored.apply_catalog_change({
        "from_version": "0.2.0", "to_version": "0.2.1", "change_type": "PATCH",
        "affected_topic_ids": ["sys.synthetic.a"],
    })
    minor = restored.apply_catalog_change({
        "from_version": "0.2.1", "to_version": "0.3.0", "change_type": "MINOR",
        "added_topic_ids": ["sys.synthetic.new"],
    })
    major = restored.apply_catalog_change({
        "from_version": "0.3.0", "to_version": "1.0.0", "change_type": "MAJOR",
        "affected_topic_ids": ["sys.synthetic.a"],
        "successor_topic_ids": ["sys.synthetic.a1", "sys.synthetic.a2"],
    })
    return {
        "events": events,
        "outcomes": outcomes,
        "embedding_calls": engine.embedding_calls,
        "incremental_full_parity": actual == expected,
        "default_records": default_rows,
        "stale_revision_leaks": stale_leaks,
        "crash_recovery_snapshot_digest": _digest(restored.snapshot()),
        "duplicate_replay_idempotent": bool(duplicate.get("duplicate")),
        "catalog_changes": [patch, minor, major],
    }


def _activation_fixture(config: dict[str, Any]) -> dict[str, Any]:
    base = datetime(2026, 9, 1, tzinfo=timezone.utc)
    events: list[dict[str, Any]] = []
    events.append({
        "kind": "assignment", "topic_id": "topic.oneoff", "input_ref": "o1",
        "conversation_id": "c1", "at": base.isoformat(),
    })
    for index in range(3):
        events.append({
            "kind": "assignment", "topic_id": "topic.sustained",
            "input_ref": f"s{index}", "conversation_id": f"c{index % 2}",
            "at": (base + timedelta(days=index)).isoformat(),
        })
    for index in range(5):
        events.append({
            "kind": "assignment", "topic_id": "topic.singleconv",
            "input_ref": f"k{index}", "conversation_id": "one",
            "at": (base + timedelta(hours=index)).isoformat(),
        })
    events.extend([
        {"kind": "manual", "topic_id": "topic.pinned", "pinned": True,
         "at": base.isoformat()},
        {"kind": "manual", "topic_id": "topic.hidden", "visibility": "HIDDEN",
         "explicit_select": True, "at": base.isoformat()},
        {"kind": "manual", "topic_id": "topic.forceinactive",
         "activation_lock": "FORCE_INACTIVE", "at": base.isoformat()},
    ])
    for index in range(3):
        events.append({
            "kind": "assignment", "topic_id": "topic.forceinactive",
            "input_ref": f"f{index}", "conversation_id": f"fc{index}",
            "at": (base + timedelta(days=index)).isoformat(),
        })
    for topic_index in range(55):
        topic = f"budget.{topic_index:02d}"
        for event_index in range(3):
            events.append({
                "kind": "assignment",
                "topic_id": topic,
                "input_ref": f"{topic}.i{event_index}",
                "conversation_id": f"{topic}.c{event_index % 2}",
                "at": (base + timedelta(days=event_index, minutes=topic_index)).isoformat(),
            })
    decay_time = base + timedelta(days=70)
    pre_decay = ActivationEngine.replay(events, config)
    events.append({"kind": "tick", "at": decay_time.isoformat()})
    after_decay = ActivationEngine.replay(events, config)
    for index in range(2):
        events.append({
            "kind": "assignment", "topic_id": "topic.sustained",
            "input_ref": f"reactivate.{index}", "conversation_id": f"rc{index}",
            "at": (decay_time + timedelta(days=index)).isoformat(),
        })
    engine = ActivationEngine.replay(events, config)
    first = engine.snapshot()
    second = ActivationEngine.replay(list(reversed(events)), config).snapshot()
    return {
        "event_count": len(events),
        "deterministic_replay": first == second,
        "one_off_inactive": engine.profile("topic.oneoff")["activity_state"] == "INACTIVE",
        "sixty_day_decay": after_decay.profile("topic.sustained")["activity_state"] == "INACTIVE",
        "sustained_reactivated": engine.profile("topic.sustained")["activity_state"] == "ACTIVE",
        "single_conversation_activated": engine.profile("topic.singleconv")["ever_active"],
        "force_inactive_respected": engine.profile("topic.forceinactive")["activity_state"] == "INACTIVE",
        "pinned_active": engine.profile("topic.pinned")["activity_state"] == "ACTIVE",
        "hidden_classifiable": (
            engine.profile("topic.hidden")["visibility"] == "HIDDEN"
            and engine.classification_eligible("topic.hidden")
        ),
        "pre_decay_auto_active_count": pre_decay.auto_active_count(),
        "auto_active_count": engine.auto_active_count(),
        "budget_limit": int(config["activation"]["auto_active_budget"]),
        "profiles": engine.snapshot()["profiles"],
    }


def _sem06_queue() -> dict[str, Any]:
    source_path = repo_root() / "artifacts" / "sem-04" / "high-information-sampling-signals.json"
    source = json.loads(source_path.read_text(encoding="utf-8"))
    items: list[dict[str, Any]] = []
    for group in source.get("groups", []):
        for case_id in group.get("case_ids", [])[:12]:
            items.append({
                "case_id": case_id,
                "signal": group["signal"],
                "priority": group["priority"],
                "source_round": "SEM-04",
                "contains_real_paia_input": False,
            })
    items.extend([
        {
            "case_id": "sem05:lifecycle:edit-vs-metadata",
            "signal": "lifecycle_boundary",
            "priority": 3,
            "source_round": "SEM-05",
            "contains_real_paia_input": False,
        },
        {
            "case_id": "sem05:activation:reactivation",
            "signal": "activation_boundary",
            "priority": 3,
            "source_round": "SEM-05",
            "contains_real_paia_input": False,
        },
        {
            "case_id": "sem05:activation:hidden-classifiable",
            "signal": "presentation_vs_classification",
            "priority": 3,
            "source_round": "SEM-05",
            "contains_real_paia_input": False,
        },
    ])
    items.sort(key=lambda item: (-int(item["priority"]), str(item["case_id"])))
    return {
        "generated_for": "SEM-06 concentrated owner semantic batch selection support",
        "machine_selected": True,
        "owner_labels_used": False,
        "contains_real_paia_input": False,
        "item_count": len(items),
        "items": items,
        "use_constraint": (
            "Selection evidence only. SEM-06 must obtain authorized owner gold "
            "before making personalized semantic claims."
        ),
    }


def run_sem05(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    config = load_sem05_config()
    catalog = load_catalog()
    validate_catalog_contract(catalog)
    lifecycle = _lifecycle_fixture(config)
    activation = _activation_fixture(config)

    synthetic_count = int(config["performance"]["synthetic_input_count"])
    texts = [
        f"synthetic public-safe performance fixture {index} semantic lifecycle"
        for index in range(synthetic_count)
    ]
    local_perf = measure_local_pipeline(texts)
    total_tokens = synthetic_count * int(config["performance"]["assumed_tokens_per_input"])
    api_rows = api_tradeoff_rows(
        config, input_count=synthetic_count, total_tokens=total_tokens
    )
    qualified_local = qualified_local_runtime_evidence()

    policy_probes = [
        {"evidence_class": "synthetic", "contains_real_input": False},
        {"evidence_class": "private", "contains_real_input": True},
    ]
    denied_policy_probes = sum(
        not external_call_allowed(**probe) for probe in policy_probes
    )
    real_input_external_events = 0
    live_calls = 0

    cluster_items = [
        {"id": "c1", "text": "semantic lifecycle cache invalidation edit revision"},
        {"id": "c2", "text": "semantic lifecycle cache invalidation metadata revision"},
        {"id": "c3", "text": "activation profile sustained accepted assignment"},
        {"id": "c4", "text": "activation profile accepted assignment reactivation"},
        {"id": "c5", "text": "privacy api retention pricing metadata"},
        {"id": "c6", "text": "privacy api pricing retention matrix"},
    ]
    clusters_a = diagnostic_clusters(cluster_items)
    clusters_b = diagnostic_clusters(list(cluster_items))
    cluster_disagreement = int(
        clusters_a["stability_digest"] != clusters_b["stability_digest"]
    )

    owner_failures: list[str] = []
    for task in SEMANTIC_OWNER_TASKS:
        try:
            open_owner_task("SEM-05", task)
            owner_failures.append(task)
        except OwnerAttentionViolation:
            pass
    isolation = static_runtime_isolation_audit(repo_root())
    sem06_queue = _sem06_queue()
    acceptance = config["acceptance"]
    manual_violations = sum(
        not activation[key]
        for key in ("force_inactive_respected", "pinned_active", "hidden_classifiable")
    )
    g6 = (
        (not bool(acceptance["incremental_full_parity_required"]) or lifecycle["incremental_full_parity"])
        and lifecycle["stale_revision_leaks"] <= int(acceptance["stale_revision_leaks_max"])
        and lifecycle["duplicate_replay_idempotent"]
        and activation["deterministic_replay"]
        and activation["one_off_inactive"]
        and activation["sixty_day_decay"]
        and activation["sustained_reactivated"]
        and activation["single_conversation_activated"]
        and manual_violations <= int(acceptance["activation_manual_violations_max"])
        and activation["pre_decay_auto_active_count"] <= int(acceptance["auto_active_budget_max"])
        and activation["auto_active_count"] <= int(acceptance["auto_active_budget_max"])
        and qualified_local["candidate_count"] == 4
        and qualified_local["all_runtime_qualified"]
        and not qualified_local["contains_real_paia_input"]
        and cluster_disagreement <= int(acceptance["clustering_repeat_disagreement_max"])
        and real_input_external_events <= int(acceptance["real_input_api_egress_max"])
        and live_calls <= int(acceptance["live_api_calls_max"])
        and len(owner_failures) <= int(acceptance["owner_attention_policy_violations_max"])
        and denied_policy_probes == len(policy_probes)
        and sem06_queue["item_count"] > 0
    )
    g0 = not isolation and not owner_failures

    manifest = build_run_manifest(
        lab_commit=lab_commit,
        catalog_version=str(catalog["catalog_version"]),
        round_id="SEM-05",
        benchmark_version=str(config["benchmark_version"]),
        metrics_ref="artifacts/sem-05/lifecycle-invalidation-report.json",
    )
    return {
        "round": "SEM-05",
        "manifest": manifest,
        "benchmark": {
            "version": config["benchmark_version"],
            "contains_real_paia_input": False,
            "owner_labels_used": False,
            "personalized_semantic_claim": "WITHHELD",
        },
        "lifecycle": lifecycle,
        "activation": activation,
        "performance": {
            "ci_control": local_perf,
            "qualified_local_runtime": qualified_local,
            "api_tradeoff": api_rows,
            "api_measurement_note": (
                "No provider inference request is issued in SEM-05; API rows are "
                "pricing/privacy metadata plus deterministic cost estimates."
            ),
        },
        "privacy": {
            "providers": api_rows,
            "default_deny": True,
            "policy_probe_count": len(policy_probes),
            "denied_policy_probe_count": denied_policy_probes,
            "real_input_api_egress_events": real_input_external_events,
            "live_api_calls": live_calls,
        },
        "clustering": {
            **clusters_a,
            "repeat_disagreement_count": cluster_disagreement,
        },
        "sem06_evidence_queue": sem06_queue,
        "metrics": {
            "incremental_full_parity": 1.0 if lifecycle["incremental_full_parity"] else 0.0,
            "stale_revision_leaks": lifecycle["stale_revision_leaks"],
            "activation_manual_state_violations": manual_violations,
            "pre_decay_auto_active_count": activation["pre_decay_auto_active_count"],
            "auto_active_count": activation["auto_active_count"],
            "activation_replay_deterministic": 1.0 if activation["deterministic_replay"] else 0.0,
            "clustering_repeat_disagreement_count": cluster_disagreement,
            "local_latency_p50_seconds": local_perf["warm_p50_seconds"],
            "local_latency_p95_seconds": local_perf["warm_p95_seconds"],
            "local_throughput_inputs_per_second": local_perf["throughput_inputs_per_second"],
            "local_peak_memory_bytes": local_perf["peak_memory_bytes"],
            "local_index_size_bytes_estimate": local_perf["index_size_bytes_estimate"],
            "real_input_api_egress_events": real_input_external_events,
            "live_api_calls": live_calls,
            "owner_attention_policy_violations": len(owner_failures),
            "isolation_violations": len(isolation),
            "model_training_runs": 0,
            "automatic_topic_creation_events": 0,
        },
        "findings": {
            "owner_attention_policy_violations": owner_failures,
            "isolation": isolation,
        },
        "gates": {
            "G0_isolation": "PASS" if g0 else "FAIL",
            "G6_lifecycle_activation_privacy_infrastructure": "PASS" if g6 else "FAIL",
            "personalized_activation_routing_quality": "INCONCLUSIVE",
        },
        "pass": g0 and g6,
    }
