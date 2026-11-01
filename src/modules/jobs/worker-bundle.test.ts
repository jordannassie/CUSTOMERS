import { readFileSync } from "node:fs";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

// The scan worker is bundled on its own (scripts/build-worker.mjs), outside Next. Server Actions, next/cache and
// UI pulled in through a module's index.ts broke that build (next's tracer needs @opentelemetry/api), so the
// worker path goes through server.ts files instead. This bundles it the same way and checks every source file.
async function workerInputs(): Promise<string[]> {
  const result = await build({
    entryPoints: ["netlify/worker/scan-worker-background.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    metafile: true,
    logLevel: "silent",
    alias: { "server-only": "./node_modules/server-only/empty.js" },
  });
  return Object.keys(result.metafile.inputs);
}

describe("scan worker bundle", () => {
  it("builds without Server Actions, next/cache or UI files", { timeout: 60_000 }, async () => {
    const inputs = await workerInputs();
    const src = inputs.filter((file) => file.startsWith("src/"));
    expect(src).toContain("src/modules/jobs/worker.ts");

    const offenders = src.filter((file) => {
      if (file.endsWith(".tsx")) return true;
      const code = readFileSync(file, "utf8");
      return /^\s*["']use server["']/m.test(code) || /from ["']next\/(cache|server)["']/.test(code);
    });
    expect(offenders).toEqual([]);
    // next/headers (auth) is fine; next's tracer and cache are what need @opentelemetry/api.
    expect(inputs.filter((file) => /next\/dist\/server\/(lib\/trace|web\/spec-extension\/unstable-cache)/.test(file))).toEqual([]);
  });
});
