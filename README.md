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
npm test                  # rebuilds the local Supabase database from supabase/migrations, then runs Vitest
npx playwright test       # end-to-end at 1440px and 390px; starts the dev server on E2E_PORT (default 3106)
npx vitest run evals      # AI evals, see evals/README.md
```

- Unit tests sit next to the code as `src/**/*.test.ts`.
- Tests read only `.env.test.local`, which `scripts/test-db-reset.sh` writes with the local database keys. They never touch the shared database.
- Every worktree gets its own local stack, so parallel sessions never reset each other's database (BUG-010). See below.
- End-to-end tests: run `npm test` once to create `.env.test.local`, then `npx playwright test`. The dev server Playwright starts uses those values (not `.env.local`), with `WORKER_IN_PROCESS=true` and the test admins in `ADMIN_EMAILS` (BUG-031). If a dev server already runs on `E2E_PORT`, Playwright reuses it, so start that one the same way or stop it first.

### One local test stack per worktree

- `npm test` claims a slot from 0 to 9 for the worktree and runs the stack as project `customers-direct-<slot>` on ports `55<slot>00` to `55<slot>99` (API on `55<slot>21`, database on `55<slot>22`). The slot stays with the worktree until it is stopped.
- Claims live in the shared git folder (`.git/test-db-slots/`), so all worktrees of the clone see them. Set `TEST_DB_SLOT` (or `LEADER_SLOT`) to pick a slot yourself.
- The Supabase CLI reads the project id and ports from `SUPABASE_*` variables set by `scripts/test-db-env.sh`; `supabase/config.toml` is unchanged, and CI (with `CI` set) keeps the default stack on ports 54620 to 54629.
- To run a CLI command against your own stack: `source scripts/test-db-env.sh && supabase status`.

```bash
npm run test:db:list           # slots, worktrees, API port and memory of each running stack
npm run test:db:stop           # stop this worktree's stack, delete its data and free the slot
bash scripts/test-db.sh stop 3 # the same for slot 3, after its worktree was removed
```

Each stack uses about 550 MiB of Docker memory when idle and about 800 MiB during a test run (storage about 240, rest about 190, kong about 150, db about 150, auth and inbucket small). Studio, realtime, analytics and the other unused services stay off. Five stacks need about 4 GiB, so give Docker at least 8 GiB and stop stacks of finished worktrees (and other projects' stacks) to get the memory back.

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
