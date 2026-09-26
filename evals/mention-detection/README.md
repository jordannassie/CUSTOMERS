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

## Labelling

Who labelled the cases and when: not yet labelled (flag F-04).

## Dataset changelog

- v1: not created yet.
