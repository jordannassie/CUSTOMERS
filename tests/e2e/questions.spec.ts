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
// The header has its own "Add question" button that goes to the form, so the form's button is found inside it.
const addForm = (page: Page) => page.getByRole("form", { name: "Add a question" });
const showPaused = (page: Page) => page.getByTestId("show-paused").filter({ hasText: "Show paused" }).click();

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
  // The user's own questions keep their results but are left out of the score (BUG-129).
  await expect(questionRow(page, "oat milk latte")).toContainText("Not counted in your score");
  await expect(best).not.toContainText("Not counted in your score");

  await expect(page.getByTestId("active-count")).toHaveText("2 of 25");
  // 2 questions x 3 models x 4.3 weekly scans (MVP_SPEC 4.3).
  await expect(page.getByTestId("credit-estimate")).toContainText("About 26 credits a month");
  await expect(page.getByTestId("add-effect")).toHaveText("About 13 more credits a month: 26 now, about 39 with this question.");
  // Named share over 30 days, and the four filters with their counts.
  // 3 of 5 answers named the business.
  await expect(best.getByTestId("question-named")).toContainText("60%");
  await expect(page.getByTestId("kpi-named")).toContainText("1 of 2");
  await expect(page.getByRole("radio", { name: "Named you (1)" })).toBeVisible();
  await expect(page.getByTestId("showing-count")).toHaveText("Showing 2 of 2 active questions");
  if (test.info().project.name === "desktop") {
    await expect(page.getByRole("link", { name: "Questions", exact: true })).toHaveAttribute("aria-current", "page");
  }
});

test("add, pause, resume and remove a question", async ({ page }) => {
  await seed(page, [{ prompt: "What is the best coffee shop in Orange?" }]);

  await page.getByLabel("Add your own question").fill("  which cafe in orange has the best cold brew ");
  await addForm(page).getByRole("button", { name: "Add question" }).click();
  // The toast closes after a few seconds, so it is checked first.
  await expect(page.getByText("Question added. About 13 more credits a month.")).toBeVisible(ACTION);
  const added = questionRow(page, "Which cafe in orange has the best cold brew?");
  await expect(added).toBeVisible(ACTION);
  await expect(added).toContainText("Added by you");
  await expect(page.getByTestId("active-count")).toHaveText("2 of 25");
  await expect(page.getByLabel("Add your own question")).toHaveValue("");

  // The same question again is refused.
  await page.getByLabel("Add your own question").fill("Which cafe in Orange has the best cold brew");
  await addForm(page).getByRole("button", { name: "Add question" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "You already track this question." })).toBeVisible(ACTION);
  await page.getByLabel("Add your own question").fill("");

  await openMenu(page, added);
  await page.getByRole("menuitem", { name: "Pause" }).click();
  await expect(page.getByTestId("active-questions")).not.toContainText("cold brew", ACTION);
  // Paused questions show only when asked for, from the list's footer.
  await showPaused(page);
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
  const dialog = page.getByRole("alertdialog", { name: "Remove this question?" });
  await expect(dialog).toContainText("About 13 fewer credits a month.");
  await dialog.getByRole("button", { name: "Remove question" }).click();
  await expect(questionRow(page, "cold brew")).toHaveCount(0, ACTION);
  await expect(page.getByTestId("active-count")).toHaveText("1 of 25");
});

test("edit a suggested question: saved as a new question, the old one paused (M2)", async ({ page }) => {
  await seed(page, [{ prompt: "What is the best coffee shop in Orange?" }]);
  await openMenu(page, questionRow(page, "best coffee shop"));
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByRole("textbox", { name: "Question", exact: true }).fill("What is the best coffee shop near Orange Circle?");
  await expect(page.getByText("Editing makes this a new question. The old one is paused and keeps its results.")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const confirm = page.getByRole("alertdialog", { name: "Save as a new question?" });
  await confirm.getByRole("button", { name: "Save as new question" }).click();
  const edited = page.getByTestId("active-questions").getByTestId("question-row").filter({ hasText: "near Orange Circle?" });
  await expect(edited).toBeVisible(ACTION);
  await expect(edited).toContainText("Added by you");
  await expect(edited).toContainText("Not counted in your score");
  await showPaused(page);
  await expect(page.getByTestId("paused-questions")).toContainText("What is the best coffee shop in Orange?");
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
  await expect(addForm(page).getByRole("button", { name: "Add question" })).toBeDisabled();

  await showPaused(page);
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

test("a topic tags a question and filters the list", async ({ page }) => {
  await seed(page, [{ prompt: "What is the best coffee shop in Orange?" }, { prompt: "Which cafe in Orange has fast pickup?" }]);
  await openMenu(page, questionRow(page, "fast pickup"));
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByRole("textbox", { name: "Topic" }).fill("Pickup");
  // Only the topic changed, so it is saved in place, never as a new question.
  await expect(page.getByText("Editing makes this a new question.")).toHaveCount(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(questionRow(page, "fast pickup").getByTestId("question-topic")).toHaveText("Pickup", ACTION);

  await page.getByRole("group", { name: "Topic" }).getByRole("button", { name: "Pickup" }).click();
  await expect(page.getByTestId("active-questions").getByTestId("question-row")).toHaveCount(1);
  await expect(page.getByTestId("showing-count")).toHaveText("Showing 1 of 2 active questions");
});

test("a question opens in place with each AI's answer, and a link can open it or narrow the list", async ({ page }) => {
  const { businessId, questionIds } = await seed(page, [
    { prompt: "What is the best coffee shop in Orange?" },
    { prompt: "Which cafe in Orange has fast pickup?" },
  ]);
  await seedChecks(businessId, questionIds[0], { openai: [false], anthropic: [true] });
  await db
    .from("visibility_results")
    .update({
      cited_sources: [{ url: "https://www.yelp.com/biz/bean-house" }],
      competitors_mentioned: [{ name: "Bean House", position: 1 }],
      answer_text: "1. Bean House - great espresso (https://www.google.com/maps/place/Bean+House).",
    })
    .eq("tracked_prompt_id", questionIds[0])
    .eq("provider", "openai")
    .throwOnError();
  await page.reload();

  const row = questionRow(page, "best coffee shop");
  // exact: the row's options menu is named "Options for: <question>".
  await row.getByRole("button", { name: "What is the best coffee shop in Orange?", exact: true }).click();
  const details = row.getByTestId("question-details");
  await expect(details.getByRole("tab")).toHaveCount(2, ACTION);
  await expect(details.getByRole("tab", { name: /ChatGPT\s*not named/ })).toBeVisible();
  await expect(details.getByRole("tab", { name: /Claude\s*named you/ })).toBeVisible();
  const answer = details.getByRole("tabpanel");
  await expect(answer.getByTestId("answer-named")).toContainText("Bean House");
  await expect(answer).not.toContainText("https://");
  await expect(answer.getByTestId("answer-sites")).toContainText("yelp.com");
  await expect(answer.getByTestId("why-skipped")).toContainText("ChatGPT used yelp.com here");

  await page.goto(`/questions?q=${questionIds[0]}`);
  await expect(questionRow(page, "best coffee shop").getByTestId("question-details")).toBeVisible({ timeout: 60_000 });

  await page.goto("/questions?site=yelp.com");
  await expect(page.getByTestId("site-filter")).toHaveText(/Answers that used yelp.com/, { timeout: 60_000 });
  await expect(page.getByTestId("question-row")).toHaveCount(1);
  await page.getByTestId("site-filter").click();
  await expect(page.getByTestId("question-row")).toHaveCount(2, ACTION);
});

test("the old address opens the Questions page", async ({ page }) => {
  await seed(page, [{ prompt: "What is the best coffee shop in Orange?" }]);
  await page.goto("/dashboard/prompts");
  await page.waitForURL((url) => url.pathname === "/questions");
  await expect(page.getByRole("heading", { level: 1, name: "Questions" })).toBeVisible();
});
