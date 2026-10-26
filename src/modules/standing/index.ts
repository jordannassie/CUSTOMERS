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
