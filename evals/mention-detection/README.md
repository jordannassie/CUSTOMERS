# Mention detection

Built in B-24 (MVP_SPEC 5.5, 25, D-66). Tests `src/modules/scanning/mentions.ts`.

| | |
|---|---|
| Grader | Code (`grader.ts`) |
| Start size | 150 to 200 real AI answers, positive and negative |
| Pass level | At least 95% accuracy; false positive rate and recall reported separately |
| Runs | Every pull request (`npm run evals`) |

```bash
npx vitest run --project evals evals/mention-detection
```

The suite is skipped while `dataset.v1.jsonl` does not exist. Each run writes every case with its grade to `evals/results/` (gitignored) and prints each false positive and missed mention.

## Dataset format

One JSON object per line in `dataset.v1.jsonl`:

```json
{"id":"md-001","model":"sonar","question":"Who is the best plumber near me?","answer":"<full AI answer>","business":{"name":"Ace Plumbing","website":"aceplumbing.com","city":"Austin","phone":null,"aliases":[]},"mentioned":true,"position":2,"labelledBy":"<person>","note":"generic name, city in same list item"}
```

- `model`: `gpt-4.1-mini`, `claude-haiku-4-5` or `sonar`.
- `business.hasWebsite: false` for businesses without a website (D-08).
- `mentioned` and `position` are the person's answer: is this business recommended in the answer, and at which list item (null when not in a list).
- `labelledBy`: who labelled the case. A label is never copied from a model (MVP_SPEC 25, principle 6).

## What to include

- Real answers from the three check models, not written by hand. No private customer data.
- Roughly half positive and half negative.
- Tricky names: short or generic ("Ace", "Prime", "Best Plumbing"), names inside other words ("space"), legal suffixes (LLC, Inc, Co), apostrophes and "&", domain-only mentions, aliases, businesses without a website, and same-name businesses in another city.

## Labelling with a spreadsheet (B-24)

1. Export: `LABEL_SUITE=mention-detection LABEL_COUNT=100 npm run label:export`. It reads saved real answers (never sample answers) read-only from the local database by default, 2 cases per answer: the business the question was asked for and one of its competitors. `LABEL_ENV_FILE=.env.development.local.ohio` reads the preview database instead; the live project needs `LABEL_FROM_LIVE=1`. The sheet is written to `evals/results/labelling/mention-detection.csv` (git-ignored).
2. Open it in Google Sheets or Excel. Fill `mentioned` (yes or no) and `position` (the list item number, empty when it is not a list) for each row, reading the whole answer. Leave a row empty to skip it; add a `note` when unsure.
3. Download it back as CSV to the same path (or pass `LABEL_CSV=path/to/file.csv` in the next step).
4. Import: `LABEL_SUITE=mention-detection LABELLER="Your name" npm run label:import`. It adds the labelled rows to `dataset.v1.jsonl` with your name and today's date, keeps rows already there, skips empty ones, and refuses the whole sheet if a row would not load in this suite. You can label in several sittings.
5. Record who labelled and when under "Labelling" below, then run the fast suite: `npx vitest run --project evals evals/mention-detection`. The paid suite runs in `eval-ai.yml`.

The scripts never call a model and never fill a label themselves: every label comes from the person (MVP_SPEC 25, principle 6).

## Labelling

Who labelled the cases and when: not yet labelled (flag F-04).

## Dataset changelog

- v1: not created yet.
