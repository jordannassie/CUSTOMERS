# Question picking

Built in B-33 (MVP_SPEC 5.3, 25, D-62). Tests `src/modules/onboarding/questions.ts` with the prompt in `src/modules/onboarding/prompts/pick-questions.v1.ts`.

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
