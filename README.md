# Customers — Next.js + Supabase + Netlify

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
│   └── page.tsx            # Home page (server component — reads Supabase session)
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

## Deploying to Netlify

### Option A — Netlify UI (recommended)

1. Push this repo to GitHub (already done ✅).
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
3. Connect your GitHub account and select **jordannassie/CUSTOMERS**.
4. Netlify auto-detects `netlify.toml` — build command and publish dir are pre-filled.
5. Under **Site configuration → Environment variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click **Deploy site** 🚀

### Option B — Netlify CLI

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
| `SUPABASE_SERVICE_ROLE_KEY`     | Optional | Admin key — server-side only         |

---

## License

MIT
