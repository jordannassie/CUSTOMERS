---
name: verify
description: How to run and drive the Customers.Direct app to verify a change the way a real user would meet it (browser, API, worker), against the expected results in the build plan. Use with /verify and before reporting any task as done.
---

# Verify Customers.Direct

Passing lint, typecheck, tests and build proves the code is healthy, not that the product works. A task is verified only when the running app shows the result a real user expects. Capture evidence (screenshots, responses), then try to break it.

## 1. Know what the user should see

Before running anything, write down the expected results:
1. The task's **"What the user sees"** list in `docs/build-plan/` (each task has one). These are the acceptance criteria.
2. The phase's **demo checklist** at the end of the same file, when the task completes a phase or touches its flow.
3. The spec section the task links to (`docs/MVP_SPEC.md`), for wording, numbers and edge cases.
4. If the task has no user-facing result, name the nearest place a user feels it (for example credits show in the usage widget, a scan result on the Overview) and check there.

Every expected result gets a ✅, ❌ or ⚠️ in the report, with its evidence. Anything expected but not checked is listed as not verified, never assumed.

## 2. Start the app

1. `npm install` only if `package.json` changed. The `predev` script runs the malware scanner first; if it reports a payload, stop and report it. Never open or run flagged code.
2. `npm run dev` in the background, log to a scratch file. App at `http://localhost:3000`.
3. Wait for `Ready` in the log, then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` should print 200.
4. Also check the Netlify deploy preview of the pull request (link in the PR checks) or the `mvp` staging deploy when the change depends on hosting (functions, env vars, redirects, caching).
5. Stop the server when done.

If another Claude session works in the main folder, verify from a separate git worktree (`git worktree add ...`) and never switch that folder's branch.

## 3. Drive the browser: Playwright, always

- Use the **Playwright MCP** for every web check in this project. No need to ask which tool (standing instruction from the user).
- Check desktop (1440 x 900) and phone (390 x 844) for every UI change; save screenshots into the scratchpad and attach them to the PR.
- Playwright fills password fields and Stripe's card fields (inside their iframe) directly; use Stripe test cards (`4242 4242 4242 4242`, decline `4000 0000 0000 0002`, 3D Secure `4000 0025 0000 3155`, failed renewal `4000 0000 0000 0341`).
- Use the **Chrome DevTools MCP** only to observe: console errors, network requests and responses, performance and LCP, accessibility. Never to drive a flow.
- Every checked page: zero console errors from our code (browser extension noise excluded), no failed network requests.

## 4. Test data

- Log in with the test account from the team password manager (the audit account, Brandastic business). Its agency is marked `is_test` once B-14 lands, so scans use recorded answers and spend no real credits.
- Before B-14: a scan on a normal account calls the real AI APIs and costs money. Ask the user before running one.
- Stripe: sandbox keys only. Webhooks: Stripe CLI (`stripe listen`, `stripe trigger ...`) against local or the preview.

## 5. What a real user does, per kind of change

| Change touches | Walk through as the user |
|---|---|
| Marketing pages | Read the page as a first-time visitor at both sizes: headline, links, forms, "Choose plan" to signup; nothing claims a feature that does not exist |
| Auth | Sign up, confirm, log in, log out; open `/dashboard` logged out and come back after login; wrong password message |
| Onboarding | Full setup with a real business website, then the no-website path; leave halfway and come back |
| Scans and credits | Run a scan on a test business; see the result on the Overview, the balance drop in the usage widget, the job in the admin scan log |
| Billing | Pricing, signup, card step with test cards, trial banner, top-up, plan change, failed payment banner |
| Dashboard pages | Each page with no data, a first scan and 30 days of history; empty, loading and error states |
| Reports | Share link opened logged out; PDF downloads and looks like the page |
| Emails | Trigger each email; it arrives once, reads clearly, links work |
| Admin | Non-admin is redirected; each admin action works and appears in the audit log |
| API routes | Without a session (401), wrong method, malformed body, oversized input |
| Worker and schedules | Queue a test job, trigger the worker, see the job `done` and the result in the app |

## 6. Try to break it

At least one probe per change, at the same place the user meets it: double-click, back button mid-flow, refresh during loading, empty or very long input, slow network (DevTools throttling), a second tab, a logged-out tab.

## 7. Known quirks

- `NEXT_PUBLIC_SITE_URL` in `.env.local` points at port 3001 while dev runs on 3000, so Google login and email links break locally until it is fixed.
- Some business sites (for example brandastic.com) sit behind Cloudflare and block the old scanner; auto-fill should fall back to Google Places.
- A Grammarly-style browser extension causes a hydration warning on `<body>`; it is not an app bug.
- The database is shared with the live site: never run destructive actions or unapproved migrations while verifying.

## 8. Report

Use the /verify format: verdict, what you ran, one line per expected result (✅ ❌ ⚠️ with evidence), probes, and findings. A task is **PASS** only when every expected user result is ✅. Lint, typecheck, tests and build passing is required but never enough on its own.
