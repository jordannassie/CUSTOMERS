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
          setupFiles: ["tests/setup/retry-gateway-502.ts"],
          env: testEnv as Record<string, string>,
        },
      },
      {
        extends: true,
        test: {
          name: "evals",
          include: ["evals/**/*.eval.ts"],
          exclude: ["evals/**/*.ai.eval.ts"],
          testTimeout: 120_000,
        },
      },
      {
        // AI-graded suites call real models, so they run only in eval-ai.yml (B-07).
        extends: true,
        test: {
          name: "evals-ai",
          include: ["evals/**/*.ai.eval.ts"],
          testTimeout: 120_000,
        },
      },
      {
        // Live developer checks (scripts/dev); each one also needs LIVE_AI_CALL=1 to call a real model.
        extends: true,
        test: {
          name: "dev",
          include: ["scripts/dev/**/*.dev.ts"],
        },
      },
      {
        // Records real answers for test mode (B-31); needs LIVE_AI_CALL=1 like the dev checks.
        extends: true,
        test: {
          name: "record",
          include: ["scripts/record-ai-answers.ts"],
        },
      },
      {
        // Question library scripts (B-32); drafting also needs LIVE_AI_CALL=1.
        extends: true,
        test: {
          name: "question-library",
          include: ["scripts/*-question-library.ts"],
        },
      },
    ],
  },
});
