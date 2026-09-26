import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

// Only the local database written by scripts/test-db-reset.sh; .env.local is never loaded,
// so tests cannot reach the shared database or spend real AI credits.
const TEST_ENV_FILE = ".env.test.local";
const testEnv = existsSync(TEST_ENV_FILE) ? parseEnv(readFileSync(TEST_ENV_FILE, "utf8")) : {};

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // server-only throws outside a React Server Components build; tests run server code directly.
    alias: { "server-only": fileURLToPath(new URL("node_modules/server-only/empty.js", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          env: testEnv as Record<string, string>,
        },
      },
      {
        extends: true,
        test: {
          name: "evals",
          include: ["evals/**/*.eval.ts"],
          testTimeout: 120_000,
        },
      },
    ],
  },
});
