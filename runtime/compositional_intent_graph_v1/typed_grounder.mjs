import { extractGoal } from "./goal_parser.mjs";

const lower = value => String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
function contains(span, atom) {
  if (!atom) return false;
  if (/^[\x00-\x7f]+$/u.test(atom)) {
    const escaped = atom.replace(/[.*+?^$()|[\]{}\\]/gu, "\\$&");
    return new RegExp("(^|[^a-z0-9])" + escaped + "($|[^a-z0-9])", "u").test(span);
  }
  return span.includes(atom);
}
const noIntent = /^(?:okay|ok|noted|thanks|谢谢|好的|收到|稍后再说)[.!。？?\s]*$/iu;
const quotedOnly = /(?:only quoting|just an example|只是例子|只是背景|不用分类|没有需要处理|hypothetical)/iu;

export function createTypedGrounder(index, policy = "balanced") {
  if (index?.format !== "cig02b-typed-index-v1" || index.topic_count !== 144 ||
      index.topics?.length !== 144) throw new Error("invalid 144-Topic typed index");
  if (!["strict", "balanced"].includes(policy)) throw new Error("unknown policy");
  const documentFrequency = new Map();
  for (const topic of index.topics) {
    for (const value of new Set(topic.atoms.OBJECT.map(atom => atom.value))) {
      documentFrequency.set(value, (documentFrequency.get(value) ?? 0) + 1);
    }
  }
  const actionAtoms = [...index.global_action_atoms.en, ...index.global_action_atoms.zh].map(lower);
  const prepared = index.topics.map(topic => ({
    topic_id:topic.topic_id, domain_id:topic.domain_id,
    objects:[...new Map(topic.atoms.OBJECT.map(atom => [atom.value, atom])).values()],
    outcomes:[...new Map(topic.atoms.OUTCOME.map(atom => [atom.value, atom])).values()]
  }));
  function classify(input) {
    const current = String(input?.current ?? "").trim();
    if (!current || noIntent.test(current) || quotedOnly.test(current)) return {topics:[],state:"DEFER"};
    const extracted = extractGoal(current);
    const span = lower(extracted?.span ?? current);
    const hasAction = actionAtoms.some(atom => contains(span, atom));
    if (!hasAction && !extracted) return {topics:[],state:"DEFER"};
    const matches = [];
    for (const topic of prepared) {
      const objects = topic.objects.filter(atom => contains(span, atom.value));
      if (!objects.length) continue;
      const uniqueObjects = objects.filter(atom => documentFrequency.get(atom.value) === 1);
      const outcomes = topic.outcomes.filter(atom => contains(span, atom.value));
      const score = Math.min(uniqueObjects.length, 2) * 3 +
        Math.min(objects.length - uniqueObjects.length, 2) +
        Math.min(outcomes.length, 2) + (hasAction ? 1 : 0);
      matches.push({topic_id:topic.topic_id,score,objects:objects.length,
        unique_objects:uniqueObjects.length,outcomes:outcomes.length});
    }
    matches.sort((a,b) => b.score-a.score || a.topic_id.localeCompare(b.topic_id));
    const first=matches[0], second=matches[1];
    if (!first) return {topics:[],state:"DEFER"};
    const qualified = policy === "strict"
      ? first.unique_objects >= 1 && first.score >= 5 && (!second || first.score-second.score >= 3)
      : (first.unique_objects >= 1 || first.objects >= 2 && first.outcomes >= 1) &&
        first.score >= 4 && (!second || first.score-second.score >= 2);
    if (!qualified) return {topics:[],state:"DEFER"};
    return {topics:[first.topic_id],state:"ASSIGNED",goal_source:extracted ? "EXPLICIT_GOAL_SPAN" : "CURRENT_INTENT",
      evidence:{score:first.score,unique_objects:first.unique_objects,objects:first.objects,outcomes:first.outcomes}};
  }
  return { classify };
}
