# Seed data

## question-library.v1.json (B-32, MVP_SPEC 5.3)

Not created yet. It waits for the rotated AI keys (B-01) and a reviewer.

1. `LIVE_AI_CALL=1 npm run question-library:generate` drafts about 40 templates per industry with Claude Sonnet (status `draft`).
2. A person reads every template, fixes wording, removes weak ones, then sets `"status": "approved"` and `"review": { "reviewer": "<name>", "reviewedAt": "YYYY-MM-DD" }`.
3. `npm run question-library:validate` must pass (every template has `{city}`, a tag and an intent; review recorded).
4. `npm run question-library:seed` loads it into `question_library` as version 1 (local stack by default; `SEED_ENV_FILE=.env.local` for customers-dev). Only an approved file is loaded.

Changing templates later means a new file with the next version, so old scan results keep their version.
