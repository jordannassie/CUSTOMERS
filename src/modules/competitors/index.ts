// The only file other modules may import from (eslint-plugin-boundaries).
export { checkCompetitorWebsite, saveCompetitorAliases, saveCompetitorWebsite, trackCompetitor } from "./actions";
export { getCompetitorAliases, type CompetitorNames } from "./aliases/dal";
export { fetchPlaceSignals, getCompetitorsPage, getOverviewCompete, getPickedInstead, loadCompetitorsPage, loadPicked } from "./dal";
export type { OverviewCompete } from "./overview";
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
export { getComparePage, type CompareOption, type ComparePage, type Comparison } from "./compare/dal";
export { googleReasonCards, type LeadCard, type ReasonCard } from "./compare/cards";
export { SPARK_SCANS, TABLE_MODELS, type TableKpis, type TableRow } from "./table";
export { placeAmongTracked, type TrackedPlace } from "./rank";
export { likelyReason } from "./likely-reason";
