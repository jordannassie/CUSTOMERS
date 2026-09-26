# "Also recommended" extraction

Built in B-25 (MVP_SPEC 25).

| | |
|---|---|
| Grader | Code, set F1 |
| Start size | 50 to 100 answers |
| Pass level | F1 at least 0.85 to start |
| Runs | Every pull request |

Files: `dataset.v1.jsonl` (labelled by a person), `grader.ts`, `*.eval.ts`. The eval runs the real code from `src/modules/`, and imports any prompt from `src/modules/*/prompts/`.

## Labelling

Who labelled the cases and when: not yet labelled.

## Dataset changelog

- v1: not created yet.
