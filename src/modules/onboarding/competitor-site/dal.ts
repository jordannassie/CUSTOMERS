import "server-only";
// Reads a competitor's website for "Check their website" (B-91) with the same clients as auto-fill: Firecrawl and
// Claude (OpenAI as the backup, D-84), or the fixtures in fixture mode. The AI cost is recorded against the business
// asking. robots.txt is one small direct fetch, no AI. Callers check the user may see the business, the 30-day reuse
// and the rate limit first.
import { safeFetch } from "@/lib/net/safe-fetch";
import { liveAutofillClients, onboardingFixtures } from "../dal";
import { BEAN_DOMAIN, COFFEE_DOMAIN } from "../fixtures";
import { aiBlocked } from "./robots";
import { readCompetitorSite, type CompetitorSiteFacts, type ReadRobots } from "./service";

const ROBOTS_TIMEOUT_MS = 5_000;

// Fixture mode: Sunrise's own site turns two AI crawlers away, Bean House lets them all in.
const FIXTURE_ROBOTS: Record<string, string> = {
  [COFFEE_DOMAIN]: "User-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: *\nAllow: /",
  [BEAN_DOMAIN]: "User-agent: *\nAllow: /",
};

const liveRobots: ReadRobots = async (domain) => {
  const res = await safeFetch(`https://${domain}/robots.txt`, { timeoutMs: ROBOTS_TIMEOUT_MS });
  // No robots.txt means nothing is turned away.
  if (res.status === 404 || res.status === 410) return [];
  if (!res.ok) return null;
  return aiBlocked(res.text);
};

const fixtureRobots: ReadRobots = async (domain) => (domain in FIXTURE_ROBOTS ? aiBlocked(FIXTURE_ROBOTS[domain]) : []);

export async function readCompetitorWebsite(
  domain: string,
  usage: { accountUserId: string; businessId: string },
): Promise<CompetitorSiteFacts | null> {
  const { scrape, extract } = liveAutofillClients(usage);
  return readCompetitorSite(domain, { scrape, extract, robots: onboardingFixtures() ? fixtureRobots : liveRobots });
}
