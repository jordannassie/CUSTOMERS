export const PLACEMENTS = ["homepage", "directory", "detail", "footer", "nav"] as const;

export type NewsletterPlacement = (typeof PLACEMENTS)[number];

export const BEEHIIV_SIGNUP_URL = "https://customersdirect.beehiiv.com/?modal=signup";

export const BEEHIIV_LOADER_SRC = "https://subscribe-forms.beehiiv.com/v3/loader.js";

export const BEEHIIV_FORM_ID = "06ca54a8-f420-4152-91af-72299f2e3b4f";

const FORM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveEmbed(input?: { src?: string | null; formId?: string | null }): { src: string; formId: string } {
  const src = isAllowedEmbedSrc(input?.src) ? input.src : BEEHIIV_LOADER_SRC;
  const formId = input?.formId && FORM_ID.test(input.formId) ? input.formId : BEEHIIV_FORM_ID;
  return { src, formId };
}

export function isPlacement(value: string): value is NewsletterPlacement {
  return (PLACEMENTS as readonly string[]).includes(value);
}

/** Accept only an https script URL on a Beehiiv host. An empty value means the signup link is used. */
export function isAllowedEmbedSrc(value: string | null | undefined): value is string {
  if (!value || !value.startsWith("https://")) return false;
  try {
    const url = new URL(value);
    return url.hostname === "beehiiv.com" || url.hostname.endsWith(".beehiiv.com");
  } catch {
    return false;
  }
}

export function signupHref(placement: NewsletterPlacement): string {
  const url = new URL(BEEHIIV_SIGNUP_URL);
  url.searchParams.set("utm_source", "customers.direct");
  url.searchParams.set("utm_medium", "website");
  url.searchParams.set("utm_campaign", "ai-newsletter");
  url.searchParams.set("utm_content", placement);
  return url.toString();
}
