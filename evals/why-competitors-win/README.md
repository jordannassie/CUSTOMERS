# Why competitors win

Built in B-51 (MVP_SPEC 7.2, 25, D-30, D-73). Tests `src/modules/insights/explain.ts` with the prompt in `src/modules/insights/prompts/explain.v1.ts` (writer: Claude Sonnet 5, `claude-sonnet-5`).

| | |
|---|---|
| Grader | Code first (`codeGrade` in `grader.ts`), then a pass/fail checklist from Claude Haiku (`claude-haiku-4-5`, `evals/shared/judge.ts`), a different model from the writer |
| Start size | 20 to 40 cases |
| Pass level | Haiku grader at least 90% agreement with people first; then a pass rate set after the first trusted baseline |
| Runs | `why-competitors-win.eval.ts` (dataset format, code grader, the real flow on fixtures, the Haiku grader's wiring with a fake judge; no model call): every pull request. `why-competitors-win.ai.eval.ts` (Sonnet writes, Haiku grades, paid): when a prompt, model or eval changes (`eval-ai.yml`). |

```bash
npx vitest run --project evals evals/why-competitors-win      # code checks, free
npx vitest run --project evals-ai evals/why-competitors-win   # the eval itself, paid
```

The AI suite is skipped while `dataset.v1.jsonl` does not exist or `ANTHROPIC_API_KEY` is not set, and says which in the test name. Status: **not run yet**. The dataset has not been labelled, so the Haiku grader is wired but has never been called, and there is no pass rate. B-51 stays open until a person labels the cases and the grader reaches 90% agreement.

## What is graded

**Code grader** (every case, no model): 3 to 5 reasons; every number in the title, evidence and "why it matters" appears in the facts (steps and the Claude prompt may also use small counts up to 12); every placeholder is one the facts offered, and none sits in a title or a "Copy for Claude" prompt; every website named is the business's own or a cited site; a website fix has a Claude prompt; no long dashes, emojis or words the writing guide bans (`docs/design/WRITING.md`). The same checks run in production, where a reason that fails them is dropped and fewer than 3 good reasons means the fixed rules are used instead.

**Haiku grader** (`JUDGE_SYSTEM` in `grader.ts`, version `why-competitors-win.judge.v1`), each pass or fail for the whole explanation:

| Check | Passes when |
|---|---|
| `grounded` | Every claim about the business, a competitor or a website comes from the facts. Nothing is guessed about a competitor's website. |
| `specific` | Every reason names the specific competitor, question or cited site it is about. |
| `actionable` | Every reason has steps the owner could start this week. |
| `noInventedNumbers` | Every number appears in the facts, or is a placeholder in braces. |

A case passes when the code grader and all 4 Haiku checks pass. Writer or grader API errors are counted apart and left out of the scores (principle 9). Each run writes every case in full, with the calibration pairs, to `evals/results/` (gitignored).

**Calibration** (principle 4): before the pass rate means anything, Haiku grades each case's `calibration.output`, and its verdicts are compared with the person's `calibration.human`. The suite fails unless they agree on at least 90% of the single verdicts. Start with the 20 to 40 cases here; MVP_SPEC 25 asks for about 100 labelled examples per grader, so add calibration rows (they do not need a new writer run) until there are about 100 before trusting small changes.

## Dataset format

One JSON object per line in `dataset.v1.jsonl`. `dataset.v1.jsonl.example` shows three made-up rows on `.example` domains; they carry `"example": true`, which the loader refuses in the real dataset.

```json
{"id":"wcw-001","input":{...facts...},"calibration":{"output":{"reasons":[...]},"human":{"grounded":true,"specific":true,"actionable":false,"noInventedNumbers":true}},"labelledBy":"<person>","labelledAt":"2026-10-01","note":"optional"}
```

- `input`: the facts object Claude is given, exactly as `buildExplainInput` makes it (`src/modules/insights/facts.ts`). Google values appear only as comparisons and placeholder names, never as numbers (D-73), so the dataset holds no Google content.
- `calibration.output`: one explanation to grade, in the writer's output shape. Use real Sonnet outputs for these facts, including some weak ones, so the grader is tested on both passes and failures.
- `calibration.human`: the person's pass or fail for each of the 4 checks. Never copied from Haiku or Sonnet (principle 6).
- `labelledBy`, `labelledAt`: who labelled the case and on which date.

## Labelling guide

1. Pick 20 to 40 scans across industries (coffee shops, dentists, plumbers, lawyers, salons and a few others), with a mix of: a clear competitor lead, businesses without a website, businesses without a Google place, scans where AI cites directory sites (Yelp, TripAdvisor), and scans where the business already does well. Use test agencies or public businesses only; no private customer data in the repo.
2. For each, build `input` with `buildExplainInput` from the saved scan (production answers can be referenced by run id and loaded at run time instead of copied, MVP_SPEC 25).
3. Before labelling, read 20 to 50 Sonnet outputs by hand (principle 1) and note the ways they go wrong. Add a check to the list above only if people keep seeing a failure the 4 checks miss.
4. For each case, put one Sonnet explanation in `calibration.output` and grade it yourself, check by check, reading it against `input` only:
   - `grounded`: fail if any reason says something the facts do not show, for example "Bean House has a newer website" or "you are not listed on Yelp" (the facts only say Yelp was cited and the business was not named).
   - `specific`: fail if any reason is general advice that would fit any business ("improve your SEO").
   - `actionable`: fail if any reason's steps are vague ("work on your reviews") rather than something to do this week.
   - `noInventedNumbers`: fail if any number is not in `input`. Placeholders such as `{c1.review_count}` count as given.
   Be strict: one weak reason fails that check for the whole explanation.
5. Aim for roughly a third of the cases failing at least one check, so agreement is tested on failures as well as passes.
6. When unsure, add a `note` saying why, so the case can be reviewed later.

After the first trusted run, check any perfect score or sudden jump by hand (principle 11), and turn every real production failure into a new case (principle 12).

## Labelling

Who labelled the cases and when: not yet labelled. The dataset must come from a person; B-51 stays open until it is done and the grader is calibrated.

## Dataset changelog

- v1: not created yet. Format, graders, example rows and this guide added in B-51.
