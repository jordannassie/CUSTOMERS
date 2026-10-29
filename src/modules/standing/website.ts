// Their website against yours (B-91): what their site lists that yours doesn't, tied to the questions they win when
// the words match. Pure. Both sides come from the sites' own words (website_facts and business_site_facts), with the
// page each service was found on, so every claim can be checked. Only a read site on both sides is compared.
import { meaningWords } from "@/lib/site-claims";
import { possessive, type Fact } from "./reasons";
import { questionFacts, signalFacts, type ClaimSet, type SignalSet } from "./site-signals";

/** signals, claims and words: from a "Check their website" read (step 1 and 2); absent on older saved facts. */
export type TheirWebsite = {
  status: "read" | "blocked" | "unreachable";
  services: { name: string; page: string | null }[];
  hasPhone: boolean | null;
  hasAddress: boolean | null;
  signals?: SignalSet | null;
  claims?: ClaimSet;
  words?: string[];
};

/** Your site: from setup's facts, or, once a check read it the same way as theirs, with signals, claims and words. */
export type YourSite = {
  read: boolean;
  services: string[];
  hasPhone: boolean | null;
  hasAddress: boolean | null;
  signals?: SignalSet | null;
  claims?: ClaimSet;
  words?: string[];
};

const MAX_GAPS = 2;

export { meaningWords };

const pageName = (page: string | null) => (page === "/" ? "home page" : page ? `${page} page` : "website");

/** Services on their site with no word in common with any service on yours. */
export function serviceGaps(theirs: TheirWebsite, yours: YourSite): TheirWebsite["services"] {
  const ours = new Set(yours.services.flatMap(meaningWords));
  return theirs.services.filter((s) => {
    const words = meaningWords(s.name);
    return words.length > 0 && !words.some((w) => ours.has(w));
  });
}

export function websiteGaps(name: string, theirs: TheirWebsite | null, yours: YourSite, questionsTheyWin: { question: string }[]): Fact[] {
  if (!theirs || theirs.status !== "read" || !yours.read) return [];
  const gaps = serviceGaps(theirs, yours).map((s) => {
    const words = new Set(meaningWords(s.name));
    const won = questionsTheyWin.find((q) => meaningWords(q.question).some((w) => words.has(w)));
    return { service: s, won };
  });
  gaps.sort((a, b) => Number(!!b.won) - Number(!!a.won));
  const facts: Fact[] = gaps.slice(0, MAX_GAPS).map(({ service, won }) => ({
    title: `Their website lists ${service.name}`,
    action: `If you offer ${service.name}, add it to the services page on your website, with a short description.`,
    match: meaningWords(service.name),
    detail: won ? `Not in the services on yours. AI named them more often on "${won.question}".` : `Not in the services on yours. Found on their ${pageName(service.page)}.`,
    text: `${possessive(name)} website lists ${service.name}, and the services on your website don't include it.`,
    where: "website",
    weight: won ? 6 : 3.5,
    key: `web:service:${service.name.toLowerCase()}`,
    basis: "website" as const,
  }));
  if (theirs.hasPhone && yours.hasPhone === false) {
    facts.push({
      title: "Their website shows a phone number",
      detail: "We didn't find one on yours.",
      action: "Show your phone number on every page of your website, for example in the footer.",
      match: ["phone"],
      key: "web:phone",
      basis: "website",
      text: `${possessive(name)} website shows a phone number, and we didn't find one on yours.`,
      where: "website",
      weight: 2,
    });
  }
  if (theirs.hasAddress && yours.hasAddress === false) {
    facts.push({
      title: "Their website shows an address",
      detail: "We didn't find one on yours.",
      action: "Show your full address on your website, for example on the contact page and in the footer.",
      match: ["address"],
      key: "web:address",
      basis: "website",
      text: `${possessive(name)} website shows an address, and we didn't find one on yours.`,
      where: "website",
      weight: 1.5,
    });
  }
  return facts;
}

/** Step 1 and 2 together, when both sites were read the same way (a check read yours too). */
export function websiteChecks(theirs: TheirWebsite | null, yours: YourSite, questionsTheyWin: { question: string }[]): { behind: Fact[]; ahead: Fact[] } {
  if (!theirs || theirs.status !== "read" || !yours.read || !theirs.signals || !yours.signals) return { behind: [], ahead: [] };
  const signals = signalFacts(theirs.signals, yours.signals);
  const asked = questionFacts(questionsTheyWin, { claims: theirs.claims ?? [], words: theirs.words ?? [] }, { claims: yours.claims ?? [], words: yours.words ?? [] });
  return { behind: [...asked, ...signals.behind], ahead: signals.ahead };
}
