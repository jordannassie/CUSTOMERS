import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page } from "@playwright/test";

// B-53 against the local Supabase stack only. Each test seeds its own is_test agency, questions and saved
// checks, so no AI is called (D-61).
const local = existsSync(".env.test.local") ? parseEnv(readFileSync(".env.test.local", "utf8")) : {};
const hasDb = !!(local.NEXT_PUBLIC_SUPABASE_URL && local.SUPABASE_SERVICE_ROLE_KEY);
test.skip(!hasDb, "Skipped: no local test database. Run scripts/test-db-reset.sh to create .env.test.local.");

const db = hasDb
  ? createClient(local.NEXT_PUBLIC_SUPABASE_URL!, local.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  : null!;
const HOUR = 3_600_000;
const MODELS = ["openai", "anthropic", "perplexity"] as const;
const userIds: string[] = [];
// Server Actions and the refresh after them can take several seconds on a busy dev server.
const ACTION = { timeout: 30_000 };

type Question = { prompt: string; source?: string; active?: boolean };

async function seed(page: Page, questions: Question[]): Promise<{ businessId: string; questionIds: string[] }> {
  const email = `e2e-questions-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data: user, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !user.user) throw error ?? new Error("no user");
  userIds.push(user.user.id);

  const { data: agency } = await db
    .from("agencies")
    .insert({ owner_user_id: user.user.id, name: "Questions test agency", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await db
    .from("businesses")
    .insert({
      owner_user_id: user.user.id,
      agency_id: agency.id,
      name: "Bean There Coffee",
      status: "active",
      industry: "coffee_shop",
      primary_city: "Orange",
      primary_region: "CA",
      models: [...MODELS],
      scan_frequency: "weekly",
    })
    .select("id")
    .single()
    .throwOnError();
  const questionIds: string[] = [];
  for (const [i, q] of questions.entries()) {
    const { data } = await db
      .from("tracked_prompts")
      .insert({
        business_id: business.id,
        prompt: q.prompt,
        source: q.source ?? "library",
        active: q.active ?? true,
        created_at: new Date(Date.now() - (questions.length - i) * HOUR).toISOString(),
      })
      .select("id")
      .single()
      .throwOnError();
    questionIds.push(data.id);
  }

  await page.goto("/login?next=/questions");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => url.pathname === "/questions");
  // The dev server compiles the page on its first visit, which can take far longer than an assertion's 5s.
  await expect(page.getByRole("heading", { level: 1, name: "Questions" })).toBeVisible({ timeout: 60_000 });
  return { businessId: business.id, questionIds };
}

/** Saved checks for one question: `mentions` per model, oldest first. */
async function seedChecks(businessId: string, questionId: string, mentions: Partial<Record<(typeof MODELS)[number], boolean[]>>) {
  const { data: run } = await db
    .from("visibility_runs")
    .insert({ business_id: businessId, provider: "scan", status: "completed" })
    .select("id")
    .single()
    .throwOnError();
  const rows = Object.entries(mentions).flatMap(([provider, list]) =>
    list!.map((mentioned, i) => ({
      run_id: run.id,
      business_id: businessId,
      tracked_prompt_id: questionId,
      provider,
      created_at: new Date(Date.now() - (list!.length - i) * 24 * HOUR).toISOString(),
      business_mentioned: mentioned,
      competitors_mentioned: [],
      cited_sources: [],
      answer_text: `${provider} answer ${i} ${randomUUID()}`,
    })),
  );
  await db.from("visibility_results").insert(rows).throwOnError();
}

const questionRow = (page: Page, text: string) => page.getByTestId("question-row").filter({ hasText: text });

/** Opens a question's menu once any toast has closed; on a phone a toast covers the rows above it. */
async function openMenu(page: Page, row: Locator) {
  // A toast stays open while the pointer rests on it.
  await page.mouse.move(0, 0);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, { timeout: 15_000 });
  await row.getByRole("button", { name: /^Options for/ }).click();
}

test.afterAll(async () => {
  for (const id of userIds.splice(0)) await db.auth.admin.deleteUser(id);
});

test("each question shows how often each AI recommended the business, and the credit use", async ({ page }) => {
  const { businessId, questionIds } = await seed(page, [
    { prompt: "What is the best coffee shop in Orange?" },
    { prompt: "Where can I get an oat milk latte in Orange?", source: "custom" },
  ]);
  await seedChecks(businessId, questionIds[0], { openai: [true, false, true, true], perplexity: [false] });
  await page.reload();

  const best = questionRow(page, "What is the best coffee shop in Orange?");
  await expect(best.locator('[data-model="openai"]')).toContainText("3 of 4");
  await expect(best.locator('[data-model="openai"]')).toContainText("Appeared in 3 of the last 4 checks");
  await expect(best.locator('[data-model="perplexity"]')).toContainText("Appeared in 0 of the last 1 check");
  await expect(best.locator('[data-model="anthropic"]')).toContainText("Not checked yet");
  await expect(questionRow(page, "oat milk latte")).toContainText("Added by you");

  await expect(page.getByTestId("active-count")).toHaveText("2 of 25");
  // 2 questions x 3 models x 4.3 weekly scans (MVP_SPEC 4.3).
  await expect(page.getByTestId("credit-estimate")).toContainText("About 26 credits a month");
  await expect(page.getByTestId("add-effect")).toHaveText("About 13 more credits a month: 26 now, about 39 with this question.");
  if (test.info().project.name === "desktop") {
    await expect(page.getByRole("link", { name: "Questions", exact: true })).toHaveAttribute("aria-current", "page");
  }
});

test("add, pause, resume and remove a question", async ({ page }) => {
  await seed(page, [{ prompt: "What is the best coffee shop in Orange?" }]);

  await page.getByLabel("Add your own question").fill("  which cafe in orange has the best cold brew ");
  await page.getByRole("button", { name: "Add question" }).click();
  // The toast closes after a few seconds, so it is checked first.
  await expect(page.getByText("Question added. About 13 more credits a month.")).toBeVisible(ACTION);
  const added = questionRow(page, "Which cafe in orange has the best cold brew?");
  await expect(added).toBeVisible(ACTION);
  await expect(added).toContainText("Added by you");
  await expect(page.getByTestId("active-count")).toHaveText("2 of 25");
  await expect(page.getByLabel("Add your own question")).toHaveValue("");

  // The same question again is refused.
  await page.getByLabel("Add your own question").fill("Which cafe in Orange has the best cold brew");
  await page.getByRole("button", { name: "Add question" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "You already track this question." })).toBeVisible(ACTION);
  await page.getByLabel("Add your own question").fill("");

  await openMenu(page, added);
  await page.getByRole("menuitem", { name: "Pause" }).click();
  await expect(page.getByTestId("paused-questions").getByTestId("question-row")).toContainText("cold brew", ACTION);
  await expect(page.getByTestId("active-questions")).not.toContainText("cold brew");
  await expect(page.getByTestId("active-count")).toHaveText("1 of 25");
  await expect(page.getByTestId("credit-estimate")).toContainText("About 13 credits a month");

  const paused = page.getByTestId("paused-questions").getByTestId("question-row");
  await openMenu(page, paused);
  await page.getByRole("menuitem", { name: "Resume" }).click();
  await expect(page.getByTestId("active-questions")).toContainText("cold brew", ACTION);
  await expect(page.getByTestId("paused-questions")).toHaveCount(0);

  await openMenu(page, questionRow(page, "cold brew"));
  await page.getByRole("menuitem", { name: "Remove" }).click();
  const dialog = page.getByRole("dialog", { name: "Remove this question?" });
  await expect(dialog).toContainText("About 13 fewer credits a month.");
  await dialog.getByRole("button", { name: "Remove question" }).click();
  await expect(questionRow(page, "cold brew")).toHaveCount(0, ACTION);
  await expect(page.getByTestId("active-count")).toHaveText("1 of 25");
});

test("edit a question's wording", async ({ page }) => {
  await seed(page, [{ prompt: "What is the best coffee shop in Orange?" }]);
  await openMenu(page, questionRow(page, "best coffee shop"));
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByRole("textbox", { name: "Question", exact: true }).fill("What is the best coffee shop near Orange Circle?");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const edited = questionRow(page, "near Orange Circle?");
  await expect(edited).toBeVisible(ACTION);
  await expect(edited).toContainText("Added by you");
});

test("at 25 active questions: the limit message, and no way to add or resume", async ({ page }) => {
  await seed(page, [
    ...Array.from({ length: 25 }, (_, i) => ({ prompt: `Question number ${i + 1} about coffee in Orange?` })),
    { prompt: "Which coffee shop in Orange opens earliest?", active: false },
  ]);
  await expect(page.getByTestId("active-count")).toHaveText("25 of 25");
  await expect(page.getByTestId("question-limit")).toHaveText(
    "You have 25 active questions, the most your plan allows. Pause or remove one to add another.",
  );
  await expect(page.getByLabel("Add your own question")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add question" })).toBeDisabled();

  const paused = page.getByTestId("paused-questions").getByTestId("question-row");
  await openMenu(page, paused);
  await expect(page.getByRole("menuitem", { name: "Resume" })).toBeDisabled();
  await page.keyboard.press("Escape");

  // Pausing one makes room again.
  await openMenu(page, questionRow(page, "Question number 25 about"));
  await page.getByRole("menuitem", { name: "Pause" }).click();
  await expect(page.getByTestId("active-count")).toHaveText("24 of 25", ACTION);
  await expect(page.getByTestId("question-limit")).toHaveCount(0);
  await expect(page.getByLabel("Add your own question")).toBeEnabled();
});

test("the old address opens the Questions page", async ({ page }) => {
  await seed(page, [{ prompt: "What is the best coffee shop in Orange?" }]);
  await page.goto("/dashboard/prompts");
  await page.waitForURL((url) => url.pathname === "/questions");
  await expect(page.getByRole("heading", { level: 1, name: "Questions" })).toBeVisible();
});
