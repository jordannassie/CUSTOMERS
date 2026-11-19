// An AI answer that opens by saying it has no web access ("I don't have access to current, real-time information")
// and cites nothing did not look anything up, so it is not a check of what the AI recommends: it is a failed check,
// never charged and never counted in a score (QA round 2, 2026-11-13). Pure.
//
// The same rule lives in SQL in migration 095 (visibility_results_counted), so answers saved before this change stop
// counting too. Change both together; no-web.test.ts lists the phrases they must agree on.

/** How far into the answer the refusal must start: a good answer may say "I can't check live stock" much later. */
export const NO_WEB_PREFIX = 300;

const NO_WEB = new RegExp(
  [
    // "I don't have access to current information", "I can't browse the internet", "I'm unable to search the web"
    String.raw`\bi(?: don't| do not| can't| cannot| am unable to|'m unable to| am not able to|'m not able to)(?: currently)? (?:have )?(?:access|browse|search|look up|retrieve|check)\b[^.]{0,60}\b(?:real-time|real time|current|live|up-to-date|up to date|internet|web|online)`,
    // "I don't have real-time information about local businesses"
    String.raw`\bi (?:don't|do not) have (?:real-time|real time|current|live|up-to-date|up to date) (?:information|data|access)`,
    // "My knowledge has a cutoff", "my training data only goes up to"
    String.raw`\bmy (?:knowledge|training data)(?: has a)? (?:cutoff|cut-off|only goes)`,
  ].join("|"),
);

/** True when the answer opens by refusing for lack of web access and cites no source. */
export function isNoWebAnswer(answerText: string, citations: readonly unknown[] | null | undefined): boolean {
  if (citations && citations.length > 0) return false;
  const opening = answerText.slice(0, NO_WEB_PREFIX).toLowerCase().replace(/[‘’]/g, "'");
  return NO_WEB.test(opening);
}

export const NO_WEB_REASON = "answered without looking anything up on the web";
