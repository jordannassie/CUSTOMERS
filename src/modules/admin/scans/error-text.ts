import { ABANDONED_ERROR } from "@/lib/scan-job-staleness";
import { REASONS } from "@/modules/entitlements";
import { MODEL_LABELS } from "../usage-cost/service";

// Turns the error text a scan job stores (scan_jobs.error) into plain words for the admin pages. The stored text is
// written for developers: "Every check failed: perplexity: perplexity returned 403: {...json...}". Admins see what
// went wrong and what to do; the original stays available as the technical details. Pure.

export type ScanErrorText = {
  /** One or two plain sentences: what happened and the next step. */
  summary: string;
  /** The stored text, unchanged, for a developer. Null when the summary already is the stored text. */
  technical: string | null;
  /** Why Retry is not offered, when retrying cannot change the outcome (a skip for billing). Null otherwise. */
  noRetry?: string | null;
};

// The worker's skip text for the scanning module's Claude outage (scanning/claude-outage CLAUDE_SKIPPED).
const CLAUDE_SKIPPED = "Claude unavailable, skipped";

// A skipped scan stores the reason the customer sees ("Your free trial has ended..."). Admins read what happened to
// the agency instead, and whether Retry can help (admin audit 2026-11-12). The stored text stays as technical details.
const SKIPS: Record<string, { summary: string; noRetry?: string }> = {
  [REASONS.trialOver]: {
    summary: "Skipped: the agency's free trial ended and it has not paid yet.",
    noRetry: "Retrying won't help. Scans start again on their own once the agency pays.",
  },
  [REASONS.pastDue]: {
    summary: "Skipped: the agency's last payment didn't go through.",
    noRetry: "Retrying won't help. Scans start again once the agency updates its card.",
  },
  [REASONS.canceled]: { summary: "Skipped: the agency's plan has ended.", noRetry: "Retrying won't help until the agency picks a plan again." },
  [REASONS.readOnly]: {
    summary: "Skipped: the agency's plan has ended, so its account is read-only.",
    noRetry: "Retrying won't help until the agency picks a plan again.",
  },
  [REASONS.paused]: { summary: "Skipped: the agency's account is paused.", noRetry: "Retrying won't help until the account is turned back on." },
  [REASONS.setupUnfinished]: {
    summary: "Skipped: the agency hasn't finished setting up its first business.",
    noRetry: "Retrying won't help until the agency finishes setup.",
  },
  [REASONS.offPlan]: {
    summary: "Skipped: this business is off the agency's plan.",
    noRetry: "Retrying won't help until the business is back on the plan.",
  },
  [REASONS.outOfCredits]: { summary: "Skipped: the agency was out of credits. Retry once it has more credits." },
  [REASONS.testOutOfCredits]: { summary: "Skipped: this test agency had no credits. Add credits on its agency page, then retry." },
  [ABANDONED_ERROR]: {
    summary:
      "Stopped: no worker finished this scan within 2 hours, so it was ended and its unused credits went back. Check the scan worker on System status, then retry.",
  },
  [REASONS.scanAlreadyQueued]: { summary: "Skipped: this business already had a scan waiting or running." },
  [CLAUDE_SKIPPED]: { summary: "Skipped: Claude was unavailable, and it is the only AI tool this business checks. Retry once Claude is back." },
};

type Provider = keyof typeof MODEL_LABELS;

const EVERY_CHECK_FAILED = "Every check failed: ";
// The customer-facing wording the worker puts first when the AI tools were down (jobs/service NOT_ANSWERING_TEXT).
const NOT_ANSWERING = "The AI tools were not answering";
const NO_SAMPLE_ANSWERS = "No sample answers for this kind of business";

// The same phrases the System status page uses to spot an account out of credit (system-status/dal.ts).
const OUT_OF_CREDIT = /credit balance|exceeded your current quota|insufficient_quota|paid credit|returned 402/i;
// Signs that a text was written for a developer, not a person.
const TECHNICAL = /returned \d{3}|[{}[\]]|\bError:|\bat \S+ \(|\bundefined\b|\bnull\b|ECONN|ETIMEDOUT|fetch failed|\bpgrst|\bsql\b/i;

const RETRY_LATER = "Retry it in a few minutes.";
const ASK_DEVELOPER = "If it fails again, send the technical details to the developer.";

/** What one AI tool's error means, as a sentence. */
function explainProvider(provider: Provider, text: string): string {
  const name = MODEL_LABELS[provider];
  if (text.includes(NO_SAMPLE_ANSWERS)) {
    return "This is a test account, and test accounts use saved sample answers instead of real AI. There are none for this kind of business yet.";
  }
  if (/is not set up \(no API key\)/i.test(text)) return `${name} isn't connected on this site, so its checks couldn't run.`;
  if (OUT_OF_CREDIT.test(text)) return `${name} is out of credit. Add credit to the ${name} account, then retry the scan.`;
  if (/returned 40[13]\b/.test(text)) return `${name} didn't accept our key. Check ${name} on the System status page.`;
  if (/returned 429\b/.test(text)) return `${name} was busy and asked us to slow down. ${RETRY_LATER}`;
  if (/returned 5\d\d\b/.test(text)) return `${name} had a problem on its side. ${RETRY_LATER}`;
  if (/did not answer within/i.test(text)) return `${name} took too long to answer. ${RETRY_LATER}`;
  if (/request failed/i.test(text)) return `We couldn't reach ${name}. ${RETRY_LATER}`;
  return `The ${name} check failed. ${ASK_DEVELOPER}`;
}

/** Each AI tool's part of the stored text, in order: "perplexity: perplexity returned 403: ...; openai: ...". */
function providerParts(text: string): { provider: Provider; text: string }[] {
  const ids = Object.keys(MODEL_LABELS).join("|");
  // A part starts at the text's start or after ": ", "; " or ". ", with the tool's id and then ": " (or "is not set
  // up", the one error stored without the id in front). "perplexity: perplexity returned" is one part, not two.
  const start = new RegExp(`(?<=^|[:;.] )(${ids})(?=: | is not set up)|^(${ids})(?=: | is not set up)`, "g");
  const marks = [...text.matchAll(start)];
  return marks.map((m, i) => ({
    provider: (m[1] ?? m[2]) as Provider,
    text: text.slice(m.index, i + 1 < marks.length ? marks[i + 1].index : undefined),
  }));
}

const unique = (sentences: string[]) => [...new Set(sentences)].join(" ");

export function explainScanError(raw: string | null | undefined): ScanErrorText | null {
  const text = raw?.trim();
  if (!text) return null;

  const skip = SKIPS[text];
  if (skip) return { summary: skip.summary, technical: text, noRetry: skip.noRetry ?? null };

  if (text.startsWith(NOT_ANSWERING)) {
    const reasons = providerParts(text).map((p) => explainProvider(p.provider, p.text));
    const lead = "The AI tools weren't answering, so the scan stopped. No credits were used, and the next scheduled scan will try again.";
    return { summary: reasons.length ? `${lead} ${unique(reasons)}` : lead, technical: text };
  }

  const parts = providerParts(text);
  if (parts.length > 0) {
    const reasons = unique(parts.map((p) => explainProvider(p.provider, p.text)));
    // The cause first: in a tight table cell the first line is the one that has to say what to do.
    const tail = text.startsWith(EVERY_CHECK_FAILED) ? " No check could run, so no credits were used." : "";
    return { summary: `${reasons}${tail}`, technical: text };
  }

  if (text.startsWith(EVERY_CHECK_FAILED)) {
    return { summary: `No check in this scan could run, so no credits were used. Retry it. ${ASK_DEVELOPER}`, technical: text };
  }

  // Skipped scans store a plain reason already ("The business is paused."); keep it as it is.
  if (!TECHNICAL.test(text)) return { summary: text, technical: null };
  return { summary: `The scan stopped because of an unexpected problem. Retry it. ${ASK_DEVELOPER}`, technical: text };
}
