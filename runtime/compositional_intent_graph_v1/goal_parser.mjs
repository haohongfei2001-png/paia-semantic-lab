// CIG-01 local goal/means parser. No Topic dictionary, model or network access.
// This prototype only tests whether surface grammar preserves a goal span.
function clean(value) {
  return String(value).trim().replace(/^[,，；;:\s]+|[。.!?？,，；;\s]+$/gu, "").trim();
}

export function extractGoal(current) {
  const text = String(current ?? "").trim();
  if (!text) return null;
  const patterns = [
    /\buse\b[\s\S]+?\bto improve\s+(.+?)(?:[.!?]|$)/iu,
    /用[\s\S]+?来改进(.+?)(?:[。！？]|$)/u,
    /为了(.+?)[，,][\s\S]*?用/u,
    /\b(?:want|plan|need) to\s+(.+?)(?:\s+by using\b|[.!?]|$)/iu,
    /\bso I can\s+(.+?)(?:[.!?]|$)/iu,
    /\busing\b[\s\S]+?,\s*I plan to\s+(.+?)(?:[.!?]|$)/iu,
    /(.+?)是目的[，,][\s\S]*?只是工具/u,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const span = match && clean(match[1]);
    if (span) return { role: "GOAL", span, source: "current" };
  }
  return null;
}

export function createIntentGraph() {
  return {
    extractGoal,
    classifyGoal(input) {
      const goal = extractGoal(input?.current);
      return goal
        ? { state: "GOAL_SPAN_FOUND", goal, means: null }
        : { state: "DEFER", goal: null, means: null };
    },
  };
}
