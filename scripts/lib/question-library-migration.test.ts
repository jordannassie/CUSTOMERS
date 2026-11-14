import { describe, expect, it } from "vitest";
import { libraryMigrationSql, nextMigrationNumber } from "./question-library-migration";

const approved = {
  version: 1,
  status: "approved",
  promptVersion: "test",
  model: "test",
  generatedAt: "2026-11-14T00:00:00.000Z",
  review: { reviewer: "A Person", reviewedAt: "2026-11-14" },
  templates: [
    { industry: "dentist", template: "Who's the best dentist in {city}?", tags: ["General", " family dentistry "], intent: "best" },
    { industry: "plumber", template: "Which plumber in {city} can come today?", tags: ["emergency"], intent: "urgent", source: "manual-draft" },
  ],
};

describe("nextMigrationNumber", () => {
  it("takes the number after the highest migration", () => {
    expect(nextMigrationNumber(["001_init.sql", "094_data_api_grants.sql", "095_x.sql", "README.md"])).toBe("096");
    expect(nextMigrationNumber([])).toBe("001");
  });
});

describe("libraryMigrationSql", () => {
  it("inserts every approved template once, with quotes escaped and tags trimmed and lower-cased", () => {
    const out = libraryMigrationSql(approved, "096", "supabase/seed/question-library.v1.json");
    expect(out).toContain("-- Migration 096: question library version 1, 2 templates, approved by A Person on 2026-11-14");
    expect(out).toContain("('dentist', 'Who''s the best dentist in {city}?', array['general', 'family dentistry']::text[], 'best', 1)");
    expect(out).toContain("('plumber', 'Which plumber in {city} can come today?', array['emergency']::text[], 'urgent', 1)");
    expect(out).toMatch(/where not exists \(\s+select 1\s+from public\.question_library q/);
    expect(out).not.toMatch(/create table/i);
  });

  it("refuses a draft file and an approved file without a reviewer", () => {
    expect(() => libraryMigrationSql({ ...approved, status: "draft", review: null }, "096", "x")).toThrow(/approved/);
    expect(() => libraryMigrationSql({ ...approved, review: null }, "096", "x")).toThrow();
  });
});
