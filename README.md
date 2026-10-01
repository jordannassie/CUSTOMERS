# Customers.Direct

Customers.Direct checks whether ChatGPT, Claude and Perplexity recommend a local business when people ask them for one ("best dentist in Austin"). It shows which competitors the AI picks instead and why, gives steps to fix it, and tracks the mention rate over time. It is sold to local businesses and to the agencies that manage them, paid for with credits on a monthly plan.

## Read first

| Need | File |
|---|---|
| Rules for working in this repo (people and AI agents) | `CLAUDE.md`, `AGENTS.md` |
| What we build and how (wins over old code and old docs) | `docs/MVP_SPEC.md` |
| Next task, task by task (`B-xx`), and live progress | `docs/build-plan/README.md`, `docs/build-plan/STATUS.md` |
| Why each choice was made (`D-xx`) | `docs/DECISIONS.md` |
| Look and feel, and how every word should read | `docs/design/DESIGN.md`, `docs/design/WRITING.md` |
| Go-live steps, backups, Google Places rules | `docs/launch/` |
| Known bugs | `docs/BUGS.md`, `docs/MVP_ROADMAP.md` |

## Stack

| Layer | What we use |
|---|---|
| App | Next.js 16.3 (App Router, Turbopack, Cache Components), React 19.2, TypeScript 5 |
| UI | Tailwind CSS 4, shadcn/ui, Lucide icons, Recharts |
| Data and auth | Supabase (Postgres with RLS, Auth, Storage, pg_cron), `@supabase/ssr` |
| Payments | Stripe (Checkout, subscriptions, webhooks) |
| AI checks | OpenAI, Anthropic and Perplexity APIs; Google Places for business data |
| Email and PDF | Resend with React Email; PDFs from Browserless or local Chromium |
| Validation and env | zod 4, `@t3-oss/env-nextjs` |
| Tests | Vitest 4, Playwright 1.63, `vitest-evals` for AI evals |
| Hosting | Netlify with `@netlify/plugin-nextjs`; the scan worker is a Netlify background function |
| Runtime | Node 24 or newer (`engines` in `package.json`) |

## Folder map

```
src/
├── app/                   Routes only, kept thin
│   ├── (marketing)/       Home page; pricing, agency, compare, legal and auth pages are top-level folders
│   ├── (app)/             Signed-in app: dashboard, onboarding, competitors, questions, sources, settings
│   ├── internal/admin/    Admin pages (ADMIN_EMAILS only)
│   ├── r/[token]/         Public share page for a report
│   └── api/               Route handlers: Stripe webhook, admin and public endpoints
├── modules/<feature>/     All feature logic; copy _template/ to start one
│   ├── dal.ts             The only place that reads the database or secrets (server-only)
│   ├── actions.ts         Server Actions, each checks auth itself
│   ├── service.ts         Pure logic, easy to test
│   ├── schema.ts          zod schemas for every input
│   └── prompts/           Versioned AI prompts, also used by evals/
├── components/            UI only; never imports Supabase, Stripe or AI clients
├── lib/env.ts             The only file that reads process.env
├── types/database.types.ts  Generated Supabase types, never edited by hand
└── proxy.ts               Quick redirects only; never the auth check
supabase/migrations/       Schema changes, one new file each (see its README)
netlify/worker/            Scan worker, bundled by scripts/build-worker.mjs
evals/                     AI evals (evals/README.md)
tests/e2e/                 Playwright specs; tests/fixtures/ holds recorded AI answers and seed data
scripts/                   Checks, scanners, test database and seed scripts
```

Unit tests sit next to the code as `*.test.ts`. Keep files under 250 lines.

## Run it locally

Needs Node 24, Docker and the Supabase CLI. Install once with `npm ci`. Every step below uses a local database, recorded AI answers and fake payments, so nothing costs money.

### 1. Start the local database

```bash
bash scripts/test-db-reset.sh
```

This starts the shared local Supabase stack (or reuses it if another worktree already did), builds it from `supabase/migrations` when they changed, and writes its URL and keys to `.env.test.local`. It is the same stack `npm test` uses (see "Test database" below). Local emails (sign-up, password reset) from the shared stack land in Mailpit at http://127.0.0.1:54624.

### 2. Add test data

```bash
npm run seed:test-agency
```

It creates, from `tests/fixtures/test-agency.json`:
- A user `test-agency@customers.test` with a random password, printed once at the end.
- A test agency (`is_test`, so scans use recorded answers and cost no AI money) with 500 credits, granted through `grant_credits`.
- 2 businesses, Bean There Coffee (Orange, CA) and Maple Leaf Dental (Austin, TX), each with 3 questions and 2 competitors.

Use it when you want to click around the app or run a scan by hand. Running it again only reports the agency that exists. The script refuses any database except the local stack or customers-dev (`npm run seed:test-agency -- --env .env.local`); never the live one. A rebuild of the stack after a migration change wipes the data, so run it again then.

### 3. Start the dev server with fixtures

```bash
set -a; source .env.test.local; set +a
export WORKER_IN_PROCESS=true PLACES_FIXTURES=true ONBOARDING_FIXTURES=true STRIPE_CHECKOUT_FIXTURES=true
export PDF_RENDERER=chromium CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
export ADMIN_EMAILS=test-agency@customers.test
export NEXT_PUBLIC_SITE_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000
# next dev still reads .env.local; empty values set here win, so no real key is used.
export OPENAI_API_KEY= ANTHROPIC_API_KEY= PERPLEXITY_API_KEY= GOOGLE_PLACES_API_KEY= FIRECRAWL_API_KEY= \
  BROWSERLESS_API_KEY= STRIPE_SECRET_KEY= STRIPE_WEBHOOK_SECRET= RESEND_API_KEY= WORKER_URL=
npm run dev -- -p 3000
```

| Setting | What it does |
|---|---|
| `PLACES_FIXTURES=true` | Competitor suggestions come from hand-built fixtures, never Google Places. |
| `ONBOARDING_FIXTURES=true` | Setup auto-fill and question picking come from fixtures, never Firecrawl, Google or Claude. |
| `STRIPE_CHECKOUT_FIXTURES=true` | The card step, top-ups and plan changes use a fake Checkout and card form (`4242 4242 4242 4242` pays, `4000 0000 0000 0002` declines). No Stripe call is made. |
| `WORKER_IN_PROCESS=true` | With no `WORKER_URL`, Run scan runs the scan worker inside the dev server. Local dev only. |
| `PDF_RENDERER=chromium` | PDF export uses local Chrome at `CHROMIUM_PATH` instead of Browserless. `NEXT_PUBLIC_APP_URL` must point at this server. |
| `ADMIN_EMAILS` | Comma-separated emails that get the admin pages. It is the only source of admin access. |

The 3 fixture flags only work outside production: the code ignores them when `NODE_ENV` is `production`. Only use a different port if 3000 is taken, and change the 2 URLs to match.

### 4. Log in

- Open http://localhost:3000/login as `test-agency@customers.test` with the printed password. Lost it? Use "Forgot password" and open the email in Mailpit.
- The seeded businesses start part way through setup, so the first login opens setup at "Business details". Click Continue to the end; the fixtures fill every step and no card is asked for. Then Run scan on the Overview finishes in a second from recorded answers and uses 1 test credit per answer.
- Admin: http://localhost:3000/internal/admin opens for any email in `ADMIN_EMAILS`. To see what a normal user sees, restart the server without that email in the list.

## Checks, tests and evals

```bash
npx tsc --noEmit            # types
npm run lint                # ESLint, including module boundary rules
npm run check:auth          # every route and Server Action checks auth itself
npm run check:copy          # wording against docs/design/WRITING.md (long dashes, banned words)
npm run check:rls           # every new table in a migration enables RLS
npm run check:routes -- http://localhost:3000   # kept routes load, removed ones redirect; needs a running server
npm test                    # unit tests; gets the local test database ready first
npm run test:e2e            # Playwright at 1440px and 390px; starts its own dev server on E2E_PORT (default 3106)
npm run evals               # code-graded AI evals on recorded answers, free
npm run evals:ai            # AI-graded evals; calls real models, needs API keys, costs money
npm run build               # production build plus the worker bundle
```

- Tests read only `.env.test.local`, never `.env.local`, so they cannot reach a shared database or spend AI credits.
- `npm run test:e2e` starts its dev server with `.env.test.local`, the fixture flags, `WORKER_IN_PROCESS=true` and 2 test admins in `ADMIN_EMAILS` (`playwright.config.ts`). If a server already runs on `E2E_PORT`, it reuses it, so start that one the same way or stop it first. Name a spec to run one file: `npm run test:e2e -- tests/e2e/overview.spec.ts`.
- `npm run dev`, `npm run build` and `npm run scan` run the malware scanner first. If it reports a payload, stop and tell the team; never run flagged code.

## Test database (INFRA-02)

Needs Docker and the Supabase CLI (MVP_SPEC 21, D-75, D-81).

- Every worktree tests against one local stack, project `customers-direct` on the committed ports (API 54621, database 54622). Tests create their own agencies and businesses, so sessions can share it.
- `npm test` rebuilds it from `supabase/migrations` only when the migrations changed since the last rebuild (their hash is kept in the database), and never while another session's tests run on it: it waits, with a message, and rebuilds after. Rebase often, so sessions do not rebuild it back and forth.
- A worktree whose branch adds or changes a migration gets its own stack automatically: a slot from 0 to 9, project `customers-direct-<slot>` on ports `55<slot>00` to `55<slot>99`. `TEST_DB_ISOLATED=1` forces its own stack, `TEST_DB_ISOLATED=0` the shared one. Slots live in `.git/test-db-slots/`; `TEST_DB_SLOT` picks one.
- Heavy commands take turns across all sessions on the machine: `npm test`, `npm run build`, and `npm run test:e2e` when it names no spec. A waiting session prints what is running. A single file (`npx vitest run <file>`) is not queued. Taking turns also keeps the shared database right: the scan queue, alert and low credit tests read whole tables, so two full runs at once fail each other.
- CI (with `CI` set) is unchanged: it always rebuilds and never queues.
- Locks are files in `/tmp/customers-direct-test`, held with `flock` for as long as the command runs; a crashed run frees them.
- To run a CLI command against your stack: `source scripts/test-db-env.sh && supabase status`.
- Never run `supabase stop` or `docker stop` on a stack another session started.

```bash
npm run test:db:list           # the shared stack and every slot: worktree, API port, memory
npm run test:db:stop           # stop this worktree's own stack, delete its data and free the slot
npm run test:db:clean          # stop every slot stack no worktree needs now (add --dry to only list them)
```

A stack uses about 550 MiB of Docker memory when idle and about 900 MiB during a test run. Branches from before INFRA-02 still use their own slot and do not take the locks, so run `test:db:clean` once they are merged.

## Database changes and types

- Schema changes only through a new file in `supabase/migrations/`, never by editing an applied one. How to write and apply them: [supabase/migrations/README.md](supabase/migrations/README.md).
- `src/types/database.types.ts` is generated, never edited by hand. After a migration, link the Supabase CLI once (`supabase link --project-ref <ref>`) and run `npm run db:types`.
- Credits change only through the SQL functions (`hold_credits`, `capture_credit`, `release_hold`, `grant_credits`, `expire_grants`, `admin_adjust_credits`), never from app code.
- The live database is shared with the live site. Test against the local stack or customers-dev only.

## Branches

- `mvp` is where development happens: the MVP rebuild, with its own Netlify staging URL. It merges into `main` once, at go-live (B-80).
- `main` is the live site. Netlify publishes every merge to it. Never push to it directly.
- Each task gets its own `task/B-xx-name` branch, merged by pull request into `mvp` or `main` as its task in `docs/build-plan/` says. Put the decision or bug ID (`D-xx`, `SEC-01`) in commit and PR titles.
- The `original-backup` tag marks `main` as it was before the rebuild started.

## How CI works

GitHub Actions run on every pull request and on every push to `main`:

| Workflow | What it runs |
|---|---|
| CI (`ci.yml`) | Typecheck; lint with `check:auth`, `check:copy` and `check:rls`; unit tests on a fresh local Supabase; build; Playwright smoke tests |
| Evals, code-graded (`eval-fast.yml`) | `npm run evals` on recorded answers |
| Evals, AI-graded (`eval-ai.yml`) | `npm run evals:ai`, only when a prompt, model setting or eval changes |
| Security (`security.yml`) | Malware and secret scanners, each proving first that it still catches a known-bad sample |

Every job that installs packages scans for malware before `npm ci`. Git hooks (`.husky/`) run the same scanners on every commit and push; never skip them with `--no-verify`. Netlify builds a deploy preview for each pull request.

## Deploying

Netlify builds with `npm run build` (`netlify.toml`) and publishes `main` to the live site. Environment variables are set in the Netlify UI per context. The go-live steps (env vars, backups, migrations, Stripe live switch, merging `mvp` into `main`) are in [docs/launch/RUNBOOK.md](docs/launch/RUNBOOK.md).

## Environment variables

Every variable is declared and validated in `src/lib/env.ts`; required ones fail the build when missing. `.env.example` lists all of them with a short note. Copy it to `.env.local` for local work and never commit real values.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key (safe for the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin key, server side only |

Every other variable (AI keys, Stripe, Resend, worker, fixture flags, feature flags) is optional; a missing AI key makes scans report "not configured", never fake results.

## License

MIT
