import { createFrameGrounder } from "./frame_grounder.mjs";
import { currentGoalScopeReason } from "./current_goal_scope.mjs";

export function createAuthoredTopicRouter(index) {
  if (index?.format !== "cig02g-authored-frame-index-v1" ||
      index.topic_count !== 144 || index.topics?.length !== 144 ||
      index.provenance?.dev_rows_read !== 0 ||
      index.provenance?.capability_test_rows_read !== 0 ||
      index.provenance?.natural_source_readiness_is_runtime_eligibility !== false) {
    throw new Error("invalid isolated CIG-02G TRAIN index");
  }
  const grounder = createFrameGrounder({ ...index, format: "cig02e-typed-frame-index-v1" });
  function classify(input) {
    const reason = currentGoalScopeReason(input?.current);
    if (reason) return { topics: [], state: "DEFER", reason };
    // All 144 formal Topics remain candidates. Evidence must qualify in the current
    // goal span; public natural-source scarcity is provenance, not a veto.
    return grounder.classify({ current: input.current });
  }
  return { classify };
}
