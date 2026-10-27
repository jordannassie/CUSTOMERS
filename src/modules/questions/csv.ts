import { namedPercent, topPick } from "./list";
import type { QuestionRow } from "./service";

// "Export CSV" on the Questions page: the rows the list shows, built in the browser. Pure.

/** Quotes a cell, and keeps a spreadsheet from reading text that starts with = + - @ as a formula. */
export function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function questionsCsv(rows: QuestionRow[], models: { id: string; label: string }[]): string {
  const header = ["Question", "Topic", "Status", "Named you (%)", ...models.map((m) => `${m.label} (named you)`), "Top pick"];
  const lines = rows.map((r) => {
    const pct = namedPercent(r);
    return [
      r.text,
      r.topic,
      r.active ? "Active" : "Paused",
      pct,
      ...models.map((m) => {
        const res = r.results.find((x) => x.model === m.id);
        return res && res.checks > 0 ? `${res.appeared} of ${res.checks}` : "Not checked yet";
      }),
      topPick(r)?.name ?? null,
    ];
  });
  return [header, ...lines].map((cells) => cells.map(csvCell).join(",")).join("\r\n");
}
