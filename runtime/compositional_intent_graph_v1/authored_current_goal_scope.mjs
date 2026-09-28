import { currentGoalScopeReason } from "./current_goal_scope.mjs";
// The historical bare Chinese 别 guard also matches ordinary nouns such as
// 识别/类别. Mask only a bounded, explicit non-negation compound allowlist for
// scope validation; the grounder still receives the original unmodified input.
const nonNegationCompounds = /识别|区别|分别|特别|类别|差别|级别|别名|个别|性别|告别/gu;
export function authoredCurrentGoalScopeReason(value) {
  if (typeof value !== "string") return "INVALID_CURRENT_INPUT";
  const normalized = value.normalize("NFKC");
  const scopeText = normalized.replace(nonNegationCompounds, word => word.replace("别", "□"));
  return currentGoalScopeReason(scopeText);
}
