# Why competitors win

Built in B-51 (MVP_SPEC 25).

| | |
|---|---|
| Grader | AI grader checklist (Claude Haiku, a different model from the writer), calibrated first |
| Start size | 20 to 40 cases |
| Pass level | Grader at least 90% agreement with people, then a set pass rate |
| Runs | On prompt or model change |

Files: `dataset.v1.jsonl` (labelled by a person), `grader.ts`, `*.eval.ts`. The eval runs the real code from `src/modules/`, and imports any prompt from `src/modules/*/prompts/`.

## Labelling

Who labelled the cases and when: not yet labelled.

## Dataset changelog

- v1: not created yet.
