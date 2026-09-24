from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
CATALOG = Path("catalog/system_topic_catalog_v0.2.yaml")
PROFILES = Path("semantic_profiles/v0.1/manifest.json")
AUTHORED = Path("lexicon/compiled_semantic_v1/authored.tsv")
OUTPUT = Path("artifacts/compiled-semantic-lexicon-v1")
GENERIC = {"问题", "事情", "计划", "学习", "工作", "生活", "帮助", "信息", "管理", "support", "plan", "work", "study", "help", "management"}


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text).casefold()).strip(" .。,:：;；、\"' ")


def family_key(text: str) -> str:
    # Phrase-family near-dedupe: spacing/punctuation variants carry no new
    # semantic evidence. Preserve words and Han characters, not syntax marks.
    return "".join(char for char in text if char.isalnum())


def render(obj: object) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"


def profiles(root: Path) -> dict[str, dict]:
    manifest = json.loads((root / PROFILES).read_text(encoding="utf-8"))
    rows = {}
    for shard in manifest["shards"]:
        for row in json.loads((root / shard["path"]).read_text(encoding="utf-8"))["profiles"]:
            rows[row["topic_id"]] = row
    return rows


def authored_rows(root: Path, topic_ids: set[str]) -> list[dict]:
    rows = []
    seen = set()
    for line_number, raw in enumerate((root / AUTHORED).read_text(encoding="utf-8").splitlines(), 1):
        topic_id, zh, en = raw.split("\t")
        if topic_id not in topic_ids or topic_id in seen:
            raise ValueError(f"Invalid authored Topic on line {line_number}: {topic_id}")
        seen.add(topic_id)
        for language, phrase in (("zh", zh), ("en", en)):
            rows.append({"topic_id": topic_id, "text": norm(phrase),
                         "source_class": "natural_expression", "family": "catalog_authored." + language,
                         "source_span": f"{AUTHORED}:{line_number}:{language}", "weight": 3,
                         "generator_mode": "model_authored_catalog_only_v1"})
    if seen != topic_ids:
        raise ValueError(f"Authored expressions cover {len(seen)} of {len(topic_ids)} Topics")
    return rows


def source_rows(formal: dict, profile: dict) -> list[dict]:
    topic_id = formal["topic_id"]
    rows = []

    def add(value: str, source_class: str, family: str, weight: int) -> None:
        text = norm(value)
        if text:
            rows.append({"topic_id": topic_id, "text": text, "source_class": source_class,
                         "family": family, "source_span": family + ":" + hashlib.sha256(value.encode()).hexdigest()[:12],
                         "weight": weight, "generator_mode": "public_profile_extraction_v1"})

    # Preserve authored public semantic phrases without mechanically filling a
    # quota with templates. Further natural-expression authorship remains a
    # measured DEV expansion, rather than asserting that aliases are paraphrases.
    for language in ("zh", "en"):
        for value in profile["semantic_core"]:
            if bool(re.search(r"[\u3400-\u9fff]", value)) != (language == "zh"):
                continue
            tail = re.split(r"[:：]", value, maxsplit=1)[-1]
            for phrase in re.split(r"[,，、;；。]", tail):
                add(phrase, "natural_expression", "semantic_core." + language, 2)
        for value in profile["positive_intents"]:
            if bool(re.search(r"[\u3400-\u9fff]", value)) != (language == "zh"):
                continue
            match = re.search(r"(?:常见线索包括|with signals such as)\s*(.+?)[。.]?$", value, re.I)
            if match:
                for phrase in re.split(r"[,，、;；]", match.group(1)):
                    add(phrase, "natural_expression", "positive_intent." + language, 2)
        add(formal["name"][language], "cross_lingual_form", "canonical." + language, 3)
        for phrase in profile["lexical_anchors"].get(language, []):
            add(phrase, "cross_lingual_form", "lexical_anchor." + language, 2)
        for phrase in formal.get("aliases", {}).get(language, []):
            add(phrase, "cross_lingual_form", "formal_alias." + language, 2)

    # Contrastive evidence is retained for auditing, never silently compiled
    # as a positive phrase. Generic boilerplate exclusions are not executable.
    for neighbor in profile.get("contrastive_neighbors", []):
        rows.append({"topic_id": topic_id, "text": str(neighbor), "source_class": "contrastive",
                     "family": "neighbor", "source_span": "contrastive_neighbors:" + str(neighbor),
                     "weight": 0, "generator_mode": "public_profile_extraction_v1"})
    return rows


def compile_sources(root: Path = ROOT) -> tuple[dict, dict, dict]:
    catalog = yaml.safe_load((root / CATALOG).read_text(encoding="utf-8"))
    public_profiles = profiles(root)
    formal = [row for row in catalog["topics"] if row["lifecycle"] == "ACTIVE"]
    if len(formal) != 144 or set(public_profiles) != {row["topic_id"] for row in formal}:
        raise ValueError("144 Topic profile/catalog identity mismatch")
    raw = [item for row in formal for item in source_rows(row, public_profiles[row["topic_id"]])]
    raw.extend(authored_rows(root, {row["topic_id"] for row in formal}))
    for row in formal:
        domain = row["topic_id"].split(".")[1]
        for peer in formal:
            if peer["topic_id"] == row["topic_id"] or peer["topic_id"].split(".")[1] != domain:
                continue
            for language in ("zh", "en"):
                raw.append({"topic_id": row["topic_id"], "text": norm(peer["name"][language]),
                            "source_class": "contrastive", "family": "same_domain_neighbor." + language,
                            "source_span": "formal:" + peer["topic_id"] + ":name." + language,
                            "weight": 0, "generator_mode": "formal_boundary_comparison_v1"})
    unique = {}
    rejected = []
    for row in raw:
        text = row["text"]
        if row["source_class"] != "contrastive":
            chars = len(re.sub(r"\W", "", text))
            if text in GENERIC or chars < 2 or chars > 80 or ">" in text:
                rejected.append({**row, "reason": "generic_or_low_information"})
                continue
        key = (row["topic_id"], family_key(text))
        if key in unique:
            if row["weight"] > unique[key]["weight"]:
                unique[key] = row
            continue
        unique[key] = row
    retained = sorted(unique.values(), key=lambda x: (x["topic_id"], x["text"], x["source_class"]))
    owners = defaultdict(set)
    for row in retained:
        if row["weight"]:
            owners[family_key(row["text"])].add(row["topic_id"])
    collisions = [{"family_key": key, "topics": sorted(ids)} for key, ids in sorted(owners.items()) if len(ids) > 1]
    contested = {row["family_key"] for row in collisions}
    # A phrase shared by Topics cannot by itself justify assignment.
    terms = []
    for row in retained:
        if row["weight"] and family_key(row["text"]) not in contested:
            terms.append([row["text"], row["topic_id"], row["weight"],
                          0 if row["source_class"] == "natural_expression" else 1])
    source = {"format": "csl-source-v1", "catalog_version": catalog["catalog_version"],
              "input_digests": {
                  str(CATALOG): hashlib.sha256((root / CATALOG).read_bytes()).hexdigest(),
                  str(PROFILES): hashlib.sha256((root / PROFILES).read_bytes()).hexdigest(),
                  str(AUTHORED): hashlib.sha256((root / AUTHORED).read_bytes()).hexdigest(),
                  **{row["path"]: hashlib.sha256((root / row["path"]).read_bytes()).hexdigest()
                     for row in json.loads((root / PROFILES).read_text(encoding="utf-8"))["shards"]},
              },
              "source_classes": ["natural_expression", "cross_lingual_form", "contrastive"],
              "rows": retained}
    digest = hashlib.sha256(render(source).encode()).hexdigest()
    index = {"format": "csl-compact-index-v1", "catalog_version": catalog["catalog_version"],
             "source_sha256": digest, "topic_count": 144, "topic_ids": [x["topic_id"] for x in formal],
             "topic_names": [[x["name"]["zh"], x["name"]["en"]] for x in formal],
             "source_classes": ["natural_expression", "cross_lingual_form"],
             "generator_modes": ["public_profile_extraction_v1", "formal_boundary_comparison_v1",
                                 "model_authored_catalog_only_v1"],
             "terms": sorted(terms)}
    report = {"format": "csl-collision-report-v1", "source_sha256": digest,
              "raw_count": len(raw), "retained_count": len(retained),
              "compiled_count": len(terms), "rejected": rejected, "collisions": collisions,
              "under_target_topic_count": sum(
                  sum(x["topic_id"] == row["topic_id"] and x["weight"] > 0 for x in retained) < 60
                  for row in formal
              ),
              "source_class_counts": {name: sum(x["source_class"] == name for x in retained)
                                      for name in source["source_classes"]}}
    if len(render(index).encode()) > 1048576:
        raise ValueError("Production index exceeds 1 MiB")
    return source, index, report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    values = compile_sources()
    for name, value in zip(("CSL-01_SOURCE.json", "CSL-01_INDEX.json", "CSL-01_COLLISIONS.json"), values):
        path = ROOT / OUTPUT / name
        expected = render(value)
        if args.check:
            if path.read_text(encoding="utf-8") != expected:
                raise SystemExit(f"Non-deterministic CSL-01 artifact: {name}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(expected, encoding="utf-8")


if __name__ == "__main__":
    main()
