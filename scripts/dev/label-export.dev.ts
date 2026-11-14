// Labelling sheets for the eval suites (B-24, B-25, B-33, B-34, B-51): writes evals/results/labelling/<suite>.csv for a
// person to fill in Google Sheets or Excel, then npm run label:import. Reads the database read-only; never calls a model.
//   LABEL_SUITE=mention-detection npm run label:export        (B-24, saved real answers, 2 cases per answer)
//   LABEL_SUITE=entity-extraction npm run label:export        (B-25, saved real answers)
//   LABEL_SUITE=question-picking npm run label:export         (B-33, businesses x library templates)
//   LABEL_SUITE=business-autofill npm run label:export        (B-34, LABEL_DOMAINS="a.com,b.com" or saved domains)
//   LABEL_SUITE=why-competitors-win LABEL_CASES_FILE=cases.jsonl npm run label:export   (B-51, writer outputs)
// Options: LABEL_COUNT (answers or businesses), LABEL_ENV_FILE (default .env.test.local; the live project only with
// LABEL_FROM_LIVE=1), LABEL_BUSINESSES_CSV (B-33: case_id,industry,services,description,city,region instead of saved ones).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import { LIBRARY_INDUSTRIES } from "@/lib/industries";
import { parseCsv, splitList, toCsv } from "../lib/csv";
import { EXTRACTION_COLUMNS, MENTION_COLUMNS, extractionRows, mentionRows, type SourceAnswer } from "../lib/labelling-answers";
import { AUTOFILL_COLUMNS, EXPLAIN_COLUMNS, PICKING_COLUMNS, autofillRows, explainRows, pickingRows, type ExplainSourceCase, type PickingBusiness } from "../lib/labelling-cases";

const SUITE = process.env.LABEL_SUITE ?? "";
const COUNT = Number(process.env.LABEL_COUNT || 100);
const LIVE_REF = "wsxusvapciexemfvtadm";
const OUT_DIR = "evals/results/labelling"; // git-ignored working files

function database() {
  const file = process.env.LABEL_ENV_FILE || ".env.test.local";
  const env = parseEnv(readFileSync(file, "utf8"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (url.includes(LIVE_REF) && process.env.LABEL_FROM_LIVE !== "1") {
    throw new Error(`${file} points at the live project; set LABEL_FROM_LIVE=1 to read answers from it (read-only)`);
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error(`SUPABASE_SERVICE_ROLE_KEY is missing from ${file}`);
  console.log(`Reading (read-only) from ${new URL(url).host}`);
  return createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/** Recent real (not sample) answers, taken in turn from each AI so all three appear. */
async function savedAnswers(limit: number): Promise<SourceAnswer[]> {
  const db = database();
  const { data, error } = await db
    .from("visibility_results")
    .select("id, provider, question, answer_text, business_id")
    .eq("is_sample", false)
    .not("answer_text", "is", null)
    .not("question", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit * 4);
  if (error) throw new Error(`Could not read answers: ${error.message}`);
  const byProvider = new Map<string, typeof data>();
  for (const r of data) byProvider.set(r.provider, [...(byProvider.get(r.provider) ?? []), r]);
  const picked: typeof data = [];
  for (let i = 0; picked.length < limit && [...byProvider.values()].some((l) => l.length > i); i++) {
    for (const list of byProvider.values()) if (list[i] && picked.length < limit) picked.push(list[i]);
  }
  const ids = [...new Set(picked.map((r) => r.business_id))];
  const [businesses, competitors] = await Promise.all([
    db.from("businesses").select("id, name, domain, primary_city, phone, aliases").in("id", ids),
    db.from("business_competitors").select("business_id, name, domain, city, aliases").in("business_id", ids),
  ]);
  if (businesses.error || competitors.error) throw new Error("Could not read businesses or competitors");
  return picked.flatMap((r) => {
    const b = businesses.data.find((x) => x.id === r.business_id);
    if (!b) return [];
    return [
      {
        id: r.id,
        provider: r.provider,
        question: r.question!,
        answer: r.answer_text!,
        business: { name: b.name, website: b.domain, city: b.primary_city, phone: b.phone, aliases: b.aliases ?? [] },
        competitors: competitors.data
          .filter((c) => c.business_id === b.id)
          .map((c) => ({ name: c.name, website: c.domain, city: c.city, aliases: c.aliases ?? [] })),
      },
    ];
  });
}

async function savedBusinesses(limit: number): Promise<PickingBusiness[]> {
  const { data, error } = await database()
    .from("businesses")
    .select("id, industry, services, description, primary_city, primary_region")
    .in("industry", [...LIBRARY_INDUSTRIES])
    .is("deleted_at", null)
    .not("primary_city", "is", null)
    .limit(limit);
  if (error) throw new Error(`Could not read businesses: ${error.message}`);
  return data.map((b, i) => ({
    id: `qp-${String(i + 1).padStart(3, "0")}`,
    industry: b.industry!,
    services: b.services ?? [],
    description: b.description ?? "",
    city: b.primary_city!,
    region: b.primary_region,
  }));
}

it(`write the labelling sheet for ${SUITE || "(set LABEL_SUITE)"}`, async () => {
  let columns: readonly string[];
  let rows: Record<string, string>[];
  if (SUITE === "mention-detection") {
    columns = MENTION_COLUMNS;
    rows = mentionRows(await savedAnswers(COUNT));
  } else if (SUITE === "entity-extraction") {
    columns = EXTRACTION_COLUMNS;
    rows = extractionRows(await savedAnswers(COUNT));
  } else if (SUITE === "question-picking") {
    const library = JSON.parse(readFileSync("supabase/seed/question-library.v1.json", "utf8"));
    if (library.status !== "approved") console.warn(`The library is "${library.status}": label after B-32 approval, or relabel when it changes.`);
    const businesses = process.env.LABEL_BUSINESSES_CSV
      ? parseCsv(readFileSync(process.env.LABEL_BUSINESSES_CSV, "utf8")).map((r) => ({ id: r.case_id, industry: r.industry, services: splitList(r.services), description: r.description, city: r.city, region: r.region || null }))
      : await savedBusinesses(Math.min(COUNT, 30));
    columns = PICKING_COLUMNS;
    rows = pickingRows(businesses, library.templates);
  } else if (SUITE === "business-autofill") {
    const domains = process.env.LABEL_DOMAINS
      ? splitList(process.env.LABEL_DOMAINS.replace(/,/g, "|"))
      : ((await database().from("businesses").select("domain").not("domain", "is", null).limit(COUNT)).data ?? []).map((b) => b.domain!);
    columns = AUTOFILL_COLUMNS;
    rows = autofillRows([...new Set(domains)]);
  } else if (SUITE === "why-competitors-win") {
    const file = process.env.LABEL_CASES_FILE;
    if (!file) throw new Error("Set LABEL_CASES_FILE to a JSONL file of {id, input, output} from a writer run (see the suite README)");
    const cases = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as ExplainSourceCase);
    columns = EXPLAIN_COLUMNS;
    rows = explainRows(cases);
  } else {
    throw new Error("Set LABEL_SUITE to mention-detection, entity-extraction, question-picking, business-autofill or why-competitors-win");
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const path = `${OUT_DIR}/${SUITE}.csv`;
  writeFileSync(path, toCsv(columns, rows));
  console.log(`Wrote ${rows.length} rows to ${path}. Fill the label columns, then: LABEL_SUITE=${SUITE} LABELLER="Your name" npm run label:import`);
  expect(rows.length).toBeGreaterThan(0);
});
