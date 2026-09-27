// Drafts the industry question library with Claude Sonnet (B-32 step 2, MVP_SPEC 5.3): about 40 templates
// for each of the 10 industries, written to supabase/seed/question-library.v1.json as a draft for a
// person to review (step 3). Real paid calls, so it only runs with LIVE_AI_CALL=1, and only after the AI
// keys are rotated (B-01):
//   LIVE_AI_CALL=1 npm run question-library:generate
// The key comes from the shell, or else .env.local. Industries already in the draft are kept, so a
// stopped run resumes. An approved file is never overwritten.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { expect, it } from "vitest";
import { LIBRARY_INDUSTRIES } from "@/lib/industries";
import { libraryFileSchema, validateLibrary, type LibraryFile } from "@/modules/question-library";
import { createTemplateDrafter } from "@/modules/question-library/generate";
import { GENERATE_MODEL, GENERATE_PROMPT_VERSION } from "@/modules/question-library/prompts/generate-templates.v1";

const live = process.env.LIVE_AI_CALL === "1";
const OUT = "supabase/seed/question-library.v1.json";

function key(name: string): string {
  const fromFile = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8"))[name] : undefined;
  const value = process.env[name] || fromFile;
  if (!value) throw new Error(`${name} is not set in the shell or .env.local`);
  return value;
}

function save(file: LibraryFile) {
  writeFileSync(OUT, `${JSON.stringify(file, null, 2)}\n`);
}

it.runIf(live)("draft the question library", { timeout: 60 * 60_000 }, async () => {
  const existing = existsSync(OUT) ? libraryFileSchema.parse(JSON.parse(readFileSync(OUT, "utf8"))) : null;
  if (existing && existing.status !== "draft") throw new Error(`${OUT} is ${existing.status}; not overwriting it`);

  const file: LibraryFile = existing ?? {
    version: 1,
    status: "draft",
    promptVersion: GENERATE_PROMPT_VERSION,
    model: GENERATE_MODEL,
    generatedAt: new Date().toISOString(),
    review: null,
    templates: [],
  };
  const draft = createTemplateDrafter(key("ANTHROPIC_API_KEY"));
  const failures: string[] = [];

  for (const industry of LIBRARY_INDUSTRIES) {
    if (file.templates.some((t) => t.industry === industry)) continue;
    try {
      file.templates.push(...(await draft(industry)));
      save(file);
      console.log(`drafted ${industry}`);
    } catch (err) {
      failures.push(`${industry}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const result = validateLibrary(file);
  for (const w of result.warnings) console.warn(`warning: ${w}`);
  if (!result.ok) console.error(`Fix during review:\n- ${result.errors.join("\n- ")}`);
  console.log(`Draft written to ${OUT}. A person now reviews every template, then sets status "approved" and review.`);
  expect(failures).toEqual([]);
});

it.skipIf(live)("skipped: set LIVE_AI_CALL=1 (and rotate the AI keys first, B-01) to make the real calls", () => {});
