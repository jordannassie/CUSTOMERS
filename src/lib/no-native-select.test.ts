import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// 2026-10-16: the last raw <select> elements (admin leads filters, the contact form) opened past the screen edge on a
// phone (BUG-188, BUG-189). The lint rule keeps them out of everything but the shared controls in src/components/ui.
const code = "export function Pick() {\n  return <select><option>a</option></select>;\n}\n";

async function rulesHit(filePath: string): Promise<string[]> {
  const [result] = await new ESLint({ cwd: process.cwd() }).lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === "no-restricted-syntax").map((m) => m.message);
}

describe("no raw <select> outside src/components/ui", () => {
  it("fails in app and component code", async () => {
    expect(await rulesHit("src/app/internal/admin/leads/_components/example.tsx")).toEqual([
      "Use Select from src/components/ui/select.tsx; its list stays on screen at 360px.",
    ]);
    expect(await rulesHit("src/components/site/Example.tsx")).toHaveLength(1);
  }, 60_000);

  it("is allowed in the shared controls", async () => {
    expect(await rulesHit("src/components/ui/country-select.tsx")).toEqual([]);
  }, 60_000);
});
