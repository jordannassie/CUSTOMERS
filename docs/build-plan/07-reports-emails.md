# Phase 7: Reports and emails

Goal: agencies can send clients a report (link or PDF), and every important moment triggers a clear email. [Back to index](./README.md)

---

### B-59 Share page
- [ ] Done

Phase 7 · M · Depends on: B-49, B-50, B-52 · Blocked by Jordan: no · MVP_SPEC 8.3, D-11, D-12 · Branch: `task/B-59-share-page` → `mvp`

**Build**
1. Server Action `createShareLink(businessId)`: `report_shares` row with a long random token (at least 32 bytes, URL-safe); `revokeShareLink(id)`.
2. Public route `src/app/r/[token]/page.tsx`: read-only report (score, label, sentence, trend, per-model scores, competitor table with live Places data and attribution, top opportunities, date range) with the agency's logo and name in the header.
3. `noindex`, no links into the app, no internal IDs in the page.
4. Print styling so "Print, Save as PDF" in a browser gives a clean document; a `data-report-ready` element appears once charts have rendered (used by B-60).
5. Revoked or unknown token shows a friendly "This report link is no longer active."

**What the user sees**
- "Share" gives a link the agency can send to their client; the client sees a clean report with the agency's logo, no login needed.
- The agency can turn the link off at any time.

**Engineering checks**
- Test: revoked token returns the inactive page; the page has `noindex`; no database IDs in the HTML.

---

### B-60 PDF export
- [ ] Done

Phase 7 · M · Depends on: B-59 · Blocked by Jordan: no · MVP_SPEC 8.3, D-71 · Branch: `task/B-60-pdf-export` → `mvp`

**Build**
1. `src/modules/reports/pdf.ts`: `renderPdf(url)` calls Browserless's PDF endpoint with the share page URL, waits for `[data-report-ready]`, A4 or Letter with margins, header and footer with page numbers.
2. Fallback behind the same function (env switch): `playwright-core` with `@sparticuz/chromium`.
3. Server Action `exportPdf(businessId)`: creates or reuses a share token, renders, returns the file as a download named `<business>-ai-visibility-<date>.pdf`.
4. Timeout and a friendly error ("PDF could not be created. Try again, or use Print, Save as PDF.").

**What the user sees**
- "Export PDF" downloads a polished report within a few seconds that looks exactly like the share page, with charts and the agency's logo.

**Engineering checks**
- Test with a mocked Browserless; one real render attached to the PR.

---

### B-61 Email foundation
- [ ] Done

Phase 7 · M · Depends on: B-09 · Blocked by Jordan: sending domain verification (DNS) · MVP_SPEC 10, D-37, D-72 · Branch: `task/B-61-email-foundation` → `mvp`

**Build**
1. Install React Email; `src/modules/email/templates/` with a shared layout (logo, plain footer, unsubscribe link where needed) in the DESIGN.md look.
2. `src/modules/email/send.ts`: Resend client, sends HTML plus a text version, logs to an `email_log` table (type, agency, sent_at, provider id).
3. Verify the sending domain in Resend (SPF, DKIM); needs DNS access.
4. Email preferences on the agency (weekly report on or off) and an unsubscribe route.

**What the user sees**
- Nothing yet; emails in B-62 look consistent and land in the inbox, not spam.

**Engineering checks**
- Email previews render (React Email preview); a test send reaches a real inbox with SPF and DKIM passing.

---

### B-62 The five emails
- [ ] Done

Phase 7 · M · Depends on: B-61, B-42, B-13, B-30 · Blocked by Jordan: no · MVP_SPEC 10, D-37 · Branch: `task/B-62-the-five-emails` → `mvp`

**Build**
1. Welcome: on account creation.
2. Trial ending: on `customer.subscription.trial_will_end` (3 days before), with the charge date and amount.
3. Payment failed: on `invoice.payment_failed`, with a link to update the card.
4. Low credits: when the pool reaches 80% of the period's credits, at 0, and when it goes negative (once each per period).
5. Weekly report: Mondays via pg_cron, per agency: each business's score and real changes only (beyond the margin), new opportunities, link to the share page (no PDF attachment).
6. All triggers are idempotent (no duplicate emails if an event repeats).

**What the user sees**
- A short welcome after signing up.
- A clear warning 3 days before the trial charge.
- A helpful email if a payment fails, with a button to fix it.
- A heads-up when credits are running low.
- A Monday summary of how each business is doing, with changes that actually matter.

**Engineering checks**
- Tests for each trigger, including repeat events sending once.
- Screenshots of each email in the PR.

---

## Phase 7 demo checklist

1. On a business, press "Share": copy the link, open it in a private window. The report shows the agency logo and no login is needed.
2. Turn the link off and reload: "This report link is no longer active."
3. Press "Export PDF": a polished PDF downloads with charts.
4. Sign up a new test account: the welcome email arrives.
5. The developer triggers trial-ending, payment-failed and low-credit events: each email arrives once and reads clearly.
6. The developer runs the weekly report job: the Monday summary arrives with scores and a link.
