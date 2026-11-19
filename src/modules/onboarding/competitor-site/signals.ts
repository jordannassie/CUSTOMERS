// What a website shows that AI tools can use, beyond its services (B-91 step 1): checked in code on the pages we read,
// no AI. Pure. Every check is "found on the pages we read", never "missing from the site": we read about 5 pages
// (BUG-115).
import { extractSignals } from "@/modules/readiness-check";

export type PageSignals = {
  /** Structured data (JSON-LD or microdata) naming the business type, such as LocalBusiness or Plumber. */
  businessSchema: boolean;
  contactForm: boolean;
  /** Customer reviews or testimonials on the page itself. */
  reviews: boolean;
  /** A questions and answers section. */
  faq: boolean;
  /** Opening hours written on the page. */
  hours: boolean;
};

export type SiteSignals = PageSignals & {
  /** Words on the pages we read, main content only. */
  words: number;
  /** AI crawlers its robots.txt turns away; empty when it lets them in, null when we couldn't tell. */
  aiBlocked: string[] | null;
};

const REVIEW_SCHEMA = /"@type"\s*:\s*"(Review|AggregateRating)"/i;
const REVIEW_HEADING = /^#{1,4}[^\n]*(testimonial|reviews?\b|what (our )?(customers|clients|patients) say)/im;
const FAQ_SCHEMA = /"@type"\s*:\s*"FAQPage"/i;
const FAQ_TEXT = /^#{1,4}[^\n]*(faq|frequently asked|questions)/im;
const HOURS_SCHEMA = /openingHours/i;
const DAY = "(mon|tue|wed|thu|fri|sat|sun)[a-z]*\\.?";
const HOURS_TEXT = new RegExp(`${DAY}[^\\n]{0,40}\\d{1,2}(:\\d{2})?\\s*(am|pm|a\\.m\\.|p\\.m\\.)|open 24\\s*\\/\\s*7|open 24 hours`, "i");

export function pageSignals(html: string | null, markdown: string): PageSignals {
  const fromHtml = html ? extractSignals(html) : null;
  return {
    businessSchema: fromHtml?.hasBusinessType ?? false,
    contactForm: fromHtml?.hasContactForm ?? false,
    reviews: (html ? REVIEW_SCHEMA.test(html) : false) || REVIEW_HEADING.test(markdown),
    faq: (html ? FAQ_SCHEMA.test(html) : false) || FAQ_TEXT.test(markdown),
    hours: (html ? HOURS_SCHEMA.test(html) : false) || HOURS_TEXT.test(markdown),
  };
}

export const wordCount = (markdown: string) => (markdown.match(/[A-Za-z]{2,}/g) ?? []).length;

/** One page's signals, or the whole site's: any page that shows it counts. */
export function siteSignals(pages: { signals: PageSignals; markdown: string }[], aiBlocked: string[] | null): SiteSignals {
  const any = (k: keyof PageSignals) => pages.some((p) => p.signals[k]);
  return {
    businessSchema: any("businessSchema"),
    contactForm: any("contactForm"),
    reviews: any("reviews"),
    faq: any("faq"),
    hours: any("hours"),
    words: pages.reduce((n, p) => n + wordCount(p.markdown), 0),
    aiBlocked,
  };
}
