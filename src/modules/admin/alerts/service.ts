import { createElement } from "react";
import { NoticeEmail, type SendEmailInput, type SendEmailResult } from "@/modules/email";

export const EMAIL_EVERY_MS = 60 * 60 * 1000;

export type OpenAlert = {
  id: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  message: string;
  createdAt: string;
  lastSeenAt: string;
};

// Checks that count events in the last hour (migration 058). Once the events stop the check stops firing, so the
// message stays as it was last raised, "in the last hour" included (BUG-161).
const HOURLY_KINDS = new Set(["failed_scans", "webhook_failures", "provider_errors"]);
const HOUR_MS = 60 * 60 * 1000;

// The database writes some alerts with developer names (migration 058); the Overview reads them in plain words.
const PLAIN_ALERT_WORDS: [RegExp, string][] = [
  // "1 Stripe webhook event failed" stays singular (admin audit 2026-11-12: it read "1 payment updates").
  [/\bStripe webhook events\b/g, "payment updates from Stripe"],
  [/\bStripe webhook event\b/g, "payment update from Stripe"],
  [/\bStripe webhooks?\b/g, "payment updates from Stripe"],
  [/\bCheck that the worker is running\./g, "Check Scan worker and Automatic scans on the System status page."],
  // "Anthropic (Claude)" is the System status check's name; it becomes "Claude", never "Claude (Claude)".
  [/\b(?:openai|OpenAI)(?: \(ChatGPT\))?/g, "ChatGPT"],
  [/\b(?:anthropic|Anthropic)(?: \(Claude\))?/g, "Claude"],
  [/\bperplexity\b/g, "Perplexity"],
];

export function plainAlertText(message: string): string {
  return PLAIN_ALERT_WORDS.reduce((text, [pattern, words]) => text.replace(pattern, words), message);
}

/**
 * What the Overview shows for an open alert. An hourly alert not seen for over an hour says "in one hour" instead of
 * "in the last hour", and `stale` adds "Nothing new since" next to when it was last seen.
 */
export function alertWording(alert: Pick<OpenAlert, "kind" | "message" | "lastSeenAt">, now: Date): { message: string; stale: boolean } {
  const stale = HOURLY_KINDS.has(alert.kind) && now.getTime() - Date.parse(alert.lastSeenAt) > HOUR_MS;
  const message = plainAlertText(alert.message);
  return { message: stale ? message.replace(/\bin the last hour\b/g, "in one hour") : message, stale };
}

/** Somewhere to act on an alert: a page in admin, or the Stripe dashboard (external). */
export type AlertLink = { label: string; href: string; external?: boolean };

const SYSTEM_STATUS: AlertLink = { label: "Open System status", href: "/internal/admin/settings" };

/**
 * Where to go about an alert (admin audit 2026-11-12: alerts gave nothing to act on). `stripeWebhooks` is the Stripe
 * dashboard's webhooks page in the mode of the key in use. Kinds with no page that helps get no link.
 */
export function alertLinks(kind: string, stripeWebhooks: string): AlertLink[] {
  if (isServiceCheckKind(kind)) return [SYSTEM_STATUS];
  switch (kind) {
    case "failed_scans":
      return [{ label: "See failed scans", href: "/internal/admin/scans?status=failed" }];
    case "stuck_jobs":
      return [{ label: "See running scans", href: "/internal/admin/scans?status=running" }, SYSTEM_STATUS];
    case "webhook_failures":
      return [SYSTEM_STATUS, { label: "Open webhooks in Stripe", href: stripeWebhooks, external: true }];
    case "provider_errors":
    case "anthropic_credit":
    case "ai_fallback":
    case "claude_unavailable":
      return [SYSTEM_STATUS];
    case "daily_ai_cost":
      return [{ label: "See AI cost by model", href: "/internal/admin/usage?days=7" }];
    default:
      return [];
  }
}

// Raised by scans when Anthropic rejects the key, the account has no credit, or every Claude check in a scan failed
// with server errors or timeouts (modules/scanning/claude-outage).
export const CLAUDE_UNAVAILABLE = "claude_unavailable";
const ANTHROPIC_ONLY_ERRORS = /^Errors in the (last|one) hour from Anthropic \(\d+\)\.$/;

/**
 * While "Claude unavailable" is open it is the one Claude alert on the Overview: the backup notice, the credit alert,
 * the System status check of the Anthropic key and a provider error count that only names Anthropic say the same thing, so
 * they are left out of the list. The one left keeps the most serious severity among them.
 */
export function foldClaudeAlerts(alerts: OpenAlert[]): OpenAlert[] {
  const claude = alerts.find((a) => a.kind === CLAUDE_UNAVAILABLE);
  if (!claude) return alerts;
  const folded = alerts.filter(
    (a) =>
      a.kind === "ai_fallback" ||
      a.kind === "anthropic_credit" ||
      a.kind === `service_check:anthropic` ||
      (a.kind === "provider_errors" && ANTHROPIC_ONLY_ERRORS.test(a.message)),
  );
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  const severity = [claude, ...folded].reduce((s, a) => (rank[a.severity] < rank[s] ? a.severity : s), claude.severity);
  return alerts.filter((a) => !folded.includes(a)).map((a) => (a === claude ? { ...a, severity } : a));
}

export type NotifyDeps = {
  /** Open alerts no admin has been emailed about yet. */
  unemailed: () => Promise<OpenAlert[]>;
  /** True when an email about this kind of alert went out after `since`. */
  emailedSince: (kind: string, since: Date) => Promise<boolean>;
  markEmailed: (alertId: string, at: Date) => Promise<void>;
  send: (input: SendEmailInput) => Promise<SendEmailResult>;
  recipients: string[];
  now: () => Date;
};

export type NotifySummary = { emailed: number; held: number; failed: number };

const SUBJECT = { critical: "Urgent alert", warning: "Alert", info: "Notice" } as const;

/**
 * Emails every admin about each new alert, at most once per hour per alert kind (MVP_SPEC 22).
 * An alert held back by the hourly limit stays unemailed and goes out on a later run if it is still open.
 */
export async function notifyAdmins(deps: NotifyDeps): Promise<NotifySummary> {
  const summary: NotifySummary = { emailed: 0, held: 0, failed: 0 };
  if (deps.recipients.length === 0) return summary;

  for (const alert of await deps.unemailed()) {
    const now = deps.now();
    if (await deps.emailedSince(alert.kind, new Date(now.getTime() - EMAIL_EVERY_MS))) {
      summary.held++;
      continue;
    }
    let delivered = false;
    for (const to of deps.recipients) {
      // A send that throws (email not set up yet, provider down) counts as failed; the alert stays open and
      // unemailed for the next run, and the check itself still answers 200.
      try {
        const result = await deps.send(alertEmail(alert, to));
        if (result.status === "sent" || (result.status === "skipped" && result.reason === "duplicate")) delivered = true;
      } catch (error) {
        console.error("[admin/alerts] alert email not sent", alert.kind, error instanceof Error ? error.message : String(error));
      }
    }
    if (delivered) {
      await deps.markEmailed(alert.id, now);
      summary.emailed++;
    } else {
      summary.failed++;
    }
  }
  return summary;
}

/** The key starts with the kind, so the hourly limit can find every email sent about that kind. */
export function alertEmailKey(kind: string, alertId: string, to: string): string {
  return `system_alert:${kind}:${alertId}:${to.toLowerCase()}`;
}

function alertEmail(alert: OpenAlert, to: string): SendEmailInput {
  return {
    type: "system_alert",
    to,
    subject: `${SUBJECT[alert.severity]}: ${alert.message}`.slice(0, 200),
    agencyId: null,
    idempotencyKey: alertEmailKey(alert.kind, alert.id, to),
    template: ({ baseUrl }) =>
      createElement(NoticeEmail, {
        preview: alert.message,
        heading: "Something needs a look",
        paragraphs: [
          alert.message,
          "You get at most 1 email an hour about this kind of problem. Resolve the alert on the admin Overview once it is handled.",
        ],
        action: { label: "Open the admin Overview", href: `${baseUrl.replace(/\/$/, "")}/internal/admin` },
        baseUrl,
      }),
  };
}

// Settings checks every service live (modules/system-status). A failing one opens an alert of its own kind, so it
// shows on the Overview and admins get the usual email; the next check that passes closes it again.
const SERVICE_CHECK_PREFIX = "service_check:";

export const serviceCheckKind = (serviceId: string) => `${SERVICE_CHECK_PREFIX}${serviceId}`;
export const isServiceCheckKind = (kind: string) => kind.startsWith(SERVICE_CHECK_PREFIX);

export type ServiceCheck = { id: string; name: string; group: string; state: string; detail: string };
export type ServiceAlertChanges = {
  raise: { kind: string; severity: "warning" | "critical"; message: string; serviceId: string }[];
  resolve: string[];
};

/**
 * "error" opens (or refreshes) the service's alert; "ok" and "not set up" close it, since either way the failure it
 * reported is gone ("not set up" is a known state, like the worker settings before the go-live switch, 2026-11-10).
 * Unknown (a timeout, a rate limit) leaves it as it is, so one slow answer does not open or close anything. Data
 * services only warn: scans, payments and background jobs stop without the others.
 */
export function serviceAlertChanges(services: ServiceCheck[]): ServiceAlertChanges {
  return {
    raise: services
      .filter((s) => s.state === "error")
      .map((s) => ({
        kind: serviceCheckKind(s.id),
        severity: s.group === "data" ? "warning" : "critical",
        message: `${s.name} is not working. ${s.detail.trim().replace(/([^.])$/, "$1.")} Found by the System status check.`,
        serviceId: s.id,
      })),
    resolve: services.filter((s) => s.state === "ok" || s.state === "not_configured" || s.state === "off").map((s) => serviceCheckKind(s.id)),
  };
}
