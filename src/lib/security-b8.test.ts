import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// B8: the old /api/geo/seo route is gone, and signed-in or anonymous users can never truncate a table (migration
// 051). No test can run raw SQL here, so this pins the migration and the route; the live grants were checked with
// has_table_privilege on the local database when this was written.
const MIGRATIONS = "supabase/migrations";

describe("B8", () => {
  it("has a migration that revokes TRUNCATE from anon and authenticated, now and for later tables", () => {
    const sql = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(path.join(MIGRATIONS, f), "utf8").toLowerCase())
      .join("\n");
    expect(sql).toMatch(/revoke truncate on all tables in schema public from anon, authenticated/);
    expect(sql).toMatch(/alter default privileges in schema public revoke truncate on tables from anon, authenticated/);
  });

  it("no longer has the /api/geo/seo route, and nothing calls it", () => {
    expect(existsSync("src/app/api/geo/seo")).toBe(false);
    const callers = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return callers(p);
        return /\.(ts|tsx)$/.test(e.name) && !p.endsWith("security-b8.test.ts") && readFileSync(p, "utf8").includes("/api/geo/seo") ? [p] : [];
      });
    expect(callers("src")).toEqual([]);
  });
});
