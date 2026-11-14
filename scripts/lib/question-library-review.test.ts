import { describe, expect, it } from "vitest";
import type { LibraryFile } from "@/modules/question-library";
import { applyReview, flagsFor, reviewRows, ReviewImportError, similarity, summary, type ReviewTemplate } from "./question-library-review";

const t = (industry: ReviewTemplate["industry"], template: string, intent: ReviewTemplate["intent"] = "best", tags = ["general"]): ReviewTemplate => ({
  industry,
  template,
  intent,
  tags,
});

const file = (templates: ReviewTemplate[]): LibraryFile & { templates: ReviewTemplate[] } => ({
  version: 1,
  status: "draft",
  promptVersion: "test",
  model: "test",
  generatedAt: "2026-11-14T00:00:00.000Z",
  review: null,
  templates,
});

describe("flagsFor", () => {
  it("passes a clean template", () => {
    const clean = t("dentist", "Who is the best dentist in {city} for a family checkup?");
    expect(flagsFor(clean, [clean])).toEqual([]);
  });

  it("flags a missing city, near me wording, an unclear intent and another industry's words", () => {
    const bad = t("restaurant", "Is there a cozy cafe with great espresso near me?", "price");
    const flags = flagsFor(bad, [bad]);
    expect(flags).toContain("missing {city}");
    expect(flags).toContain("near me wording");
    expect(flags).toContain('intent "price" not clear from the wording');
    expect(flags).toContain("sounds like coffee shop");
  });

  it("flags fast food wording for restaurants unless the tags say fast food", () => {
    const fast = t("restaurant", "Where is the best fast food restaurant in {city}?");
    expect(flagsFor(fast, [fast])).toContain("fast food wording without a fast food tag");
    const tagged = t("restaurant", "Where is the best fast food restaurant in {city}?", "best", ["fast food"]);
    expect(flagsFor(tagged, [tagged])).not.toContain("fast food wording without a fast food tag");
  });

  it("flags exact and near duplicates within an industry, and hand-added templates", () => {
    const a = t("plumber", "Who is the best emergency plumber in {city}?", "urgent");
    const b = t("plumber", "Who's the best emergency plumber in {city} today?", "urgent");
    expect(similarity(a.template, b.template)).toBeGreaterThanOrEqual(0.75);
    expect(flagsFor(b, [a, b]).some((f) => f.startsWith("near duplicate"))).toBe(true);
    const manual = { ...t("salon", "Which salon in {city} has the best reviews for curly hair?", "reviews"), source: "manual-draft" };
    expect(flagsFor(manual, [manual])).toContain("added by hand (manual-draft): check it");
  });
});

describe("reviewRows and summary", () => {
  it("gives every template a stable id, its flags and keep as the default action", () => {
    const rows = reviewRows([t("dentist", "Who is the best dentist in {city} for a family checkup?")]);
    expect(rows[0]).toMatchObject({ id: "qlt-001", industry: "dentist", action: "keep", flags: "" });
  });

  it("counts templates per industry and lists thin intents", () => {
    const s = summary([t("dentist", "Who is the best dentist in {city}?")], 1);
    const dentist = s.find((x) => x.industry === "dentist")!;
    expect(dentist.templates).toBe(1);
    expect(dentist.thinIntents).toEqual(["urgent", "price", "reviews", "comparison"]);
    expect(s.find((x) => x.industry === "lawyer")!.templates).toBe(0);
  });
});

describe("applyReview", () => {
  const library = file([
    t("dentist", "Who is the best dentist in {city}?"),
    t("dentist", "What does a cleaning cost at a dentist in {city}?", "price"),
    t("dentist", "Which dentist in {city} has great reviews?", "reviews"),
  ]);

  it("keeps, edits, deletes and adds, and never approves the file", () => {
    const out = applyReview(library, [
      { id: "qlt-001", action: "keep" },
      { id: "qlt-002", action: "edit", new_template: "How much is a teeth cleaning at a dentist in {city}?", new_tags: "cleaning | price" },
      { id: "qlt-003", action: "delete" },
      { id: "", action: "add", industry: "dentist", intent: "urgent", template: "Which dentist in {city} takes emergency visits today?", tags: "emergency" },
    ]);
    expect(out.status).toBe("draft");
    expect(out.review).toBeNull();
    expect(out.templates.map((x) => x.template)).toEqual([
      "Who is the best dentist in {city}?",
      "How much is a teeth cleaning at a dentist in {city}?",
      "Which dentist in {city} takes emergency visits today?",
    ]);
    expect(out.templates[1].tags).toEqual(["cleaning", "price"]);
    expect(out.templates[2]).toMatchObject({ intent: "urgent", tags: ["emergency"], source: "review-added" });
  });

  it("lists every problem at once: missing rows, bad actions, unknown ids and incomplete edits", () => {
    try {
      applyReview(library, [
        { id: "qlt-001", action: "maybe" },
        { id: "qlt-002", action: "edit" },
        { id: "qlt-099", action: "keep" },
      ]);
      throw new Error("expected a ReviewImportError");
    } catch (error) {
      expect(error).toBeInstanceOf(ReviewImportError);
      const problems = (error as ReviewImportError).problems.join("\n");
      expect(problems).toMatch(/action must be keep, edit, delete or add/);
      expect(problems).toMatch(/edit needs new_template/);
      expect(problems).toMatch(/qlt-003 .* is missing from the sheet/);
      expect(problems).toMatch(/qlt-099 is not in the library file/);
    }
  });
});
