# Owner to-do before go-live

Everything left that code cannot do: settings in outside services, money, decisions and labelling. Written after the preview audit on 2026-11-12. Tick each one when done. Who: **J** = Jordan, **D** = developer, **J+D** = together.

## 1. Do now

- [ ] **Top up Perplexity (J).** Every Perplexity check has failed since about Oct 20 ("Agent API requires paid credits"), so customers get partial scans.
  1. perplexity.ai, log in with the API account, open Settings, then API, then Billing.
  2. Add credit and turn on auto top-up.
  3. In the app: Admin, then System status, then Check again. Perplexity turns green after the next scan whose Perplexity checks work.
- [ ] **Mark QA and demo agencies as test (D).** They count as paying customers and in revenue on the admin Overview.
  1. Admin, then Agencies, open each QA, Speed Test or placeholder agency, then Mark as test.
  2. On the Overview, resolve the old "Stripe payment updates" alert from Oct 20 once it's checked.

## 2. Settings in outside services

- [ ] **Login emails over SMTP (J+D, BUG-294, EMAIL-01).** Without this, password reset and change email fail with a 500.
  1. Resend (resend.com), then Domains, then add the sending domain (for example `mail.customers.direct`). Add the DNS records Resend shows at the domain's DNS host and wait for "Verified".
  2. Resend, then API keys, then create a key with sending access.
  3. Supabase, open the live project, then Authentication, then Emails, then SMTP settings. Turn on custom SMTP:
     - host `smtp.resend.com`, port `465`, username `resend`
     - password: the API key
     - sender: `no-reply@<the domain>`, name "Customers.Direct"
  4. In the same project, go to Authentication, then Sign in / Providers, then Email, and turn on **Confirm email** (ACC-04).
  5. Netlify, then Site configuration, then Environment variables. Set `RESEND_API_KEY` and `EMAIL_FROM` for production, then redeploy.
  6. Test it: Forgot password on the live site should deliver an email.
- [ ] **Admin two-step login (J+D, M6).** It is off on the preview.
  1. Supabase, live project, then Authentication, then Multi-Factor. Turn on **Authenticator app (TOTP)**.
  2. Netlify environment variables: `ADMIN_REQUIRE_MFA=true` for production, then redeploy.
  3. Each admin logs in once. The app opens `/admin-verify` with a QR code; scan it with Google Authenticator or 1Password. Set it up on two devices.
  4. Lost phone: the developer runs `npm run admin:mfa-reset -- --env <live env file> --email <admin email>` (dry run), then again with `--apply`. The admin signs in and scans a new code.
- [ ] **Launch Kit checkout (J).** The $97 buttons on `/start-ai-business` are disabled.
  1. Stripe, then Product catalogue, then add "AI Business Launch Kit", one-off $97.
  2. Stripe, then Payment links, then create one for it and copy the link.
  3. Netlify: `NEXT_PUBLIC_LAUNCH_KIT_PAYMENT_LINK=<link>`, then redeploy. The buttons turn on by themselves.
- [ ] **Stripe live account (J, D-40, F-17, F-56).** This needs Jordan's own Stripe account in his LLC.
  1. Create the products and monthly prices for Starter, Growth and Pro at the prices in D-21, plus the top-up packs (D-22).
  2. Settings, then Billing, then Customer portal: save the settings once in live mode (cards, invoices, cancel). Copy its ID (`bpc_...`) into Netlify as `STRIPE_PORTAL_CONFIGURATION`. Without saving them the portal errors in live mode.
  3. Developers, then Webhooks, then add the endpoint `https://<live domain>/api/stripe/webhook`. Use the events listed in `docs/launch/RUNBOOK.md`, and copy its signing secret.
  4. Netlify production variables: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_GROWTH_MONTHLY`, `STRIPE_PRICE_PRO_MONTHLY`.
  5. Sales tax (BILL-02): Stripe, then Tax. Add the registrations, then tell D to turn on automatic tax.
  6. Run the Stripe test-clock checks in sandbox: trial end, failed renewal and refund (DEMO-AND-GO-LIVE-PLAN 2.1).
- [ ] **New API keys in Jordan's name (J, B-01, SEC-01).** Create new keys for OpenAI, Anthropic, Perplexity, Google Places and Firecrawl. Put them in the Netlify production variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `GOOGLE_PLACES_API_KEY`, `FIRECRAWL_API_KEY`). Then delete the old keys at each provider.
- [ ] **Google Places quota (J, BUG-260).** Place Details is capped at 100 a day.
  1. Google Cloud console, then APIs and services, then Places API (New), then Quotas.
  2. Raise "Place Details requests per day" to at least 2,000. Keep a budget alert under Billing.
- [ ] **Uptime monitor (D).** Better Stack free plan: monitor `https://<domain>/api/health` (answers 200 when the app reaches its database, 503 when not), `/` and `/login`, every 3 minutes, alerts by email. It also keeps one server warm.
- [ ] **Branch protection (J, F-05).** GitHub, then the repo's Settings, then Branches. Add a rule for `main` and one for `mvp`: require a pull request, and require the Lint, Typecheck, Unit tests and Build checks.

## 3. Decisions for Jordan

Answer each in `docs/DECISIONS.md`, or tell D, who records it.

- [ ] D-21 plan prices and D-22 top-up prices.
- [ ] D-69 / B-81: what existing beta users get when billing starts. Then D emails them.
- [ ] D-08: businesses with no website are allowed (built; needs a yes, then B-37 is ticked).
- [ ] D-77: 30-day wait before an account is deleted.
- [ ] Contact email: the address to show on `/contact` instead of the personal Gmail (for example `hello@customers.direct`). D swaps it in `src/app/contact/page.tsx`.
- [ ] `/ads` examples: send real sample videos. The page shows the same sample 16 times (`src/modules/video-ads/portfolio.ts`). Or decide to hide the section until there are real ones.
- [ ] Claude answers given without a web search ("I don't have real-time information") count as "not named" and cost a credit. Options:
  - keep it, since the Claude app also does this sometimes;
  - treat it as a failed check (free, retried);
  - force a search. This needs an eval run (MVP_SPEC 25).
- [ ] "8 vs 0, About the same" on the overview comes from the margin-of-error rule (D-64). Keep it, or show "Ahead" or "Behind" from a smaller gap.
- [ ] Industry list: add "Car dealer" and similar? A used car dealer was filed as "Auto repair shop", and all its questions were about repairs. This is part of the question library review (B-32).
- [ ] Open flags in `docs/build-plan/FLAGS.md`:
  - F-41 refund wording
  - F-44, F-45, F-46 billing choices
  - F-59 weekly emails create share links
  - F-64 test agencies in alerts
  - F-70 returning customers
  - F-73 backup plan
  - F-75 design calls
  - F-76 wording claim
  - F-09 database API grants (past its date)

## 4. Legal

- [ ] **Terms and Privacy (J + lawyer, B-78, D-78, BUG-293).** The lawyer answers the 17 questions in PR #126. Then D removes the "Draft, pending legal review" line and sets the effective date in `src/components/legal/`.
- [ ] **Google Places terms (J or lawyer, B-79, D-73).** Confirm our reading in `docs/launch/places-compliance.md`. Then run `supabase/cleanup/places-cleanup.sql` on live, after a backup.
- [ ] **Changed wording list (J, B-84).** Approve the list in PR #127.

## 5. Labelling and AI checks (people, about 1 to 2 weeks)

How to label: a spreadsheet per suite, no code needed. The developer runs the export, the person fills the label column in Google Sheets or Excel, the developer runs the import. Full steps in each suite's `evals/<suite>/README.md` ("Labelling with a spreadsheet"). The scripts never call a model and never fill a label themselves.

- Export: `LABEL_SUITE=<suite> npm run label:export` writes `evals/results/labelling/<suite>.csv` (git-ignored).
- Import: `LABEL_SUITE=<suite> LABELLER="Your name" npm run label:import` writes `evals/<suite>/dataset.v1.jsonl`, checked by the suite's own reader.
- Then `npm run evals` (free), and `npm run evals:ai` (paid) to save a baseline in `evals/results/` (B-75).

- [ ] B-24 mention detection, 150 to 200 cases: `LABEL_SUITE=mention-detection LABEL_COUNT=100 npm run label:export`, fill `mentioned` (yes or no) and `position`.
- [ ] B-25 "also recommended" names, 50 to 100 answers: `LABEL_SUITE=entity-extraction LABEL_COUNT=80 npm run label:export`, fill `names` (separated by `|`, or `none`).
- [ ] B-32 question library review, 405 draft templates (about 40 per industry, 6 restaurant ones added by hand for sit-down and BBQ places). **Until this is done the library is empty and onboarding uses questions the AI writes itself, which are weaker** (a sit-down BBQ restaurant got "fast food" questions in testing).
  1. Developer: `npm run question-library:review` writes `evals/results/question-library/review.csv`, one row per template with automatic flags to check first (unclear intent, another industry's words, brand names, near duplicates, "near me", hand-added), and prints templates per industry and intent.
  2. Reviewer: in Google Sheets or Excel, set `action` on every row: `keep`, `edit` (fill `new_template`, `new_tags` with `|` between tags, or `new_intent`) or `delete`. Add a new template as a new row with no `id`, `action` = `add`, and `industry`, `intent`, `template`, `tags`. Download it back as CSV to the same path.
  3. Developer: `npm run question-library:import-review` applies the sheet to `supabase/seed/question-library.v1.json` and runs the B-32 checks. The file stays a draft. Repeat steps 1 to 3 until the reviewer is happy.
  4. Reviewer approves: in the file set `"status": "approved"` and `"review": { "reviewer": "<name>", "reviewedAt": "<YYYY-MM-DD>" }`. Developer runs `npm run question-library:validate`, then `npm run question-library:seed` to load it on the local stack and checks onboarding picks from it.
  5. Developer: `npm run question-library:migration` writes `supabase/migrations/NNN_question_library_v1.sql` from the approved file (it refuses a draft), adds it to `supabase/migrations/README.md`, and commits both, so the library reaches live with the other migrations on go-live day (the seed script refuses the live database on purpose).
  6. New industries such as car dealer need a code change first (the industry list in `src/lib/industries.ts` feeds onboarding and the auto-fill prompt, decision D-62), then templates for them.
- [ ] B-33 question picking, after B-32: `LABEL_SUITE=question-picking LABEL_BUSINESSES_CSV=businesses.csv npm run label:export` with 20 to 30 public businesses, mark `acceptable` yes per template (15 to 25 per business).
- [ ] B-34 auto-fill, 30 to 50 businesses: `LABEL_SUITE=business-autofill LABEL_DOMAINS="a.com,b.com" npm run label:export`, fill what the website and Google state. Decide D-73 first (Google values kept in the repo).
- [ ] B-51 "why competitors win": a developer saves 20 to 40 writer outputs as `cases.jsonl` (paid run), then `LABEL_SUITE=why-competitors-win LABEL_CASES_FILE=cases.jsonl npm run label:export`; grade the 4 checks pass or fail.
- [ ] B-75 save a baseline for every suite in `evals/results/`.
- [ ] B-76 ask 10 questions in the real ChatGPT, Claude and Perplexity apps and compare them with our saved answers. Write the result in `evals/results/`.

## 6. Go-live day (D, with J on call; B-80, B-83)

Follow `docs/launch/RUNBOOK.md` (54 steps). In short:

1. Back up live.
2. Repair the migration history (F-11).
3. Apply migrations 021 to 094. Then check the grants landed: `select has_table_privilege('service_role', 'public.scan_jobs', 'select');` returns true. 094 is what gives the app access to every table 021 to 093 create.
4. Set the Netlify production variables and the Vault secrets.
5. Switch Stripe to live.
6. Run `enqueue_due_scans(true)`.
7. Update PR #157's description (it still says 021 to 076), then merge it.
8. Run the rehearsal on production (B-83).
