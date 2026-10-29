// The only file other modules may import from (eslint-plugin-boundaries).
export { loadStanding, type StandingData } from "./dal";
export type { StandingCheck } from "./checks";
export {
  ASSISTANTS,
  assistantLine,
  competitorWhy,
  questionLine,
  type AssistantTally,
  type CompetitorWhy,
  type Fact,
  type GoogleValues,
  type QuestionTally,
  type Where,
  type WhyInput,
} from "./service";
export { WHERE_TEXT, googleFacts } from "./reasons";
export { questionSummaries, type Named, type QuestionSummary, type SiteUse } from "./questions";
export { theirSite } from "./reasons";
export { meaningWords, serviceGaps, type TheirWebsite, type YourSite } from "./website";
export { googleArea, type Area, type Lead, type SourceRow } from "./gap";
export type { DomainRow } from "./domains";
export { tallyResult, MIN_TALLY_ANSWERS, type TallyResult } from "./assistant-facts";
export { citations, pickCounts, shareOf, shares, siteRows, type SiteRow } from "./picks";
