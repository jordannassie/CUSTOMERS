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
  types: ["coffee_shop", "cafe", "food", "point_of_interest", "establishment"],
  websiteUri: "https://www.sunrise-coffee.example/",
  city: "Springfield",
  state: "IL",
  country: "US",
  // Google's neighborhood for the listing: pre-fills "Neighborhood or area" on the details form.
  area: "Downtown",
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
  types: ["marketing_agency", "point_of_interest", "establishment"],
  websiteUri: "https://brandastic-like.example",
  city: "Costa Mesa",
  state: "CA",
  country: "US",
  // No neighborhood on this listing: the field stays empty.
  area: null,
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

// A competitor's site for "Check their website" (B-91): it lists catering and beans to go, which Sunrise doesn't.
export const BEAN_DOMAIN = "beanhouse.example";

export const BEAN_PAGES: PageResult[] = [
  {
    path: "/",
    status: "ok",
    title: "Bean House | Springfield coffee shop",
    markdown:
      "# Bean House\n\nSpringfield's coffee shop for espresso drinks and fresh coffee beans to go. Roasting since 2009.\n\n" +
      "## Hours\n\nMonday to Sunday, 7am to 7pm\n\n## What our customers say\n\n\"Best espresso in town.\" Dana R.\n\n" +
      "## FAQ\n\nDo you cater offices? Yes, with free quotes for teams of any size.",
    // The page's HTML also carries LocalBusiness structured data.
    signals: { businessSchema: true, contactForm: false, reviews: true, faq: true, hours: true },
  },
  {
    path: "/services",
    status: "ok",
    title: "Services | Bean House",
    kind: "services",
    markdown: "## What we do\n\n- Office catering for teams of 10 to 200\n- Coffee beans to go, roasted weekly\n- Espresso drinks",
  },
  { path: "/about", status: "missing", title: null, markdown: "" },
  {
    path: "/contact",
    status: "ok",
    title: "Contact | Bean House",
    markdown: "## Find us\n\n44 Elm St, Springfield, IL 62701\n\nCall (217) 555-0199",
    signals: { businessSchema: false, contactForm: true, reviews: false, faq: false, hours: false },
  },
];

export const BEAN_SITE_OUTPUT: AutofillOutput = {
  name: "Bean House",
  industry: "coffee_shop",
  description: "A Springfield coffee shop with espresso drinks, office catering and coffee beans to go.",
  services: ["office catering", "coffee beans to go", "espresso drinks"],
  city: "Springfield",
  state: "IL",
  country: "US",
  phone: "(217) 555-0199",
  address: "44 Elm St, Springfield, IL 62701",
  confidence: "high",
};
