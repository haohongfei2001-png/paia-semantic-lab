from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "artifacts/compiled-semantic-lexicon-v1/CSL-00_EVALUATOR_MANIFEST.json"
AUTHORED = ROOT / "fixtures/compiled_semantic_v1/blind_v2_authored.tsv"
OUTPUT = ROOT / "fixtures/compiled_semantic_v1/blind_v2.json"

DEFER = [
    "先这样吧", "我还没想好", "嗯", "随便聊聊", "继续", "好的",
    "What do you think?", "I am not sure yet", "Just checking in",
    "Maybe later", "Could you help?", "Let me think",
    "这个先放一放", "有点复杂", "我再看看",
    "That is interesting", "I will get back to you", "No specific task yet",
]

def build() -> dict:
    # Exactly two file inputs: restricted formal manifest and newly authored
    # utterances. No production index, DEV, TEST v1, or private fixture input.
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    formal = manifest["topics"]
    rows = [line.split("\t") for line in AUTHORED.read_text(encoding="utf-8").splitlines()]
    if len(formal) != 144 or len(rows) != 144 or any(len(row) != 2 or not all(row) for row in rows):
        raise ValueError("Fresh evaluator needs two nonempty expressions for each of 144 Topics")
    cases = []
    for i, item in enumerate(formal):
        topic_id = item["topic_id"]
        for language, text in zip(("zh", "en"), rows[i]):
            if text.strip().casefold() == item["name"][language].strip().casefold():
                raise ValueError("Evaluator expression is only a Topic name")
            cases.append({
                "id": f"single:{i}:{language}", "kind": "single_label",
                "family": f"fresh_natural.{language}",
                "input": {"current": text, "title": "", "recent_user_inputs": []},
                "gold_topics": [topic_id],
            })
    for n in range(24):
        i = n * 6
        j = (i + 1) % 144
        a, b = formal[i]["topic_id"], formal[j]["topic_id"]
        cases.extend([
            {"id": f"context:{n}:stale_title", "kind": "context",
             "family": "current_over_stale_title",
             "input": {"current": rows[i][0], "title": rows[j][1], "recent_user_inputs": []},
             "gold_topics": [a]},
            {"id": f"context:{n}:switch", "kind": "context",
             "family": "explicit_topic_switch",
             "input": {"current": rows[j][1], "title": rows[i][0], "recent_user_inputs": [rows[i][0]]},
             "gold_topics": [b]},
            {"id": f"context:{n}:continuation", "kind": "context",
             "family": "content_poor_continuation",
             "input": {"current": "接着讲", "title": "", "recent_user_inputs": [rows[i][0]]},
             "gold_topics": [a]},
        ])
    for n in range(18):
        i, j = n * 8, (n * 8 + 3) % 144
        cases.append({
            "id": f"multi:{n}", "kind": "multi_label", "family": "two_distinct_goals",
            "input": {"current": rows[i][0] + "；另外，" + rows[j][0], "title": "", "recent_user_inputs": []},
            "gold_topics": [formal[i]["topic_id"], formal[j]["topic_id"]],
        })
    for n, text in enumerate(DEFER):
        cases.append({
            "id": f"defer:{n}", "kind": "should_defer", "family": "insufficient_evidence",
            "input": {"current": text, "title": "", "recent_user_inputs": []},
            "gold_topics": [],
        })
    counts = dict(Counter(item["kind"] for item in cases))
    if counts != {"single_label": 288, "context": 72, "multi_label": 18, "should_defer": 18}:
        raise ValueError("Frozen TEST v2 case counts changed")
    return {"format": "csl04-blind-fixture-v2", "counts": counts, "cases": cases}

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
    if args.check:
        if OUTPUT.read_text(encoding="utf-8") != rendered:
            raise SystemExit("Non-deterministic TEST v2 fixture")
    else:
        OUTPUT.write_text(rendered, encoding="utf-8")

if __name__ == "__main__":
    main()
