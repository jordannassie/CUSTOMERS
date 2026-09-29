import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

// Only the local database written by scripts/test-db-reset.sh; .env.local is never loaded,
// so tests cannot reach the shared database or spend real AI credits.
const TEST_ENV_FILE = ".env.test.local";
// These read or write the whole scan queue, so they run one at a time after every other unit file.
const SERIAL_TESTS = ["src/modules/jobs/queue.test.ts", "src/modules/jobs/schedules.test.ts"];
const testEnv = existsSync(TEST_ENV_FILE) ? parseEnv(readFileSync(TEST_ENV_FILE, "utf8")) : {};
// Database tests share the machine with other workers' stacks (BUG-010); 5s and 20s timed out under that load.
// Hooks get the same limit: their set-up and clean-up (creating and deleting users) hit the 10s default.
const DB_TEST_TIMEOUT = 60_000;

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
          exclude: SERIAL_TESTS,
          setupFiles: ["tests/setup/retry-gateway-502.ts"],
          env: testEnv as Record<string, string>,
          testTimeout: DB_TEST_TIMEOUT,
          hookTimeout: DB_TEST_TIMEOUT,
        },
      },
      {
        // claim_scan_jobs takes jobs from the whole queue: alongside other files it took their queued jobs.
        // enqueue_due_scans queues every due business: alongside other files it failed on a business they
        // deleted mid-insert (BUG-035), so it must not run next to queue.test.ts's clean-up either.
        extends: true,
        test: {
          name: "unit-queue",
          include: SERIAL_TESTS,
          fileParallelism: false,
          setupFiles: ["tests/setup/retry-gateway-502.ts"],
          env: testEnv as Record<string, string>,
          testTimeout: DB_TEST_TIMEOUT,
          hookTimeout: DB_TEST_TIMEOUT,
          sequence: { groupOrder: 1 },
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
