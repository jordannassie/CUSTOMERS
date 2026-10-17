export const PLACEMENTS = ["homepage", "directory", "detail", "footer", "nav"] as const;

export type NewsletterPlacement = (typeof PLACEMENTS)[number];

export const BEEHIIV_SIGNUP_URL = "https://customersdirect.beehiiv.com/?modal=signup";

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
