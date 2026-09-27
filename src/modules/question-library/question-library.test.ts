import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateRequest, toTemplates } from "./generate";
import { GENERATE_MODEL } from "./prompts/generate-templates.v1";
import { LibraryNotLoadableError, toSeedRows } from "./service";
import { validateLibrary } from "./validate";
import type Anthropic from "@anthropic-ai/sdk";

const example = JSON.parse(readFileSync("tests/fixtures/question-library.example.json", "utf8"));
const approved = { ...example, status: "approved", review: { reviewer: "A Reviewer", reviewedAt: "2026-09-27" } };
const withTemplate = (t: object) => ({ ...example, templates: [{ ...example.templates[0], ...t }] });

describe("validateLibrary", () => {
  it("accepts the example file", () => {
    expect(validateLibrary(example)).toMatchObject({ ok: true, warnings: [] });
  });

  it.each([
    [{ template: "Who is the best dentist near me?" }, "missing {city}"],
    [{ tags: [] }, "at least one tag"],
    [{ tags: ["  "] }, "at least one tag"],
    [{ template: "Best dentist in {city} for {service}?" }, "unknown placeholder {service}"],
    [{ template: "Best dentist in {city}" }, "not a question"],
    [{ industry: "other" }, '"other" has no library'],
  ])("rejects %j", (t, message) => {
    const result = validateLibrary(withTemplate(t));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.join("\n")).toContain(message);
  });

  it("rejects a missing or unknown intent and industry", () => {
    const result = validateLibrary(withTemplate({ intent: "cheap", industry: "florist" }));
    expect(!result.ok && result.errors.join("\n")).toMatch(/intent[\s\S]*industry|industry[\s\S]*intent/);
  });

  it("rejects duplicates in one industry", () => {
    const dup = { ...example, templates: [example.templates[0], { ...example.templates[0], template: " who is the BEST dentist in {city}? " }] };
    expect(validateLibrary(dup)).toMatchObject({ ok: false });
  });

  it("requires the reviewer and date on an approved file", () => {
    expect(validateLibrary({ ...approved, review: null })).toMatchObject({ ok: false });
    expect(validateLibrary({ ...approved, review: { reviewer: "", reviewedAt: "2026-09-27" } })).toMatchObject({ ok: false });
    expect(validateLibrary({ ...approved, review: { reviewer: "A", reviewedAt: "last week" } })).toMatchObject({ ok: false });
  });

  it("warns when an industry is missing or far from about 40 templates", () => {
    const result = validateLibrary(approved);
    expect(result.ok && result.warnings).toContain("lawyer: 0 templates (expected about 40)");
  });
});

describe("toSeedRows", () => {
  it("loads only an approved file, with its version", () => {
    const rows = toSeedRows(approved);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual({
      industry: "dentist",
      template: "Which dentist in {city} offers emergency appointments?",
      tags: ["emergency dental care"],
      intent: "urgent",
      version: 1,
      active: true,
    });
  });

  it.each(["example", "draft"])("refuses a %s file", (status) => {
    expect(() => toSeedRows({ ...approved, status })).toThrow(LibraryNotLoadableError);
  });

  it("refuses an invalid approved file", () => {
    expect(() => toSeedRows({ ...approved, templates: [{ ...example.templates[0], tags: [] }] })).toThrow(/at least one tag/);
  });
});

describe("generator", () => {
  it("asks Claude Sonnet for one industry with structured output", () => {
    const req = generateRequest("med_spa");
    expect(req.model).toBe(GENERATE_MODEL);
    expect(GENERATE_MODEL).toBe("claude-sonnet-5");
    expect(req.messages[0].content).toContain("Med spa");
    expect(req.output_config.format.type).toBe("json_schema");
  });

  it("parses the reply into templates for that industry", () => {
    const text = JSON.stringify({ templates: [{ template: "Which med spa in {city} does lip filler?", tags: ["injectables"], intent: "best" }] });
    const message = { stop_reason: "end_turn", content: [{ type: "text", text }] } as unknown as Anthropic.Message;
    expect(toTemplates("med_spa", message)).toEqual([
      { industry: "med_spa", template: "Which med spa in {city} does lip filler?", tags: ["injectables"], intent: "best" },
    ]);
  });

  it("fails loudly when the reply is cut off", () => {
    const message = { stop_reason: "max_tokens", content: [] } as unknown as Anthropic.Message;
    expect(() => toTemplates("med_spa", message)).toThrow(/output tokens/);
  });
});

// Once the reviewed library exists, npm test keeps it valid.
const LIBRARY = "supabase/seed/question-library.v1.json";
it.skipIf(!existsSync(LIBRARY))("the library file passes validation", () => {
  const result = validateLibrary(JSON.parse(readFileSync(LIBRARY, "utf8")));
  expect(result.ok ? [] : result.errors).toEqual([]);
});
