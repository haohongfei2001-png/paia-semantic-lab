import { extractGoal } from "./goal_parser.mjs";

const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase()
  .replace(/\s+/gu, " ").trim();
const requestStart = /^\s*(?:please\b|can you\b|could you\b|would you\b|how (?:do|can) i\b|i (?:want|need|plan) to\b|help me\b|请|帮我|我想|我需要|怎么|如何|能否|能不能)/iu;
const incidental = /(?:only quoting|just an example|hypothetical|只是例子|只是背景|不用分类|没有需要处理)/iu;
const noIntent = /^(?:okay|ok|noted|thanks|谢谢|好的|收到|稍后再说)[.!。？?\s]*$/iu;

function contains(span, phrase) {
  if (!phrase) return false;
  if (/^[\x00-\x7f]+$/u.test(phrase)) {
    const escaped = phrase.replace(/[.*+?^$()|[\]{}\\]/gu, "\\$&");
    return new RegExp("(^|[^a-z0-9])" + escaped + "($|[^a-z0-9])", "u").test(span);
  }
  return span.includes(phrase);
}
const defer = reason => ({ topics: [], state: "DEFER", reason });

export function createFrameGrounder(index) {
  if (index?.format !== "cig02e-typed-frame-index-v1" ||
      index.topic_count !== 144 || index.topics?.length !== 144) {
    throw new Error("invalid CIG-02E full-Catalog index");
  }
  const ids = new Set();
  const phraseTopics = new Map();
  const prepared = index.topics.map(topic => {
    if (!topic.topic_id || ids.has(topic.topic_id)) throw new Error("duplicate or missing Topic");
    ids.add(topic.topic_id);
    if (!topic.names?.zh || !topic.names?.en) throw new Error("missing formal name");
    const roles = {};
    for (const role of ["ACTION", "OBJECT", "OUTCOME"]) {
      roles[role] = [];
      for (const lang of ["zh", "en"]) {
        const values = topic.roles?.[role]?.[lang];
        if (!Array.isArray(values) || !values.length) throw new Error("missing typed frame role");
        for (const value of values) {
          const phrase = normalize(value);
          if (!phrase || phrase !== value) throw new Error("invalid normalized phrase");
          roles[role].push({ value: phrase, lang });
          const key = lang + ":" + phrase;
          if (!phraseTopics.has(key)) phraseTopics.set(key, new Set());
          phraseTopics.get(key).add(topic.topic_id);
        }
      }
    }
    return {
      topic_id: topic.topic_id,
      source_frame_path: topic.source_frame_path,
      names: [normalize(topic.names.zh), normalize(topic.names.en)],
      roles
    };
  });
  function classify(input) {
    const current = String(input?.current ?? "").trim();
    if (!current || noIntent.test(current) || incidental.test(current)) return defer("NO_CURRENT_GOAL");
    const goal = extractGoal(current);
    if (!goal && !requestStart.test(current)) return defer("NO_CURRENT_GOAL");
    const span = normalize(goal?.span ?? current);
    if (!span) return defer("EMPTY_GOAL");
    const nameHits = prepared.filter(topic => topic.names.some(name => contains(span, name)));
    if (nameHits.length > 1) return defer("COMPETING_FORMAL_NAMES");
    if (nameHits.length === 1) {
      const topic = nameHits[0];
      return {
        topics: [topic.topic_id], state: "ASSIGNED",
        goal_source: goal ? "EXPLICIT_GOAL_SPAN" : "CURRENT_REQUEST",
        evidence: { rule: "EXACT_FORMAL_NAME", source_frame_path: topic.source_frame_path }
      };
    }
    const qualified = [];
    for (const topic of prepared) {
      const hits = {};
      let distinct = false;
      for (const role of ["ACTION", "OBJECT", "OUTCOME"]) {
        hits[role] = topic.roles[role].filter(atom => contains(span, atom.value));
        if (hits[role].some(atom =>
          phraseTopics.get(atom.lang + ":" + atom.value).size === 1)) distinct = true;
      }
      if (!hits.OBJECT.length || !(hits.ACTION.length || hits.OUTCOME.length) || !distinct) continue;
      qualified.push({
        topic_id: topic.topic_id,
        source_frame_path: topic.source_frame_path,
        roles: Object.fromEntries(["ACTION", "OBJECT", "OUTCOME"].map(role =>
          [role, hits[role].map(atom => atom.value)]))
      });
    }
    if (qualified.length !== 1) return defer(qualified.length ? "COMPETING_TYPED_FRAMES" : "INSUFFICIENT_TYPED_EVIDENCE");
    const winner = qualified[0];
    return {
      topics: [winner.topic_id], state: "ASSIGNED",
      goal_source: goal ? "EXPLICIT_GOAL_SPAN" : "CURRENT_REQUEST",
      evidence: { rule: "UNIQUE_TYPED_FRAME_COMPOSITION",
        source_frame_path: winner.source_frame_path, matched_roles: winner.roles }
    };
  }
  return { classify };
}
