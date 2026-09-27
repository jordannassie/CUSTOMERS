// Runs the real question picking (one Claude Haiku call per business, paid) on the labelled businesses
// against the reviewed library file, so it lives in the AI suite (eval-ai.yml).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { expect, it } from "vitest";
import { createHarness, describeEval } from "vitest-evals";
import { createQuestionModel, type QuestionModel } from "@/modules/onboarding/question-model";
import { PICK_MODEL, PICK_PROMPT_VERSION } from "@/modules/onboarding/prompts/pick-questions.v1";
import { prepareQuestions, type QuestionSet } from "@/modules/onboarding/questions";
import { validateLibrary, type LibraryFile } from "@/modules/question-library";
import { apiErrorCase, gradeCase, LIBRARY_PATH, loadDataset, PASS_OVERLAP, poolNotInLibrary, score, type GradedCase, type PickingCase } from "./grader";

const dataset = loadDataset();
const apiKey = process.env.ANTHROPIC_API_KEY;

function loadApprovedLibrary(): LibraryFile | string {
  if (!existsSync(LIBRARY_PATH)) return "supabase/seed/question-library.v1.json does not exist yet (B-32)";
  const result = validateLibrary(JSON.parse(readFileSync(LIBRARY_PATH, "utf8")));
  if (!result.ok) return `the library file is not valid: ${result.errors[0]}`;
  if (result.file.status !== "approved") return `the library file is "${result.file.status}", not approved by a reviewer`;
  return result.file;
}

const library = loadApprovedLibrary();
const skipReason =
  dataset === null
    ? "evals/question-picking/dataset.v1.jsonl is not labelled yet (see README.md)"
    : typeof library === "string"
      ? library
      : !apiKey
        ? "ANTHROPIC_API_KEY is not set"
        : null;

function entriesFor(file: LibraryFile, industry: string) {
  return file.templates
    .filter((t) => t.industry === industry)
    .map((t, i) => ({ id: `${industry}-${i}`, template: t.template, tags: t.tags, intent: t.intent }));
}

type Output = { set: QuestionSet | null; apiError: string | null };

// prepareQuestions hides model failures behind the fallback; the eval records API errors so they
// count apart (principle 9), while bad answers from the model stay scored as fallbacks.
function recordingModel(errors: string[]): QuestionModel {
  const model = createQuestionModel(apiKey ?? "");
  const record = (err: unknown) => {
    if (err instanceof Anthropic.APIError) errors.push(`anthropic: ${err.message}`);
    throw err;
  };
  return { pick: (input) => model.pick(input).catch(record), write: (input) => model.write(input).catch(record) };
}

const harness = createHarness<PickingCase, Output>({
  name: "question-picking",
  run: async ({ input }) => {
    const errors: string[] = [];
    const file = library as LibraryFile;
    const set = await prepareQuestions(input.input, {
      loadLibrary: async (industry) => entriesFor(file, industry),
      model: recordingModel(errors),
    });
    const output: Output = errors.length ? { set: null, apiError: errors.join("; ") } : { set, apiError: null };
    return { events: [{ type: "message", role: "assistant", content: JSON.stringify(output) }], output };
  },
});

// Skipped until a person has labelled dataset.v1.jsonl (see README.md), the library is approved, and the key is set.
describeEval(`question picking ${PICK_PROMPT_VERSION}`, { harness, skipIf: () => skipReason !== null }, (it) => {
  it(`reaches overlap ${PASS_OVERLAP} with the acceptable pools`, async ({ run }) => {
    const file = library as LibraryFile;
    const graded: GradedCase[] = [];
    for (const c of dataset ?? []) {
      const entries = entriesFor(file, c.input.industry);
      expect(poolNotInLibrary(c, entries.map((e) => e.template)), `${c.id}: pool entries not in the library`).toEqual([]);
      const { output } = await run(c);
      if (!output.set) {
        graded.push(apiErrorCase(c, output.apiError ?? ""));
        continue;
      }
      const byId = new Map(entries.map((e) => [e.id, e.template]));
      const picked = output.set.questions.flatMap((q) => (q.templateId ? [byId.get(q.templateId) ?? ""] : []));
      graded.push(gradeCase(c, picked, output.set.source));
    }
    const result = { ...score(graded), model: PICK_MODEL, prompt: PICK_PROMPT_VERSION, libraryVersion: file.version };

    // Every case saved in full (principle 10). Real cost is read from the provider dashboard for now.
    const dir = new URL("../results/", import.meta.url);
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(new URL(`question-picking.${stamp}.json`, dir), JSON.stringify({ result, graded }, null, 2));

    console.log("question picking", result);
    for (const g of graded.filter((c) => c.missing.length || c.source === "fallback")) {
      console.log(`${g.id} (${g.source}): overlap ${g.overlap}, not acceptable ${JSON.stringify(g.missing)}`);
    }
    expect(result.scored).toBeGreaterThan(0);
    expect(result.meanOverlap).toBeGreaterThanOrEqual(PASS_OVERLAP);
  });
});

it.skipIf(skipReason === null)(`skipped: ${skipReason}`, () => {});
