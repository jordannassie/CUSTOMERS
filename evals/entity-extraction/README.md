# "Also recommended" extraction

Built in B-25 (MVP_SPEC 5.2, 25, D-74). Tests `src/modules/scanning/extract.ts` with the prompt in `src/modules/scanning/prompts/extract-names.v1.ts`.

| | |
|---|---|
| Grader | Code, set F1 (`grader.ts`) |
| Start size | 50 to 100 answers |
| Pass level | Mean set F1 at least 0.85 to start |
| Runs | `entity-extraction.eval.ts` (grader and format checks, no model call): every pull request. `entity-extraction.ai.eval.ts` (real Claude Haiku call per answer): when a prompt, model or eval changes (`eval-ai.yml`). |

```bash
npx vitest run --project evals evals/entity-extraction      # grader checks, free
npx vitest run --project evals-ai evals/entity-extraction   # the eval itself, paid
```

The AI suite is skipped while `dataset.v1.jsonl` does not exist or `ANTHROPIC_API_KEY` is not set, and says which one in the test name. Each run writes every case with its grade, the model, the prompt version and the real cost to `evals/results/` (gitignored), and prints the names each answer missed or added. API errors (timeouts, 429, 5xx) are counted separately and left out of F1.

## Dataset format

One JSON object per line in `dataset.v1.jsonl`. `dataset.v1.jsonl.example` shows three made-up rows; they carry `"example": true`, which the loader refuses in the real dataset.

```json
{"id":"ee-001","model":"sonar","question":"What is the best plumber in Austin, TX?","city":"Austin","answer":"<full AI answer>","names":["Ace Plumbing","Rapid Rooter & Drain"],"labelledBy":"<person>","note":"optional"}
```

- `model`: the check model that wrote the answer: `gpt-4.1-mini`, `claude-haiku-4-5` or `sonar`.
- `answer`: the full answer text, copied as is.
- `names`: the person's label (below). Never copied from the extractor's output (MVP_SPEC 25, principle 6).
- `labelledBy`: who labelled the case.

## Labelling guide

Read the whole answer, then write down every business it names, following the same rules the prompt gives the model:

1. Include every local business, practice or shop named as an option for the customer, including chains and ones mentioned only in passing ("or try Joe's if they are booked").
2. Leave out websites and platforms used as sources or places to look: Yelp, Google Maps, Tripadvisor, Angi, Reddit, news sites. Leave out people (a dentist's own name counts only if it is the practice name), products, neighborhoods and cities.
3. Copy each name as the answer writes it the first time. Spelling variants and legal suffixes do not matter to the grader ("Ace Plumbing, LLC" equals "Ace Plumbing"; "&" equals "and").
4. List each business once, in the order it first appears.
5. If no business is named, use `"names": []`. Include some of these.
6. When unsure, add a `note` saying why, so the case can be reviewed later.

What to include: 50 to 100 real answers from the three check models across several industries and cities; lists, prose answers, answers with sources, and answers that name nothing. No private customer data; answers are public AI output to generic local questions.

Before labelling, read 20 to 50 real answers by hand (principle 1). After the first run, check any perfect score or sudden jump by hand (principle 11).

## Labelling

Who labelled the cases and when: not yet labelled. The dataset must come from a person; B-25 stays open until it is done.

## Dataset changelog

- v1: not created yet. Format and example rows added in B-25.
