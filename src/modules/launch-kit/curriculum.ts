/* eslint-disable max-lines -- lesson copy for all six Academy modules lives in this file. */
export type Lesson = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  actionStep: string;
  resourceLabel: string;
  /** File name under public/academy/videos/. Leave empty until the video is uploaded. */
  videoFile: string | null;
  estimatedMinutes: number;
};

export type Module = {
  id: string;
  slug: string;
  number: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  lessons: Lesson[];
  isActivationModule?: boolean;
};

export const JOURNEY_STEPS = [
  "Understand AI visibility",
  "Build your offer",
  "Find prospects",
  "Get your first client",
  "Set up monthly payments",
  "Activate your agency software",
] as const;

function lesson(
  id: string,
  title: string,
  summary: string,
  actionStep: string,
  resourceLabel: string,
  estimatedMinutes: number,
): Lesson {
  return {
    id,
    slug: id,
    title,
    summary,
    actionStep,
    resourceLabel,
    videoFile: null,
    estimatedMinutes,
  };
}

export const MODULES: Module[] = [
  {
    id: "understand-the-opportunity",
    slug: "understand-the-opportunity",
    number: 1,
    title: "Understand the opportunity",
    description: "What AI visibility is, why local businesses care, and what they pay for.",
    estimatedMinutes: 25,
    lessons: [
      lesson(
        "what-ai-visibility",
        "What AI visibility is",
        "People now ask ChatGPT, Claude, and Perplexity who to hire nearby. AI visibility is whether those tools name a business in the answer.",
        "Write one sentence you could say to a business owner that explains AI visibility in plain words.",
        "AI visibility one-pager (coming soon)",
        8,
      ),
      lesson(
        "why-local-businesses-care",
        "Why local businesses care",
        "If AI names a competitor and not them, they lose the customer before a website visit or a Google result ever appears.",
        "List three local businesses in one category and guess whether AI would name them. You will check this later with a report.",
        "Example prompts worksheet (coming soon)",
        8,
      ),
      lesson(
        "what-businesses-pay-for",
        "What businesses are paying for",
        "They are not buying software. They are buying a monthly check plus a simple report that shows how they appear in AI search versus nearby competitors.",
        "Write the outcome you will promise: monitoring, competitor tracking, and a monthly report they can understand.",
        "Service outcome checklist (coming soon)",
        9,
      ),
    ],
  },
  {
    id: "build-your-offer",
    slug: "build-your-offer",
    number: 2,
    title: "Build your AI agency offer",
    description: "Pick a niche, explain the service simply, and set starter pricing.",
    estimatedMinutes: 30,
    lessons: [
      lesson(
        "pick-a-niche",
        "Pick a niche",
        "Start with one local category you can talk about, such as roofers, dentists, or med spas in one city.",
        "Choose one category and one city. Write them at the top of your notes and keep them for the rest of the program.",
        "Niche picker worksheet (coming soon)",
        10,
      ),
      lesson(
        "explain-the-service",
        "Explain the service simply",
        "A business owner should understand you in one sentence: you check whether AI recommends them, show who wins instead, and keep watching it every month.",
        "Write your one-sentence offer. Read it out loud. If it needs extra explanation, shorten it.",
        "Offer script card (coming soon)",
        10,
      ),
      lesson(
        "starter-pricing",
        "Create starter pricing",
        "A simple starting point is a monthly monitoring fee, often around $500 a month. That is an example, not a rule. Set a number you can explain.",
        "Write a starter, growth, and premium monthly price you could show a first client. Keep the differences obvious.",
        "Pricing table template (coming soon)",
        10,
      ),
    ],
  },
  {
    id: "find-prospects",
    slug: "find-prospects",
    number: 3,
    title: "Find your first prospects",
    description: "Find local businesses, run a report, and send a short outreach message.",
    estimatedMinutes: 35,
    lessons: [
      lesson(
        "identify-prospects",
        "Identify local business prospects",
        "Look for businesses with a website and a Google listing in your niche. You only need a short list to start.",
        "Write down 10 local businesses in your niche, with website and city.",
        "Prospect list template (coming soon)",
        12,
      ),
      lesson(
        "run-a-report",
        "Run a report",
        "A report compares how the business shows up in AI answers against nearby competitors. You will use Customers.Direct for this once the software is active.",
        "Pick one business from your list. Write the prompts a customer would type, such as best [category] near me.",
        "Prompt list template (coming soon)",
        12,
      ),
      lesson(
        "outreach-scripts",
        "Use outreach scripts",
        "Keep the first message short. Offer the report. Do not pitch a long contract in the first note.",
        "Copy the outreach script from this program, swap in the business category, and save it as your default message.",
        "Outreach script card (coming soon)",
        11,
      ),
    ],
  },
  {
    id: "sell-the-service",
    slug: "sell-the-service",
    number: 4,
    title: "Sell the service",
    description: "Present the report, handle basic objections, and close the monthly service.",
    estimatedMinutes: 30,
    lessons: [
      lesson(
        "present-the-report",
        "Present the report",
        "Show what AI said, who got named, and what that means for new customers. Stay on the page. Do not drown them in tools.",
        "Practice a 5 minute walkthrough: the question, the answer, the competitor, the monthly plan.",
        "Report walkthrough outline (coming soon)",
        10,
      ),
      lesson(
        "handle-objections",
        "Handle basic objections",
        "Common replies: they already do SEO, they want to think about it, or they are not sure AI matters yet. Answer with the report, not with pressure.",
        "Write a calm reply to \"we already have SEO\" and \"can you send this in an email\".",
        "Objection notes (coming soon)",
        10,
      ),
      lesson(
        "close-monthly",
        "Close the monthly service",
        "Ask for a monthly monitoring agreement. One price, one report cadence, a start date.",
        "Write the close: price, what they get each month, and the start date you will propose.",
        "Close checklist (coming soon)",
        10,
      ),
    ],
  },
  {
    id: "get-paid-and-deliver",
    slug: "get-paid-and-deliver",
    number: 5,
    title: "Get paid and deliver",
    description: "Set up recurring payments, onboard the client, and send a monthly report.",
    estimatedMinutes: 30,
    lessons: [
      lesson(
        "recurring-payments",
        "Set up recurring payments",
        "Collect the monthly fee on a card or invoice on the same day each month. Do this in your own billing tool. The $97 kit does not charge your clients.",
        "Pick the tool you will use to collect monthly payments and write the billing day you will use.",
        "Billing setup notes (coming soon)",
        10,
      ),
      lesson(
        "onboard-clients",
        "Onboard clients",
        "Collect the website, category, city, and who should receive the report. Confirm the monthly price in writing.",
        "Fill an onboarding checklist for a fictional first client in your niche.",
        "Onboarding checklist (coming soon)",
        10,
      ),
      lesson(
        "monthly-reporting",
        "Deliver monthly reporting",
        "Each month, send a short report: mention rate, competitors named, and what changed. Keep it readable on a phone.",
        "Sketch the three sections of your monthly report and the sentence you will send with it.",
        "Monthly report outline (coming soon)",
        10,
      ),
    ],
  },
  {
    id: "activate-customers-direct",
    slug: "activate-customers-direct",
    number: 6,
    title: "Activate Customers.Direct",
    description: "The kit taught the business. Agency software is how you run it for clients.",
    estimatedMinutes: 15,
    isActivationModule: true,
    lessons: [
      lesson(
        "kit-vs-software",
        "What the $97 kit covered",
        "The Launch Kit is training, scripts, templates, pricing guidance, and a first-client plan. It is a one-time purchase.",
        "Confirm you still have your niche, offer sentence, and outreach script written down.",
        "Kit recap sheet (coming soon)",
        5,
      ),
      lesson(
        "what-agency-includes",
        "What Agency software includes",
        "Customers.Direct Agency is the product: AI visibility scans, prompt tracking, competitor tracking, client accounts, white-label reports, and an agency dashboard.",
        "Write which first client you will load into the software after you activate.",
        "Software feature list (coming soon)",
        5,
      ),
      lesson(
        "activate-agency",
        "Activate when you are ready",
        "Agency software is $199 a month. It is a separate checkout. Buying the kit never starts this subscription.",
        "When you have a prospect or a client ready, open the activation page and start the $199 a month checkout.",
        "Activation checklist (coming soon)",
        5,
      ),
    ],
  },
];

export function allLessons(): Lesson[] {
  return MODULES.flatMap((module) => module.lessons);
}

export function getModule(slug: string): Module | undefined {
  return MODULES.find((item) => item.slug === slug);
}

export function getLesson(moduleSlug: string, lessonSlug: string): {
  module: Module;
  lesson: Lesson;
  lessonIndex: number;
} | undefined {
  const foundModule = getModule(moduleSlug);
  if (!foundModule) return undefined;
  const lessonIndex = foundModule.lessons.findIndex((item) => item.slug === lessonSlug);
  if (lessonIndex < 0) return undefined;
  return { module: foundModule, lesson: foundModule.lessons[lessonIndex], lessonIndex };
}

export function nextLessonPath(
  moduleSlug: string,
  lessonSlug: string,
): string | null {
  const found = getLesson(moduleSlug, lessonSlug);
  if (!found) return null;
  const { module: foundModule, lessonIndex } = found;
  const nextInModule = foundModule.lessons[lessonIndex + 1];
  if (nextInModule) return `/academy/${foundModule.slug}/${nextInModule.slug}`;
  const moduleIndex = MODULES.findIndex((item) => item.slug === foundModule.slug);
  const nextModule = MODULES[moduleIndex + 1];
  if (nextModule?.lessons[0]) {
    return `/academy/${nextModule.slug}/${nextModule.lessons[0].slug}`;
  }
  return "/academy";
}

export function firstIncompleteLessonPath(completedIds: Set<string>): string {
  for (const academyModule of MODULES) {
    for (const item of academyModule.lessons) {
      if (!completedIds.has(item.id)) {
        return `/academy/${academyModule.slug}/${item.slug}`;
      }
    }
  }
  return `/academy/${MODULES[0].slug}/${MODULES[0].lessons[0].slug}`;
}

export function moduleCompletion(academyModule: Module, completedIds: Set<string>): {
  done: number;
  total: number;
  complete: boolean;
} {
  const total = academyModule.lessons.length;
  const done = academyModule.lessons.filter((item) => completedIds.has(item.id)).length;
  return { done, total, complete: done === total };
}
