# Check-in theme plan

Branch `theme/check-in`, from `fix/qa-blockers` (3320d51). Source design: `docs/design/files/C-*.dc.html` plus the four screenshots the user attached.
Presentation only: no business logic, queries, routes, Stripe, auth or scoring changes. Notes and decisions: `THEME_NOTES.md`.

## Stack (audit)

- Next.js 16.3.0, App Router (`src/app`), React 19.2.8, TypeScript 5
- Tailwind CSS v4 (`@import "tailwindcss"`, tokens in `@theme inline` in `src/app/globals.css`, no tailwind.config)
- shadcn/ui (radix-ui 1.6, `src/components/ui`), CSS variables already mapped to `--cd-*` tokens
- Charts: Recharts 2.15.4 already installed (peer deps list React 19). Kept, nothing new installed.
- Fonts before: Geist + Geist Mono via `next/font/google`
- Icons: lucide-react. Toasts: sonner. PDF: @react-pdf/renderer. Email: react-email.

## Order of work

1. [ ] Tokens: re-map `--cd-*` and shadcn variables in `globals.css` to the Check-in palette, radius scale, motion keyframes, focus ring
2. [ ] Fonts: Figtree (400 to 700) and Young Serif (400) with `next/font/google` as `--font-figtree` and `--font-young-serif`
3. [ ] Shared UI primitives restyled (list below)
4. [ ] App shell: 220px left nav, serif wordmark, workspace switcher, white-pill active link, ground background, top bar
5. [ ] Chart components in `src/components/charts/` (list below)
6. [ ] Check-in building blocks in `src/components/checkin/` (user bubble, AI message card, follow-up chips, composer, right rail cards, status pill)
7. [ ] Overview, Competitors, Compare, Sources rebuilt as conversations from the data they already load
8. [ ] Questions, Actions, Reports, Billing, Settings, onboarding restyled
9. [ ] Marketing site, auth pages, admin panel restyled
10. [ ] Hard-coded colour sweep, then typecheck, lint, build, and a click-through at 1440px and 390px

## Routes and screens

### Marketing site
- [ ] `/` home (`src/app/(marketing)/page.tsx`, `components/marketing/home/*`, newsletter section `components/site/NewsletterSignup.tsx`)
- [ ] `/pricing` (`components/marketing/pricing/*`)
- [ ] `/agency`
- [ ] `/apps`, `/apps/[slug]`, `/apps/[slug]/review` (AI apps directory, `components/site/apps/*`)
- [ ] `/compare` (public readiness check)
- [ ] `/ads`, `/ads/brief` (video ads, `components/site/video-ads/*`)
- [ ] `/start-ai-business` (launch kit, `components/site/launch-kit/*`)
- [ ] `/contact`, `/privacy`, `/terms`, `/email/unsubscribe`
- [ ] `/account-deleted`, `/account-paused`
- [ ] Header, footer, mobile menu, logo (`components/marketing/*`)

### Auth
- [ ] `/login`, `/signup`, `/forgot-password`, `/reset-password` (`components/geo/*`)

### Onboarding (`src/app/(app)/onboarding/*`, `components/onboarding/*`)
- [ ] start, agency, details, website, competitors, questions, models, card, first-scan

### Dashboard (`src/app/(app)`)
- [ ] Overview `/dashboard` (C-Overview)
- [ ] Competitors `/competitors` (C-Competitors), `/competitors/manage`
- [ ] Compare `/competitors/compare` (C-Compare)
- [ ] Sources `/sources` (C-Sources)
- [ ] Questions `/questions`
- [ ] Actions `/actions`
- [ ] Reports `/reports`
- [ ] Billing `/settings/billing`, `/settings/billing/plans`, `/settings/billing/plans/new-business`, `/settings/credits`, `/settings/usage`
- [ ] Settings `/settings`

### Admin panel (`src/app/internal/admin`)
- [ ] overview, agencies, agencies/[id], businesses, businesses/[id], scans, usage, leads, feature-requests, news, reviews, apps, video-ads, settings, not-found

### States
- [ ] `error.tsx` (root, app, admin, each dashboard page), `global-error.tsx`, `not-found.tsx` (root, admin)
- [ ] `loading.tsx` skeletons (`components/app/PageSkeletons.tsx`, `AppShellSkeleton.tsx`, admin skeletons)
- [ ] Empty states (per page), app banners (`components/app/AppBanners.tsx`), toasts (`ui/sonner.tsx`)
- [ ] Dialogs: overdraft, recent scan, suggest feature, delete, add action, confirm (admin)
- [ ] Emails (`src/modules/email/templates`): sent, not rendered in the app; colour constants only

## Shared components
- [ ] ui: button, input, textarea, select, label, field, badge, card, tabs, segmented-control, table, dialog, sheet, dropdown-menu, tooltip, sonner, skeleton, progress, switch, separator
- [ ] app: AppShell, AppSidebar, TopBar, BusinessSwitcher, UsageWidget, PageHeader, PageContainer, AppBanners, KpiTile, SampleDataBadge, PageSkeletons
- [ ] page cards: competitors/SectionCard, sources/SectionCard, overview/Panel, settings/SettingsSection, admin page-header, stat, badges, filter-tabs

## Chart components (`src/components/charts/`)
- [ ] LineAreaChart, RadialBars, ScoreGauge, BubbleChart, SlopeChart, GapChart, LollipopRows, RadarChart, StackedShareBar, RankedBars, Donut, Sparkline, ProgressRing
- [ ] Each: typed props, token colours, `role="img"` with a written summary, legend or direct labels, own scroll container when wide, motion off under reduced motion
