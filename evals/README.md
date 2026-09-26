# AI evals

Evals check the quality of the AI parts whenever a prompt or model changes (MVP_SPEC 25, D-81). They run inside Vitest with `vitest-evals`; `autoevals` supplies scorer functions where useful.

```bash
npx vitest run evals        # every suite
npx vitest run evals/mention-detection
```

## Folders

| Folder | Grader | Built in |
|---|---|---|
| `mention-detection/` | Code | B-24 |
| `entity-extraction/` | Code, set F1 | B-25 |
| `question-picking/` | Overlap with an acceptable pool | B-33 |
| `business-autofill/` | Code schema check plus "nothing invented" check | B-34 |
| `why-competitors-win/` | AI grader, calibrated first | B-51 |
| `prompt-templates/` | Code | B-52 |
| `shared/` | `judge.ts` (the one AI grader model), `metrics.ts` (accuracy, set F1, overlap), a smoke eval | B-06 |
| `results/` | Run output; gitignored except one baseline per suite (B-75) | |

Each suite has `dataset.v1.jsonl`, `grader.ts`, `*.eval.ts` and a `README.md` with who labelled it, when, and a dataset changelog. Datasets are versioned (`v1`, `v2`). No private customer data in the repo; production answers are referenced by ID and loaded at run time.

## The 12 principles

**Human task** means a person must do it; code or a model cannot stand in.

| # | Principle | Who |
|---|---|---|
| 1 | Read 20 to 50 real outputs by hand before writing graders. | **Human task** |
| 2 | Code graders before AI graders wherever the output has a fixed shape. | Code |
| 3 | AI graders give pass or fail, not 1 to 5 scores. | Code |
| 4 | Check each AI grader against about 100 human-labelled examples; at least 90% agreement before trusting it. | **Human task** (labels), code (agreement) |
| 5 | A model never grades its own output. | Code (`assertNotSelfGrading` in `shared/judge.ts`) |
| 6 | Correct answers are labelled by people, never copied from the model under test. | **Human task** |
| 7 | Pin exact model versions; record the real cost of every run. | Code |
| 8 | Pass levels sit above the noise (about ±14 points at 25 cases, ±7 at 100). | Code |
| 9 | API errors are counted separately, never as model failures. | Code |
| 10 | Every case is saved in full (input, output, grade). | Code |
| 11 | A perfect score or a sudden jump gets checked by hand. | **Human task** |
| 12 | Every real production failure becomes a new case. | **Human task** (spot and label), code (add the case) |

## When they run

- Code-graded suites: every pull request (`eval-fast.yml`, B-07).
- AI-graded suites: only when files under `src/modules/*/prompts/`, model settings or `evals/` change (`eval-ai.yml`, B-07).
