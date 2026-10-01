// Copy rules from docs/design/WRITING.md (B-84): no long dashes, none of the banned AI-sounding words,
// none of the product terms MVP_SPEC 8.4 says not to show, and one spelling of "canceled".
// Usage: node scripts/check-copy.ts          (exits 1 on any finding)
//        node scripts/check-copy.ts --list   (prints every string and JSX text in src/, for a wording review)
//
// Scope: every .ts and .tsx file in src/, which holds the app, marketing pages, admin, emails, PDF and share page.
// Long dashes fail anywhere in a file, comments included: they are easy to copy from a comment into a string.
// Banned words fail only in strings and JSX text. WRITING.md covers words a reader sees, so comments and
// identifiers are out of scope for the word list (a comment saying "test harness" never reaches a user).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = join(import.meta.dirname, "..");
const DASH = /[–—]/;
const BANNED = [
  "unlock", "unleash", "elevate", "empower", "seamless", "seamlessly", "robust", "leverage",
  "cutting-edge", "game-changer", "revolutionize", "supercharge", "delve", "navigate the landscape",
  "in the realm of", "a testament to", "tapestry", "harness", "streamline", "next-level", "effortless",
  "world-class",
];
const BANNED_RE = new RegExp(`(?<![\\w-])(${BANNED.map((w) => w.replace(/-/g, "\\-")).join("|")})(?![\\w-])`, "i");
// MVP_SPEC 8.4 "Do not show". Acronyms match case-sensitively so words like "geography" or "llm_cost" pass.
const SPEC_TERMS = [
  /\b(direct score|share of voice|buyer[- ]intent|entity consistency|structured data|citation rate|beta \(free\)|supabase auth)\b/i,
  /\b(GEO|AEO|WebMCP|LLMs?|UGC)\b/,
];

// Files allowed to break a rule, with the reason. Keep these short.
const DASH_ALLOW: Record<string, string> = {
  "src/app/api/internal/admin/news/article/route.ts": "LinkedIn studio AI prompt, kept untouched until Jordan answers (D-07)",
  "src/app/api/internal/admin/news/search/route.ts": "LinkedIn studio AI prompt, kept untouched until Jordan answers (D-07)",
};
const WORD_ALLOW: Record<string, string> = {
  "src/modules/insights/validate.ts": "the banned word list that rejects AI-written reasons",
  "src/modules/insights/prompts/explain.v1.ts": "tells the model which words to avoid",
  "src/modules/sources/classify.ts": "Seamless is a food delivery site name",
};
// One spelling in the product (BUG-J): US English, as in "canceled", which Stripe and the app already use.
const SPELLING = /\b(cancell(?:ed|ing))\b/i;
const TERM_ALLOW: Record<string, string> = {
  "src/app/api/internal/admin/news/article/route.ts": "LinkedIn studio AI prompt, kept untouched until Jordan answers (D-07)",
  "src/app/api/internal/admin/news/search/route.ts": "LinkedIn studio AI prompt, kept untouched until Jordan answers (D-07)",
  "src/app/internal/admin/news/_components/news-config.ts": "LinkedIn studio, kept untouched until Jordan answers (D-07)",
  "src/app/internal/admin/news/_components/output-panel.tsx": "LinkedIn studio, kept untouched until Jordan answers (D-07)",
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

type Text = { line: number; text: string };

function textsIn(file: string, source: string): Text[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Text[] = [];
  const add = (node: ts.Node, text: string) => {
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (trimmed) out.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: trimmed });
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!(ts.isPropertyAssignment(node.parent) && node.parent.name === node)) add(node, node.text);
    } else if (ts.isTemplateExpression(node)) {
      add(node, [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(" … "));
    } else if (ts.isJsxText(node)) {
      add(node, node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const files = walk(join(ROOT, "src"))
  .filter((path) => /\.tsx?$/.test(path) && !path.endsWith(".d.ts"))
  .map((path) => relative(ROOT, path))
  .sort();

// Tailwind class lists are not copy: lowercase tokens with a hyphen or colon and no sentence punctuation.
const CLASS_LIST = /^(?=.*[-:])[a-z0-9:\-\/\[\]._%#!&>*=()]+(\s+[a-z0-9:\-\/\[\]._%#!&>*=()]+)*$/;

if (process.argv.includes("--list")) {
  for (const file of files) {
    if (/\.test\.tsx?$/.test(file)) continue;
    for (const { line, text } of textsIn(file, readFileSync(join(ROOT, file), "utf8"))) {
      if (/[a-z]/i.test(text) && /\S\s+\S/.test(text) && !CLASS_LIST.test(text)) console.log(`${file}:${line}\t${text}`);
    }
  }
  process.exit(0);
}

const failures: string[] = [];
for (const file of files) {
  const source = readFileSync(join(ROOT, file), "utf8");
  if (!(file in DASH_ALLOW)) {
    source.split("\n").forEach((line, i) => {
      if (DASH.test(line)) failures.push(`${file}:${i + 1}: long dash (use a comma, colon, period or "to")`);
    });
  }
  // Tests hold bad examples on purpose, to prove the validators reject them.
  if (/\.test\.tsx?$/.test(file)) continue;
  for (const { line, text } of textsIn(file, source)) {
    const match = file in WORD_ALLOW ? null : BANNED_RE.exec(text);
    if (match) failures.push(`${file}:${line}: banned word "${match[1]}" in "${text.slice(0, 80)}"`);
    const term = file in TERM_ALLOW ? null : SPEC_TERMS.map((re) => re.exec(text)).find(Boolean);
    if (term) failures.push(`${file}:${line}: "${term[1]}" is on the MVP_SPEC 8.4 do not show list, in "${text.slice(0, 80)}"`);
    const spelling = SPELLING.exec(text);
    if (spelling) failures.push(`${file}:${line}: "${spelling[1]}" is British spelling, use "${spelling[1].replace(/ll/i, "l")}"`);
  }
}
const allowed = [...Object.keys(DASH_ALLOW), ...Object.keys(WORD_ALLOW), ...Object.keys(TERM_ALLOW)];
const staleAllow = [...new Set(allowed)].filter((file) => !files.includes(file));

for (const failure of failures) console.log(`FAIL ${failure}`);
for (const file of staleAllow) console.log(`FAIL ${file}: in the allow list but the file no longer exists`);

console.log(`\nChecked ${files.length} files in src/ against docs/design/WRITING.md and MVP_SPEC 8.4, ${new Set(allowed).size} files on the allow list.`);
process.exit(failures.length || staleAllow.length ? 1 : 0);
