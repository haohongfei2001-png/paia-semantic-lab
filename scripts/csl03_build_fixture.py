from __future__ import annotations

import hashlib
import json
import argparse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "artifacts/compiled-semantic-lexicon-v1/CSL-00_EVALUATOR_MANIFEST.json"
AUTHORED = ROOT / "fixtures/compiled_semantic_v1/blind_v1_authored.tsv"
OUTPUT = ROOT / "fixtures/compiled_semantic_v1/blind_v1.json"


def build() -> dict:
    # Evaluator construction has precisely two inputs: the restricted formal
    # manifest and independently authored TEST utterances. Never import or
    # inspect the production candidate, public DEV or historical fixtures.
    manifest_bytes = MANIFEST.read_bytes()
    source_bytes = AUTHORED.read_bytes()
    manifest = json.loads(manifest_bytes)
    formal = manifest["topics"]
    ids = [row["topic_id"] for row in formal]
    authored = {}
    for line in source_bytes.decode("utf-8").splitlines():
        topic_id, zh, en = line.split("\t")
        if topic_id in authored or not zh.strip() or not en.strip():
            raise ValueError("Duplicate/empty evaluator expression: " + topic_id)
        authored[topic_id] = (zh.strip(), en.strip())
    if len(ids) != 144 or set(ids) != set(authored):
        raise ValueError("Evaluator authoring must cover the formal 144 exactly")

    cases = []
    for topic_id in ids:
        for language, text in zip(("zh", "en"), authored[topic_id]):
            cases.append({"id": f"single:{topic_id}:{language}", "kind": "single_label",
                          "family": "independent_natural." + language,
                          "input": {"current": text, "title": "", "recent_user_inputs": []},
                          "gold_topics": [topic_id]})
    # 24 spaced Topic anchors span the catalog's domains, with three distinct
    # context counterfactuals for each. Gold comes from the formal Topic IDs.
    for i in range(0, 144, 6):
        topic_id, next_id = ids[i], ids[(i + 1) % 144]
        current_zh, _ = authored[topic_id]
        _, switched_en = authored[next_id]
        cases.extend([
            {"id": f"context:{i}:stale_title", "kind": "context",
             "family": "strong_current_vs_stale_title",
             "input": {"current": current_zh, "title": formal[(i + 1) % 144]["name"]["zh"],
                       "recent_user_inputs": []}, "gold_topics": [topic_id]},
            {"id": f"context:{i}:continuation", "kind": "context",
             "family": "content_poor_continuation",
             "input": {"current": "继续", "title": formal[i]["name"]["zh"],
                       "recent_user_inputs": []}, "gold_topics": [topic_id]},
            {"id": f"context:{i}:switch", "kind": "context",
             "family": "explicit_topic_switch",
             "input": {"current": switched_en, "title": formal[i]["name"]["zh"],
                       "recent_user_inputs": [current_zh]}, "gold_topics": [next_id]},
        ])
    for i in range(0, 144, 8):
        first, second = ids[i], ids[(i + 73) % 144]
        cases.append({"id": f"multi:{i}", "kind": "multi_label",
                      "family": "two_separate_current_goals",
                      "input": {"current": authored[first][0] + "；然后" + authored[second][0],
                                "title": "", "recent_user_inputs": []},
                      "gold_topics": [first, second]})
    defer_texts = [
        "这件事之后再说", "我还没想好", "刚才那个怎么样", "先放一放", "嗯嗯", "没有具体问题",
        "等我整理一下", "你知道我的意思吧", "随便看看", "这两个选项哪个", "以后再讨论",
        "我今天只是路过", "好吧", "先别分类", "暂时不知道", "就这样", "后面再说", "这个呢",
    ]
    for i, text in enumerate(defer_texts):
        cases.append({"id": f"defer:{i}", "kind": "should_defer", "family": "insufficient_evidence",
                      "input": {"current": text, "title": "", "recent_user_inputs": []},
                      "gold_topics": []})
    assert len(cases) == 396
    return {"format": "csl03-fresh-blind-v1", "source_class": "restricted_formal_manifest_only",
            "evaluator_manifest_sha256": hashlib.sha256(manifest_bytes).hexdigest(),
            "authored_source_sha256": hashlib.sha256(source_bytes).hexdigest(),
            "counts": {"single_label": 288, "context": 72, "multi_label": 18, "should_defer": 18},
            "cases": cases}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    text = json.dumps(build(), ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
    if args.check:
        if OUTPUT.read_text(encoding="utf-8") != text:
            raise SystemExit("Frozen TEST v1 fixture differs from restricted evaluator inputs")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
