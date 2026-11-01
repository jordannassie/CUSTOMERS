// The only file other modules may import from (eslint-plugin-boundaries).
export { explainAfterScan, getLiveOpportunities } from "./dal";
export type { LiveOpportunity } from "./dal";
export type { Explanation } from "./explain";
export { checkFixes } from "./actions";
export { getFixesState, type FixesState } from "./save/dal";
export { EXPLAIN_WAIT_MS } from "./save/service";
