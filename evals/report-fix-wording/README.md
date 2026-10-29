# Report fix wording

Tests the optional AI wording step for the fixes in the version 2 PDF report: `src/modules/reports/v2/wording/word-fixes.ts` with the prompt in `src/modules/reports/prompts/fix-wording.v1.ts` (writer: Claude Sonnet 5, `claude-sonnet-5`; backup `gpt-4.1`, D-84). The fixes are built in code with template wording; the writer rewrites only each fix's title, why and steps. In production it runs only when `REPORT_AI_WORDING` is on, never for a test agency (D-61), and any fix that fails the code checks keeps its template text.

| | |
|---|---|
| Grader | Code first (`codeGrade` in `grader.ts`, the same checks production runs), then a pass/fail checklist from a judge of the other model family: GPT-4.1 (`gpt-4.1`) grades Claude's wording, Claude Haiku (`claude-haiku-4-5`) grades the backup's (principle 5) |
| Start size | 20 to 40 cases |
| Pass level | Judge at least 90% agreement with people first; then a pass rate set after the first trusted baseline |
| Runs | `report-fix-wording.eval.ts` (code grader on hand-written answers in `cases.ts`, the real flow on them, the dataset format, the judge's wiring with a fake judge; no model call): every pull request. `report-fix-wording.ai.eval.ts` (Sonnet writes, the other family judges, paid): when the prompt, model or eval changes (`eval-ai.yml`). |

```bash
npx vitest run --project evals evals/report-fix-wording      # code checks, free
npx vitest run --project evals-ai evals/report-fix-wording   # the eval itself, paid
```

The AI suite is skipped while `dataset.v1.jsonl` does not exist, or the writer's or the judge's API key is not set, and says which in the test name. Status: **not run yet**. The dataset has not been labelled, so the judge is wired but has never been called, and there is no pass rate.

**The labelled set must be written by people before the paid eval runs.** The rows in `dataset.v1.jsonl.example` and the answers in `cases.ts` were written by hand as format examples; they are not labelled data, and the loader refuses `"example": true` rows in the real dataset.

## What is graded

**Code grader** (every case, no model), per fix: a rewrite for every fix key, none unknown or repeated; title at most 60 characters, sentence case, no full stop; why 1 or 2 sentences (at most 320 characters); 2 to 4 steps, each one sentence; every number (digits, decimals, percents) appears in the report snapshot (the agency block left out) or is 1 to 4; every website named appears in the snapshot; no long dashes, emojis, exclamation marks or words the writing guide bans (`docs/design/WRITING.md`); no promised results (guarantees, "#1", "will rank", "rank first", "will make AI name you").

**Judge** (`JUDGE_SYSTEM` in `grader.ts`, version `report-fix-wording.judge.v1`), each pass or fail for the whole rewrite:

| Check | Passes when |
|---|---|
| `faithful` | Every fix keeps the problem, the place to fix it and the actions of its draft and evidence. Nothing that matters is left out and no new action is added. |
| `grounded` | Every claim about the business, a competitor, an AI assistant or a website comes from that fix's facts. |
| `plain` | A local business owner with no marketing background understands every sentence. |
| `actionable` | Every step is one concrete action the owner could start this week, in a sensible order. |

A case passes when the code grader and all 4 judge checks pass. Writer or judge API errors are counted apart and left out of the scores (principle 9). Each run writes every case in full, with the calibration pairs, to `evals/results/` (gitignored).

**Calibration** (principle 4): before the pass rate means anything, the judge grades each case's `calibration.output`, and its verdicts are compared with the person's `calibration.human`. The suite fails unless they agree on at least 90% of the single verdicts. MVP_SPEC 25 asks for about 100 labelled examples per grader; add calibration rows until there are about 100 before trusting small changes.

## Dataset format

One JSON object per line in `dataset.v1.jsonl`:

```json
{"id":"rfw-001","snapshot":{...ReportSnapshot, with its template fixes...},"calibration":{"output":{"fixes":[{"key":"...","title":"...","why":"...","steps":["..."]}]},"human":{"faithful":true,"grounded":true,"plain":false,"actionable":true}},"labelledBy":"<person>","labelledAt":"2026-11-01","note":"optional"}
```

- `snapshot`: a full version 2 report snapshot (`src/modules/reports/v2/snapshot-schema.ts`) as `v2/build.ts` makes it, with the template fixes in `fixes`. Use test agencies or public businesses only, and no Google Places values (D-73 and MVP_SPEC 26: names, ratings and reviews from Places are never stored).
- `calibration.output`: one rewrite to grade, in the writer's output shape. Use real Sonnet outputs for that snapshot, including weak ones, so the judge is tested on passes and failures.
- `calibration.human`: the person's pass or fail for each of the 4 checks. Never copied from a model (principle 6).
- `labelledBy`, `labelledAt`: who labelled the case and on which date.

## What a person must label

1. Pick 20 to 40 saved version 2 reports from test agencies across industries (coffee shops, dentists, plumbers, salons, lawyers and a few others), with a mix of: 1 fix and 6 fixes, businesses without a website, fixes for Google, review sites and the own website, and markets whose names hold digits or full stops ("St. Louis").
2. Turn on `REPORT_AI_WORDING` locally for a non-test copy, or call the writer directly, and read 20 to 50 Sonnet rewrites by hand first (principle 1). Note the ways they go wrong; add a check to the lists above only if people keep seeing a failure the checks miss.
3. For each case, put one Sonnet rewrite in `calibration.output` and grade it yourself, check by check, against that snapshot's fixes only:
   - `faithful`: fail if any fix changes what the owner should do, drops a step that matters, or adds a new one.
   - `grounded`: fail if any fix states something its evidence does not show, for example "Bean House has more photos" when the evidence only counts answers.
   - `plain`: fail if any sentence needs marketing knowledge ("optimise your NAP citations") or reads like an ad.
   - `actionable`: fail if any step is vague ("work on your reviews").
   Be strict: one weak fix fails that check for the whole rewrite.
4. Aim for roughly a third of the cases failing at least one check.
5. When unsure, add a `note` saying why.

After the first trusted run, check any perfect score or sudden jump by hand (principle 11), and turn every real production fallback worth keeping into a new case (principle 12).

## Labelling

Who labelled the cases and when: not yet labelled.

## Dataset changelog

- v1: not created yet. Format, graders, example rows, hand-written fixture cases and this guide added with the fix wording step.
