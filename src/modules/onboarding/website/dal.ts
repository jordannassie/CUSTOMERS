import "server-only";
import { onboardingFixtures } from "../dal";
import { checkDomain } from "./domain-check";

/** False only when the website's address does not exist (a typo, BUG-102). Fixture mode never looks it up. */
export async function websiteExists(domain: string): Promise<boolean> {
  if (onboardingFixtures()) return true;
  return (await checkDomain(domain)) !== "not_found";
}
