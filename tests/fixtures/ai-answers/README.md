# Recorded AI answers

Answers from the check models (`gpt-4.1-mini`, `claude-haiku-4-5`, `sonar`), used so tests and `is_test` agencies run full scans with no AI calls and no AI cost (D-61).

- One JSON file per answer. At run time a test scan picks, for each check, the answer from the same model whose question matches best (exact match first, then the most shared words).
- Public business names only. No customer data, no private questions.

## The synthetic files are placeholders

Every `synthetic-*.json` file (with `"synthetic": true`) is hand-written. The businesses in them are made up and the answers were never produced by a real model. They exist only so test mode, the seed agency and the tests work before real answers can be recorded.

They cover 3 industries (coffee shop, dentist, plumber) in 2 cities (Orange, CA and Austin, TX), 2 questions each, for all three models.

## Replacing them with real recordings

Real answers are recorded by `scripts/record-ai-answers.ts`: about 50 answers per model for the same 3 industries and 2 cities. It makes real paid calls (about $5 in total), so it runs only with `LIVE_AI_CALL=1`, and only after the AI keys are rotated (B-01):

```
LIVE_AI_CALL=1 npm run record:ai-answers
```

It writes `recorded-*.json` files, skips answers already recorded (so a stopped run can resume), and removes the synthetic files once every answer is recorded. The `names` in a recorded file come from the name extractor (Claude Haiku); read through them before committing.

## Restaurant and coffee shop answers for Islamabad (BUG-072)

A test restaurant has no recordings of its own trade, so it gets the closest answer of any trade (a plumber's, for example). The food set records 51 real answers: 9 restaurant and 8 coffee shop questions in Islamabad, on all three models. About $0.75 at the average cost per check seen locally (ChatGPT $0.014, Claude $0.022, Perplexity $0.004, plus $0.0008 to pull out the names), at most about $1.50:

```
LIVE_AI_CALL=1 RECORD_SET=food npm run record:ai-answers
```

It writes `recorded-{model}-restaurant-islamabad-{n}.json` and `recorded-{model}-coffee-islamabad-{n}.json`; test scans then match a restaurant or coffee shop in Islamabad to its own trade and city first (`scanning/recorded.ts`). It does not remove the synthetic files.
