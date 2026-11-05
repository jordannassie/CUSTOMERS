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

1. [x] Tokens: re-map `--cd-*` and shadcn variables in `globals.css` to the Check-in palette, radius scale, motion keyframes, focus ring
2. [x] Fonts: Figtree (400 to 700) and Young Serif (400) with `next/font/google` as `--font-figtree` and `--font-young-serif`
3. [x] Shared UI primitives restyled (list below)
4. [x] App shell: 220px left nav, serif wordmark, workspace switcher, white-pill active link, ground background, top bar
5. [x] Chart components in `src/components/charts/` (list below)
6. [x] Check-in building blocks in `src/components/checkin/` (user bubble, AI message card, follow-up chips, composer, right rail cards, status pill)
7. [x] Overview, Competitors, Compare, Sources rebuilt as conversations from the data they already load
8. [x] Questions, Actions, Reports, Billing, Settings, onboarding restyled
9. [x] Marketing site, auth pages, admin panel restyled
10. [x] Hard-coded colour sweep, then typecheck, lint, build, and a click-through at 1440px and 390px

## Routes and screens

### Marketing site
- [x] `/` home (`src/app/(marketing)/page.tsx`, `components/marketing/home/*`, newsletter section `components/site/NewsletterSignup.tsx`)
- [x] `/pricing` (`components/marketing/pricing/*`)
- [x] `/agency`
- [x] `/apps`, `/apps/[slug]`, `/apps/[slug]/review` (AI apps directory, `components/site/apps/*`; detail page not seen, no local directory rows)
- [x] `/compare` (public readiness check)
- [x] `/ads`, `/ads/brief` (video ads, `components/site/video-ads/*`)
- [x] `/start-ai-business` (launch kit, `components/site/launch-kit/*`)
- [x] `/contact`, `/privacy`, `/terms`, `/email/unsubscribe`
- [x] `/account-deleted`, `/account-paused`
- [x] Header, footer, mobile menu, logo (`components/marketing/*`)

### Auth
- [x] `/login`, `/signup`, `/forgot-password`, `/reset-password` (`components/geo/*`)

### Onboarding (`src/app/(app)/onboarding/*`, `components/onboarding/*`)
- [x] start, agency, details, website, competitors, questions, models, card, first-scan (styled; not opened in the browser, see THEME_NOTES.md)

### Dashboard (`src/app/(app)`)
- [x] Overview `/dashboard` (C-Overview)
- [x] Competitors `/competitors` (C-Competitors), `/competitors/manage`
- [x] Compare `/competitors/compare` (C-Compare)
- [x] Sources `/sources` (C-Sources)
- [x] Questions `/questions`
- [x] Actions `/actions`
- [x] Reports `/reports`
- [x] Billing `/settings/billing`, `/settings/billing/plans`, `/settings/billing/plans/new-business`, `/settings/credits`, `/settings/usage`
- [x] Settings `/settings`

### Admin panel (`src/app/internal/admin`)
- [x] overview, agencies, agencies/[id], businesses, businesses/[id], scans, usage, leads, feature-requests, news, reviews, apps, video-ads, settings, not-found

### States
- [x] `error.tsx` (root, app, admin, each dashboard page), `global-error.tsx`, `not-found.tsx` (root, admin)
- [x] `loading.tsx` skeletons (`components/app/PageSkeletons.tsx`, `AppShellSkeleton.tsx`, admin skeletons)
- [x] Empty states (per page), app banners (`components/app/AppBanners.tsx`), toasts (`ui/sonner.tsx`)
- [x] Dialogs: overdraft, recent scan, suggest feature, delete, add action, confirm (admin)
- [x] Emails (`src/modules/email/templates`): sent, not rendered in the app; colour constants and corners only

## Shared components
- [x] ui: button, input, textarea, select, label, field, badge, card, tabs, segmented-control, table, dialog, sheet, dropdown-menu, tooltip, sonner, skeleton, progress, switch, separator
- [x] app: AppShell, AppSidebar, TopBar, BusinessSwitcher, UsageWidget, PageHeader, PageContainer, AppBanners, KpiTile, SampleDataBadge, PageSkeletons
- [x] page cards: competitors/SectionCard, sources/SectionCard, overview/Panel, settings/SettingsSection, admin page-header, stat, badges, filter-tabs

## Chart components (`src/components/charts/`)
- [x] LineAreaChart, RadialBars, ScoreGauge, BubbleChart, SlopeChart, GapChart, LollipopRows, RadarChart, StackedShareBar, RankedBars, Donut, Sparkline, ProgressRing
- [x] DotMatrix added (Competitors needs it); Legend and ChartTooltipCard shared
- [x] Each: typed props, token colours, `role="img"` with a written summary, legend or direct labels, own scroll container when wide, motion off under reduced motion
