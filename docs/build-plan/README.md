# Customers.Direct Build Plan

The ordered task list to build the MVP described in [MVP_SPEC.md](../MVP_SPEC.md), following [DECISIONS.md](../DECISIONS.md) and [design/DESIGN.md](../design/DESIGN.md). Written 2026-09-26.

Anyone should be able to pick up the next task from this plan without asking.

## Phases

| # | Phase | File | Tasks | Estimate |
|---|---|---|---|---|
| 1 | Safety and setup | [01-setup.md](./01-setup.md) | B-01 to B-09 | 9.5 days |
| 2 | Foundation (database, credits, data move) | [02-foundation.md](./02-foundation.md) | B-10 to B-17 | 10 days |
| 3 | Scan engine | [03-scan-engine.md](./03-scan-engine.md) | B-20 to B-31 | 15.5 days |
| 4 | Onboarding | [04-onboarding.md](./04-onboarding.md) | B-32 to B-38 | 16 days |
| 5 | Billing | [05-billing.md](./05-billing.md) | B-40 to B-46 | 17 days |
| 6 | Dashboard | [06-dashboard.md](./06-dashboard.md) | B-48 to B-58 | 22 days |
| 7 | Reports and emails | [07-reports-emails.md](./07-reports-emails.md) | B-59 to B-62 | 6 days |
| 8 | Admin | [08-admin.md](./08-admin.md) | B-64 to B-69 | 9.5 days |
| 9 | Marketing site | [09-marketing.md](./09-marketing.md) | B-70 to B-74 | 9 days |
| 10 | Launch readiness | [10-launch.md](./10-launch.md) | B-75 to B-83 | 12 days |

**Total: 78 tasks, about 127 developer days.** One developer: about 6 months. Two developers working in parallel (see below): about 3 to 3.5 months. Estimates use S = half a day, M = 1 to 2 days, L = 3 to 5 days, and include tests. Gaps in the numbering (B-18, B-19, B-39, B-47, B-63) are spare IDs for tasks added later.

## Branches (D-45)

- **`main` is the live site.** Netlify publishes every merge to `main` straight away. Never push to it directly.
- **`mvp` is the rebuild.** One long-lived branch that collects many tasks, with its own Netlify staging URL. Merged into `main` once, at go-live (B-80). Merge `main` into `mvp` at least weekly so it keeps the latest safety and groundwork changes.
- **Task branches**: one per task, named `task/B-xx-name`, opened from the target branch and merged back by pull request after CI passes.
  - Into **`main`**: safe for the live site now, or invisible to users (tooling, CI, new unused tables and modules, scan engine parts not wired to the UI).
  - Into **`mvp`**: anything customers would see or that changes live behaviour (new pages, onboarding, billing, dashboard, admin, marketing, workers and schedules).
- Every task below names its branch and target. Database migrations apply to the one shared database whichever branch they come from, so they stay additive (D-43).

| Target | Tasks |
|---|---|
| `main` (short task branches) | B-02 to B-07, B-10 to B-13, B-16, B-20 to B-25, B-30, B-31, B-81, B-83 |
| `mvp` (short task branches) | B-08, B-09, B-14, B-15, B-17, B-26 to B-29, B-32 to B-79 (except B-80), B-82 |
| `mvp` into `main` | B-80 (go-live) |
| No branch | B-01 (keys and accounts) |

## Milestones

1. **First real scan works end to end** (end of phase 3): a test business is scanned on ChatGPT, Claude and Perplexity with location, credits are charged correctly, and a score with a confidence label is stored.
2. **A new customer can sign up, pay and see results** (end of phase 5, with a basic dashboard from phase 6 B-48 and B-49): pricing, signup, onboarding, card, trial, first scan, score.
3. **Complete product, ready to launch** (end of phase 10).

## Dependency map

```
Phase 1 (setup)
   └── Phase 2 (foundation)
          ├── Phase 3 (scan engine) ──┬── Phase 4 (onboarding) ── Phase 5 (billing)
          │                            ├── Phase 6 (dashboard) ── Phase 7 (reports, emails)
          │                            └── Phase 8 (admin)
          └── Phase 9 (marketing site; needs only B-09 design system and B-40 plan prices)
Phase 10 (launch) needs everything above.
```

Task-level dependencies are listed in each task.

## Two developers in parallel

| Weeks | Developer A | Developer B |
|---|---|---|
| 1 to 2 | Phase 1 (B-01 to B-08) | B-09 design system, then phase 9 marketing site |
| 3 to 4 | Phase 2 foundation | Phase 9 continued, B-32 question library content |
| 5 to 8 | Phase 3 scan engine | Phase 4 onboarding (UI first, wired to B-26 when ready) |
| 9 to 12 | Phase 5 billing | Phase 6 dashboard |
| 13 to 14 | Phase 7 reports and emails | Phase 8 admin |
| 15 to 16 | Phase 10 launch readiness | Phase 10 launch readiness |

## Blocked by Jordan

These tasks can be built and tested against sandboxes, but cannot go live without Jordan:

| Needs | Blocks |
|---|---|
| His Stripe account (LLC) | B-40 live keys, B-80 go-live |
| Plan prices confirmed (D-21) | B-40 products, B-72 pricing page |
| Domain DNS access (only if we move to Vercel) | B-80 go-live |
| Existing beta users decision | B-81 |
| Lawyer or Jordan review | B-78 terms and privacy, B-79 Places reading |
| LinkedIn Studio decision | Nothing blocked; untouched until then (D-07) |

## Work only people can do

Budget about 4 to 5 days of human time across the build:
- Labelling eval datasets: mention detection, name extraction, auto-fill, question picking, explanations (B-24, B-25, B-33, B-34, B-51, B-75).
- Reviewing the industry question library (B-32).
- Calibration check against the real ChatGPT, Claude and Perplexity apps (B-76).
- Reading 20 to 50 real outputs before each AI grader is written.
- Walking through each phase's demo checklist.

## How each task is written

```
### B-xx Title
Phase · Size · Depends on · Blocked by Jordan · Spec and decision links

Build            exact steps: files, functions, tables, endpoints, UI
What the user sees   real results in plain language, checked in the running app
Engineering checks   standard checks plus anything specific to the task
```

## Standard engineering checks (every task)

Every task must also pass these; tasks only list extra checks.
- `npx tsc --noEmit`, `npx eslint src` (including boundaries and max-lines rules), `npm test`, `npm run build`: real output pasted in the PR.
- New or changed database objects: migration file added, Supabase types regenerated, RLS enabled.
- New inputs validated with zod; every action and route calls `requireUser()` or `requireAdmin()`.
- UI tasks: screenshots or a short recording at 1440px and 390px wide, including empty, loading and error states, attached to the PR.
- Prompt or model changes: the related eval suite run and its result pasted in the PR.

## Workflow

- One branch and one pull request per task, on the branch named in the task. PR title starts with the task ID: `B-13: credit SQL functions`.
- The git hooks scan every commit and push for malware and secrets (D-82). Never bypass them with `--no-verify`.
- "What the user sees" is checked in the running app (Playwright or by hand) and shown with screenshots or a recording in the PR.
- Testing uses an `is_test` agency (no real AI credits or payments) and Stripe sandbox keys.
- Back up Supabase before any migration (the database is shared with the live site).
- When a task is merged, tick it here and add the PR number.
- If a task needs a new decision, add it to DECISIONS.md first.
