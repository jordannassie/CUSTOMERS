// The only file other modules may import from (eslint-plugin-boundaries).
export { saveCompetitorAliases, saveCompetitorWebsite, trackCompetitor } from "./actions";
export { getCompetitorAliases, type CompetitorNames } from "./aliases/dal";
export { fetchPlaceSignals, getCompetitorsPage, getPickedInstead, loadCompetitorsPage } from "./dal";
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
