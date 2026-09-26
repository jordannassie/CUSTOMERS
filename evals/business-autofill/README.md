# Business auto-fill

Built in B-34 (MVP_SPEC 25).

| | |
|---|---|
| Grader | Code schema check plus "nothing invented" check |
| Start size | 30 to 50 businesses |
| Pass level | Schema 100%; any invented field fails |
| Runs | Schema every pull request; invented-field check on prompt or model change |

Files: `dataset.v1.jsonl` (labelled by a person), `grader.ts`, `*.eval.ts`. The eval runs the real code from `src/modules/`, and imports any prompt from `src/modules/*/prompts/`.

## Labelling

Who labelled the cases and when: not yet labelled.

## Dataset changelog

- v1: not created yet.
