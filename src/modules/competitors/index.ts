// The only file other modules may import from (eslint-plugin-boundaries).
export { checkCompetitorWebsite, saveCompetitorAliases, saveCompetitorWebsite, trackCompetitor } from "./actions";
export { getCompetitorAliases, type CompetitorNames } from "./aliases/dal";
export { fetchPlaceSignals, getCompetitorsPage, getPickedInstead, loadCompetitorsPage, loadPicked } from "./dal";
export type { PickedInstead } from "./picked";
export { namedAs, rowName, trackedNote, type ChainOf } from "./chain";
export type { FetchSignals, PlaceSignals } from "./places";
export {
  COLLECTING_TEXT,
  STANDING_TEXT,
  answersText,
  headToHead,
  hoursText,
  matchedNone,
  reviewsText,
  websiteLabel,
  websiteAction,
  websiteShown,
  type CompetitorsView,
  type LeaderRow,
  type SignalRow,
} from "./service";
export { MAX_COMPETITORS, type ChartSeries, type CompetitorChartsView, type PairPoint } from "./charts";
export { standingSentence, whySentence, type ClaimRow, type CompareRow, type ServiceChip, type FixLink, type WebsiteView, type WhyCard, type WhyPanel } from "./why/service";
export { getWebsiteChecks } from "./why/dal";
export { getComparison, type Comparison } from "./compare/dal";
