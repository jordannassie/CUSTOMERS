// Pure rules for contact messages and feature requests.
import { createHash } from "node:crypto";
import { CONTACT_TOPICS, FEATURE_DESCRIPTION_MAX, FEATURE_TITLE_MAX } from "./schema";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The first thing wrong with a contact message, as the form shows it; null when it can be saved. */
export function contactProblem(input: { name: string; email: string; message: string }): string | null {
  if (!input.name) return "Enter your name.";
  if (!input.email) return "Enter your email address.";
  if (!EMAIL.test(input.email)) return "Enter an email address like you@business.com.";
  if (!input.message) return "Write a short message so we know how to help.";
  return null;
}

/** The first thing wrong with a feature request, as the dialog shows it; null when it can be saved. */
export function featureRequestProblem(input: { title: string; description: string }): string | null {
  if (!input.title) return "Add a short title for your idea.";
  if (input.title.length > FEATURE_TITLE_MAX) return `Keep the title to ${FEATURE_TITLE_MAX} characters or fewer.`;
  if (!input.description) return "Add a sentence about what you need.";
  if (input.description.length > FEATURE_DESCRIPTION_MAX) return `Keep the description to ${FEATURE_DESCRIPTION_MAX} characters or fewer.`;
  return null;
}

/** The topic the message is about, from the new `interest` field or the old `topic`; "other" when unknown. */
export function contactTopic(interest: unknown, topic: unknown): (typeof CONTACT_TOPICS)[number] {
  const raw = interest ?? topic;
  return typeof raw === "string" && (CONTACT_TOPICS as readonly string[]).includes(raw) ? (raw as (typeof CONTACT_TOPICS)[number]) : "other";
}

/** Only a hash of the address is kept, never the address. */
export function hashIp(ip: string | null): string | null {
  if (!ip || ip === "unknown") return null;
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * The admin's search text for a PostgREST `or` filter: its commas, brackets and wildcards would otherwise change the
 * filter itself, so they are taken out.
 */
export function searchTerm(search: string): string {
  return search.replace(/[,()%*\\]/g, " ").replace(/\s+/g, " ").trim();
}
