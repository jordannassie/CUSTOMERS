// Hand-written fixture cases for the free code-graded eval: a snapshot with template fixes, and a writer answer
// written by hand (not by a model) that the code grader must pass or fail with exactly these issues. Made-up
// businesses on .example domains only.
import type { FixWordingOutput } from "@/modules/reports/prompts/fix-wording.v1";
import { reportSnapshotSchema, type ReportFix, type ReportSnapshot } from "@/modules/reports/v2/snapshot-schema";
import { COFFEE_SNAPSHOT, GOOD_COFFEE_WORDING } from "@/modules/reports/v2/wording/fixtures";

export type FixtureCase = { id: string; snapshot: ReportSnapshot; output: unknown; expected: string[] };

const fix = (n: number, key: string, over: Partial<ReportFix>): ReportFix => ({
  n,
  key,
  title: "",
  areas: ["website"],
  where: "Your website",
  priority: "high",
  impact: "high",
  effort: "low",
  owner: "You",
  evidence: "",
  why: "",
  steps: [],
  goal: { label: "Done when", text: "" },
  wording: "template",
  ...over,
});

function snapshot(name: string, domain: string, market: string, rival: string, fixes: ReportFix[]): ReportSnapshot {
  return reportSnapshotSchema.parse({
    ...COFFEE_SNAPSHOT,
    business: { name, domain, market },
    score: { value: 10, change: null, rangePoints: null },
    named: { answers: 3, total: 30, questions: 2, questionsAsked: 5 },
    rank: { position: 2, of: 3, leader: { name: rival, score: 50 } },
    ownSite: { hasSite: true, cited: 0, otherSites: 9 },
    shareOfPicks: 12,
    businesses: [
      { name: rival, isYou: false, mentions: 15, score: 50 },
      { name, isYou: true, mentions: 3, score: 10 },
    ],
    fixes,
  });
}

const PLUMBER = snapshot("Rapid Flow Plumbing", "rapidflow.example", "Austin, TX", "Lone Star Plumbers", [
  fix(1, "gbp_hours", {
    title: "Show your emergency hours on Google",
    areas: ["google"],
    where: "Google Business Profile",
    priority: "critical",
    evidence: "Lone Star Plumbers was named in 12 of 30 answers about emergency plumbers. You were named in 0.",
    why: "AI picks plumbers it can tell are open now. Your profile does not say you take emergency calls.",
    steps: ["Set your hours to show when you take emergency calls.", "Add emergency plumbing as a service."],
    goal: { label: "Done when", text: "Your Google profile shows emergency hours." },
  }),
  fix(2, "own_site_uncited", {
    title: "Get your website quoted by AI",
    evidence: "AI quoted your website in 0 of 30 answers. It quoted other websites 9 times.",
    why: "AI quotes websites that answer the question. Yours was not quoted.",
    steps: ["Add a page for each service you offer.", "List the areas you cover by name."],
    goal: { label: "Target for next scan", text: "AI quotes your website in at least 3 answers." },
  }),
]);

const PLUMBER_GOOD: FixWordingOutput = {
  fixes: [
    {
      key: "gbp_hours",
      title: "Show on Google that you take emergency calls",
      why: "Lone Star Plumbers was named in 12 of 30 answers about emergency plumbers and you were named in 0. AI can only suggest you for emergencies if your profile says you take them.",
      steps: ["Set your Google hours to show when you take emergency calls.", "Add emergency plumbing to your list of services."],
    },
    {
      key: "own_site_uncited",
      title: "Give AI pages on your website it can quote",
      why: "AI quoted your website in 0 of 30 answers and other websites 9 times. A clear page for each service gives it something of yours to quote.",
      steps: ["Add one page for each service you offer, with what it costs to book.", "List every area of Austin, TX you cover by name."],
    },
  ],
};

const DENTIST = snapshot("Bright Smile Dental", "brightsmile.example", "Leeds", "Park Lane Dentists", [
  fix(1, "theme:invisalign", {
    title: "Say you offer clear aligners",
    evidence: "Park Lane Dentists was named for clear aligners in 6 answers. You were named in 1.",
    why: "AI does not know you offer clear aligners.",
    steps: ["Add a clear aligners page to your website.", "Add clear aligners to your Google profile services."],
    goal: { label: "Done when", text: "Your website has a clear aligners page." },
  }),
]);

export const FIXTURE_CASES: FixtureCase[] = [
  { id: "coffee-good", snapshot: COFFEE_SNAPSHOT, output: GOOD_COFFEE_WORDING, expected: [] },
  { id: "plumber-good", snapshot: PLUMBER, output: PLUMBER_GOOD, expected: [] },
  {
    id: "dentist-invented-number",
    snapshot: DENTIST,
    output: {
      fixes: [
        {
          key: "theme:invisalign",
          title: "Tell AI you offer clear aligners",
          why: "Park Lane Dentists was named in 6 answers and 70% of patients ask for aligners.",
          steps: ["Add a clear aligners page to your website.", "Add clear aligners to your Google profile services."],
        },
      ],
    },
    expected: ["theme:invisalign: number not in the report: 70"],
  },
  {
    id: "coffee-bad-wording",
    snapshot: COFFEE_SNAPSHOT,
    output: {
      fixes: [
        { ...GOOD_COFFEE_WORDING.fixes[0], title: "Unlock your website \u2014 the easy way" },
        { ...GOOD_COFFEE_WORDING.fixes[1], why: "A full Yelp listing will make AI recommend you first." },
        { ...GOOD_COFFEE_WORDING.fixes[2], steps: ["Add oat milk.", "Add photos.", "Add hours.", "Add prices.", "Add parking."] },
      ],
    },
    expected: [
      "own_site_uncited: long dash",
      "own_site_uncited: banned word: unlock",
      "source:yelp.com: promises a result: will make AI name you",
      "theme:oat milk: needs 2 to 4 steps, has 5",
    ],
  },
  {
    id: "plumber-missing-and-unknown",
    snapshot: PLUMBER,
    output: { fixes: [PLUMBER_GOOD.fixes[0], { ...PLUMBER_GOOD.fixes[1], key: "made_up" }, PLUMBER_GOOD.fixes[0]] },
    expected: ["unknown fix key: made_up", "duplicate fix key: gbp_hours", "own_site_uncited: no rewrite returned"],
  },
  { id: "bad-schema", snapshot: DENTIST, output: { fixes: [{ key: "theme:invisalign", title: "Hi" }] }, expected: ["schema"] },
];
