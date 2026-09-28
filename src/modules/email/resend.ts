import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

export type OutgoingEmail = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

/** What send.ts needs from a mail provider. Tests pass a fake, so no test ever reaches Resend. */
export type EmailClient = {
  send(email: OutgoingEmail, options: { idempotencyKey?: string }): Promise<{ id: string }>;
};

export function createResendClient(apiKey: string): EmailClient {
  const resend = new Resend(apiKey);
  return {
    async send(email, { idempotencyKey }) {
      const { data, error } = await resend.emails.send(email, idempotencyKey ? { idempotencyKey } : undefined);
      if (error || !data) throw new Error(`Resend: ${error?.message ?? "no email id returned"}`);
      return { id: data.id };
    },
  };
}

/** Logs instead of sending, for dev servers whose .env.local holds a real key. */
export function createLogEmailClient(): EmailClient {
  let sent = 0;
  return {
    async send(email) {
      console.log(`email (not sent): ${email.subject} to ${email.to}`);
      return { id: `log_${++sent}` };
    },
  };
}

let client: EmailClient | null = null;

/** The app's only Resend client, created lazily so builds without a key still pass. */
export function getEmailClient(): EmailClient {
  if (client) return client;
  if (!env.RESEND_API_KEY) throw new Error("Email is not configured. Set RESEND_API_KEY.");
  client = createResendClient(env.RESEND_API_KEY);
  return client;
}
