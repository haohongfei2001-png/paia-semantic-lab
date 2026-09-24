const HAN_RE = /\p{Script=Han}+/gu;
const LATIN_WORD_RE = /[\p{Script=Latin}\p{N}]+/gu;

export const LSR01_CONSTANTS = Object.freeze({
  recentMax: 3,
  recentDecay: Object.freeze([1.0, 0.5, 0.25]),
  titleRelativeSupport: 0.5,
  ordinaryContextBonus: 0.2,
  competitionMargin: 0.10,
  bm25: Object.freeze({ k1: 1.2, b: 0.75 }),
});

const ACKNOWLEDGEMENTS = new Set([
  "好", "好的", "嗯", "嗯嗯", "谢谢", "收到", "明白了", "知道了",
  "ok", "okay", "thanks", "thankyou",
]);

const CONTINUATIONS = new Set([
  "继续", "继续吧", "接着", "接着说", "然后呢", "这个", "这个呢",
  "那这个呢", "做", "继续这个", "这个怎么样", "那这个怎么样",
]);

const AMBIGUOUS_REFERENCE_RE = /(第[一二三四五六七八九十0-9]+个|前者|后者|第二个|第三个)/u;

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/([\p{L}])[-‐‑–—]([\p{L}])/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function compactControlText(value) {
  return normalizeText(value).replace(/[\p{P}\p{S}\s]+/gu, "");
}

export function isContentPoorContinuation(value) {
  return CONTINUATIONS.has(compactControlText(value));
}

function isAcknowledgement(value) {
  return ACKNOWLEDGEMENTS.has(compactControlText(value));
}

export function splitClauses(value) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return text
    .split(/[。！？!?；;\n]+|[，,](?=\s*(?:然后|再|同时|并且|另外|接着))/u)
    .map((row) => row.replace(/^(?:然后|再|同时|并且|另外|接着)\s*/u, "").trim())
    .filter(Boolean);
}

function featuresForText(value) {
  const text = normalizeText(value);
  const features = new Set();

  for (const run of text.match(HAN_RE) ?? []) {
    const chars = Array.from(run);
    for (const n of [2, 3]) {
      for (let i = 0; i + n <= chars.length; i += 1) {
        features.add("z" + n + ":" + chars.slice(i, i + n).join(""));
      }
    }
  }

  for (const word of text.match(LATIN_WORD_RE) ?? []) {
    if (word.length > 1 || /^\d+$/u.test(word)) {
      features.add("w:" + word);
    }
  }

  return features;
}

function phraseContains(haystackRaw, needleRaw) {
  const haystack = normalizeText(haystackRaw);
  const needle = normalizeText(needleRaw);
  if (!needle) return false;

  if (/\p{Script=Han}/u.test(needle)) {
    return haystack.includes(needle);
  }

  const escaped = needle.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
  const pattern = new RegExp("(^|[^a-z0-9])" + escaped + "($|[^a-z0-9])", "u");
  return pattern.test(haystack);
}

function phraseSpecificity(phrase, canonical) {
  const normalized = normalizeText(phrase);
  if (!normalized) return 0;
  if (canonical.has(normalized)) return 1.0;
  if (/\p{Script=Han}/u.test(normalized)) {
    const count = Array.from(normalized.replace(/[^\p{Script=Han}]/gu, "")).length;
    return count >= 2 ? 0.90 : 0.45;
  }
  const words = normalized.match(LATIN_WORD_RE) ?? [];
  return words.length >= 2 ? 0.90 : 0.55;
}

function exactEvidence(text, topic) {
  let best = 0;
  const matches = [];
  for (const entry of topic._phrases) {
    if (!phraseContains(text, entry.text)) continue;
    best = Math.max(best, entry.strength);
    matches.push({
      type: "phrase",
      phrase: entry.text,
      field: entry.field,
      strength: entry.strength,
    });
  }
  return { score: best, matches };
}

function weightedNorm(featureSet, idf, unknownWeight) {
  let sum = 0;
  for (const feature of featureSet) {
    const weight = idf.get(feature) ?? unknownWeight;
    sum += weight * weight;
  }
  return Math.sqrt(sum);
}

function tfidfFieldScore(queryFeatures, field, idf, unknownWeight) {
  if (!queryFeatures.size || !field.features.size || field.norm === 0) {
    return { score: 0, overlaps: [] };
  }
  const qNorm = weightedNorm(queryFeatures, idf, unknownWeight);
  if (!qNorm) return { score: 0, overlaps: [] };

  let dot = 0;
  const overlaps = [];
  for (const feature of queryFeatures) {
    if (!field.features.has(feature)) continue;
    const weight = idf.get(feature) ?? 0;
    if (weight <= 0) continue;
    dot += weight * weight;
    overlaps.push({ feature, idf: weight });
  }
  return {
    score: field.norm ? dot / (qNorm * field.norm) : 0,
    overlaps,
  };
}

function bm25FieldScore(queryFeatures, field, bm25Idf, unknownBm25, avgLen, constants) {
  if (!queryFeatures.size || !field.features.size) {
    return { score: 0, overlaps: [] };
  }
  const k1 = constants.bm25.k1;
  const b = constants.bm25.b;
  const dl = field.features.size;
  const lengthNorm = 1 - b + b * (dl / Math.max(avgLen, 1));
  let raw = 0;
  let possible = 0;
  const overlaps = [];

  for (const feature of queryFeatures) {
    const idf = bm25Idf.get(feature) ?? unknownBm25;
    possible += idf;
    if (!field.features.has(feature)) continue;
    const contribution = idf * ((k1 + 1) / (1 + k1 * lengthNorm));
    raw += contribution;
    overlaps.push({ feature, idf });
  }

  return {
    score: possible > 0 ? clamp(raw / possible, 0, 1) : 0,
    overlaps,
  };
}

function meaningfulSparseEvidence(overlaps) {
  return overlaps.some((row) => row.idf >= 1.0);
}

function buildTopicRuntime(topic, canonicalSet) {
  const phraseRows = [];
  for (const [lang, values] of Object.entries(topic.fields.names_anchors)) {
    for (const text of values) {
      phraseRows.push({
        text,
        field: "names_anchors." + lang,
        strength: phraseSpecificity(text, canonicalSet),
      });
    }
  }

  const seen = new Set();
  const phrases = [];
  for (const row of phraseRows.sort((a, b) => b.text.length - a.text.length)) {
    const key = normalizeText(row.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    phrases.push(row);
  }

  const fields = [];
  for (const [fieldName, languageRows] of Object.entries(topic.fields)) {
    for (const [lang, values] of Object.entries(languageRows)) {
      fields.push({
        name: fieldName + "." + lang,
        features: featuresForText(values.join(" ")),
        norm: 0,
      });
    }
  }

  return { ...topic, _phrases: phrases, _fields: fields };
}

function prepareIndex(index, constants) {
  if (index.format !== "paia-lightweight-topic-index-v1") {
    throw new Error("Unsupported lightweight Topic index format");
  }
  if (index.topic_count !== 144 || index.topics.length !== 144) {
    throw new Error("LSR-01 requires exactly 144 Topics");
  }

  const topics = index.topics.map((topic) => {
    const canonical = new Set([
      normalizeText(topic.names.zh),
      normalizeText(topic.names.en),
    ]);
    return buildTopicRuntime(topic, canonical);
  });

  const df = new Map();
  for (const topic of topics) {
    const union = new Set();
    for (const field of topic._fields) {
      for (const feature of field.features) union.add(feature);
    }
    for (const feature of union) {
      df.set(feature, (df.get(feature) ?? 0) + 1);
    }
  }

  const N = topics.length;
  const idf = new Map();
  const bm25Idf = new Map();
  for (const [feature, count] of df.entries()) {
    idf.set(feature, Math.log((N + 1) / (count + 1)));
    bm25Idf.set(feature, Math.log(1 + (N - count + 0.5) / (count + 0.5)));
  }
  const unknownWeight = Math.log(N + 1);
  const unknownBm25 = Math.log(1 + (N + 0.5) / 0.5);

  let totalFieldLength = 0;
  let fieldCount = 0;
  for (const topic of topics) {
    for (const field of topic._fields) {
      let sum = 0;
      for (const feature of field.features) {
        const weight = idf.get(feature) ?? 0;
        sum += weight * weight;
      }
      field.norm = Math.sqrt(sum);
      totalFieldLength += field.features.size;
      fieldCount += 1;
    }
  }

  return {
    index,
    topics,
    idf,
    bm25Idf,
    unknownWeight,
    unknownBm25,
    avgFieldLength: totalFieldLength / Math.max(fieldCount, 1),
    constants,
  };
}

function scoreTopic(text, topic, candidate, prepared) {
  const exact = exactEvidence(text, topic);
  if (candidate === "A") {
    return {
      topic_id: topic.topic_id,
      score: exact.score,
      eligible: exact.score > 0,
      exact: exact.matches,
      sparse: [],
    };
  }

  const queryFeatures = featuresForText(text);
  let bestSparse = { score: 0, overlaps: [], field: null };
  for (const field of topic._fields) {
    const row = candidate === "C"
      ? bm25FieldScore(
          queryFeatures,
          field,
          prepared.bm25Idf,
          prepared.unknownBm25,
          prepared.avgFieldLength,
          prepared.constants,
        )
      : tfidfFieldScore(
          queryFeatures,
          field,
          prepared.idf,
          prepared.unknownWeight,
        );
    if (row.score > bestSparse.score) {
      bestSparse = { ...row, field: field.name };
    }
  }

  const sparseEligible = bestSparse.score > 0.02
    && meaningfulSparseEvidence(bestSparse.overlaps);

  return {
    topic_id: topic.topic_id,
    score: Math.max(exact.score, bestSparse.score),
    eligible: exact.score > 0 || sparseEligible,
    exact: exact.matches,
    sparse: bestSparse.overlaps
      .sort((a, b) => b.idf - a.idf)
      .slice(0, 8),
    sparse_field: bestSparse.field,
  };
}

function scoreAll(text, candidate, prepared) {
  return prepared.topics
    .map((topic) => scoreTopic(text, topic, candidate, prepared))
    .sort((a, b) => b.score - a.score || a.topic_id.localeCompare(b.topic_id));
}

function contextSupport(topicId, title, recent, candidate, prepared) {
  let support = 0;
  const limitedRecent = (recent ?? []).slice(-prepared.constants.recentMax).reverse();

  for (let index = 0; index < limitedRecent.length; index += 1) {
    const text = limitedRecent[index];
    if (isContentPoorContinuation(text) || isAcknowledgement(text)) continue;
    const row = scoreAll(text, candidate, prepared)
      .find((entry) => entry.topic_id === topicId);
    if (row?.eligible) {
      support = Math.max(
        support,
        row.score * prepared.constants.recentDecay[index],
      );
    }
  }

  if (title) {
    const row = scoreAll(title, candidate, prepared)
      .find((entry) => entry.topic_id === topicId);
    if (row?.eligible) {
      support = Math.max(
        support,
        row.score * prepared.constants.titleRelativeSupport,
      );
    }
  }

  return clamp(support, 0, 1);
}

function classifyClause(clause, context, candidate, threshold, prepared) {
  const scored = scoreAll(clause, candidate, prepared).filter((row) => row.eligible);
  if (!scored.length) {
    return { assigned: null, reason: "NO_CURRENT_EVIDENCE", ranking: [] };
  }

  const withContext = scored.map((row) => {
    const h = contextSupport(
      row.topic_id,
      context.title,
      context.recent_user_inputs,
      candidate,
      prepared,
    );
    const bonus = prepared.constants.ordinaryContextBonus * h;
    return {
      ...row,
      context_support: h,
      score_with_context: clamp(row.score + bonus, 0, 1.2),
    };
  }).sort((a, b) =>
    b.score_with_context - a.score_with_context
    || a.topic_id.localeCompare(b.topic_id)
  );

  const top = withContext[0];
  const second = withContext[1];
  if (top.score_with_context < threshold) {
    return { assigned: null, reason: "BELOW_THRESHOLD", ranking: withContext };
  }
  if (
    second
    && second.score_with_context >= threshold
    && top.score_with_context - second.score_with_context
      < prepared.constants.competitionMargin
  ) {
    return { assigned: null, reason: "COMPETING_INTERPRETATIONS", ranking: withContext };
  }

  return { assigned: top, reason: "ASSIGNED", ranking: withContext };
}

function classifyStandalone(text, candidate, threshold, prepared) {
  const labels = [];
  const clauseEvidence = [];
  let hadEvidence = false;

  for (const clause of splitClauses(text)) {
    const result = classifyClause(
      clause,
      { title: "", recent_user_inputs: [] },
      candidate,
      threshold,
      prepared,
    );
    clauseEvidence.push({ clause, ...result });
    if (result.ranking.length) hadEvidence = true;
    if (result.assigned && !labels.includes(result.assigned.topic_id)) {
      labels.push(result.assigned.topic_id);
    }
  }

  return { labels, clauseEvidence, hadEvidence };
}

function continuationDecision(input, candidate, threshold, prepared) {
  const current = String(input.current ?? "");
  if (AMBIGUOUS_REFERENCE_RE.test(current)) {
    return { state: "DEFER", topics: [], reason: "AMBIGUOUS_REFERENCE", evidence: [] };
  }

  const recent = (input.recent_user_inputs ?? [])
    .slice(-prepared.constants.recentMax)
    .reverse();

  for (const row of recent) {
    if (!row || isContentPoorContinuation(row) || isAcknowledgement(row)) continue;
    const standalone = classifyStandalone(row, candidate, threshold, prepared);
    if (standalone.labels.length === 1) {
      return {
        state: "ASSIGNED",
        topics: standalone.labels,
        reason: "RECENT_CONTENT_ANCHOR",
        evidence: [{ source: "recent", text: row, inherited: true, chainable: false }],
      };
    }
  }

  if (input.title) {
    const standalone = classifyStandalone(
      String(input.title),
      candidate,
      Math.max(threshold, 0.80),
      prepared,
    );
    if (standalone.labels.length === 1) {
      return {
        state: "ASSIGNED",
        topics: standalone.labels,
        reason: "TITLE_ONLY_FALLBACK",
        evidence: [{
          source: "title",
          text: String(input.title),
          inherited: true,
          chainable: false,
        }],
      };
    }
  }

  return {
    state: "DEFER",
    topics: [],
    reason: "NO_UNAMBIGUOUS_CONTINUATION_ANCHOR",
    evidence: [],
  };
}

export function createRouter(index, overrides = {}) {
  const constants = {
    ...LSR01_CONSTANTS,
    ...overrides,
    bm25: { ...LSR01_CONSTANTS.bm25, ...(overrides.bm25 ?? {}) },
  };
  const prepared = prepareIndex(index, constants);

  function classify(input, options = {}) {
    const candidate = options.candidate ?? "B";
    const threshold = Number(options.threshold ?? 0.50);
    if (!["A", "B", "C"].includes(candidate)) {
      throw new Error("Unknown LSR-01 candidate: " + candidate);
    }

    const current = String(input.current ?? "");
    if (!current.trim() || isAcknowledgement(current)) {
      return {
        state: "UNASSIGNED",
        topics: [],
        reason: "NO_ARCHIVABLE_CURRENT_CONTENT",
        evidence: [],
      };
    }

    if (isContentPoorContinuation(current)) {
      return continuationDecision(input, candidate, threshold, prepared);
    }

    const labels = [];
    const evidence = [];
    let anyEvidence = false;

    for (const clause of splitClauses(current)) {
      const result = classifyClause(
        clause,
        {
          title: String(input.title ?? ""),
          recent_user_inputs: input.recent_user_inputs ?? [],
        },
        candidate,
        threshold,
        prepared,
      );
      if (result.ranking.length) anyEvidence = true;
      if (result.assigned && !labels.includes(result.assigned.topic_id)) {
        labels.push(result.assigned.topic_id);
        evidence.push({
          source: "current",
          clause,
          topic_id: result.assigned.topic_id,
          direct_score: result.assigned.score,
          context_support: result.assigned.context_support,
          score: result.assigned.score_with_context,
          exact: result.assigned.exact,
          sparse: result.assigned.sparse,
          sparse_field: result.assigned.sparse_field,
        });
      }
    }

    if (labels.length) {
      return { state: "ASSIGNED", topics: labels, reason: "CURRENT_EVIDENCE", evidence };
    }

    return {
      state: "DEFER",
      topics: [],
      reason: anyEvidence ? "INSUFFICIENT_OR_COMPETING_EVIDENCE" : "NO_TOPIC_EVIDENCE",
      evidence: [],
    };
  }

  function rank(text, options = {}) {
    const candidate = options.candidate ?? "B";
    const limit = Number(options.limit ?? 20);
    return scoreAll(text, candidate, prepared)
      .slice(0, limit)
      .map((row) => ({
        topic_id: row.topic_id,
        score: row.score,
        eligible: row.eligible,
      }));
  }

  return { classify, rank, topicCount: prepared.topics.length, constants };
}
