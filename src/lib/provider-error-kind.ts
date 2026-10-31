// The kind of an outside service's failure, so provider_errors keeps one row per provider and kind per hour with a
// count (migration 058) instead of one row per request. Pure.

export type ProviderErrorKind = "billing" | "rate_limit" | "auth" | "timeout" | "server" | "network" | "other";

const RULES: [ProviderErrorKind, RegExp][] = [
  ["billing", /out of credit|credit balance|insufficient_quota|billing|\b402\b/i],
  ["rate_limit", /\b429\b|rate.?limit|too many requests|quota/i],
  ["auth", /\b40[13]\b|unauthori[sz]ed|forbidden|invalid api key|permission/i],
  ["timeout", /time(?:d)?.?out|timeout|aborted/i],
  ["server", /\b5\d\d\b|overloaded|unavailable|internal server error|bad gateway/i],
  ["network", /fetch failed|network|econn|enotfound|socket|dns/i],
];

/** "Places returned 429" is rate_limit, "Out of credit: ..." is billing, anything unknown is other. */
export function providerErrorKind(message: string): ProviderErrorKind {
  return RULES.find(([, re]) => re.test(message))?.[0] ?? "other";
}
