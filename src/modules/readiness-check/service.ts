import { readinessScore, type Signals } from "./signals";
import type { CheckRow, Finding, ReadinessCheckResult } from "./schema";

const CHECKS: { key: keyof Signals; label: string; detail: string }[] = [
  { key: "hasStructuredData", label: "Website info for AI", detail: "Hidden business details on the website that AI tools can read" },
  { key: "hasBusinessType", label: "Business type stated", detail: "The hidden business details say what kind of business this is" },
  { key: "hasDescription", label: "Page summary", detail: "A clear description of the page for search and AI tools" },
  { key: "hasPhone", label: "Phone number", detail: "A phone number on the home page" },
  { key: "hasAddress", label: "Address", detail: "A street address marked up on the page" },
  { key: "hasContactForm", label: "Contact or booking form", detail: "A way to ask for a quote or book" },
  { key: "hasReviews", label: "Reviews mentioned", detail: "Reviews or testimonials on the home page" },
];

function has(s: Signals | null, key: keyof Signals): boolean {
  return s ? Boolean(s[key]) : false;
}

export function buildChecks(mine: Signals | null, them: Signals | null): CheckRow[] {
  return CHECKS.map(({ key, label, detail }) => ({ label, detail, mine: has(mine, key), them: has(them, key) }));
}

export function buildFindings(mine: Signals | null, them: Signals | null): Finding[] {
  if (!mine) return [];
  const findings: Finding[] = [];
  const theyHave = (key: keyof Signals) => !has(mine, key) && has(them, key);

  if (!mine.hasStructuredData) {
    findings.push({
      level: "High impact",
      title: "Add business details for AI",
      detail: `${
        theyHave("hasStructuredData") ? "Your competitor's site has hidden business details for AI and yours does not." : "Your site has no hidden business details for AI."
      } It tells AI tools your business name, type, address and hours in a format they read reliably.`,
    });
  } else if (!mine.hasBusinessType) {
    findings.push({
      level: "High impact",
      title: "Say what kind of business you are",
      detail: "Your hidden business details do not name a business type, such as dentist or plumber. Adding one helps AI tools place you in local answers.",
    });
  }
  if (mine.wordCount <= 300) {
    findings.push({
      level: "High impact",
      title: "Explain your services in more detail",
      detail: "Your home page has little text. AI tools can only describe what your site actually says.",
    });
  }
  if (!mine.hasPhone || !mine.hasAddress) {
    findings.push({
      level: "Worth doing",
      title: "Show your phone number and address",
      detail: "Clear contact details help AI tools confirm where you are and that you are a real local business.",
    });
  }
  if (theyHave("hasReviews")) {
    findings.push({
      level: "Worth doing",
      title: "Show your reviews on your site",
      detail: "Your competitor mentions reviews on their home page and you do not.",
    });
  }
  if (theyHave("hasContactForm")) {
    findings.push({
      level: "Worth doing",
      title: "Add a contact or booking form",
      detail: "Your competitor has one on their home page. It makes the next step clear for visitors.",
    });
  }
  if (findings.length === 0) {
    findings.push({
      level: "Keep it up",
      title: "Your website basics are in good shape",
      detail: "A good website does not guarantee AI recommends you. The full check asks ChatGPT, Claude and Perplexity directly.",
    });
  }
  return findings.slice(0, 4);
}

export function compareSites(
  mine: { domain: string; signals: Signals | null },
  them: { domain: string; signals: Signals | null },
): ReadinessCheckResult {
  const site = (s: typeof mine) => ({
    domain: s.domain,
    reached: s.signals !== null,
    score: s.signals ? readinessScore(s.signals) : 0,
  });
  return {
    mine: site(mine),
    them: site(them),
    checks: buildChecks(mine.signals, them.signals),
    findings: buildFindings(mine.signals, them.signals),
  };
}
