// Migration 067 refuses a second copy of a business in one agency: the same website, the same Google listing, or a
// second setup draft. Its refusal is SQLSTATE 23505 with a "duplicate_business:" message. Pure.

export const DUPLICATE_BUSINESS_TEXT = "This business is already in your account.";

export type DuplicateKind = "website" | "listing" | "draft";

/** Which rule refused the write, or null when the error is not migration 067's refusal. */
export function duplicateBusiness(error: { code?: string; message?: string } | null | undefined): DuplicateKind | null {
  if (error?.code !== "23505") return null;
  const match = /^duplicate_business: (website|Google listing|draft)/.exec(error.message ?? "");
  if (!match) return null;
  return match[1] === "Google listing" ? "listing" : (match[1] as DuplicateKind);
}

/** Thrown by a save that hit migration 067, so the step answers with DUPLICATE_BUSINESS_TEXT instead of crashing. */
export class DuplicateBusinessError extends Error {
  constructor(readonly kind: DuplicateKind) {
    super(`duplicate_business: ${kind}`);
    this.name = "DuplicateBusinessError";
  }
}
