# Phase 3: Scan engine

Goal: accurate, affordable checks on ChatGPT, Claude and Perplexity, run as background jobs, producing a trustworthy score. Ends with **Milestone 1: first real scan works end to end**. [Back to index](./README.md)

---

### B-20 Provider interface and OpenAI adapter
- [ ] Done

Phase 3 · M · Depends on: B-15 · Blocked by Jordan: no · MVP_SPEC 5.1, 5.2, D-67, D-68, MVP_ROADMAP REL-01 · Branch: `task/B-20-provider-interface-and-openai-adapter` → `mvp`

**Build**
1. `src/modules/scanning/providers/types.ts`: `runCheck({ question, location: { city, region, country }, model }) => { answerText, citations[], model, usage: { inputTokens, outputTokens, searchCalls }, costUsd, latencyMs }`.
2. `providers/openai.ts`: OpenAI Responses API, model `gpt-4.1-mini` (pinned in `providers/models.ts`), `tools: [{ type: "web_search", user_location: { type: "approximate", city, region, country } }]`. Extract citations from the response annotations.
3. Shared helper: 30-second timeout, 2 retries with backoff on 429 and 5xx, typed errors (`ProviderError` with `retryable`).
4. Cost from real usage and the price table in `providers/pricing.ts` (source and date noted in the file).

**What the user sees**
- Nothing visible yet. Checked through a developer script: "best coffee shop near me" with Orange, CA returns real Orange coffee shops.

**Engineering checks**
- Unit tests with recorded responses (no live calls in CI).
- One live smoke call recorded in the PR with its real cost.

---

### B-21 Claude adapter
- [ ] Done

Phase 3 · M · Depends on: B-20 · Blocked by Jordan: no · MVP_SPEC 5.1, D-67 · Branch: `task/B-21-claude-adapter` → `mvp`

**Build**
1. `providers/anthropic.ts` using the official `@anthropic-ai/sdk`: model `claude-haiku-4-5`, tool `{ type: "web_search_20250305", name: "web_search", max_uses: 3, user_location: { type: "approximate", city, region, country } }`.
2. Collect text blocks into `answerText` and web search results into `citations`.
3. Handle web-search errors returned inside a 200 response (the error comes back as an object in the tool result, not as an exception).
4. Remove the old `claude-3-5-haiku-20241022` adapter.

**What the user sees**
- Nothing visible yet. Same developer script works for Claude.

**Engineering checks**
- Unit tests with recorded responses, including a web-search error case.
- One live smoke call recorded in the PR.

---

### B-22 Perplexity adapter
- [ ] Done

Phase 3 · S · Depends on: B-20 · Blocked by Jordan: no · MVP_SPEC 5.1, D-67 · Branch: `task/B-22-perplexity-adapter` → `mvp`

**Build**
1. `providers/perplexity.ts`: model `sonar`, `web_search_options: { user_location: { country, region, city } }`, citations from the response.
2. Same timeout, retry and cost helpers.

**What the user sees**
- Nothing visible yet. Same developer script works for Perplexity.

**Engineering checks**
- Unit tests with recorded responses; one live smoke call recorded in the PR.

---

### B-23 Answer cache
- [ ] Done

Phase 3 · S · Depends on: B-20, B-11 · Blocked by Jordan: no · MVP_SPEC 5.4, D-24 · Branch: `task/B-23-answer-cache` → `mvp`

**Build**
1. `src/modules/scanning/cache.ts`: key = sha256 of `model + normalised question + city/region/country`; normalisation lowercases and trims spaces and punctuation.
2. Read: hit only if younger than 24 hours. Write: answer, citations, extracted names (from B-25), model, cost.
3. On a cache hit, `usage_events` records cost 0 and `cached = true`.

**What the user sees**
- Nothing visible. Two test businesses in the same city asking the same library question within a day share one AI call.

**Engineering checks**
- Unit tests: hit within 24 hours, miss after, different city misses.

---

### B-24 Mention detection v2 and its eval
- [ ] Done

Phase 3 · L · Depends on: B-06 · Blocked by Jordan: no · MVP_SPEC 5.5, 25, D-66 · Branch: `task/B-24-mention-detection-v2-and-its` → `main`

**Build**
1. `src/modules/scanning/mentions.ts`: word-boundary match on name, domain and aliases; strips suffixes (LLC, Inc, Co); for short or generic names requires a second signal (city, domain or phone near the name); records list position.
2. Businesses without a website: match on name plus city, plus phone if present (D-08).
3. Eval dataset `evals/mention-detection/dataset.v1.jsonl`: 150 to 200 real AI answers with the correct mentions labelled **by a person** (positive and negative cases, tricky names like "Ace", "Prime", "Best Plumbing").
4. `mention-detection.eval.ts`: accuracy, false positive rate and recall reported separately.

**What the user sees**
- Nothing visible yet; later the score stops counting "Ace" inside "space" as a mention.

**Engineering checks**
- Eval at least 95% accuracy; false positives reported; results pasted in the PR.
- Human labelling done and noted in `evals/mention-detection/README.md` (who, when).

---

### B-25 "Also recommended by AI" extraction and its eval
- [ ] Done

Phase 3 · M · Depends on: B-21 · Blocked by Jordan: no · MVP_SPEC 5.2, D-74 · Branch: `task/B-25-also-recommended-by-ai-extraction` → `mvp`

**Build**
1. `src/modules/scanning/extract.ts`: Claude Haiku with structured output returns every business name in an answer (name, position, whether it matches the business or a tracked competitor).
2. Prompt in `src/modules/scanning/prompts/extract-names.v1.ts`.
3. Stored with the cached answer; scheduled scans use the Message Batches API.
4. Eval `evals/entity-extraction/`: 50 to 100 answers with names labelled by a person; set F1.

**What the user sees**
- Nothing visible yet; later the Competitors page lists businesses AI recommends that the agency is not tracking.

**Engineering checks**
- Eval F1 at least 0.85; results pasted in the PR.

---

### B-26 Run a check and run a scan
- [ ] Done

Phase 3 · M · Depends on: B-13, B-20 to B-25 · Blocked by Jordan: no · MVP_SPEC 5.2, 4.2, D-53, D-54 · Branch: `task/B-26-run-a-check-and-run` → `mvp`

**Build**
1. `src/modules/scanning/service.ts`:
   - `runScan(jobId)`: loads the business, its active questions and chosen models; calls `hold_credits(questions × models)`; runs checks 4 to 6 at a time; for each result: cache, mention detection, name extraction, `capture_credit`; failed checks after retries are not captured; finally `release_hold`.
   - Writes `visibility_runs` and per-check results with model, mentioned, position, citations, cost, cached flag.
2. `is_test` agencies use recorded answers from `tests/fixtures/ai-answers/` instead of live calls (B-31).
3. Sets `businesses.next_scan_at` from the frequency when done.

**What the user sees**
- Nothing visible yet in the new UI; results appear through the worker in B-27 and the dashboard later.

**Engineering checks**
- Integration test with recorded answers: 12 questions × 3 models charges exactly 36; one provider failing charges only successful checks.

---

### B-27 Job worker
- [ ] Done

Phase 3 · M · Depends on: B-26 · Blocked by Jordan: no · MVP_SPEC 6.3, D-42 · Branch: `task/B-27-job-worker` → `mvp`

**Build**
1. SQL function `claim_scan_jobs(limit)` using `for update skip locked` (MVP_SPEC 6.3).
2. Worker logic in `src/modules/jobs/worker.ts`, called from a thin entry point. On Netlify (D-41): a background function `netlify/functions/scan-worker-background.mts` (15-minute limit), triggered by pg_net; on Vercel: `src/app/api/jobs/worker/route.ts` with `maxDuration`. Both check `x-worker-secret` against `env.WORKER_SECRET`; claim up to 10 jobs; run them in parallel; stop claiming new jobs when the time budget (`env.WORKER_TIME_BUDGET_SECONDS`, 600 on a Netlify background function, 240 on Vercel) is nearly used; marks `done` or requeues with backoff (5 minutes × attempts) up to 3 attempts, then `failed`.
3. Function `reset_stuck_jobs()`: jobs `running` for over 10 minutes go back to `queued`.

**What the user sees**
- Nothing visible yet. A queued test job becomes `done` within a minute of calling the worker.

**Hosting test (D-41)**: run this worker on a Netlify preview with a real scan (3 models, 12 questions). Record duration and any errors in the PR. If it fails for platform reasons, raise the Vercel option before continuing.

**Engineering checks**
- Test: two workers running at once never take the same job.
- Test: a job failing 3 times ends `failed` with the error saved.

---

### B-28 Schedules (pg_cron and pg_net)
- [ ] Done

Phase 3 · S · Depends on: B-27 · Blocked by Jordan: no · MVP_SPEC 6.2 · Branch: `task/B-28-schedules-pg-cron-and-pg` → `mvp`

**Build**
1. Enable `pg_cron` and `pg_net`. Store the worker URL and secret in Supabase Vault.
2. Schedules: daily 02:00 UTC enqueue due businesses (balance above 0, status allowed); every minute call the worker; every 10 minutes `reset_stuck_jobs()`; daily `expire_grants()`.
3. Until go-live (B-80) the worker URL points at the `mvp` staging deploy, and the daily enqueue only picks `is_test` agencies, so real customers are not scanned or charged by unreleased code. Document how to switch both at go-live.
4. Delete `netlify/functions/geo-scheduled-monitoring.mts` and the old cron route.

**What the user sees**
- Businesses due for a scan get scanned overnight without anyone clicking anything.

**Engineering checks**
- `select * from cron.job` shows the four jobs; a due test business is scanned by the next day.

---

### B-29 Manual "Run scan"
- [ ] Done

Phase 3 · S · Depends on: B-27, B-16 · Blocked by Jordan: no · MVP_SPEC 6.4 · Branch: `task/B-29-manual-run-scan` → `mvp`

**Build**
1. Server Action `startScan(businessId)` in `src/modules/jobs/actions.ts`: `requireAgency`, `canStartScan`, insert a high-priority job, then call the worker immediately.
2. `getScanStatus(businessId)` for polling.

**What the user sees**
- Pressing "Run scan" shows "Scanning…" and the new result appears within about a minute.
- Pressing it again while scanning does nothing and says "A scan is already running."
- With 0 credits, the button explains "You're out of credits."

**Engineering checks**
- Test: double submit creates one job.

---

### B-30 Scoring and confidence
- [ ] Done

Phase 3 · M · Depends on: B-26 · Blocked by Jordan: no · MVP_SPEC 5.6, D-63 to D-65 · Branch: `task/B-30-scoring-and-confidence` → `mvp`

**Build**
1. `src/modules/scanning/scoring.ts`:
   - Visibility score = mentions ÷ checks over the last 30 days; per model and an equal-weight overall score.
   - 7-day trend series.
   - Margin of error per question cluster from unique answers (cached answers count once); labels Early estimate (under 50 unique answers), Good (50 to 200), High (over 200).
   - `isRealChange(a, b)`: true only when the difference is larger than the margin.
   - Competitor comparison: ahead, behind or about the same using the margin.
   - Per question: "appeared in X of the last Y checks".
2. SQL view or function for the 30-day aggregates so pages load fast.

**What the user sees**
- Nothing visible yet; later the Overview shows "62, Good confidence. AI recommended you in about 6 of 10 customer questions this month."

**Engineering checks**
- Unit tests with fixed data: score, margin, labels, real-change rule, competitor comparison.

---

### B-31 Test mode with recorded answers
- [ ] Done

Phase 3 · S · Depends on: B-26 · Blocked by Jordan: no · D-61 · Branch: `task/B-31-test-mode-with-recorded-answers` → `mvp`

**Build**
1. Record about 50 real answers per model for 3 industries in 2 cities into `tests/fixtures/ai-answers/`.
2. `is_test` agencies (set by admin) get recorded answers chosen by question and model, so full flows run with no AI cost.
3. Seed script `scripts/seed-test-agency.ts`: a test agency with 2 businesses, competitors and questions.

**What the user sees**
- Demos and automated tests can run a full scan without spending real credits or money.

**Engineering checks**
- A test agency scan makes zero calls to OpenAI, Anthropic or Perplexity (checked by blocking those hosts in the test).

---

## Phase 3 demo checklist (Milestone 1)

1. The developer creates a real (non-test) business, for example a coffee shop in Orange, CA, with 12 questions and all three models.
2. Press "Run scan" (temporary button on the old dashboard or the admin business page): "Scanning…" appears, then the scan finishes within about a minute.
3. The admin scan log shows 36 checks across ChatGPT, Claude and Perplexity, with real local businesses named in the answers and the city used.
4. The credit balance dropped by exactly 36.
5. The score shows a number with a confidence label (for a first scan: "Early estimate").
6. Run the same scan for a second coffee shop in the same city the same day: most checks are served from the cache (cost 0 in the log) and still charged 1 credit each.
