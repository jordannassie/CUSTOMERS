// The only file other modules may import from (eslint-plugin-boundaries).
export { readSite } from "./fetch-site";
// Pure: what a page's HTML shows (structured data, a contact form), shared with "Check their website" (B-91).
export { extractSignals, type Signals as HtmlSignals } from "./signals";
export { compareSites } from "./service";
export { extractDomain, isSafePublicUrl } from "./url";
export {
  readinessCheckInput,
  type ReadinessCheckInput,
  type ReadinessCheckResult,
  type SiteResult,
  type CheckRow,
  type Finding,
} from "./schema";
