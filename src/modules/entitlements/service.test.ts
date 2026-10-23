import { describe, expect, it } from "vitest";
import {
  fitsPlan,
  canAddBusiness,
  canFinishDraft,
  canEditTracking,
  canSpendTopUps,
  canStartScan,
  maxCompetitors,
  maxQuestions,
  REASONS,
  type AgencyFacts,
  type BusinessFacts,
} from "./service";

const agency = (over: Partial<AgencyFacts> = {}): AgencyFacts => ({
  id: "agency-1",
  status: "active",
  businessCount: 1,
  balance: 100,
  trialOver: false,
  ...over,
});

const business = (over: Partial<BusinessFacts> = {}): BusinessFacts => ({
  id: "business-1",
  agencyId: "agency-1",
  planName: "Starter",
  maxQuestions: 25,
  maxCompetitors: 5,
  activeQuestionCount: 0,
  competitorCount: 0,
  hasOpenScan: false,
  onPlan: true,
  ...over,
});

const blockedStatuses = [
  ["past_due", REASONS.pastDue],
  ["canceled", REASONS.canceled],
  ["suspended", REASONS.paused],
  ["deleted", REASONS.paused],
] as const;

describe("canEditTracking (BUG-C)", () => {
  it("is read-only once the plan has ended", () => {
    expect(canEditTracking({ status: "canceled" })).toEqual({ allowed: false, reason: REASONS.readOnly });
    expect(canEditTracking({ status: "suspended" })).toEqual({ allowed: false, reason: REASONS.paused });
  });

  it("allows edits on a trial, a live plan, or while a payment is retried", () => {
    for (const status of ["trialing", "active", "past_due"]) expect(canEditTracking({ status }).allowed).toBe(true);
  });
});

describe("canSpendTopUps", () => {
  it.each(["trialing", "active"])("allows a %s agency", (status) => {
    expect(canSpendTopUps(agency({ status }))).toEqual({ allowed: true, reason: "" });
  });

  it.each(blockedStatuses)("blocks a %s agency", (status, reason) => {
    expect(canSpendTopUps(agency({ status }))).toEqual({ allowed: false, reason });
  });
});

describe("canAddBusiness", () => {
  it("lets a trial agency add its second business", () => {
    expect(canAddBusiness(agency({ status: "trialing", businessCount: 1 })).allowed).toBe(true);
  });

  it("stops a trial agency at 2 businesses", () => {
    expect(canAddBusiness(agency({ status: "trialing", businessCount: 2 }))).toEqual({
      allowed: false,
      reason: "Your trial includes 2 businesses. Upgrade to add more.",
    });
  });

  it("has no business limit on a paid plan", () => {
    expect(canAddBusiness(agency({ status: "active", businessCount: 40 })).allowed).toBe(true);
  });

  it.each(blockedStatuses)("blocks a %s agency", (status, reason) => {
    expect(canAddBusiness(agency({ status, businessCount: 0 }))).toEqual({ allowed: false, reason });
  });
});

describe("canFinishDraft", () => {
  // businessCount holds set-up businesses only, so the draft being finished is not in it.
  it("lets a trial with 1 set-up business finish its draft", () => {
    expect(canFinishDraft(agency({ status: "trialing", businessCount: 1 })).allowed).toBe(true);
  });

  it("stops a trial with 2 set-up businesses from turning on a third", () => {
    expect(canFinishDraft(agency({ status: "trialing", businessCount: 2 }))).toEqual({
      allowed: false,
      reason: "Your trial includes 2 businesses. Upgrade to add more.",
    });
  });

  it("has no limit on a paid plan, and never blocks on status alone", () => {
    expect(canFinishDraft(agency({ status: "active", businessCount: 40 })).allowed).toBe(true);
    expect(canFinishDraft(agency({ status: "past_due", businessCount: 0 })).allowed).toBe(true);
  });
});

describe("canStartScan", () => {
  it("allows a scan with credits, a live plan and no open job", () => {
    expect(canStartScan(agency(), business())).toEqual({ allowed: true, reason: "" });
    expect(canStartScan(agency({ status: "trialing", balance: 1 }), business()).allowed).toBe(true);
  });

  it.each([0, -12])("says out of credits at a balance of %i", (balance) => {
    expect(canStartScan(agency({ balance }), business())).toEqual({
      allowed: false,
      reason: "You're out of credits. Buy a top-up or upgrade.",
    });
  });

  it("blocks a second scan while one is queued or running", () => {
    expect(canStartScan(agency(), business({ hasOpenScan: true }))).toEqual({
      allowed: false,
      reason: REASONS.scanAlreadyQueued,
    });
  });

  it.each(blockedStatuses)("blocks a %s agency even with top-up credits left", (status, reason) => {
    expect(canStartScan(agency({ status, balance: 500 }), business())).toEqual({ allowed: false, reason });
  });

  it("blocks a business from another agency", () => {
    expect(canStartScan(agency(), business({ agencyId: "agency-2" }))).toEqual({
      allowed: false,
      reason: REASONS.notYourBusiness,
    });
    expect(canStartScan(agency(), business({ agencyId: null })).allowed).toBe(false);
  });

  it("blocks a business taken off the plan, even with credits (M1)", () => {
    expect(canStartScan(agency({ balance: 500 }), business({ onPlan: false }))).toEqual({
      allowed: false,
      reason: "This business is off your plan.",
    });
    // The account problem still comes first.
    expect(canStartScan(agency({ status: "past_due" }), business({ onPlan: false })).reason).toBe(REASONS.pastDue);
  });

  it("reports the account problem before the credit problem", () => {
    expect(canStartScan(agency({ status: "canceled", balance: 0 }), business()).reason).toBe(REASONS.canceled);
  });
});

describe("maxQuestions", () => {
  it("allows up to the plan limit", () => {
    expect(maxQuestions(business({ activeQuestionCount: 24 }))).toEqual({ allowed: true, reason: "", limit: 25 });
  });

  it("stops at the plan limit with the plan name", () => {
    expect(maxQuestions(business({ activeQuestionCount: 25 }))).toEqual({
      allowed: false,
      reason: "Your Starter plan includes 25 questions per business. Upgrade or remove one to add another.",
      limit: 25,
    });
  });

  it("has no limit when the plan sets none", () => {
    expect(maxQuestions(business({ maxQuestions: null, activeQuestionCount: 500 }))).toEqual({
      allowed: true,
      reason: "",
      limit: null,
    });
  });
});

describe("maxCompetitors", () => {
  it("allows up to the plan limit", () => {
    expect(maxCompetitors(business({ competitorCount: 4 })).allowed).toBe(true);
  });

  it("stops at the plan limit with the plan name", () => {
    expect(maxCompetitors(business({ planName: "Pro", maxCompetitors: 10, competitorCount: 10 }))).toEqual({
      allowed: false,
      reason: "Your Pro plan includes 10 competitors per business. Upgrade or remove one to add another.",
      limit: 10,
    });
  });

  it("has no limit when the plan sets none", () => {
    expect(maxCompetitors(business({ maxCompetitors: null, competitorCount: 99 })).limit).toBeNull();
  });
});

describe("fitsPlan", () => {
  const starter = { name: "Starter", maxCompetitors: 5, maxQuestions: 25 };
  it("allows a business inside the smaller plan's limits", () => {
    expect(fitsPlan(business({ competitorCount: 5, activeQuestionCount: 25 }), starter).allowed).toBe(true);
    expect(fitsPlan(business({ competitorCount: 40 }), { name: "Custom", maxCompetitors: null, maxQuestions: null }).allowed).toBe(true);
  });
  it("says what to remove first", () => {
    expect(fitsPlan(business({ competitorCount: 8 }), starter)).toEqual({
      allowed: false,
      reason: "Starter tracks up to 5 competitors per business and this one has 8. Remove 3 competitors on the Competitors page, then move it to Starter.",
    });
    expect(fitsPlan(business({ competitorCount: 6 }), starter).reason).toContain("Remove 1 competitor on");
    expect(fitsPlan(business({ competitorCount: 2, activeQuestionCount: 26 }), starter).reason).toContain("Remove 1 question on the Questions page");
  });
});

describe("a trial past its end date with no payment confirmed", () => {
  it("refuses scans and top-up spending, even with credits left", () => {
    const over = agency({ status: "trialing", balance: 330, trialOver: true });
    expect(canStartScan(over, business())).toEqual({ allowed: false, reason: REASONS.trialOver });
    expect(canSpendTopUps(over).allowed).toBe(false);
    expect(canStartScan(agency({ status: "trialing", balance: 330 }), business()).allowed).toBe(true);
  });
  it("still allows edits, which spend nothing", () => {
    expect(canEditTracking(agency({ status: "trialing", trialOver: true })).allowed).toBe(true);
  });
});
