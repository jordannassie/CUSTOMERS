// The sample in docs/report-reference.pdf as a full version 2 snapshot (Cheezious, Rawalpindi), for the PDF and the
// tests. Sample data for layout only: the excerpts are written for the sample, not quoted from saved answers.
import { reportSnapshotSchema, type ReportFix, type ReportSnapshot } from "../snapshot-schema";

const fix = (f: Omit<ReportFix, "wording">): ReportFix => ({ ...f, wording: "template" });

export const cheeziousSnapshot: ReportSnapshot = reportSnapshotSchema.parse({
  version: 2,
  preparedAt: "2026-10-28T10:00:00.000Z",
  period: { start: "2026-09-29", end: "2026-10-28", days: 30 },
  agency: {
    name: "Brightline Digital",
    logoPath: null,
    accent: "#1F4FD1",
    contactEmail: "hello@brightline.example",
    bookingUrl: "https://brightline.example/book",
  },
  business: { name: "Cheezious", domain: "cheezious.com", market: "Rawalpindi, Punjab" },
  coverage: { questions: 10, engines: ["ChatGPT", "Claude", "Perplexity"], answers: 60 },
  score: { value: 15, change: { direction: "up", points: 2 }, rangePoints: 4 },
  named: { answers: 9, total: 60, questions: 6, questionsAsked: 10 },
  rank: { position: 3, of: 5, leader: { name: "Pizza Hut", score: 38 } },
  ownSite: { hasSite: true, cited: 0, otherSites: 26 },
  shareOfPicks: 18,
  businesses: [
    { name: "Pizza Hut", isYou: false, mentions: 23, score: 38 },
    { name: "Domino's", isYou: false, mentions: 17, score: 28 },
    { name: "Cheezious", isYou: true, mentions: 9, score: 15 },
    { name: "Dampukh", isYou: false, mentions: 0, score: 0 },
    { name: "The Monal", isYou: false, mentions: 0, score: 0 },
  ],
  summary: {
    headline: "AI named Cheezious in 9 of 60 answers. Pizza Hut was named in 23.",
    lead:
      "When people in Rawalpindi, Punjab asked AI the 10 questions we track, Cheezious came up in 15% of answers. AI knows you as a value option, but it has little to say about how good your food is and how fast you deliver. It never used your own website as a source.",
    short: {
      knows: "AI names you most for price questions. Most of what AI knows about you comes from Foodpanda, TripAdvisor and thecookbook.pk.",
      behind: "Pizza Hut and Domino's are named more often. Google fed 8 answers that named Pizza Hut.",
      fixes: "Start where AI reads: your website and Google Business Profile. Then win quality and freshness questions.",
    },
  },
  knows: {
    headline: "AI sees Cheezious as a value option, and knows little else",
    knownFor: { title: "Fair prices and good value", detail: "Named in 5 of 18 price answers." },
    trustedBy: { title: "thecookbook.pk", detail: "thecookbook.pk named you in 7 of 11 answers." },
    foundThrough: { title: "Foodpanda and TripAdvisor", detail: "6 of the 9 answers naming you came through each of these sites." },
    gaps: [
      { title: "Your services, prices and locations", evidence: "Your website was never used as a source.", fix: 1 },
      { title: "Your Google listing and ratings", evidence: "Google fed 10 answers, none named you.", fix: 2 },
      { title: "How good your work is", evidence: "Named in 1 of 18 quality answers.", fix: 3 },
      { title: "How fast you are", evidence: "Named in 0 of 12 speed answers.", fix: 5 },
    ],
    excerpts: {
      named: {
        engine: "Perplexity",
        date: "2026-10-12",
        question: "Cheap pizza delivery in Rawalpindi",
        text: "For a budget friendly option, Cheezious is popular with students for its deals and generous cheese.",
        name: "Cheezious",
      },
      competitor: {
        engine: "ChatGPT",
        date: "2026-10-20",
        question: "Best pizza in Rawalpindi",
        text: "Pizza Hut on Murree Road is a reliable choice with fast delivery and consistent quality across branches.",
        name: "Pizza Hut",
      },
    },
  },
  behind: {
    headline: "Pizza Hut and Domino's give AI more to work with",
    line: "Pizza Hut was named in 23 of 60 answers, Domino's in 17 and Cheezious in 9. Dampukh and The Monal were not named in any answer. 4 reasons explain most of the gap.",
    reasons: [
      { title: "Google sends answers their way", them: "Google fed 8 answers that named Pizza Hut.", you: "Google fed 10 answers and named you in none.", fixes: [2] },
      { title: "TripAdvisor quotes them more", them: "TripAdvisor was used in 11 answers that named Domino's.", you: "TripAdvisor named you in 6 of 20 answers.", fixes: [3] },
      { title: "Their facts are easy to read online", them: "Other business websites were used in 26 answers.", you: "Your website was used in 0 answers.", fixes: [1] },
      { title: "They are linked with quality and speed questions", them: "Pizza Hut was named in 9 of 18 quality answers and 7 of 12 speed answers.", you: "You were named in 1 of 18 quality answers and 0 of 12 speed answers.", fixes: [3, 5] },
    ],
    wins: "Price and value questions, and food blog coverage. thecookbook.pk named you in 7 of the 11 answers that used it. Keep both strong while you fix the gaps.",
  },
  fixes: [
    fix({
      n: 1, key: "own_site_uncited", title: "Get cheezious.com used as a source", areas: ["website"], where: "Your website", priority: "critical",
      impact: "high", effort: "medium", owner: "Web developer",
      evidence: "cheezious.com was used in 0 of 60 answers. Other pizza websites, bhaipizza.com and jfcpizza.com, were used in 13 answers each.",
      why: "When AI cannot read your menu, prices and branches on your own site, it quotes other sites and listings instead.",
      steps: [
        "One page per Rawalpindi branch: address, hours, phone, delivery areas and the full menu with prices as plain text.",
        "Add website info for AI to your page code: your name, address, phone, hours, price range and the areas you serve.",
        "Check robots.txt does not block GPTBot, ClaudeBot or PerplexityBot.",
        "Add a short FAQ answering what customers ask AI: delivery time, prices, freshness and pickup.",
      ],
      goal: { label: "Done when", text: "cheezious.com appears as a source in the next scan" },
    }),
    fix({
      n: 2, key: "source:google", title: "Complete Google Business Profiles", areas: ["google"], where: "Google Business Profile", priority: "high",
      impact: "high", effort: "low", owner: "Marketing",
      evidence: "Google was used in 10 answers and named you in none. 8 of those answers named Pizza Hut instead.",
      why: "AI reads Google listings for branch details, ratings and reviews. Thin or missing profiles get skipped.",
      steps: [
        "Claim and verify a Google Business Profile for every Rawalpindi branch.",
        "Set categories to pizza restaurant and pizza delivery, add hours, menu link, order link and real photos.",
        "Reply to recent reviews and ask happy customers to mention what they ordered and how fast it came.",
      ],
      goal: { label: "Done when", text: "Google sourced answers start naming Cheezious" },
    }),
    fix({
      n: 3, key: "theme:quality", title: "Win quality and freshness questions", areas: ["website", "blogs", "reviews"], where: "Website, food blogs, TripAdvisor",
      priority: "high", impact: "medium", effort: "medium", owner: "Marketing",
      evidence: "Named in 1 of 18 quality answers. Domino's was named in 8.",
      why: "These are the questions where people choose a brand, not just the lowest price.",
      steps: [
        "Publish a page on your ingredients and how dough and cheese are prepared each day.",
        "Pitch local food blogs. thecookbook.pk already named you in 7 of 11 answers.",
        "Ask for reviews on TripAdvisor and Foodpanda that mention freshness and taste.",
      ],
      goal: { label: "Target for next scan", text: "Named in 4 or more of 18 quality answers" },
    }),
    fix({
      n: 4, key: "source:foodpanda", title: "Turn Foodpanda mentions into picks", areas: ["delivery"], where: "Foodpanda", priority: "medium",
      impact: "high", effort: "low", owner: "Operations",
      evidence: "Foodpanda was used in 30 answers and named you in 6. 14 of those answers named Pizza Hut.",
      why: "AI treats Foodpanda as the main list of who delivers where. Weak or missing branch listings leave you out.",
      steps: [
        "Make sure every Rawalpindi branch is listed with accurate hours and delivery areas.",
        "Use the exact same business name everywhere: Cheezious, with no variants.",
        "Reply to low ratings and fix the repeated complaints so your rating rises.",
      ],
      goal: { label: "Target for next scan", text: "Named in 12 or more Foodpanda sourced answers" },
    }),
    fix({
      n: 5, key: "theme:speed", title: "Get recommended for fast delivery", areas: ["website", "google", "delivery"], where: "Website, Google, Foodpanda",
      priority: "medium", impact: "medium", effort: "medium", owner: "Operations",
      evidence: "Named in 0 of 12 speed answers. Pizza Hut was named in 7.",
      why: "AI has nothing to quote about your delivery speed, so it names brands that publish it.",
      steps: [
        "State your average delivery time and delivery zones on your website and Google profiles.",
        "Add the same delivery zones to every Foodpanda branch listing.",
        "Ask customers to mention delivery speed in their reviews.",
      ],
      goal: { label: "Target for next scan", text: "Named in 3 or more of 12 speed answers" },
    }),
    fix({
      n: 6, key: "source:tiktok", title: "Show up in TikTok based answers", areas: ["social"], where: "TikTok", priority: "low",
      impact: "low", effort: "medium", owner: "Social media",
      evidence: "TikTok was used in 7 answers and named you in none.",
      why: "AI is starting to use short video for local food picks. A small, steady presence is enough to get named.",
      steps: ["Post short videos that name Rawalpindi and each branch.", "Work with 2 or 3 local food creators."],
      goal: { label: "Done when", text: "At least one TikTok sourced answer names Cheezious" },
    }),
  ],
  areas: [
    { area: "website", label: "Your website", fixes: [1, 3, 5], text: "Branch pages, menu and prices as plain text, website info for AI, a short FAQ and delivery times." },
    { area: "google", label: "Google Business Profile", fixes: [2, 5], text: "A complete profile per branch with categories, hours, photos, order link and review replies." },
    { area: "delivery", label: "Foodpanda", fixes: [4, 5], text: "Every branch listed, one consistent name, delivery zones and better ratings." },
    { area: "reviews", label: "Review sites", fixes: [2, 3, 5], text: "Reviews on TripAdvisor and Google that mention freshness, taste and speed." },
    { area: "blogs", label: "Blogs and guides", fixes: [3], text: "Outreach to local guides and blogs, starting with thecookbook.pk." },
    { area: "social", label: "TikTok", fixes: [6], text: "Short videos and posts that name your area and what you offer." },
  ],
  roadmap: {
    columns: [
      {
        days: "Days 1 to 30", title: "Fix the basics",
        tasks: [
          { label: "Fix 1: branch pages and website info for AI", area: "Your website" },
          { label: "Fix 2: profiles for every branch", area: "Google Business Profile" },
          { label: "Fix 4: listings cleaned up", area: "Foodpanda" },
        ],
        goal: "your website appears as a source",
      },
      {
        days: "Days 31 to 60", title: "Build proof",
        tasks: [
          { label: "Fix 3: ingredients page and blog outreach", area: "Website, food blogs" },
          { label: "Fix 5: delivery times published", area: "Website, Google, Foodpanda" },
          { label: "Weekly review requests", area: "TripAdvisor, Google" },
        ],
        goal: "first quality and delivery mentions",
      },
      {
        days: "Days 61 to 90", title: "Grow reach",
        tasks: [
          { label: "Fix 6: creator videos", area: "TikTok" },
          { label: "Check what moved", area: "All areas" },
          { label: "Reset priorities for the next 90 days", area: "Report review call" },
        ],
        goal: "close the gap to Domino's",
      },
    ],
    nextScanAt: "2026-11-27T09:00:00.000Z",
  },
  method: {
    text: "We asked ChatGPT, Claude and Perplexity the same 10 questions local customers ask, from Rawalpindi, Punjab, through each tool's official API with web search turned on. That gave 60 answers between Sep 29, 2026 and Oct 28, 2026. We recorded every business named and every website used as a source.",
  },
});
