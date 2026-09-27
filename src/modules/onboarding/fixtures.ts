// Hand-built fixtures for auto-fill tests and the fast eval. Made-up businesses on reserved
// .example domains; no real provider was called to make them.
import type { AutofillClients } from "./autofill";
import type { PageResult } from "./firecrawl";
import type { PlaceCandidate } from "./places";
import type { AutofillOutput } from "./prompts/business-autofill.v1";

export const COFFEE_DOMAIN = "sunrise-coffee.example";

export const COFFEE_PAGES: PageResult[] = [
  {
    path: "/",
    status: "ok",
    title: "Sunrise Coffee Bar | Coffee in Springfield",
    markdown:
      "# Sunrise Coffee Bar\n\nSmall-batch espresso, oat milk lattes and fresh pastries. Open early, 6am every day.\n\n[Order ahead](/order)",
  },
  {
    path: "/about",
    status: "ok",
    title: "About | Sunrise Coffee Bar",
    markdown:
      "## About us\n\nSunrise Coffee Bar is a neighborhood cafe in Springfield, IL. We roast our own beans and serve pour-over coffee, espresso drinks and breakfast sandwiches.",
  },
  { path: "/about-us", status: "missing", title: null, markdown: "" },
  {
    path: "/contact",
    status: "ok",
    title: "Contact | Sunrise Coffee Bar",
    markdown: "## Visit us\n\n120 Main St, Springfield, IL 62701\n\nCall (217) 555-0142",
  },
];

/** What a correct model answer for COFFEE_PAGES looks like. */
export const COFFEE_SITE_OUTPUT: AutofillOutput = {
  name: "Sunrise Coffee Bar",
  industry: "coffee_shop",
  description: "A neighborhood cafe in Springfield that roasts its own beans and opens at 6am.",
  services: ["espresso drinks", "oat milk lattes", "pour-over coffee", "pastries", "breakfast sandwiches"],
  city: "Springfield",
  state: "IL",
  country: "US",
  phone: "(217) 555-0142",
  address: "120 Main St, Springfield, IL 62701",
  confidence: "high",
};

export const COFFEE_PLACE: PlaceCandidate = {
  placeId: "ChIJ-fixture-sunrise-coffee",
  name: "Sunrise Coffee Bar & Roastery",
  address: "120 Main St, Springfield, IL 62701, USA",
  phone: "(217) 555-0142",
  primaryType: "coffee_shop",
  websiteUri: "https://www.sunrise-coffee.example/",
  city: "Springfield",
  state: "IL",
  country: "US",
};

export const OTHER_PLACE: PlaceCandidate = {
  ...COFFEE_PLACE,
  placeId: "ChIJ-fixture-other-business",
  name: "Sunrise Coffee Co",
  websiteUri: "https://sunrise-coffee-co.example/",
};

/** A Cloudflare-protected agency site: every page is a bot check. */
export const BLOCKED_DOMAIN = "brandastic-like.example";
export const BLOCKED_PAGES: PageResult[] = ["/", "/about", "/about-us", "/contact"].map((path) => ({
  path,
  status: "blocked",
  title: null,
  markdown: "",
}));

export const BLOCKED_PLACE: PlaceCandidate = {
  placeId: "ChIJ-fixture-blocked-agency",
  name: "Example Digital Agency",
  address: "500 Harbor Blvd, Costa Mesa, CA 92626, USA",
  phone: "(949) 555-0199",
  primaryType: "marketing_agency",
  websiteUri: "https://brandastic-like.example",
  city: "Costa Mesa",
  state: "CA",
  country: "US",
};

type FakeOptions = {
  pages?: PageResult[] | Error;
  places?: Record<string, PlaceCandidate[]> | Error;
  outputs?: Partial<Record<string, AutofillOutput | Error>>;
};

/** Clients that answer from fixtures and record what they were asked. */
export function fakeClients(opts: FakeOptions = {}) {
  const calls = { scrape: [] as string[], places: [] as string[], extract: [] as string[] };
  const clients: AutofillClients = {
    scrape: async (domain) => {
      calls.scrape.push(domain);
      if (opts.pages instanceof Error) throw opts.pages;
      return opts.pages ?? [];
    },
    searchPlaces: async (query) => {
      calls.places.push(query);
      if (opts.places instanceof Error) throw opts.places;
      return opts.places?.[query] ?? [];
    },
    extract: async ({ model }) => {
      calls.extract.push(model);
      const out = opts.outputs?.[model];
      if (out instanceof Error) throw out;
      if (!out) throw new Error(`no fixture output for ${model}`);
      return out;
    },
  };
  return { clients, calls };
}
