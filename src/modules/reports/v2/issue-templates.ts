// Template wording for each kind of issue: the title, why it holds the business back, 2 to 4 steps and the goal.
// Plain words for any kind of local business (docs/design/WRITING.md); every number comes from the caller. Pure.
import type { ReportArea, ReportFix } from "./snapshot-schema";
import type { ThemeId } from "./themes";

export type Wording = Pick<ReportFix, "title" | "why" | "steps">;

export function ownSiteWording(domain: string): Wording {
  return {
    title: `Get ${domain} used as a source`,
    why: "When AI cannot read your services, prices and locations on your own site, it quotes other sites and listings instead.",
    steps: [
      "One page per location or main service: address, hours, phone, the areas you serve and your prices as plain text.",
      "Add website info for AI to your page code: your name, address, phone, hours, price range and the areas you serve.",
      "Check that robots.txt does not block GPTBot, ClaudeBot or PerplexityBot.",
      "Add a short FAQ that answers what customers ask AI: prices, hours, wait times and where you work.",
    ],
  };
}

export function ownSiteLowWording(domain: string): Wording {
  return { ...ownSiteWording(domain), title: `Get ${domain} used in more answers` };
}

export const NO_SITE_WORDING: Wording = {
  title: "Get a website AI can read",
  why: "Without a website, AI can only repeat what other sites say about you, and it often picks a business that has one.",
  steps: [
    "Set up a simple website with one page per location or main service.",
    "Put your address, hours, phone, prices and the areas you serve on it as plain text.",
    "Add the address to your business details here, so the next scan can check it.",
  ],
};

export function listingWording(area: ReportArea, label: string, name: string, place: string | null, namedYou: number): Wording {
  const where = place ? ` in ${place}` : "";
  switch (area) {
    case "google":
      return {
        title: "Complete your Google Business Profile",
        why: "AI reads Google listings for details, ratings and reviews. Thin or missing profiles get skipped.",
        steps: [
          `Claim and verify a Google Business Profile for every location${where}.`,
          "Set the right categories, and add your hours, a link to your website and real photos.",
          "Reply to recent reviews and ask happy customers to say what they liked.",
        ],
      };
    case "delivery":
      return {
        title: namedYou > 0 ? `Turn ${label} mentions into picks` : `Get listed well on ${label}`,
        why: `AI treats ${label} as the list of who delivers where. Weak or missing listings leave you out.`,
        steps: [
          `Make sure every location${where} is listed with the right hours and delivery areas.`,
          `Use the exact same business name everywhere: ${name}, with no variants.`,
          "Reply to low ratings and fix the complaints that repeat.",
        ],
      };
    case "reviews":
      return {
        title: `Get named on ${label}`,
        why: `AI quotes ${label} when it picks who to recommend. Few recent reviews there mean it quotes others.`,
        steps: [
          `Claim your ${label} page and check your name, hours and contact details.`,
          `Ask happy customers for a review on ${label}.`,
          "Reply to every review there, good or bad.",
        ],
      };
    case "blogs":
      return {
        title: `Get featured on ${label}`,
        why: "AI uses local guides and blog posts to choose who to recommend. Being left out of them leaves you out of the answer.",
        steps: [
          `Read what ${label} published about your area and note who it features.`,
          "Send the writer what makes you different, with your prices and real photos.",
          "Invite them to visit or try your service.",
        ],
      };
    case "social":
      return {
        title: `Show up in ${label} based answers`,
        why: "AI is starting to use short videos and posts for local picks. A small, steady presence is enough to get named.",
        steps: [`Post short videos on ${label} that name your area and what you offer.`, "Work with 2 or 3 local creators."],
      };
    default:
      return {
        title: `Fix your ${label} listing`,
        why: "AI checks directories to confirm a business is real and where it is. Missing or mismatched listings get skipped.",
        steps: [
          `Claim your ${label} listing.`,
          "Use the same name, address, phone and hours as on your website.",
          "Add your services and a link to your website.",
        ],
      };
  }
}

export function themeWording(theme: ThemeId, opts: { delivery: boolean; blog: { label: string; you: number; answers: number } | null }): Wording {
  switch (theme) {
    case "price":
      return {
        title: "Win the price and value questions",
        why: "People asking about price compare options side by side. If AI cannot find your prices, it names businesses that publish theirs.",
        steps: [
          "Publish your prices or price ranges as plain text on your website.",
          "Add the same prices to your Google Business Profile and other listings.",
          "Ask happy customers to mention value in their reviews.",
        ],
      };
    case "speed":
      return {
        title: opts.delivery ? "Get recommended for fast delivery" : "Get recommended for fast service",
        why: "AI has nothing to quote about how fast you are, so it names businesses that publish it.",
        steps: [
          "State your usual wait or delivery time and your hours on your website and Google profile.",
          `Keep hours and service areas the same on every listing${opts.delivery ? ", delivery apps included" : ""}.`,
          "Ask customers to mention speed in their reviews.",
        ],
      };
    case "trust":
      return {
        title: "Win the reviews and trust questions",
        why: "AI leans on reviews to decide who is reliable. Few recent reviews make it pick someone else.",
        steps: [
          "Ask every happy customer for a review on Google and one other review site.",
          "Reply to every review, good or bad, within a few days.",
          "Show licences, awards or guarantees as plain text on your website.",
        ],
      };
    case "nearby":
      return {
        title: "Win the near me questions",
        why: "For near me questions AI checks where a business is and which areas it serves.",
        steps: [
          "List your address and the areas you serve as plain text on your website.",
          "Check the address and service areas on your Google Business Profile.",
          "Use the same name, address and phone number on every directory listing.",
        ],
      };
    default:
      return {
        title: "Win the quality questions",
        why: "These are the questions where people choose a business, not just the lowest price.",
        steps: [
          "Publish a page on what makes your work or products stand out, with real details.",
          "Ask for reviews that mention quality and results.",
          opts.blog
            ? `Pitch local guides and blogs. ${opts.blog.label} already named you in ${opts.blog.you} of ${opts.blog.answers} answers.`
            : "Pitch local guides and blogs that AI already reads.",
        ],
      };
  }
}

/** Where a theme's fix is made. */
export function themeAreas(theme: ThemeId, opts: { delivery: boolean }): ReportArea[] {
  const areas: Record<ThemeId, ReportArea[]> = {
    price: ["website", "google"],
    speed: opts.delivery ? ["website", "google", "delivery"] : ["website", "google"],
    trust: ["reviews", "google"],
    nearby: ["website", "google", "directories"],
    quality: ["website", "blogs", "reviews"],
    other: ["website"],
  };
  return areas[theme];
}

export const OWNERS: Record<ReportArea, string> = {
  website: "Web developer",
  google: "Marketing",
  delivery: "Operations",
  reviews: "Marketing",
  blogs: "Marketing",
  social: "Social media",
  directories: "Marketing",
  other: "Marketing",
};

/** Where each area's change is made, for "Where to make the changes". */
export const AREA_TEXT: Record<ReportArea, string> = {
  website: "Pages for each location and service, prices and hours as plain text, website info for AI and a short FAQ.",
  google: "A complete profile for each location with categories, hours, photos, a website link and review replies.",
  delivery: "Every location listed under one consistent name, with delivery areas, hours and better ratings.",
  reviews: "Recent reviews that mention what you do well, and a reply to each one.",
  blogs: "Outreach to local guides and blogs that AI already reads.",
  social: "Short videos and posts that name your area and what you offer.",
  directories: "The same name, address, phone and hours on every directory listing.",
  other: "Listings on the other sites AI used in these answers.",
};
