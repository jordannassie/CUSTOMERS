// A small RFC 4180 CSV reader and writer for the review and labelling spreadsheets (B-32, B-24 to B-51), so a person
// can work in Google Sheets or Excel and the scripts read the result back. Pure.

export type CsvRow = Record<string, string>;

function cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The rows as CSV text with a header line, in the given column order. Missing values are empty cells. */
export function toCsv(columns: readonly string[], rows: readonly CsvRow[]): string {
  const lines = [columns.map(cell).join(",")];
  for (const row of rows) lines.push(columns.map((c) => cell(row[c] ?? "")).join(","));
  return `${lines.join("\r\n")}\r\n`;
}

/** Every record of the text as a list of cells. Handles quoted cells with commas, quotes and line breaks. */
export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let quoted = false;
  const source = text.replace(/^﻿/, "");
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        value += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        value += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      record.push(value);
      value = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      record.push(value);
      records.push(record);
      record = [];
      value = "";
    } else {
      value += ch;
    }
  }
  if (quoted) throw new Error("CSV ends inside a quoted cell");
  if (value !== "" || record.length > 0) {
    record.push(value);
    records.push(record);
  }
  return records.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Rows keyed by the header line's column names. Extra cells are ignored; missing ones read as empty. */
export function parseCsv(text: string): CsvRow[] {
  const [header, ...body] = parseCsvRecords(text);
  if (!header) return [];
  const names = header.map((h) => h.trim());
  return body.map((cells) => Object.fromEntries(names.map((name, i) => [name, (cells[i] ?? "").trim()])));
}

/** "a | b | c" in a cell as a list; blank parts are dropped. */
export function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** A yes/no cell: true for yes, y, true, 1, x; false for no, n, false, 0; null when blank or anything else. */
export function yesNo(value: string | undefined): boolean | null {
  const v = (value ?? "").trim().toLowerCase();
  if (["yes", "y", "true", "1", "x", "pass"].includes(v)) return true;
  if (["no", "n", "false", "0", "fail"].includes(v)) return false;
  return null;
}
