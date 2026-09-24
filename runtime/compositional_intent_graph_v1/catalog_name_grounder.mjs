import { extractGoal } from "./goal_parser.mjs";
import { createTypedGrounder } from "./typed_grounder.mjs";

const lower = value => String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/gu," ").trim();
function contains(span, phrase) {
  const value=lower(phrase);
  if (/^[\x00-\x7f]+$/u.test(value)) {
    const escaped=value.replace(/[.*+?^$()|[\]{}\\]/gu,"\\$&");
    return new RegExp("(^|[^a-z0-9])"+escaped+"($|[^a-z0-9])","u").test(span);
  }
  return span.includes(value);
}
const quotedOnly=/(?:only quoting|just an example|只是例子|只是背景|不用分类|没有需要处理|hypothetical)/iu;

export function createCatalogNameGrounder(index, policy="balanced") {
  if (index?.format!=="cig02c-typed-catalog-name-index-v1" || index.topics?.length!==144) {
    throw new Error("invalid CIG-02C index");
  }
  const base=createTypedGrounder({...index,format:"cig02b-typed-index-v1"},policy);
  const names=index.topics.flatMap(topic => [
    {topic_id:topic.topic_id,value:lower(topic.canonical_names.en)},
    {topic_id:topic.topic_id,value:lower(topic.canonical_names.zh)}
  ]);
  const actions=[...index.global_action_atoms.en,...index.global_action_atoms.zh].map(lower);
  function classify(input) {
    const current=String(input?.current??"").trim();
    if (!current || quotedOnly.test(current)) return {topics:[],state:"DEFER"};
    const goal=extractGoal(current);
    const span=lower(goal?.span??current);
    const intent=Boolean(goal)||actions.some(atom=>contains(span,atom));
    if (!intent) return base.classify(input);
    const hits=names.filter(name=>contains(span,name.value));
    if (hits.length) {
      const maximal=hits.filter(hit=>!hits.some(other=>other.topic_id!==hit.topic_id &&
        other.value.length>hit.value.length && other.value.includes(hit.value)));
      const topicIds=[...new Set(maximal.map(hit=>hit.topic_id))];
      if (topicIds.length!==1) return {topics:[],state:"DEFER",reason:"COMPETING_FORMAL_NAMES"};
      return {topics:topicIds,state:"ASSIGNED",goal_source:goal?"EXPLICIT_GOAL_SPAN":"CURRENT_INTENT",
        evidence:{source:"EXACT_FORMAL_CATALOG_NAME"}};
    }
    return base.classify(input);
  }
  return {classify};
}
