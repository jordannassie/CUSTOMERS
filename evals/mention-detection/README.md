# Mention detection

Built in B-24 (MVP_SPEC 25).

| | |
|---|---|
| Grader | Code |
| Start size | 150 to 200 answers, positive and negative |
| Pass level | At least 95% accuracy; false positives reported separately |
| Runs | Every pull request |

Files: `dataset.v1.jsonl` (labelled by a person), `grader.ts`, `*.eval.ts`. The eval runs the real code from `src/modules/`, and imports any prompt from `src/modules/*/prompts/`.

## Labelling

Who labelled the cases and when: not yet labelled.

## Dataset changelog

- v1: not created yet.
