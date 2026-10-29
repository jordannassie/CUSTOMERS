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

/**
 * What the Overview shows for an open alert. An hourly alert not seen for over an hour says "in one hour" instead of
 * "in the last hour", and `stale` adds "Nothing new since" next to when it was last seen.
 */
export function alertWording(alert: Pick<OpenAlert, "kind" | "message" | "lastSeenAt">, now: Date): { message: string; stale: boolean } {
  const stale = HOURLY_KINDS.has(alert.kind) && now.getTime() - Date.parse(alert.lastSeenAt) > HOUR_MS;
  return { message: stale ? alert.message.replace(/\bin the last hour\b/g, "in one hour") : alert.message, stale };
}

// Raised by scans when Anthropic rejects the key, the account has no credit, or every Claude check in a scan failed
// with server errors or timeouts (modules/scanning/claude-outage).
export const CLAUDE_UNAVAILABLE = "claude_unavailable";
const ANTHROPIC_ONLY_ERRORS = /^Errors in the (last|one) hour from Anthropic \(\d+\)\.$/;

/**
 * While "Claude unavailable" is open it is the one Claude alert on the Overview: the backup notice, the credit alert,
 * the Settings check of the Anthropic key and a provider error count that only names Anthropic say the same thing, so
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
      const result = await deps.send(alertEmail(alert, to));
      if (result.status === "sent" || (result.status === "skipped" && result.reason === "duplicate")) delivered = true;
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
 * "error" opens (or refreshes) the service's alert and "ok" closes it. Unknown (a timeout, a rate limit) and not set
 * up leave it as it is, so one slow answer does not open or close anything. Data services only warn: scans, payments
 * and background jobs stop without the others.
 */
export function serviceAlertChanges(services: ServiceCheck[]): ServiceAlertChanges {
  return {
    raise: services
      .filter((s) => s.state === "error")
      .map((s) => ({
        kind: serviceCheckKind(s.id),
        severity: s.group === "data" ? "warning" : "critical",
        message: `${s.name} is not working. ${s.detail.trim().replace(/([^.])$/, "$1.")} Found by the Settings check.`,
        serviceId: s.id,
      })),
    resolve: services.filter((s) => s.state === "ok").map((s) => serviceCheckKind(s.id)),
  };
}
