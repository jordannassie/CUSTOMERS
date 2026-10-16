# Question picking

Built in B-33 (MVP_SPEC 5.3, 25, D-62). Tests `src/modules/onboarding/questions.ts` with the prompt in `src/modules/onboarding/prompts/pick-questions.v8.ts` (its header lists every version). v4 (2026-10-12) adds: never pick a template about a cuisine, product or service the business does not list; the code applies the same fit filter (`fitsBusiness` in `question-rules.ts`). v7 (2026-10-15): a comparison names two real options, never stand-ins like "dentist A or B"; the code also drops any left (`hasPlaceholder`). v8 (2026-10-16): full questions only, no choice between options or kinds of business, no brand or business name (see Question quality below).

| | |
|---|---|
| Grader | Code: overlap with an acceptable pool (`grader.ts`, `overlap` in `shared/metrics.ts`) |
| Start size | 20 to 30 businesses |
| Pass level | Mean overlap at least 0.8 to start |
| Runs | `question-picking.eval.ts` (grader, dataset format, and the real flow fed with a fixture library and fixture answers; no provider call): every pull request. `question-picking.ai.eval.ts` (one real Claude Haiku call per business): when a prompt, model or eval changes (`eval-ai.yml`). |

```bash
npx vitest run --project evals evals/question-picking      # grader and fixture checks, free
npx vitest run --project evals-ai evals/question-picking   # the eval itself, paid
```

The AI suite is skipped while `dataset.v1.jsonl` does not exist, while `supabase/seed/question-library.v1.json` is missing or not approved by a reviewer (B-32), or while `ANTHROPIC_API_KEY` is not set, and says which in the test name. It picks from the library file (the same templates that are loaded into `question_library`), writes every case with its grade, the model, the prompt and library version to `evals/results/` (gitignored), and prints the templates each business got that a person did not mark acceptable.

## What is graded

- **Overlap**: of the templates the picker chose, the share that are in the business's acceptable pool. A perfect pick scores 1.
- A run that fell back to the old template engine because the model's answer was unusable scores 0: the user got generic questions.
- API errors (Claude unreachable, overloaded, rate limited) are counted separately and left out of the score (principle 9).
- The intent mix (at least three intents, at most 4 of one) is enforced in code and checked by the unit tests, not by this eval.

Only businesses in one of the 10 library industries are graded. Businesses in `other` get questions written by Claude, which have no pool to overlap with.

## Dataset format

One JSON object per line in `dataset.v1.jsonl`. `dataset.v1.jsonl.example` shows two made-up rows that use the test fixture library in `src/modules/onboarding/question-fixtures.ts`; they carry `"example": true`, which the loader refuses in the real dataset.

```json
{"id":"qp-001","input":{"industry":"coffee_shop","services":["oat milk lattes","pastries"],"description":"Cafe that opens at 6am.","city":"Springfield","region":"IL"},"acceptable":["What is the best coffee shop in {city}?","..."],"libraryVersion":1,"labelledBy":"<person>","labelledAt":"2026-10-01","note":"optional"}
```

- `input`: what onboarding knows after the user confirms the form: industry (one of the 10), services, description, city and state. No business name: the picker never sees it.
- `acceptable`: every template from the library that a person would be happy to see scanned for this business, copied exactly with `{city}` left in. At least 12. The suite fails if an entry is not in the library.
- `libraryVersion`: the library version the pool was labelled against. When the library changes, relabel against the new version.
- `labelledBy`, `labelledAt`: who labelled the case and on which date.

## Labelling guide

Do this after the library is approved (B-32), since the pools are chosen from it.

1. Pick 20 to 30 real, public local businesses: two or three per library industry, a mix of broad businesses (a family dentist) and specialised ones (a cosmetic-only dentist, a vegan cafe).
2. For each, read its website and write `input` the way the onboarding form would hold it: its main services as short phrases, a one-line description, city and state. No private customer data.
3. Open that industry's templates in `supabase/seed/question-library.v1.json` and read every one.
4. Put a template in `acceptable` when a real customer of this business could ask it and the business would want to be recommended for it. Leave it out when the business does not offer that service, cannot serve that need (a kiosk and "best for working on a laptop"), or the question fits a different kind of business.
5. General questions ("Who is the best dentist in {city}?") are acceptable for every business in the industry.
6. Aim for 15 to 25 acceptable templates per business: a pool that is too wide makes the score meaningless, one too narrow punishes reasonable picks. Never fewer than 12.
7. Label from the business alone. Do not run the picker first and copy its answer (principle 6).
8. When unsure, add a `note` saying why, so the case can be reviewed later.

Before labelling, run the picker by hand on 20 to 50 businesses and read the output (principle 1). After the first run, check any perfect score or sudden jump by hand (principle 11).

## Labelling

Who labelled the cases and when: not yet labelled. The dataset must come from a person; B-33 stays open until it is done.

## Dataset changelog

- v1: not created yet. Format, grader and example rows added in B-33.

## Other businesses: question fit (2026-10-16)

Tests the questions written for businesses whose kind is not one of our industries, after the fit check in `src/modules/onboarding/prompts/question-fit.v1.ts` (`other-fit.ts` in onboarding: one Haiku call checks all 12, misfits are replaced, at most 2 rounds).

| | |
|---|---|
| Dataset | `other-fit.v1.jsonl`: 15 made-up businesses (name, Other label, services, city). A draft by an AI agent: a person must check every label and service list before a result is trusted. |
| Graders | Code first (`codeProblem` in `other-fit.ts`: a fair question, names the city, never the business). Then a judge from the other model family answers pass or fail per question: GPT-4.1 grades Claude's questions, Claude Haiku grades the OpenAI backup's. |
| Target | At least 90% of questions relevant. API errors (writer, fit check or judge) are counted apart. |
| Runs | `other-fit.eval.ts` (dataset shape, every label specific, grader and scoring with a fake judge): every pull request. `other-fit.ai.eval.ts` (paid): when the writing or fit prompt changes. |

```bash
npx vitest run --project evals evals/question-picking/other-fit.eval.ts       # free
npx vitest run --project evals-ai evals/question-picking/other-fit.ai.eval.ts # paid; needs ANTHROPIC_API_KEY and OPENAI_API_KEY
```

`EVAL_ONLY=of-001-bookstore,of-005-gym` reruns some cases, `EVAL_PACE_MS` waits between businesses, and `EVAL_NO_FIT=1` runs without the fit check as a baseline. Results go to `evals/results/` (gitignored).

## Question quality (2026-10-16)

Code rules every library, written and reused question passes (`questionProblem` in `src/modules/onboarding/question-fair.ts`), with prompt v8 and library prompt v4 asking for the same:

| Rule | File | Drops |
|---|---|---|
| incomplete | `question-options.ts` `isIncompleteQuestion` | A comparison with nothing to compare ("Which is cheaper, the coffee shops in Austin, TX?"), or a search phrase with no question word ("Best plumber in Austin?"). |
| choice | `question-options.ts` `comparesOptions` | Which option or which kind of business to pick: two treatments or actions, "a chain or a local shop", "large clinics or small offices", "Is it better to...", "Which type of...". "Which restaurant serves better seafood, casual or fine dining?" asks which restaurant and stays. |
| brand | `question-brands.ts` `namesBrand` | A listed product brand or chain in any case (LEGO, Nike, Starbucks, iPhone, BMW, Invisalign, CoolSculpting), or any other capitalised word mid-sentence that is not a place, an acronym, a day or month, a nationality or cuisine, Google or Yelp. Botox is allowed as a generic treatment (`GENERIC_TREATMENTS`). |
| own name | `question-kind.ts` `namesOwnBusiness` | The business's own name, other names, website name, and now its competitors' names (`QuestionBusiness.competitors`). |

What the new rules drop, checked by hand:

- Library (399 templates): 31 more than before, 28 choice (for example "Is it better to hire a small local HVAC company or a larger chain in {city}?", "Which is better in {city} for transmission work, a dealership service center or an independent shop?", "Which type of salon in {city} is better for curly hair...?"), 2 brand (both CoolSculpting), 1 incomplete ("What's the better option in {city} for someone with a hybrid car needing maintenance?"). Every industry keeps 26 to 39 fair templates (checked in `question-picking.eval.ts`). The comparison intent is thin now (1 to 7 per industry); a redraft with library prompt v4 refills it.
- Local active questions (653 unique, 740 rows): 12 unique (14 rows), 6 incomplete, 4 choice, 2 brand. One of the brand ones ("Where can I buy original Nike running shoes in Islamabad?") was written by the owner and is never touched.

### Before and after samples

`samples.ai.eval.ts` runs the real flow for a coffee shop in Austin, TX, a toy store in Brentwood, TN (an "Other" business, so it is written and fit-checked) and a dentist in Los Angeles, CA, once with prompt v7 and once with v8, and prints the 12 questions side by side with the drafts the code dropped and why. It writes the same to `evals/results/question-samples.*.md`. It only runs with `SAMPLES=1`; `samples.eval.ts` runs the same helper with fake models on every pull request.

```bash
SAMPLES=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run --project evals-ai evals/question-picking/samples.ai.eval.ts
```

Cost: 2 versions x 3 businesses. The coffee shop and dentist make one Haiku pick call each (about 2,500 tokens in, 100 out), plus a write call if fewer than 12 templates fit. The toy store makes a write call (about 1,000 in, 1,000 out) and 1 or 2 fit checks, with at most one more write. About 12 to 20 calls, 40,000 tokens in and 15,000 out: about $0.12 at Haiku 4.5 prices ($1 and $5 per million), under $0.25 at worst.

