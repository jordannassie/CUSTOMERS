// Server-only surface for the scan worker and other server code: no Server Actions, next/cache or UI (worker-bundle.test.ts).
export { limitMessage } from "./competitors";
// Settings rebuilds the questions when the industry or place changes after onboarding. Here, not in index.ts: index.ts
// loads the wizard actions, whose schema imports Settings, so Settings importing index.ts would be a cycle.
export { questionBasisChanged, rebuildQuestionsForIndustry, sameIndustry, type QuestionBasis } from "./wizard/questions/rebuild/dal";
// The scan worker re-reads a website whose facts are over a month old before writing advice (MVP_SPEC 7.1).
export { refreshStaleSiteFacts } from "./site-refresh/dal";
// Tracking a business AI named looks up its Google listing, so its signals show (step 9c).
export { placeIdForName } from "./competitor-step/dal";
// A chain's own branch on Google, for Opportunities and Competitors (step 6d).
export { findBranches } from "./branch/dal";
export { needsBranch, showClaimStep, type BranchSearch } from "./branch/service";
// Migration 067 refuses a second copy of a business in one agency; Settings and admin restore show it plainly.
export { DUPLICATE_BUSINESS_TEXT, duplicateBusiness } from "./duplicates";
// A new city, region or country in Settings removes competitors picked for the old place (2026-10-16).
export { keepCompetitorsNear, savedLocation } from "./competitor-location/dal";
