# Email

Email foundation (B-61, MVP_SPEC 10, D-37, D-72): React Email templates sent through Resend. The five emails themselves are B-62.

| File | Holds |
|---|---|
| `templates/_components/` | Shared layout (logo, card, plain footer, settings link, unsubscribe link when given), heading, text and button parts, and the DESIGN.md colours as plain values (mail apps ignore CSS variables). |
| `templates/notice.tsx` | A plain message with an optional button. Every template is a default export with `PreviewProps`. |
| `render.ts` | `renderEmail(element)`: HTML plus the plain text version. |
| `send.ts` | `sendEmail(input, deps?)`: renders, sends, logs to `email_log`. `deps` (client, store, settings) is injectable; tests always pass a fake client. |
| `resend.ts` | The app's only Resend client, from `RESEND_API_KEY`. |
| `dal.ts` | `email_log` reads and writes, the weekly report preference, unsubscribe token check, env settings. |
| `service.ts` | Signed unsubscribe tokens (HMAC-SHA256, never expire). |

## Sending

```ts
await sendEmail({
  type: "trial_ending",
  to: ownerEmail,
  subject: "Your trial ends in 3 days",
  agencyId,
  idempotencyKey: `trial_ending:${event.id}`,
  template: ({ baseUrl, unsubscribeUrl }) => <TrialEndingEmail baseUrl={baseUrl} unsubscribeUrl={unsubscribeUrl} ... />,
});
```

- Result is `sent`, `skipped` (`duplicate` or `unsubscribed`) or `failed`. Provider errors are logged and returned, not thrown, so a webhook or cron job can carry on. Missing config throws.
- `idempotencyKey`: a key that already has a `sent` row sends nothing; the key also goes to Resend as its idempotency key. A unique index on sent rows backs this up.
- `weekly_report` is the only email a user can turn off. It needs `agencyId` and `EMAIL_UNSUBSCRIBE_SECRET`, is skipped (and logged as `skipped`) when the agency turned it off, and gets a signed unsubscribe link in the footer plus `List-Unsubscribe` and `List-Unsubscribe-Post` headers (one-click, RFC 8058).

## Preferences and unsubscribe

- `agencies.weekly_report_emails` (default on). Signed-in users change it with the `saveEmailPreferences` action; a Settings toggle can call it.
- `/email/unsubscribe?token=...` (public page): checks the token and asks for a button press, so mail scanners that open links do not unsubscribe anyone.
- `POST /api/email/unsubscribe` (public route, the token is the proof): the page's button (redirects back with `done=1`) and mail apps' one-click POST (returns 200).

## Env

| Var | Value |
|---|---|
| `RESEND_API_KEY` | A sending-only Resend key. The old key is treated as exposed until B-01 rotates it. |
| `EMAIL_FROM` | `Customers.Direct <hello@mail.customers.direct>` once the domain below is verified. |
| `EMAIL_UNSUBSCRIBE_SECRET` | 32+ random characters (`openssl rand -base64 48`). Changing it breaks unsubscribe links in emails already sent. |
| `NEXT_PUBLIC_APP_URL` | Base for links and the logo in emails. |

## Preview

`npm run email:dev` opens the React Email preview at http://localhost:3038 with every template in `templates/`. Folders starting with `_` are not listed.

## Sending domain (B-61 step 3, needs Jordan, F-12)

Not done yet: it needs DNS access to `customers.direct`. Send from a subdomain, as Resend recommends, so the main domain's reputation is kept apart. Proposed: `mail.customers.direct`.

1. Resend dashboard, Domains, Add domain: `mail.customers.direct`, region `us-east-1` (most recipients are in the US).
2. Add these records at the DNS host for `customers.direct`. Copy the exact values from the domain's Records tab in Resend; the DKIM key is unique per domain, and the MX host depends on the region.

| Type | Name (host) | Value | Priority | For |
|---|---|---|---|---|
| TXT | `resend._domainkey.mail` | `p=MIGfMA0...` (the DKIM public key from Resend) | | DKIM |
| MX | `send.mail` | `feedback-smtp.us-east-1.amazonses.com` | 10 | SPF, return path (bounces) |
| TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` | | SPF |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@customers.direct` | | DMARC (only if `customers.direct` has none yet; a mailbox for the reports is needed) |

3. Press Verify in Resend; it shows each record as Verified within minutes to a few hours.
4. Set `EMAIL_FROM` on Netlify (and in `.env.local`) to an address on `mail.customers.direct`.
5. After a week or two of clean sending, raise DMARC to `p=quarantine`.
6. Check (B-61 engineering check): send one test email to a real Gmail inbox after B-01, open it, Show original: SPF, DKIM and DMARC all say PASS, and it is in the inbox, not spam.
