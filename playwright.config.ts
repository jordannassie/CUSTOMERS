import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig, devices } from "@playwright/test";

// Parallel sessions each run their own dev server (B-18), so the port is set per session.
const port = Number(process.env.E2E_PORT ?? 3106);
const baseURL = `http://localhost:${port}`;

// The dev server must use this worktree's local stack (written by npm test), not .env.local and the remote dev
// database (BUG-034). Env passed to next dev wins over its .env files.
const testDb = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
// One admin per project for tests/e2e/admin-access.spec.ts, which reads the same list.
const adminEmails = process.env.ADMIN_EMAILS ?? "e2e-admin-desktop@example.test,e2e-admin-mobile@example.test";
process.env.ADMIN_EMAILS = adminEmails;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // The dev server compiles each page on its first visit, which can take over 30s on a cold cache.
  timeout: 90_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  // Screen sizes from MVP_SPEC 21: every UI change is checked at 1440px and 390px.
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: `npm run dev -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // Onboarding answers from fixtures, never Firecrawl, Google or Claude (B-36), and the card step never calls Stripe (B-41).
    // Run scan starts the worker inside the dev server, since there is no separate worker locally or in CI.
    env: {
      ...testDb,
      ADMIN_EMAILS: adminEmails,
      WORKER_IN_PROCESS: "true",
      ONBOARDING_FIXTURES: "true",
      PLACES_FIXTURES: "true",
      STRIPE_CHECKOUT_FIXTURES: "true",
    },
    timeout: 180_000,
  },
});
