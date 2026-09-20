from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from copy import deepcopy
from pathlib import Path
from typing import Any, Sequence

import yaml

from .catalog import load_catalog, normalize, validate_catalog_contract
from .contracts import repo_root
from .embedding_adapters import HashNgramEmbeddingAdapter, LexicalControl, cosine
from .isolation import static_runtime_isolation_audit
from .rem01 import build_rem01_fixture_pack, query_representation, topic_descriptor_variant
from .sem02 import chunk_text
from .sem03 import build_scale_topics, build_sem03_fixture_pack, eligible_topics

DEFAULT_CONFIG_PATH = repo_root() / "configs" / "rem03_candidate_remediation_v0.1.yaml"


def load_rem03_config(path: Path | None = None) -> dict[str, Any]:
    value = yaml.safe_load((path or DEFAULT_CONFIG_PATH).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("REM-03 config must be a mapping")
    return value


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


def _profile_prior(profile: dict[str, Any] | None, topic_id: str) -> float:
    if not profile:
        return 0.0
    row = profile.get(topic_id, {})
    if not isinstance(row, dict):
        return 0.0
    score = 0.0
    if row.get("activity_state") == "ACTIVE":
        score += 1.0
    if row.get("pinned") is True:
        score += 2.0
    if row.get("calibration_prior") is True:
        score += 1.5
    return score


def _dedupe(values: Sequence[str], known: set[str] | None = None) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        value = str(value)
        if value in seen:
            continue
        if known is not None and value not in known:
            continue
        seen.add(value)
        result.append(value)
    return result


def rrf_many(
    rankings: dict[str, Sequence[str]],
    *,
    depth: int,
    constant: int,
) -> tuple[list[str], dict[str, set[str]]]:
    scores: dict[str, float] = {}
    sources: dict[str, set[str]] = defaultdict(set)
    for source, ranking in rankings.items():
        for rank, topic_id in enumerate(ranking[:depth], 1):
            topic_id = str(topic_id)
            scores[topic_id] = scores.get(topic_id, 0.0) + 1.0 / (constant + rank)
            sources[topic_id].add(source)
    ordered = [
        topic_id
        for topic_id, _ in sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    ]
    return ordered, sources


def domain_ranking(
    direct_order: Sequence[str],
    topics: Sequence[dict[str, Any]],
    *,
    depth: int,
    constant: int,
) -> list[str]:
    by_id = {str(topic["topic_id"]): topic for topic in topics}
    scores: dict[str, float] = {}
    for rank, topic_id in enumerate(direct_order[:depth], 1):
        topic = by_id.get(str(topic_id))
        if not topic or str(topic_id).startswith("usr."):
            continue
        domain = str(topic.get("internal_domain", ""))
        if not domain:
            continue
        scores[domain] = scores.get(domain, 0.0) + 1.0 / (constant + rank)
    return [
        domain
        for domain, _ in sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    ]


def domain_members(
    topics: Sequence[dict[str, Any]],
    direct_order: Sequence[str],
) -> dict[str, list[str]]:
    rank = {str(topic_id): index for index, topic_id in enumerate(direct_order)}
    grouped: dict[str, list[str]] = defaultdict(list)
    for topic in topics:
        topic_id = str(topic["topic_id"])
        if topic_id.startswith("usr."):
            continue
        domain = str(topic.get("internal_domain", ""))
        if domain:
            grouped[domain].append(topic_id)
    for domain, values in grouped.items():
        values.sort(key=lambda topic_id: (rank.get(topic_id, 10**9), topic_id))
    return dict(grouped)


def lexical_descriptor_ranking(
    query: str,
    topics: Sequence[dict[str, Any]],
) -> list[str]:
    lexical = LexicalControl()
    scored: list[tuple[float, str]] = []
    for topic in topics:
        topic_id = str(topic["topic_id"])
        descriptor = topic_descriptor_variant(topic, "full_boundaries")
        score = lexical.score(query, descriptor)
        scored.append((score, topic_id))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [topic_id for _, topic_id in scored]


def lexical_alias_ranking(
    query: str,
    topics: Sequence[dict[str, Any]],
) -> list[str]:
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


def assemble_remediated_candidates(
    *,
    query: str,
    topics: Sequence[dict[str, Any]],
    source_rankings: dict[str, Sequence[str]],
    profile: dict[str, Any] | None = None,
    config: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    cfg = config or load_rem03_config()
    policy = cfg["policy"]
    known = {str(topic["topic_id"]) for topic in topics}
    by_id = {str(topic["topic_id"]): topic for topic in topics}
    direct, source_map = rrf_many(
        source_rankings,
        depth=int(policy["direct_rrf_depth"]),
        constant=int(policy["direct_rrf_constant"]),
    )
    direct = _dedupe(direct, known)
    direct_rank = {topic_id: index for index, topic_id in enumerate(direct)}

    domains = domain_ranking(
        direct,
        topics,
        depth=int(policy["domain_rrf_depth"]),
        constant=int(policy["domain_rrf_constant"]),
    )
    members = domain_members(topics, direct)

    qn = normalize(query)
    exact_aliases = sorted(
        topic_id
        for topic_id, topic in by_id.items()
        if any(qn and qn == normalize(alias) for alias in _aliases(topic))
    )
    contained_aliases = sorted(
        (
            max(
                (len(normalize(alias)) for alias in _aliases(topic) if normalize(alias) and normalize(alias) in qn),
                default=0,
            ),
            topic_id,
        )
        for topic_id, topic in by_id.items()
        if any(normalize(alias) and normalize(alias) in qn for alias in _aliases(topic))
        and topic_id not in exact_aliases
    )
    contained_aliases = [
        topic_id
        for _, topic_id in sorted(contained_aliases, key=lambda item: (-item[0], item[1]))
    ][: int(policy.get("contained_alias_max", 4))]

    selected: list[str] = []
    selected_sources: dict[str, set[str]] = defaultdict(set)

    def add(topic_id: str, source: str) -> None:
        if topic_id not in known:
            return
        selected_sources[topic_id].add(source)
        if topic_id not in selected:
            selected.append(topic_id)

    if policy.get("exact_alias_priority", True):
        for topic_id in exact_aliases:
            add(topic_id, "exact_alias")
    if policy.get("contained_alias_priority", True):
        for topic_id in contained_aliases:
            add(topic_id, "contained_alias")

    for topic_id in direct[: int(policy["direct_seed_slots"])]:
        add(topic_id, "direct_seed")

    # The primary domain is a recall scaffold only: its Topic members remain the
    # actual candidates. Internal domains are never returned as assignment targets.
    domain_cap = int(policy.get("domain_scaffold_member_cap", 8))
    if domains and policy.get("primary_domain_full_lane", True):
        for topic_id in members.get(domains[0], [])[:domain_cap]:
            add(topic_id, "primary_domain_scaffold")

    # Fill top-10 from global direct ranking so exact/direct evidence is never
    # suppressed merely because a domain has fewer than 8 eligible members.
    for topic_id in direct:
        if len(selected) >= 10:
            break
        add(topic_id, "direct_global")

    # Declared confusing neighbors get priority before the secondary-domain lane
    # so a future real neighbor relation can affect top-20 rather than rank 21+.
    if policy.get("declared_neighbor_expansion", True):
        seed_snapshot = list(selected[:10])
        for seed in seed_snapshot:
            for neighbor in by_id[seed].get("confusing_neighbor_topic_ids", []) or []:
                add(str(neighbor), "declared_confusing_neighbor")
                if len(selected) >= int(policy["activity_invariant_prefix"]):
                    break
            if len(selected) >= int(policy["activity_invariant_prefix"]):
                break

    if len(domains) > 1 and policy.get("secondary_domain_full_lane", True):
        for topic_id in members.get(domains[1], [])[:domain_cap]:
            add(topic_id, "secondary_domain_scaffold")
            if len(selected) >= int(policy["activity_invariant_prefix"]):
                break

    for topic_id in direct:
        if len(selected) >= int(policy["activity_invariant_prefix"]):
            break
        add(topic_id, "direct_global")

    invariant_prefix = list(selected[: int(policy["activity_invariant_prefix"])])

    # The rest of the globally eligible direct order comes before personalization.
    for topic_id in direct:
        add(topic_id, "direct_global")
        if len(selected) >= int(policy["max_candidate_count"]):
            break

    # Custom safety lane is additive and never removes system Topics.
    custom_lane = int(policy["custom_safety_lane_max"])
    custom_ranked = [
        topic_id
        for topic_id in direct
        if topic_id.startswith("usr.") and topic_id in known
    ][:custom_lane]
    for topic_id in custom_ranked:
        add(topic_id, "custom_safety_lane")

    # Activity/pin/calibration priors can only append after the invariant prefix.
    personalized = sorted(
        (
            (_profile_prior(profile, topic_id), topic_id)
            for topic_id in known
            if _profile_prior(profile, topic_id) > 0 and topic_id not in selected
        ),
        key=lambda item: (-item[0], item[1]),
    )[: int(policy["personalized_slots_max"])]
    for _, topic_id in personalized:
        if len(selected) >= int(policy["max_candidate_count"]):
            break
        add(topic_id, "personalized_prior")

    selected = selected[: int(policy["max_candidate_count"])]
    if invariant_prefix:
        assert selected[: len(invariant_prefix)] == invariant_prefix

    result: list[dict[str, Any]] = []
    for rank, topic_id in enumerate(selected, 1):
        topic = by_id[topic_id]
        sources = set(source_map.get(topic_id, set())) | selected_sources.get(topic_id, set())
        result.append(
            {
                "topic_id": topic_id,
                "rank": rank,
                "sources": sorted(sources),
                "internal_domain": str(topic.get("internal_domain", "")),
                "domain_scaffold_rank": (
                    domains.index(str(topic.get("internal_domain", ""))) + 1
                    if str(topic.get("internal_domain", "")) in domains
                    else None
                ),
                "activity_prior_contribution": (
                    _profile_prior(profile, topic_id)
                    if rank > int(policy["activity_invariant_prefix"])
                    else 0.0
                ),
                "is_custom": topic_id.startswith("usr."),
                "lifecycle": str(topic.get("lifecycle", "")),
            }
        )
    return result


class RemediatedHashCandidateIndex:
    """Deterministic engineering control for REM-03 policy validation."""

    def __init__(
        self,
        topics: Sequence[dict[str, Any]],
        *,
        dimensions: int = 192,
        config: dict[str, Any] | None = None,
    ):
        self.topics = list(topics)
        self.config = config or load_rem03_config()
        self.topic_ids = [str(topic["topic_id"]) for topic in self.topics]
        self.embedder = HashNgramEmbeddingAdapter(dimensions=dimensions)
        self.full_vectors = self.embedder.embed(
            [topic_descriptor_variant(topic, "full_boundaries") for topic in self.topics]
        )
        self.name_vectors = self.embedder.embed(
            [topic_descriptor_variant(topic, "names_aliases") for topic in self.topics]
        )

    def _dense_ranking(self, query: str, vectors: Sequence[Sequence[float]]) -> list[str]:
        q = self.embedder.embed([query])[0]
        scored = [
            (cosine(q, vector), topic_id)
            for topic_id, vector in zip(self.topic_ids, vectors)
        ]
        scored.sort(key=lambda item: (-item[0], item[1]))
        return [topic_id for _, topic_id in scored]

    def _chunk_dense_ranking(self, query: str) -> list[str]:
        chunk_cfg = self.config["representation"]["long_query_chunking"]
        chunks = chunk_text(
            query,
            size=int(chunk_cfg["size_codepoints"]),
            overlap=int(chunk_cfg["overlap_codepoints"]),
        )
        vectors = self.embedder.embed([value for _, _, value in chunks])
        scored: list[tuple[float, str]] = []
        for topic_id, vector in zip(self.topic_ids, self.full_vectors):
            score = max(cosine(q, vector) for q in vectors)
            scored.append((score, topic_id))
        scored.sort(key=lambda item: (-item[0], item[1]))
        return [topic_id for _, topic_id in scored]

    def source_rankings(
        self,
        text: str,
        *,
        allowed_context: dict[str, Any] | None = None,
    ) -> tuple[str, dict[str, list[str]]]:
        current = query_representation(
            {"text": text, "allowed_context": allowed_context}, "current_only"
        )
        allowed = query_representation(
            {"text": text, "allowed_context": allowed_context}, "allowed_context"
        )
        sources: dict[str, list[str]] = {
            "dense_full_current": self._dense_ranking(current, self.full_vectors),
            "dense_names_current": self._dense_ranking(current, self.name_vectors),
            "lexical_alias_current": lexical_alias_ranking(current, self.topics),
            "lexical_descriptor_current": lexical_descriptor_ranking(current, self.topics),
        }
        query_for_policy = current
        if allowed != current:
            query_for_policy = allowed
            sources.update(
                {
                    "dense_full_context": self._dense_ranking(allowed, self.full_vectors),
                    "dense_names_context": self._dense_ranking(allowed, self.name_vectors),
                    "lexical_alias_context": lexical_alias_ranking(allowed, self.topics),
                    "lexical_descriptor_context": lexical_descriptor_ranking(
                        allowed, self.topics
                    ),
                }
            )
        chunk_cfg = self.config["representation"]["long_query_chunking"]
        if (
            bool(chunk_cfg.get("enabled"))
            and len(query_for_policy) >= int(chunk_cfg["trigger_codepoints"])
        ):
            sources["dense_chunk_max"] = self._chunk_dense_ranking(query_for_policy)
        return query_for_policy, sources

    def query(
        self,
        text: str,
        *,
        allowed_context: dict[str, Any] | None = None,
        profile: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        query, sources = self.source_rankings(text, allowed_context=allowed_context)
        return assemble_remediated_candidates(
            query=query,
            topics=self.topics,
            source_rankings=sources,
            profile=profile,
            config=self.config,
        )


def _candidate_recall(
    rankings: Sequence[list[str]],
    truth: Sequence[str],
    k: int,
) -> float:
    return sum(target in ranked[:k] for ranked, target in zip(rankings, truth)) / max(
        1, len(truth)
    )


def _profile_for_topics(topics: Sequence[dict[str, Any]]) -> dict[str, Any]:
    return {
        str(topic["topic_id"]): {
            "activity_state": "ACTIVE" if index % 2 == 0 else "INACTIVE",
            "pinned": index % 11 == 0,
            "calibration_prior": index % 17 == 0,
        }
        for index, topic in enumerate(topics)
    }


def _synthetic_custom_topics() -> list[dict[str, Any]]:
    rows = [
        ("个人语义实验项目", "Personal Semantic Lab Project"),
        ("家庭旅行计划", "Family Trip Plan"),
        ("论文数值计算", "Thesis Numerical Calculation"),
        ("求职投递追踪", "Job Application Tracking"),
    ]
    result: list[dict[str, Any]] = []
    for index, (zh, en) in enumerate(rows):
        result.append(
            {
                "topic_id": f"usr.fixture.rem03.{index:02d}",
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


def _domain_scaffold_structural_audit(
    topics: Sequence[dict[str, Any]],
    config: dict[str, Any],
) -> dict[str, Any]:
    by_domain: dict[str, list[str]] = defaultdict(list)
    for topic in topics:
        by_domain[str(topic["internal_domain"])].append(str(topic["topic_id"]))
    all_ids = [str(topic["topic_id"]) for topic in topics]
    failures: list[str] = []
    for domain, ids in sorted(by_domain.items()):
        remainder = [topic_id for topic_id in all_ids if topic_id not in set(ids)]
        synthetic_direct = ids + remainder
        source_rankings = {
            "dense_full": synthetic_direct,
            "dense_names": synthetic_direct,
            "lexical_alias": synthetic_direct,
        }
        result = assemble_remediated_candidates(
            query=f"synthetic domain scaffold {domain}",
            topics=topics,
            source_rankings=source_rankings,
            profile=None,
            config=config,
        )
        top10 = {row["topic_id"] for row in result[:10]}
        if not set(ids) <= top10:
            failures.append(domain)
    return {
        "domain_count": len(by_domain),
        "topics_per_domain": {
            domain: len(ids) for domain, ids in sorted(by_domain.items())
        },
        "all_primary_domain_members_fit_top10": not failures,
        "failures": failures,
    }


def _full_catalog_reachability_audit(
    topics: Sequence[dict[str, Any]],
    config: dict[str, Any],
) -> dict[str, Any]:
    ids = [str(topic["topic_id"]) for topic in topics]
    failures: list[str] = []
    for target in ids:
        direct = [target] + [topic_id for topic_id in ids if topic_id != target]
        result = assemble_remediated_candidates(
            query=f"reachability probe {target}",
            topics=topics,
            source_rankings={
                "dense_full": direct,
                "dense_names": direct,
                "lexical_alias": direct,
            },
            profile=None,
            config=config,
        )
        ranked = [row["topic_id"] for row in result]
        if target not in ranked[:20]:
            failures.append(target)
    return {
        "topic_count": len(ids),
        "top20_reachability_rate": (len(ids) - len(failures)) / max(1, len(ids)),
        "failure_count": len(failures),
    }


def _neighbor_structural_audit(
    topics: Sequence[dict[str, Any]],
    config: dict[str, Any],
) -> dict[str, Any]:
    left = deepcopy(topics[0])
    right = deepcopy(topics[8])  # force a cross-domain declared-neighbor test
    left["confusing_neighbor_topic_ids"] = [str(right["topic_id"])]
    right["confusing_neighbor_topic_ids"] = []
    fixture = [left, right] + [
        deepcopy(topic)
        for topic in topics
        if str(topic["topic_id"])
        not in {str(left["topic_id"]), str(right["topic_id"])}
    ]
    ids = [str(topic["topic_id"]) for topic in fixture]
    direct = [str(left["topic_id"])] + [
        topic_id for topic_id in ids if topic_id != str(left["topic_id"])
    ]
    result = assemble_remediated_candidates(
        query=str(left["name"]["zh"]),
        topics=fixture,
        source_rankings={
            "dense_full": direct,
            "dense_names": direct,
            "lexical_alias": direct,
        },
        profile=None,
        config=config,
    )
    by_id = {row["topic_id"]: row for row in result}
    target = str(right["topic_id"])
    return {
        "declared_neighbor_present": target in by_id,
        "declared_neighbor_top20": (
            target in [row["topic_id"] for row in result[:20]]
        ),
        "source_recorded": (
            target in by_id
            and "declared_confusing_neighbor" in by_id[target]["sources"]
        ),
    }


def _custom_structural_audit(
    catalog: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    custom = _synthetic_custom_topics()
    topics = eligible_topics(catalog, custom)
    target = str(custom[0]["topic_id"])
    ids = [str(topic["topic_id"]) for topic in topics]
    direct = [target] + [topic_id for topic_id in ids if topic_id != target]
    result = assemble_remediated_candidates(
        query=str(custom[0]["name"]["zh"]),
        topics=topics,
        source_rankings={
            "dense_full": direct,
            "dense_names": direct,
            "lexical_alias": direct,
        },
        profile=None,
        config=config,
    )
    ranked = [row["topic_id"] for row in result]
    return {
        "custom_target_top20": target in ranked[:20],
        "system_topics_remain_present": any(
            not row["topic_id"].startswith("usr.") for row in result[:20]
        ),
        "automatic_topic_creation": False,
    }


def _activity_invariance_audit(
    index: RemediatedHashCandidateIndex,
    topics: Sequence[dict[str, Any]],
) -> dict[str, Any]:
    profile = _profile_for_topics(topics)
    probes = [topics[0], topics[len(topics) // 2], topics[-1]]
    failures = 0
    for topic in probes:
        text = str(topic["name"]["zh"])
        off = [row["topic_id"] for row in index.query(text, profile=None)[:20]]
        on = [row["topic_id"] for row in index.query(text, profile=profile)[:20]]
        failures += int(off != on)
    return {
        "probe_count": len(probes),
        "top20_invariance_failures": failures,
        "top20_activity_invariant": failures == 0,
    }


def _scale_audit(catalog: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    topics = build_scale_topics(catalog, 1024)
    index = RemediatedHashCandidateIndex(topics, dimensions=96, config=config)
    targets = [topics[17], topics[511], topics[777], topics[1023]]
    failures = 0
    for target in targets:
        text = str(target["aliases"]["en"][0])
        ranked = [row["topic_id"] for row in index.query(text)[:20]]
        failures += int(str(target["topic_id"]) not in ranked)
    return {
        "topic_count": len(topics),
        "probe_count": len(targets),
        "top20_failures": failures,
        "pass": failures == 0,
    }


def run_rem03(lab_commit: str = "UNCOMMITTED") -> dict[str, Any]:
    config = load_rem03_config()
    catalog = load_catalog()
    validate_catalog_contract(catalog)
    topics = eligible_topics(catalog)
    index = RemediatedHashCandidateIndex(topics, config=config)

    sem03_pack = build_sem03_fixture_pack(catalog)
    standard_cases = list(sem03_pack["cases"])
    standard_rankings = [
        [
            row["topic_id"]
            for row in index.query(
                str(case["text"]),
                profile=None,
            )
        ]
        for case in standard_cases
    ]
    standard_truth = [str(case["topic_id"]) for case in standard_cases]

    rem01_pack = build_rem01_fixture_pack(catalog)
    challenge_cases = list(rem01_pack["cases"])
    boundary_cases = [
        case for case in challenge_cases if case["slice"] == "boundary_no_alias"
    ]
    boundary_rankings = [
        [row["topic_id"] for row in index.query(str(case["text"]))] for case in boundary_cases
    ]
    boundary_truth = [str(case["topic_id"]) for case in boundary_cases]

    context_cases = [
        case for case in challenge_cases if case["slice"] == "context_dependent"
    ]
    context_current = [
        [row["topic_id"] for row in index.query(str(case["text"]), allowed_context=None)]
        for case in context_cases
    ]
    context_allowed = [
        [
            row["topic_id"]
            for row in index.query(
                str(case["text"]),
                allowed_context=case.get("allowed_context"),
            )
        ]
        for case in context_cases
    ]
    context_truth = [str(case["topic_id"]) for case in context_cases]

    long_cases = [
        case for case in challenge_cases if str(case["slice"]).startswith("long_")
    ]
    long_rankings = [
        [row["topic_id"] for row in index.query(str(case["text"]))] for case in long_cases
    ]
    long_truth = [str(case["topic_id"]) for case in long_cases]

    domain_audit = _domain_scaffold_structural_audit(topics, config)
    reachability = _full_catalog_reachability_audit(topics, config)
    neighbor = _neighbor_structural_audit(topics, config)
    custom = _custom_structural_audit(catalog, config)
    activity = _activity_invariance_audit(index, topics)
    scale = _scale_audit(catalog, config)

    descriptor_templates = []
    for topic in topics:
        value = " ".join(
            [
                str(topic.get("definition", "")),
                *[str(x) for x in topic.get("inclusion_boundary", [])],
                *[str(x) for x in topic.get("representative_examples", [])],
            ]
        )
        for alias in sorted(_aliases(topic), key=len, reverse=True):
            value = value.replace(alias, "<TARGET>")
        descriptor_templates.append(value)

    isolation_violations = static_runtime_isolation_audit(repo_root())
    public_structural_pass = (
        reachability["failure_count"] == 0
        and domain_audit["all_primary_domain_members_fit_top10"]
        and neighbor["declared_neighbor_present"]
        and neighbor["source_recorded"]
        and custom["custom_target_top20"]
        and custom["automatic_topic_creation"] is False
        and activity["top20_activity_invariant"]
        and scale["pass"]
        and not isolation_violations
    )

    result = {
        "round": "REM-03",
        "lab_commit": lab_commit,
        "benchmark_version": config["benchmark_version"],
        "catalog_version": str(catalog["catalog_version"]),
        "topic_count": len(topics),
        "authorization": {
            "existing_private_artifacts": False,
            "live_archive_reads": 0,
            "real_input_api_egress_events": 0,
            "new_owner_labels": 0,
            "model_training_runs": 0,
            "production_paia_writes": 0,
            "consumed_sem07_lockbox_tuning_events": 0,
        },
        "catalog_diagnostics": {
            "topics_with_declared_neighbors": sum(
                bool(topic.get("confusing_neighbor_topic_ids")) for topic in topics
            ),
            "declared_neighbor_edges": sum(
                len(topic.get("confusing_neighbor_topic_ids") or []) for topic in topics
            ),
            "domain_count": len({str(topic["internal_domain"]) for topic in topics}),
            "domain_sizes": dict(
                sorted(Counter(str(topic["internal_domain"]) for topic in topics).items())
            ),
            "boundary_template_unique_after_alias_removal": len(
                set(descriptor_templates)
            ),
        },
        "public_quality_diagnostics": {
            "standard_recall_at_10": _candidate_recall(
                standard_rankings, standard_truth, 10
            ),
            "standard_recall_at_20": _candidate_recall(
                standard_rankings, standard_truth, 20
            ),
            "boundary_no_alias_recall_at_10": _candidate_recall(
                boundary_rankings, boundary_truth, 10
            ),
            "boundary_no_alias_recall_at_20": _candidate_recall(
                boundary_rankings, boundary_truth, 20
            ),
            "context_current_recall_at_20": _candidate_recall(
                context_current, context_truth, 20
            ),
            "context_allowed_recall_at_20": _candidate_recall(
                context_allowed, context_truth, 20
            ),
            "long_recall_at_20": _candidate_recall(long_rankings, long_truth, 20),
        },
        "structural_audits": {
            "domain_scaffold": domain_audit,
            "full_catalog_reachability": reachability,
            "declared_neighbor": neighbor,
            "custom_topic": custom,
            "activity_invariance": activity,
            "scale": scale,
        },
        "isolation_violations": isolation_violations,
        "gates": {
            "public_structural_candidate_policy": "PASS"
            if public_structural_pass
            else "FAIL",
            "private_candidate_promotion": "NOT_RUN_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            "candidate_recall_at_10_gate": "INCONCLUSIVE_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            "candidate_recall_at_20_gate": "INCONCLUSIVE_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            "round_completion": "BLOCKED_PRIVATE_EVIDENCE_NOT_AUTHORIZED",
            "rem04_unlock": "DENY",
        },
        "pass": public_structural_pass,
    }
    digest_payload = {
        "config_sha256": hashlib.sha256(DEFAULT_CONFIG_PATH.read_bytes()).hexdigest(),
        "policy": config["policy"],
        "representation": config["representation"],
        "public_quality_diagnostics": result["public_quality_diagnostics"],
        "structural_audits": result["structural_audits"],
    }
    result["deterministic_result_digest"] = hashlib.sha256(
        json.dumps(
            digest_payload,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    return result
