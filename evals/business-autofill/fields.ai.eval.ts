// Per-field accuracy of the real auto-fill on fields.v1.jsonl (2026-10-15): paid Firecrawl, Google Places and Claude
// calls per business, so it lives in the AI suite. Prints and saves accuracy for name, industry, city, phone and
// services; no pass level until a person has checked the labels and the first baseline (MVP_SPEC 25).
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createHarness, describeEval } from "vitest-evals";
import { autofill } from "@/modules/onboarding/autofill";
import { AUTOFILL_MODEL, AUTOFILL_PROMPT_VERSION, AUTOFILL_RETRY_MODEL } from "@/modules/onboarding/prompts/business-autofill.v1";
import type { BusinessDetails } from "@/modules/onboarding/schema";
import { EVAL_PROVIDER } from "../shared/ai-clients";
import { missingAutofillKeys, recordingClients } from "./clients";
import { fieldAccuracy, fieldsApiError, gradeFields, loadFields, type FieldsCase, type FieldsGraded } from "./fields";

// EVAL_ONLY=af-003,af-004 reruns some cases; EVAL_PACE_MS waits between businesses, since each reads about 4 pages
// and Firecrawl's per-minute limit failed every page after the third business on 2026-10-15.
const only = process.env.EVAL_ONLY?.split(",").map((s) => s.trim()).filter(Boolean);
const paceMs = Number(process.env.EVAL_PACE_MS ?? 0);
const cases = loadFields()?.filter((c) => !only?.length || only.includes(c.id)) ?? null;
const missingKeys = missingAutofillKeys();
const ready = cases !== null && missingKeys.length === 0;

type Output = { details: BusinessDetails | null; apiError: string | null };

const harness = createHarness<FieldsCase, Output>({
  name: "business-autofill-fields",
  run: async ({ input }) => {
    const errors: string[] = [];
    const run = await autofill(input.input, recordingClients(errors));
    const output: Output = errors.length ? { details: null, apiError: errors.join("; ") } : { details: run.result.details, apiError: null };
    return { events: [{ type: "message", role: "assistant", content: JSON.stringify(output) }], output };
  },
});

describeEval(`business auto-fill fields ${AUTOFILL_PROMPT_VERSION}`, { harness, skipIf: () => !ready }, (it) => {
  it("reports accuracy per field", async ({ run }) => {
    const graded: FieldsGraded[] = [];
    for (const [i, c] of (cases ?? []).entries()) {
      if (i > 0 && paceMs > 0) await new Promise((r) => setTimeout(r, paceMs));
      const { output } = await run(c);
      graded.push(output.details === null ? fieldsApiError(c, output.apiError ?? "") : gradeFields(c, output.details));
    }
    const result = { ...fieldAccuracy(graded), provider: EVAL_PROVIDER, models: [AUTOFILL_MODEL, AUTOFILL_RETRY_MODEL], prompt: AUTOFILL_PROMPT_VERSION };

    const dir = new URL("../results/", import.meta.url);
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(new URL(`business-autofill-fields.${EVAL_PROVIDER}.${stamp}.json`, dir), JSON.stringify({ result, graded }, null, 2));

    console.log("auto-fill accuracy per field", result);
    for (const g of graded.filter((x) => x.ok && Object.values(x.ok).includes(false))) {
      const misses = Object.entries(g.ok!).filter(([, ok]) => !ok).map(([f]) => f);
      console.log(`${g.id}: wrong ${misses.join(", ")}; got ${JSON.stringify(g.predicted)}`);
    }
    expect(result.scored).toBeGreaterThan(0);
  });
});

it.skipIf(ready)(
  cases === null ? "skipped: evals/business-autofill/fields.v1.jsonl is missing" : `skipped: ${missingKeys.join(", ")} API key not set`,
  () => {},
);
