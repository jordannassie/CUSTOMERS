# Business auto-fill

Built in B-34 (MVP_SPEC 3.2, 25, D-18). Tests `src/modules/onboarding/autofill.ts` with the prompt in `src/modules/onboarding/prompts/business-autofill.v1.ts`.

| | |
|---|---|
| Grader | Code: schema check plus "nothing invented" check (`grader.ts`) |
| Start size | 30 to 50 businesses |
| Pass level | Schema 100%; any invented field fails |
| Runs | `business-autofill.eval.ts` (grader, dataset format, and the real flow fed with fixtures; no provider call): every pull request. `business-autofill.ai.eval.ts` (real Firecrawl, Google Places and Claude calls per business): when a prompt, model or eval changes (`eval-ai.yml`). |

```bash
npx vitest run --project evals evals/business-autofill      # grader and fixture checks, free
npx vitest run --project evals-ai evals/business-autofill   # the eval itself, paid
```

The AI suite is skipped while `dataset.v1.jsonl` does not exist, or while `ANTHROPIC_API_KEY`, `FIRECRAWL_API_KEY` or `GOOGLE_PLACES_API_KEY` is not set, and says which in the test name. Each run writes every case with its grade, the models and the prompt version to `evals/results/` (gitignored), and prints the fields each business got invented, wrong or missed. Provider failures (Firecrawl or Places errors, Claude API errors) are counted separately and left out of the scores (principle 9).

## What is graded

- **Schema**: the values the form receives have exactly the form's fields, an industry from our list (or empty), and at most 12 services. Must be 100%.
- **Invented**: a field that is filled although the label says neither the website nor Google states it. Any one fails the suite.
- **Wrong** and **missed**: a different value from the label, or a labelled field left empty. Printed for reading, not a pass level yet (MVP_SPEC 25: tightened after the first baseline).

Name and address match when one contains the other (Google adds ", USA"); phone numbers compare digits; other fields compare letters and digits only. Description is graded only on empty versus filled.

## Dataset format

One JSON object per line in `dataset.v1.jsonl`. `dataset.v1.jsonl.example` shows three made-up rows on `.example` domains; they carry `"example": true`, which the loader refuses in the real dataset. The fast suite runs those three rows through the real flow with fixture sources.

```json
{"id":"ba-001","input":{"domain":"examplecoffee.com"},"blocksScanners":false,"expected":{"name":"Example Coffee","industry":"coffee_shop","description":"Espresso bar and bakery.","services":["espresso","pastries"],"city":"Austin","state":"TX","country":"US","phone":"(512) 555-0100","address":"1 Main St, Austin, TX 78701"},"labelledBy":"<person>","labelledAt":"2026-10-01","note":"optional"}
```

- `input`: `{"domain": "..."}` for a business with a website, or `{"name": "...", "city": "..."}` for one without (MVP_SPEC 3.3).
- `blocksScanners`: true when the site sits behind Cloudflare or another bot check.
- `expected`: the person's label (below). Never copied from the auto-fill output (MVP_SPEC 25, principle 6).
- `labelledBy`, `labelledAt`: who labelled the case and on which date.

## Labelling guide

For each business, open its website in a normal browser and look it up on Google Maps. Then fill `expected` with what a careful person would put in the onboarding form:

1. Write a value only if the website or the Google listing states it. If neither does, use `""` (or `[]` for services). This is what the "nothing invented" check relies on, so be strict: a city you know but neither source states is `""`.
2. `name`: the business's own name, as the website or Google writes it, without taglines.
3. `industry`: one of `dentist`, `lawyer`, `restaurant`, `coffee_shop`, `plumber`, `hvac`, `med_spa`, `real_estate`, `auto_repair`, `salon`, `other`. Use `other` when the sources clearly describe a business outside the list; use `""` when they do not say what it does.
4. `description`: any short summary if the website describes the business, `""` if it does not. Only filled versus empty is graded. For a site that blocks scanners, use `""`, since only Google can be read and Google values do not include a description.
5. `services`: the main services named on the website, `[]` if none, and `[]` for a site that blocks scanners.
6. `city`, `state`, `country`, `phone`, `address`: as on Google when Google has them (Google wins for these), otherwise as on the website. `state` as the short code (`CA`), `country` as the two-letter code (`US`).
7. For a site that blocks scanners, label only what Google shows.
8. When unsure, add a `note` saying why, so the case can be reviewed later.

What to include: 30 to 50 real, public local businesses across the industries in the list plus a few `other`; at least 5 sites behind Cloudflare or another bot check (brandastic.com is one); a few businesses without a website; a few with thin or single-page sites. No private customer data: only public business websites and public Google listings.

Before labelling, run auto-fill by hand on 20 to 50 businesses and read the output (principle 1). After the first run, check any perfect score or sudden jump by hand (principle 11). Open question before labelling: labels read off Google Maps are Google content kept in the repo, which D-73 may not allow. Decide first (flagged in the B-34 pull request); the fallback is to label only from each business's own website and leave Google-only fields out of the grade.

## Labelling

Who labelled the cases and when: not yet labelled. The dataset must come from a person; B-34 stays open until it is done.

## Dataset changelog

- v1: not created yet. Format, grader and example rows added in B-34.
