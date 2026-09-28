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
