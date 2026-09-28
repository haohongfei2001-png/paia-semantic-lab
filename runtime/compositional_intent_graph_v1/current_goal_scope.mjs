// Bounded lexical safety guard for the minimal Router, not a semantic parser.
// Fail closed on supported negative/reported/conditional/quoted controls.
// Context is intentionally absent from this API.
const quoted = /["“”「」『』«»]|(^|[\s:])'[^'\n]+'(?:[\s.,!?]|$)/u;
const negated = /\b(?:not|no|never|without|don['’]t|doesn['’]t|didn['’]t|can['’]t|cannot|won['’]t|wouldn['’]t|shouldn['’]t|isn['’]t|aren['’]t)\b|不|别|无需|无须|并非|没有/iu;
const reported = /\b(?:says?|said|told|according to|my friend|someone else)\b|他说|她说|他们说|朋友说|别人想|他想|她想/iu;
const conditional = /\b(?:if|unless|whether|suppose|imagine|hypothetical)\b|如果|假如|假设|是否|要是/iu;
const direct = /^(?:please\b|can you\b|could you\b|would you\b|how (?:do|can) i\b|i (?:want|need|plan) to\b|help me\b|use\b[\s\S]+?\bto improve\b|using\b[\s\S]+?,\s*i plan to\b|请|帮我|我想|我需要|怎么|如何|能否|能不能|用[\s\S]+?来改进|为了|[\s\S]+?是目的[，,][\s\S]*?只是工具)/iu;

export function currentGoalScopeReason(value) {
  if (typeof value !== 'string') return 'INVALID_CURRENT_INPUT';
  const current = value.normalize('NFKC').trim();
  if (!current) return 'NO_CURRENT_GOAL';
  if (quoted.test(current)) return 'QUOTED_CURRENT_SCOPE';
  if (negated.test(current)) return 'NEGATED_CURRENT_SCOPE';
  if (reported.test(current)) return 'REPORTED_CURRENT_SCOPE';
  if (conditional.test(current)) return 'CONDITIONAL_CURRENT_SCOPE';
  const body=current.replace(/[.!?。！？]+$/u,'');
  if (/[.!?。！？]/u.test(body)) return 'MULTI_SENTENCE_CURRENT_SCOPE';
  if (!direct.test(current)) return 'UNSUPPORTED_CURRENT_GOAL_SCOPE';
  return null;
}
