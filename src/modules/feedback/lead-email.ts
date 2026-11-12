import { createElement } from "react";
import { looksLikeCode } from "@/lib/submitted-text";
import { NoticeEmail, type SendEmailInput } from "@/modules/email";

// The email each admin gets when someone sends the contact form or the chat widget, so a new lead is seen the same
// day instead of whenever someone opens Leads. Pure, so the wording and the rules are tested.

export type NewLead = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  topic: string;
  source?: string | null;
  message: string;
};

const TOPIC: Record<string, string> = {
  ai_visibility: "AI visibility",
  agency: "Joining as an agency",
  book_demo: "Booking a demo call",
  other: "Something else",
  sales: "A paid AI video ad order",
};

const SOURCE: Record<string, string> = {
  contact_page: "the contact page",
  chat: "the chat widget",
  agency: "the agency page",
  video_ad: "the AI video ads page",
};

/** Leads that hold web code are spam or a security test (they show flagged in Leads), so no one is emailed. */
export function shouldEmailAdmins(lead: NewLead): boolean {
  return !looksLikeCode(lead.name, lead.company, lead.message);
}

export function newLeadEmail(lead: NewLead, to: string): SendEmailInput {
  const who = lead.company ? `${lead.name} (${lead.company})` : lead.name;
  const about = TOPIC[lead.topic] ?? "Something else";
  const where = SOURCE[lead.source ?? ""] ?? "the website";
  // Long messages are cut in the email; the full text is in Leads.
  const message = lead.message.length > 600 ? `${lead.message.slice(0, 600).trimEnd()}…` : lead.message;
  return {
    // The admin email type (system_alert) needs no change to the email_log check; the key keeps it to one per lead.
    type: "system_alert",
    to,
    subject: `New lead: ${who}`.slice(0, 200),
    agencyId: null,
    idempotencyKey: `new_lead:${lead.id}:${to.toLowerCase()}`,
    template: ({ baseUrl }) =>
      createElement(NoticeEmail, {
        preview: `${who} wrote about: ${about}`,
        heading: "Someone wants to talk to us",
        paragraphs: [
          `${who} sent a message from ${where}. Reply to ${lead.email}.`,
          `About: ${about}.`,
          message,
        ],
        action: { label: "Open the lead", href: `${baseUrl.replace(/\/$/, "")}/internal/admin/leads` },
        baseUrl,
      }),
  };
}
