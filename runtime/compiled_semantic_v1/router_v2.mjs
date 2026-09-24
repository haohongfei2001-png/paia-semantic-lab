import { isContentPoorContinuation, normalizeText, splitClauses } from "../lightweight_router_v1/router.mjs";
import { createCompiledRouter } from "./router.mjs";

// CSL-04 structural repair: recover evidence from informative subphrases.
// The index and source lexicon are unchanged; consumed TEST v1 text is never read.
const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "what", "when", "where", "would", "could", "should", "have", "your", "their", "about", "into", "some", "which", "help", "need", "make", "how", "why", "can", "does", "are", "was", "will", "如何", "什么", "怎么", "怎样", "需要", "可以", "这个", "这些", "那个", "一个", "是否", "以及", "我们", "他们", "自己", "问题", "事情"]);
const ACK = new Set(["好", "好的", "嗯", "谢谢", "收到", "ok", "okay", "thanks"]);

function tokens(text) {
  const normalized = normalizeText(text);
  const out = new Set();
  for (const run of normalized.match(/[\p{Script=Han}]+/gu) ?? []) {
    for (let i = 0; i + 1 < run.length; i++) {
      const part = run.slice(i, i + 2);
      if (!STOP.has(part)) out.add("h:" + part);
    }
  }
  for (const word of normalized.match(/[a-z][a-z0-9]+/g) ?? []) {
    if (word.length >= 3 && !STOP.has(word)) out.add("e:" + word);
  }
  return out;
}

export function createRepairedRouter(index, policy = {}) {
  const strict = createCompiledRouter(index, { minimumWeight: 3, margin: 0.25 });
  const topicTokens = new Map(index.topic_ids.map(id => [id, new Set()]));
  for (const [phrase, id, weight] of index.terms) {
    if (weight < 2) continue;
    for (const token of tokens(phrase)) topicTokens.get(id).add(token);
  }
  const postings = new Map();
  for (const [id, values] of topicTokens) {
    for (const token of values) {
      if (!postings.has(token)) postings.set(token, []);
      postings.get(token).push(id);
    }
  }

  function sparse(text) {
    const query = tokens(text);
    const scores = new Map();
    const hits = new Map();
    for (const token of query) {
      const owners = postings.get(token) ?? [];
      if (owners.length === 0 || owners.length > 12) continue;
      const rarity = Math.log2(145 / (owners.length + 1));
      for (const id of owners) {
        scores.set(id, (scores.get(id) ?? 0) + rarity);
        hits.set(id, (hits.get(id) ?? 0) + 1);
      }
    }
    const ranked = [...scores].map(([id, score]) => ({ id, score, hits: hits.get(id) }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const top = ranked[0];
    if (!top) return null;
    const second = ranked[1];
    const minScore = policy.minScore ?? 9;
    const minRatio = policy.minRatio ?? 1.6;
    if (top.hits < 2 || top.score < minScore) return null;
    if (second && top.score / second.score < minRatio) return null;
    return top;
  }

  function classify(input) {
    const current = String(input.current ?? "");
    const normalized = normalizeText(current);
    if (!normalized || ACK.has(normalized)) return { state: "UNASSIGNED", topics: [], reason: "NO_ARCHIVABLE_CURRENT_CONTENT" };
    // Continuation keeps the frozen context rule; sparse evidence never revives a stale context.
    if (isContentPoorContinuation(current)) return strict.classify(input);
    const original = strict.classify(input);
    if (original.topics.length) return original;
    const clauses = splitClauses(current);
    if (clauses.length !== 1) return original;
    const best = sparse(clauses[0]);
    return best
      ? { state: "ASSIGNED", topics: [best.id], reason: "SPARSE_CURRENT_EVIDENCE", evidence: [{ source: "current", topic_id: best.id, score: best.score, hits: best.hits }] }
      : original;
  }
  return { classify, topicCount: 144, policy: { minScore: policy.minScore ?? 9, minRatio: policy.minRatio ?? 1.6 } };
}
