from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
CATALOG = Path("catalog/system_topic_catalog_v0.2.yaml")
MANIFEST = Path("artifacts/compiled-semantic-lexicon-v1/CSL-00_EVALUATOR_MANIFEST.json")


def restricted_manifest(root: Path = ROOT) -> dict:
    # The evaluator's sole source is the formal catalog. In particular, do not
    # read profiles, aliases, examples, generated expressions or old fixtures.
    raw = (root / CATALOG).read_bytes()
    catalog = yaml.safe_load(raw)
    topics = [
        {
            "topic_id": row["topic_id"],
            "name": {"zh": row["name"]["zh"], "en": row["name"]["en"]},
            "definition": row["definition"],
            "inclusion_boundary": row["inclusion_boundary"],
            "exclusion_boundary": row["exclusion_boundary"],
        }
        for row in catalog["topics"]
        if row["lifecycle"] == "ACTIVE"
    ]
    if len(topics) != 144 or len({row["topic_id"] for row in topics}) != 144:
        raise ValueError("Expected 144 unique active formal Topics")
    return {
        "format": "csl-restricted-evaluator-manifest-v1",
        "catalog_version": catalog["catalog_version"],
        "catalog_sha256": hashlib.sha256(raw).hexdigest(),
        "topic_count": len(topics),
        "topics": topics,
    }


def render(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = render(restricted_manifest())
    path = ROOT / MANIFEST
    if args.check:
        if path.read_text(encoding="utf-8") != expected:
            raise SystemExit("CSL-00 evaluator manifest differs from formal catalog")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(expected, encoding="utf-8")


if __name__ == "__main__":
    main()
