// A stand-in for Claude that builds reasons from the facts with fixed wording. Test agencies use it
// so no live model is ever called for them (D-61), and tests use it to run the whole flow.
import type { WriteExplanation } from "./explain";
import type { ExplainInput } from "./facts";
import type { ExplainReason } from "./prompts/explain.v1";

export const TEMPLATE_MODEL = "template-writer";

const has = (input: ExplainInput, token: string) => input.placeholders.includes(token);

function competitorReason(input: ExplainInput): ExplainReason | null {
  const top = input.competitors[0];
  if (!top || top.answersNamingThem <= input.scan.answersNamingYou) return null;
  const scan = `${top.name} was named in ${top.answersNamingThem} of ${input.scan.answers} AI answers. You were named in ${input.scan.answersNamingYou}.`;
  const reviews =
    top.google?.reviewCount === "more" && has(input, `{${top.key}.review_count}`) && has(input, "{you.review_count}")
      ? ` On Google, ${top.name} has {${top.key}.review_count} reviews and you have {you.review_count}.`
      : "";
  return {
    title: reviews ? `${top.name} has more Google reviews than you` : `AI names ${top.name} more often than you`,
    evidence: scan + reviews,
    why_it_matters: reviews
      ? "AI assistants lean on review counts to decide which local businesses are trusted. More recent reviews make you a safer pick."
      : "AI assistants repeat the businesses they see mentioned most across the web.",
    steps: [
      "Ask every happy customer this week for a Google review, with a direct link to your review page.",
      "Reply to every new review within a day or two.",
      "Add the review link to your receipts and follow-up emails.",
    ],
    impact: "high",
    category: reviews ? "reviews_reputation" : "competitor_gap",
    fix_on_website: false,
    copy_for_claude: "",
  };
}

function citationReason(input: ExplainInput): ExplainReason | null {
  const site = input.citations.sites.find((s) => s.answersWithoutYou > 0);
  if (!site) return null;
  return {
    title: `AI reads ${site.domain} for these questions`,
    evidence: `AI cited ${site.domain} in ${site.answers} answers, and ${site.answersWithoutYou} of those answers did not name you.`,
    why_it_matters: "When AI trusts a site for your kind of business, being listed there with full details makes it more likely to name you.",
    steps: [
      `Search ${site.domain} for your business and check that your listing exists.`,
      "Make sure your name, address, phone and hours match your Google profile exactly.",
      "Add photos and your main services to the listing.",
    ],
    impact: "medium",
    category: "citations",
    fix_on_website: false,
    copy_for_claude: "",
  };
}

function websiteReason(input: ExplainInput): ExplainReason {
  const { business, yourWebsite } = input;
  const services = yourWebsite?.servicesListed ?? [];
  const where = business.website ? `${business.name} (${business.website})` : business.name;
  const city = business.city ?? "our city";
  if (!business.hasWebsite || !yourWebsite) {
    return {
      title: "AI has no website of yours to read",
      evidence: business.hasWebsite ? "We could not read your website when you signed up." : "You told us you do not have a website yet.",
      why_it_matters: "AI assistants quote business websites to answer questions. Without one, they have little to say about you.",
      steps: ["Create a simple one-page website with your services, address, phone and hours.", "Link it from your Google profile."],
      impact: "high",
      category: "local_presence",
      fix_on_website: true,
      copy_for_claude: `Write a simple one-page website for ${where} in ${city}. Include a short description, our services, address, phone and opening hours. Leave a clear gap marked [fill in] for every fact I have not given you, and do not invent any details.`,
    };
  }
  const missing = [!yourWebsite.hasPhone && "a phone number", !yourWebsite.hasAddress && "an address"].filter(Boolean);
  return {
    title: "Your website does not spell out what you offer",
    evidence:
      missing.length > 0
        ? `We read your website and did not find ${missing.join(" or ")}.`
        : `We read your website and found ${services.length} services listed.`,
    why_it_matters: "AI assistants answer from pages that state plainly what a business does and where it is.",
    steps: [
      "Give each main service its own short section with a heading that says what it is.",
      "Put your full address and phone number on every page, in the footer.",
    ],
    impact: "medium",
    category: "service_page",
    fix_on_website: true,
    copy_for_claude: `Help me improve the services page for ${where} in ${city}. Write one short section per service, and a footer with the address and phone number. Leave a clear gap marked [fill in] for every fact I have not given you, and do not invent any details.`,
  };
}

function questionReason(input: ExplainInput): ExplainReason | null {
  const q = input.questions[0];
  if (!q) return null;
  return {
    title: "AI skips you for a question your customers ask",
    evidence: `For "${q.question}", AI named you in ${q.answersNamingYou} of ${q.answers} answers.`,
    why_it_matters: "AI answers this question from pages that answer it directly. If your site does not, it names someone else.",
    steps: ["Add a short FAQ to your website that answers this question in plain words.", "Mention your city and neighborhood in the answer."],
    impact: "medium",
    category: "content",
    fix_on_website: true,
    copy_for_claude: `Write a short FAQ answer for the website of ${input.business.name} that answers: "${q.question}". Keep it short and plain. Leave a clear gap marked [fill in] for every fact I have not given you, and do not invent any details.`,
  };
}

export const templateWriter: WriteExplanation = async (input) => {
  const reasons = [competitorReason(input), citationReason(input), websiteReason(input), questionReason(input)].filter(
    (r): r is ExplainReason => r !== null,
  );
  return { output: { reasons }, model: TEMPLATE_MODEL, usage: null };
};
