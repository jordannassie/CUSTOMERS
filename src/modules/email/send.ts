import "server-only";
import type { ReactElement } from "react";
import { createEmailStore, getEmailSettings, type EmailSettings, type EmailStore } from "./dal";
import { renderEmail } from "./render";
import { getEmailClient, type EmailClient } from "./resend";
import { UNSUBSCRIBE_TOPICS, type EmailType, type UnsubscribeTopic } from "./schema";
import { signUnsubscribeToken, unsubscribeUrl } from "./service";

export type EmailLinks = { baseUrl: string; unsubscribeUrl: string | null };

export type SendEmailInput = {
  type: EmailType;
  to: string;
  subject: string;
  /** Null only for emails sent before the agency exists. Required for emails a user can turn off. */
  agencyId: string | null;
  template: (links: EmailLinks) => ReactElement;
  /** One email per key, ever: a repeated event (webhook retry, cron rerun) sends nothing. */
  idempotencyKey?: string;
};

export type SendEmailResult =
  | { status: "sent"; providerId: string }
  | { status: "skipped"; reason: "duplicate" | "unsubscribed" }
  | { status: "failed"; error: string };

export type SendEmailDeps = { client: EmailClient; store: EmailStore; settings: EmailSettings };

function isUnsubscribeTopic(type: EmailType): type is UnsubscribeTopic {
  return (UNSUBSCRIBE_TOPICS as readonly string[]).includes(type);
}

/**
 * Renders a template to HTML and text, sends it, and logs the result to email_log.
 * Provider failures come back as { status: "failed" } so a webhook or cron job can carry on;
 * missing configuration throws, since no email of that kind could ever go out.
 */
export async function sendEmail(input: SendEmailInput, deps?: SendEmailDeps): Promise<SendEmailResult> {
  const { client, store, settings } = deps ?? { client: getEmailClient(), store: createEmailStore(), settings: getEmailSettings() };
  const log = { type: input.type, agencyId: input.agencyId, to: input.to, idempotencyKey: input.idempotencyKey };

  if (input.idempotencyKey && (await store.hasSent(input.idempotencyKey))) return { status: "skipped", reason: "duplicate" };

  let unsubscribe: { page: string; oneClick: string } | null = null;
  if (isUnsubscribeTopic(input.type)) {
    if (!input.agencyId) throw new Error(`A ${input.type} email needs an agency for its unsubscribe link.`);
    if (!settings.unsubscribeSecret) throw new Error("Set EMAIL_UNSUBSCRIBE_SECRET to send emails with an unsubscribe link.");
    if (!(await store.wantsEmail(input.agencyId, input.type))) {
      await store.record({ ...log, status: "skipped", error: "unsubscribed" });
      return { status: "skipped", reason: "unsubscribed" };
    }
    const token = signUnsubscribeToken(input.agencyId, input.type, settings.unsubscribeSecret);
    unsubscribe = {
      page: unsubscribeUrl(settings.baseUrl, token),
      oneClick: `${settings.baseUrl.replace(/\/$/, "")}/api/email/unsubscribe?token=${encodeURIComponent(token)}`,
    };
  }

  const { html, text } = await renderEmail(input.template({ baseUrl: settings.baseUrl, unsubscribeUrl: unsubscribe?.page ?? null }));
  // RFC 8058 one-click unsubscribe; Gmail and Yahoo expect it on bulk mail.
  const headers = unsubscribe
    ? { "List-Unsubscribe": `<${unsubscribe.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
    : undefined;

  let providerId: string;
  try {
    ({ id: providerId } = await client.send(
      { from: settings.from, to: input.to, subject: input.subject, html, text, headers },
      { idempotencyKey: input.idempotencyKey },
    ));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await store.record({ ...log, status: "failed", error: message });
    return { status: "failed", error: message };
  }
  await store.record({ ...log, status: "sent", providerId });
  return { status: "sent", providerId };
}
