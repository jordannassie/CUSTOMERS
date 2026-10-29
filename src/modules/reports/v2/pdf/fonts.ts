import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

// Inter as static WOFF files (react-pdf cannot read variable fonts). They live next to this file and are read from an
// absolute path built on process.cwd(), so the Netlify function finds them once next.config.ts traces this folder in
// (outputFileTracingIncludes for the route that renders the PDF).
export const FONT_FAMILY = "Inter";
export const FONT_DIR = path.join(process.cwd(), "src/modules/reports/v2/pdf/fonts");

const FILES = [
  { file: "inter-400.woff", fontWeight: 400, fontStyle: "normal" },
  { file: "inter-400-italic.woff", fontWeight: 400, fontStyle: "italic" },
  { file: "inter-500.woff", fontWeight: 500, fontStyle: "normal" },
  { file: "inter-600.woff", fontWeight: 600, fontStyle: "normal" },
  { file: "inter-700.woff", fontWeight: 700, fontStyle: "normal" },
] as const;

let registered = false;

/** Registers Inter once per process and turns hyphenation off, so words never break with a hyphen. */
export function registerFonts(): void {
  if (registered) return;
  Font.register({
    family: FONT_FAMILY,
    fonts: FILES.map((f) => ({ src: path.join(FONT_DIR, f.file), fontWeight: f.fontWeight, fontStyle: f.fontStyle })),
  });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
