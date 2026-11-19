// Before and after samples of the questions three businesses get (2026-10-16 question quality work): the real flow
// (prepareQuestions) run once with each prompt version, side by side, with the written drafts the code dropped and
// why. Shared by samples.ai.eval.ts (paid, real models) and samples.eval.ts (free, fake models).
import { readFileSync } from "node:fs";
import type { QuestionModel } from "@/modules/onboarding/question-model";
import { prepareQuestions, type QuestionBusiness, type QuestionSet } from "@/modules/onboarding/questions";
import { namesOwnBusiness } from "@/modules/onboarding/question-kind";
import { questionProblem, type LibraryEntry } from "@/modules/onboarding/question-rules";
import type { LibraryFile } from "@/modules/question-library";
import { LIBRARY_PATH } from "./grader";

// Made-up businesses and competitors, so no real one is named in a sample. Services include a brand on purpose
// (LEGO, Invisalign): the new rules must keep it out of the questions.
export const SAMPLE_BUSINESSES: { id: string; business: QuestionBusiness }[] = [
  {
    id: "coffee-austin",
    business: {
      industry: "coffee_shop",
      services: ["espresso drinks", "cold brew", "pastries", "breakfast tacos", "free Wi-Fi"],
      description: "Neighborhood coffee shop with a patio and space to work.",
      city: "Austin",
      region: "TX",
      name: "Sample Bean Coffee",
      competitors: ["Bluebonnet Coffee Co", "Red River Roasters"],
    },
  },
  {
    id: "toys-brentwood",
    business: {
      industry: "other",
      industryText: "toy store",
      services: ["LEGO sets", "board games", "puzzles", "educational toys", "gift wrapping"],
      description: "Independent toy store for kids of all ages.",
      city: "Brentwood",
      region: "TN",
      name: "Sample Toy Box",
      competitors: ["Maple Street Toys", "Little Acorn Toys"],
    },
  },
  {
    id: "dentist-la",
    business: {
      industry: "dentist",
      services: ["teeth cleaning", "Invisalign", "teeth whitening", "dental implants", "emergency dental care"],
      description: "Family and cosmetic dental practice.",
      city: "Los Angeles",
      region: "CA",
      name: "Sample Smile Dental",
      competitors: ["Sunset Family Dentistry", "Echo Park Dental"],
    },
  },
];

/** The reviewed library file as onboarding loads it (supabase/seed/question-library.v1.json). */
export function sampleLibrary(): (industry: string) => LibraryEntry[] {
  const file = JSON.parse(readFileSync(LIBRARY_PATH, "utf8")) as LibraryFile;
  return (industry) =>
    file.templates.filter((t) => t.industry === industry).map((t, i) => ({ id: `${industry}-${i}`, template: t.template, tags: t.tags, intent: t.intent }));
}

export type SampleColumn = {
  version: string;
  set: QuestionSet | null;
  /** Written drafts the code left out, with the reason; repeats and the intent mix are not listed. */
  dropped: { text: string; why: string }[];
  apiErrors: string[];
};
export type SampleRow = { id: string; label: string; columns: SampleColumn[] };

/** A model that records every written draft, so the drops can be listed. */
function recording(model: QuestionModel, drafts: string[], errors: string[]): QuestionModel {
  const note = (err: unknown): never => {
    errors.push(err instanceof Error ? err.message : String(err));
    throw err;
  };
  return {
    pick: (input) => model.pick(input).catch(note),
    write: async (input) => {
      const out = await model.write(input).catch(note);
      drafts.push(...out.map((q) => q.template));
      return out;
    },
    ...(model.fit ? { fit: (input: Parameters<NonNullable<QuestionModel["fit"]>>[0]) => model.fit!(input).catch(note) } : {}),
  };
}

function whyDropped(template: string, business: QuestionBusiness): string | null {
  if (namesOwnBusiness(template, business)) return "names the business or a competitor";
  return questionProblem(template);
}

/** Runs every sample business once per model version, in order (no calls in parallel). */
export async function runSamples(models: { version: string; model: () => QuestionModel }[]): Promise<SampleRow[]> {
  const library = sampleLibrary();
  const rows: SampleRow[] = [];
  for (const { id, business } of SAMPLE_BUSINESSES) {
    const columns: SampleColumn[] = [];
    for (const { version, model } of models) {
      const drafts: string[] = [];
      const errors: string[] = [];
      let set: QuestionSet | null = null;
      try {
        set = await prepareQuestions(business, { loadLibrary: async (industry) => library(industry), model: recording(model(), drafts, errors) });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
      const dropped = [...new Set(drafts)].flatMap((text) => {
        const why = whyDropped(text, business);
        return why ? [{ text, why }] : [];
      });
      columns.push({ version, set, dropped, apiErrors: errors });
    }
    rows.push({ id, label: `${business.industryText ?? business.industry} in ${business.city}, ${business.region}`, columns });
  }
  return rows;
}

const cell = (s: string) => s.replace(/\|/g, "\\|");

/** Markdown: one table per business with the versions side by side, then what the code dropped from each. */
export function formatSamples(rows: SampleRow[]): string {
  const out: string[] = [];
  for (const row of rows) {
    out.push(`## ${row.label} (${row.id})`, "");
    out.push(`| # | ${row.columns.map((c) => `${c.version} (${c.set?.source ?? "failed"})`).join(" | ")} |`);
    out.push(`|---|${row.columns.map(() => "---").join("|")}|`);
    const most = Math.max(0, ...row.columns.map((c) => c.set?.questions.length ?? 0));
    for (let i = 0; i < most; i++) {
      out.push(`| ${i + 1} | ${row.columns.map((c) => cell(c.set?.questions[i] ? `${c.set.questions[i].text} [${c.set.questions[i].intent}]` : "")).join(" | ")} |`);
    }
    for (const c of row.columns) {
      if (c.apiErrors.length) out.push("", `${c.version} API errors: ${c.apiErrors.join("; ")}`);
      if (c.dropped.length) out.push("", `${c.version} drafts the code dropped:`, ...c.dropped.map((d) => `- ${d.text} (${d.why})`));
    }
    out.push("");
  }
  return out.join("\n");
}
