# Copy for Claude prompts

Built in B-52 (MVP_SPEC 25).

| | |
|---|---|
| Grader | Code (no empty placeholders, length, structure) |
| Start size | 10 to 20 |
| Pass level | 100% |
| Runs | Every pull request |

Files: `dataset.v1.jsonl` (labelled by a person), `grader.ts`, `*.eval.ts`. The eval runs the real code from `src/modules/`, and imports any prompt from `src/modules/*/prompts/`.

## Labelling

Who labelled the cases and when: not yet labelled.

## Dataset changelog

- v1: not created yet.
