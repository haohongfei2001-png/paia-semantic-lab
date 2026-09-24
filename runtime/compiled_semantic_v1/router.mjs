import { isContentPoorContinuation, normalizeText, splitClauses } from "../lightweight_router_v1/router.mjs";

const ACK = new Set(["好", "好的", "嗯", "谢谢", "收到", "ok", "okay", "thanks"]);

function matches(text, phrase) {
  if (!phrase) return false;
  if (/\p{Script=Han}/u.test(phrase)) return text.includes(phrase);
  const escaped = phrase.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
  return new RegExp("(^|[^a-z0-9])" + escaped + "($|[^a-z0-9])", "u").test(text);
}

function evidenceFor(text, index, minimumWeight) {
  const normalized = normalizeText(text);
  const scores = new Map();
  const evidence = new Map();
  for (const [phrase, topicId, weight] of index.terms) {
    if (weight < minimumWeight || !matches(normalized, phrase)) continue;
    const specificity = Math.min(1, Array.from(phrase).length / 12);
    const score = weight + specificity;
    if (score > (scores.get(topicId) ?? 0)) {
      scores.set(topicId, score);
      evidence.set(topicId, phrase);
    }
  }
  return [...scores].map(([topic_id, score]) => ({ topic_id, score, phrase: evidence.get(topic_id) }))
    .sort((a, b) => b.score - a.score || a.topic_id.localeCompare(b.topic_id));
}

export function createCompiledRouter(index, policy = {}) {
  if (index.format !== "csl-compact-index-v1" || index.topic_count !== 144 ||
      index.topic_ids.length !== 144 || index.topic_names.length !== 144) {
    throw new Error("Invalid CSL catalog/index");
  }
  const minimumWeight = Number(policy.minimumWeight ?? 2);
  const margin = Number(policy.margin ?? 0.25);
  if (![2, 3].includes(minimumWeight) || margin < 0) throw new Error("Invalid global policy");

  function classify(input) {
    const current = String(input.current ?? "");
    const normalized = normalizeText(current);
    if (!normalized || ACK.has(normalized)) {
      return { state: "UNASSIGNED", topics: [], reason: "NO_ARCHIVABLE_CURRENT_CONTENT" };
    }
    if (isContentPoorContinuation(current)) {
      const recent = (input.recent_user_inputs ?? []).slice(-3).reverse();
      for (const previous of recent) {
        const top = decide(evidenceFor(previous, index, minimumWeight));
        if (top) return { state: "ASSIGNED", topics: [top.topic_id], reason: "CLEAR_RECENT_CONTINUATION" };
      }
      const title = decide(evidenceFor(input.title ?? "", index, minimumWeight));
      return title
        ? { state: "ASSIGNED", topics: [title.topic_id], reason: "CLEAR_TITLE_CONTINUATION" }
        : { state: "DEFER", topics: [], reason: "AMBIGUOUS_CONTINUATION" };
    }
    const topics = [];
    const evidence = [];
    for (const clause of splitClauses(current)) {
      const ranked = evidenceFor(clause, index, minimumWeight);
      const top = decide(ranked);
      if (top && !topics.includes(top.topic_id)) {
        topics.push(top.topic_id);
        evidence.push({ source: "current", topic_id: top.topic_id, phrase: top.phrase, score: top.score });
      }
    }
    return topics.length
      ? { state: "ASSIGNED", topics, reason: "CURRENT_EVIDENCE", evidence }
      : { state: "DEFER", topics: [], reason: "INSUFFICIENT_OR_COMPETING_EVIDENCE", evidence: [] };
  }

  function decide(ranked) {
    if (!ranked.length) return null;
    if (ranked.length > 1 && ranked[0].score - ranked[1].score < margin) return null;
    return ranked[0];
  }

  return { classify, topicCount: 144, policy: { minimumWeight, margin } };
}
