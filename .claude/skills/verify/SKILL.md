---
name: verify
description: How to run and drive the Customers.Direct app to verify a change at its real surface (browser, API, worker). Use with /verify or before reporting any UI, API or scan change as done.
---

# Verify Customers.Direct

Evidence comes from the running app, not from tests or typecheck. Drive the smallest path that makes the changed code run, capture what you see, then probe around it.

## Start the app

1. `npm install` only if `package.json` changed. The `predev` script runs the malware scanner first; if it reports a payload, stop and report it. Never open or run flagged code.
2. `npm run dev` in the background, log to a scratch file. App at `http://localhost:3000`.
3. Wait for `Ready` in the log, then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` should print 200.
4. Stop the server when done (the port stays busy otherwise).

## Driving the browser

- Web pages: ask the user first whether to use headless Playwright MCP or `human` (visible cursor in their Chrome). Never pick for them, and never use claude-in-chrome or Chrome DevTools MCP to drive (DevTools is for console, network and performance only).
- With `human`: check `human front` is Chrome before typing; screenshots with `screencapture -x` into the scratchpad.
- macOS turns on secure input in password fields, so typed keys are blocked. Put the password on the clipboard with `pbcopy` (never echo it), click the field, use `human menu Edit Paste`, then clear the clipboard.
- Chrome autofill popups can cover the next field: press Escape or click empty space before clicking the next input.
- Stripe's card fields reject synthetic input by design. Verify checkout up to the Stripe page, or use the Stripe CLI (`stripe trigger ...`) for webhooks.

## Test data

- Log in with the test account from the team password manager (the audit account, Brandastic business). Its agency is marked `is_test` once B-14 lands, so scans use recorded answers and spend no real credits.
- Before B-14: a scan on a normal account calls the real AI APIs and costs money. Ask the user before running one.
- Stripe: sandbox keys only.

## Flows worth driving

| Change touches | Drive |
|---|---|
| Marketing pages | Load the page at 1440px and 390px; check links, forms, no console errors |
| Auth | Sign up, log in, log out, `/dashboard` while logged out redirects to `/login` |
| Onboarding | Full wizard with a real business website, then the no-website path |
| Scans, credits | Run scan on a test business; check the result, the usage widget and the admin scan log |
| Billing | Pricing page, checkout up to Stripe, webhook via Stripe CLI, billing page states |
| Dashboard pages | Each page with no data, first scan, and history; empty, loading and error states |
| Admin | Non-admin is redirected; admin actions write the audit log |
| API routes | `curl` without a session (expect 401), wrong method, bad body |

## Known quirks

- `NEXT_PUBLIC_SITE_URL` in `.env.local` points at port 3001 while dev runs on 3000, so Google login and email links break locally until it is fixed.
- Some business sites (for example brandastic.com) sit behind Cloudflare and block the old scanner; auto-fill should fall back to Google Places.
- A Grammarly-style browser extension causes a hydration warning on `<body>`; it is not an app bug.
- The database is shared with the live site: never run destructive actions or unapproved migrations while verifying.

## Report

Use the /verify report format: verdict, what you ran, steps with evidence (screenshots, response bodies), at least one probe off the happy path, and findings.
