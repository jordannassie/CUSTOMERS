# Copy for Claude prompts

Built in B-52 (MVP_SPEC 7.2, 7.3, 25). Checks every prompt and message a user can copy from the Opportunities page.

| | |
|---|---|
| Grader | Code only (`gradePrompt` in `grader.ts`), no model call |
| Size | 14 cases, 108 prompts |
| Pass level | 100% |
| Runs | Every pull request (`npm run evals`) |

```bash
npx vitest run --project evals evals/prompt-templates
```

## What is graded

Each case is a made-up business and a scan summary. The eval runs the real code that builds prompts from it: the "why competitors win" explanation with the template writer (`src/modules/insights/template-writer.ts`), the rules fallback (`src/lib/geo/opportunity-engine.ts`), and the "get found by AI" checklist (`src/modules/opportunities/checklist.ts`: the website prompt and the review request message).

Every prompt must pass all of these:

| Check | Fails when |
|---|---|
| No empty placeholders | A `{...}` is left, `undefined`, `null` or `NaN` is printed, or there are empty brackets, empty quotes or a gap where a value is missing (`in ,`, a double space) |
| Only known gaps | Any `[...]` other than `[fill in]` in a Claude prompt, or `[customer name]`, `[your Google review link]`, `[your name]` in the review message |
| Sensible length | Under 120 or over 2,500 characters |
| Structure | Does not name the business, does not start with a capital letter, or (Claude prompts) has no rule against inventing facts or does not end with a full sentence |
| Writing guide | A long dash or an emoji |

A run writes every prompt with its result to `evals/results/prompt-templates.latest.json` (gitignored).

## Labelling

The 14 cases in `dataset.v1.jsonl` were written by the B-52 build session on 2026-09-28 to cover edge cases (no website, no phone, no city, no competitors, accents, apostrophes, the largest scan). They are made-up businesses on `.example` domains. No model output was used as an expected answer, since the grader checks fixed rules only. A person should read them once and add cases from real prompts that went wrong (principle 12).

## Dataset changelog

- v1 (2026-09-28): 14 cases.
