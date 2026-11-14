// Fast checks for the per-field grader (no provider call): the grading rules, the dataset format, and the real
// auto-fill flow on fixtures for the two 2026-10-15 cases (a med spa Google calls "spa", a page title as the name).
import { describe, expect, it } from "vitest";
import { autofill } from "@/modules/onboarding/autofill";
import { COFFEE_PAGES, COFFEE_PLACE, COFFEE_SITE_OUTPUT, fakeClients } from "@/modules/onboarding/fixtures";
import { AUTOFILL_MODEL } from "@/modules/onboarding/prompts/business-autofill.v1";
import { EMPTY_DETAILS } from "@/modules/onboarding/service";
import { fieldAccuracy, fieldsApiError, gradeFields, loadFields, nameOk, servicesOk, type FieldsCase } from "./fields";

const MED_SPA: FieldsCase = {
  id: "fx-med-spa",
  input: { domain: "perfect-med-spa.example" },
  blocksScanners: false,
  expected: { name: "Perfect Med Spa", industry: "med_spa", city: "New York", phonePresent: true, services: ["Botox", "dermal fillers", "laser hair removal", "chemical peels"] },
  labelledBy: "fixture",
  labelledAt: "2026-10-15",
};

describe("per-field grader", () => {
  it("counts a name with a little more, never a page title", () => {
    expect(nameOk("Perfect Med Spa", "Perfect Med Spa")).toBe(true);
    expect(nameOk("Perfect Med Spa", "Perfect Med Spa NYC")).toBe(true);
    expect(nameOk("Wilshire Smile Studio", "Wilshire Smile Studio - Los Angeles Dentist, Cosmetic and Emergency Dentistry")).toBe(false);
    expect(nameOk("Perfect Med Spa", "")).toBe(false);
    expect(nameOk("Capital City Heating & Cooling", "Capital City Heating and Cooling Inc.")).toBe(true);
  });

  it("needs at least 3 services the site really names", () => {
    expect(servicesOk(MED_SPA.expected.services, ["Botox injections", "lip fillers", "laser treatments"])).toBe(true);
    expect(servicesOk(MED_SPA.expected.services, ["Botox", "massage", "yoga"])).toBe(false);
    expect(servicesOk(["books"], ["used books"])).toBe(true);
  });

  it("grades each field and keeps API errors out of the accuracy", () => {
    const right = gradeFields(MED_SPA, { ...EMPTY_DETAILS, name: "Perfect Med Spa", industry: "med_spa", city: "New York", phone: "(212) 555-0100", services: ["Botox", "fillers", "laser hair removal"] });
    const wrong = gradeFields(MED_SPA, { ...EMPTY_DETAILS, name: "Perfect Med Spa", industry: "other", industryText: "Spa", city: "Brooklyn", services: [] });
    expect(wrong.ok).toEqual({ name: true, industry: false, city: false, phone: false, services: false });
    expect(fieldAccuracy([right, wrong, fieldsApiError(MED_SPA, "places: 429")])).toEqual({
      total: 3,
      scored: 2,
      apiErrors: 1,
      perField: { name: 1, industry: 0.5, city: 0.5, phone: 0.5, services: 0.5 },
    });
  });

  it("reads fields.v1.jsonl when it is there: ids unique, every industry and some other", () => {
    const cases = loadFields();
    if (cases === null) return;
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
    expect(new Set(cases.map((c) => c.expected.industry)).size).toBeGreaterThanOrEqual(10);
    expect(cases.filter((c) => c.expected.industry === "other").length).toBeGreaterThanOrEqual(3);
  });
});

describe("auto-fill on fixtures, graded per field", () => {
  it("a med spa Google lists as a spa, with a page title for a name, comes in as the brand and med spa", async () => {
    const domain = MED_SPA.input.domain;
    const place = {
      ...COFFEE_PLACE,
      name: "Perfect Med Spa | Botox, Fillers & Laser in NYC",
      primaryType: "spa",
      types: ["spa", "skin_care_clinic", "beauty_salon"],
      websiteUri: `https://${domain}/`,
      city: "New York",
      state: "NY",
    };
    const output = { ...COFFEE_SITE_OUTPUT, name: "Perfect Med Spa", industry: "med_spa" as const, services: MED_SPA.expected.services, city: "New York" };
    const { clients } = fakeClients({ pages: COFFEE_PAGES, places: { [domain]: [place] }, outputs: { [AUTOFILL_MODEL]: output } });
    const run = await autofill({ domain }, clients);
    expect(gradeFields(MED_SPA, run.result.details).ok).toEqual({ name: true, industry: true, city: true, phone: true, services: true });
    expect(run.result.details.name).toBe("Perfect Med Spa");
  });
});
