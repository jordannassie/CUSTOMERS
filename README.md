# Customers: Next.js + Supabase + Netlify

A production-ready Next.js 15 starter pre-wired for **Supabase** (auth, database, storage) and **Netlify** (continuous deployment).

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Framework  | Next.js 15 (App Router, TypeScript) |
| Styling    | Tailwind CSS v4                     |
| Backend    | Supabase (auth · postgres · storage)|
| Deployment | Netlify + `@netlify/plugin-nextjs`  |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/jordannassie/CUSTOMERS.git
cd CUSTOMERS
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> Find these in your [Supabase dashboard](https://app.supabase.com) → Project → **Settings → API**.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (server component, reads Supabase session)
├── lib/
│   └── supabase/
│       ├── client.ts       # Browser/client-component Supabase client
│       └── server.ts       # Server component / Route Handler client
└── middleware.ts            # Session refresh middleware (required for SSR auth)
```

---

## Connecting Supabase

### Browser (Client Components)

```tsx
"use client";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { data, error } = await supabase.from("your_table").select("*");
```

### Server (Server Components / Route Handlers)

```tsx
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

---

## Database types

`src/types/database.types.ts` is generated, never edited by hand. After a migration, link the Supabase CLI once (`supabase link --project-ref <ref>`) and run `npm run db:types`.

How to write and apply migrations: [supabase/migrations/README.md](supabase/migrations/README.md).

---

## Tests and evals

Needs Docker and the Supabase CLI (MVP_SPEC 21, D-75, D-81).

```bash
npm test                  # gets the local Supabase database ready (see below), then runs Vitest
npm run test:e2e          # end-to-end at 1440px and 390px; starts the dev server on E2E_PORT (default 3106)
npx vitest run evals      # AI evals, see evals/README.md
```

- Unit tests sit next to the code as `src/**/*.test.ts`.
- Tests read only `.env.test.local`, which `scripts/test-db-reset.sh` writes with the local database keys. They never touch the shared database.
- End-to-end tests: `npm run test:e2e` gets the database ready the same way. The dev server Playwright starts uses `.env.test.local` (not `.env.local`), with `WORKER_IN_PROCESS=true` and the test admins in `ADMIN_EMAILS` (BUG-031). If a dev server already runs on `E2E_PORT`, Playwright reuses it, so start that one the same way or stop it first.

### One shared local test stack (INFRA-02)

- Every worktree tests against one local stack, project `customers-direct` on the committed ports (API 54621, database 54622). Tests create their own agencies and businesses, so sessions can share it.
- `npm test` rebuilds it from `supabase/migrations` only when the migrations changed since the last rebuild (their hash is kept in the database), and never while another session's tests run on it: it waits, with a message, and rebuilds after. Rebase often, so sessions do not rebuild it back and forth.
- A worktree whose branch adds or changes a migration gets its own stack automatically: a slot from 0 to 9, project `customers-direct-<slot>` on ports `55<slot>00` to `55<slot>99`. `TEST_DB_ISOLATED=1` forces its own stack, `TEST_DB_ISOLATED=0` the shared one. Slots live in `.git/test-db-slots/`; `TEST_DB_SLOT` picks one.
- Heavy commands take turns across all sessions on the machine: `npm test`, `npm run build`, and `npm run test:e2e` when it names no spec. A waiting session prints what is running. A single file (`npx vitest run <file>`) is not queued. Taking turns also keeps the shared database right: the scan queue, alert and low credit tests read whole tables, so two full runs at once fail each other.
- CI (with `CI` set) is unchanged: it always rebuilds and never queues.
- Locks are files in `/tmp/customers-direct-test`, held with `flock` for as long as the command runs; a crashed run frees them.
- To run a CLI command against your stack: `source scripts/test-db-env.sh && supabase status`.

```bash
npm run test:db:list           # the shared stack and every slot: worktree, API port, memory
npm run test:db:stop           # stop this worktree's own stack, delete its data and free the slot
npm run test:db:clean          # stop every slot stack no worktree needs now (add --dry to only list them)
```

A stack uses about 550 MiB of Docker memory when idle and about 900 MiB during a test run. Branches from before INFRA-02 still use their own slot and do not take the locks, so run `test:db:clean` once they are merged.

## Branches

- `main` is the live site. Netlify publishes every merge to it. Never push to it directly.
- `mvp` is the MVP rebuild, with its own Netlify staging URL. It merges into `main` once, at go-live.
- Each task gets its own `task/B-xx-name` branch, merged by pull request into `main` or `mvp` as the build plan says (`docs/build-plan/README.md`).
- The `original-backup` tag marks `main` as it was before the rebuild started.

---

## Deploying to Netlify

### Option A: Netlify UI (recommended)

1. Push this repo to GitHub (already done ✅).
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
3. Connect your GitHub account and select **jordannassie/CUSTOMERS**.
4. Netlify auto-detects `netlify.toml`; build command and publish dir are pre-filled.
5. Under **Site configuration → Environment variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click **Deploy site** 🚀

### Option B: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init          # link to your Netlify site
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://..."
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your-key"
netlify deploy --build --prod
```

---

## Environment Variables Reference

| Variable                        | Required | Description                          |
|---------------------------------|----------|--------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅        | Your Supabase project URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅        | Public anon key (safe for browser)   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Optional | Admin key, server-side only         |

---

## License

MIT
