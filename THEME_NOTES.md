# Check-in theme notes

Branch `theme/check-in`, from `fix/qa-blockers` (3320d51). Local commits only, nothing pushed.
Source design: `docs/design/files/C-Overview.dc.html`, `C-Competitors.dc.html`, `C-Compare.dc.html`, `C-Sources.dc.html` and the four screenshots.
Plan and checklist: `THEME_PLAN.md`.

## Libraries

| Library | Version | Status |
|---|---|---|
| recharts | 2.15.4 | Already installed, kept. Its peer dependencies list React 19 (`node_modules/recharts/package.json`). Used for the bubble chart, the radar and the donut. |
| next/font/google (Next.js 16.3.0) | built in | Figtree (400, 500, 600, 700) as `--font-figtree`, Plus Jakarta Sans (500, 600, 700) as `--font-jakarta`, used for headings through the `font-display` class. Replaces Geist and Geist Mono. |

Nothing new was installed. `package.json` and `package-lock.json` are unchanged.

## Tokens (src/app/globals.css)

All colours live in `:root` as `--cd-*` variables and are mapped into Tailwind v4 with `@theme inline`. shadcn's variables (`--background`, `--primary`, `--border`, `--ring`, ...) point at them, so every shadcn component inherits the theme.

| Role | Token | Value |
|---|---|---|
| Ground (page) | `--cd-background`, `bg-background` / `bg-ground` | #EEF2F8 |
| Surface (cards) | `--cd-surface`, `bg-surface` / `bg-card` | #FFFFFF |
| Inner panels | `--cd-muted`, `bg-muted` | #F4F6FB |
| Sunken (tracks, skeletons) | `--cd-sunken`, `bg-sunken` | #F1F4F9 |
| Chart tracks, gridlines | `--cd-track`, `bg-track` | #EDF1F7 |
| Border / strong / divider | `--cd-border`, `--cd-border-strong`, `--cd-divider` | #DCE3EE, #C9D3E3, #E5EAF3 |
| Input border | `--cd-input-border` | #8A94A6 (see decisions) |
| Ink / text 2 / muted / axis | `--cd-text`, `--cd-text-2`, `--cd-text-secondary`, `--cd-text-hint` | #141B2D, #3A4456, #545E70, #667085 |
| Brand / strong / light / lighter | `--cd-primary`, `--cd-primary-hover`, `--cd-primary-light`, `--cd-primary-lighter` | #2563EB, #1D4ED8, #3B82F6, #60A5FA |
| Brand wash / tint / tint soft / ink | `--cd-primary-tint`, `-tint-2`, `-tint-3`, `--cd-primary-ink` | #EAF1FF, #DBE7FE, #E6EEFF, #1E3A8A |
| Leading competitor | `--cd-rival`, `--cd-rival-text`, `--cd-rival-ink`, `--cd-rival-tint`, `--cd-rival-mark` | #D9735A, #B9553D, #8A3B26, #FBEDE8, #F7D9D3 |
| Danger text | `--cd-danger` | #B5402A |
| Other competitors | `--cd-competitor-1..3`, `--cd-series-3..5` | #5B6475, #AAB2BF, #C3CBD8 |
| AI tools | `--cd-chatgpt`, `--cd-chatgpt-strong`, `--cd-claude`, `--cd-perplexity` | #98A2B3, #5B6475, brand, #D98C3F |

Status tokens kept their names so existing code needs no change: `good` is now brand blue, `mid` is neutral grey, `low` is coral and danger. There is no green or yellow left in the theme.

Series colours (`src/lib/series-colors.ts`) were not touched: they read `--cd-series-2..5`, which now give the leader coral and the rest greys, so every chart already follows "you blue, leader coral, others grey".

Radius scale: `rounded-sm` 6px, `rounded-md` 10px (controls), `rounded-lg` 16px (inputs, inner cards), `rounded-xl` 20px (cards), pills `rounded-full`; buttons 12px.
Effects: `bg-gradient-user`, `bg-gradient-ai`, `shadow-user`, `shadow-float` (tooltips, popovers, dialogs, toasts only; cards have no shadow).
Motion: `animate-rise`, `animate-fade`, `animate-pop`, `animate-grow-x`, `animate-draw` (paths with `pathLength=1`). The existing `prefers-reduced-motion` rule at the end of globals.css stops all of them; Recharts reads `useReducedMotion()`.
Focus: every link, button and tab gets a 3px brand outline on keyboard focus.

## Decisions

- Headings (2026-11-07, the user's call): Young Serif from the mockups is replaced everywhere by Plus Jakarta Sans in semibold. The class is `font-display` (was `font-serif`); to try another heading font, change the font in `src/app/layout.tsx` and `--font-display` / `--font-heading` in `globals.css`.
- Favicons (2026-11-07): the switcher shows the business's own logo or website icon instead of a letter badge, and Compare's rail shows both businesses' icons with "{your business} vs {competitor}". Two e2e lines read the new heading.

- Branch base: `fix/qa-blockers`, as asked. (An earlier, interrupted command had created `theme/check-in` from `origin/release/go-live`; it was reset to `fix/qa-blockers` before any work. The two have the same files. That earlier command also ran one `git fetch`, before the no-remote rule arrived; nothing else talked to a remote.)
- DECISIONS.md items D-46 to D-50 (4px corners, the old palette) are superseded by this theme at the user's request. DECISIONS.md and DESIGN.md were not edited; update them if this theme is accepted.
- Input borders use #8A94A6 instead of the mockup's #C9D3E3, which is 1.5:1 on white and fails WCAG 1.4.11 for a field's edge. Decorative borders use the mockup colours.
- Contrast fixes against the mockup: "Done" pills use brand-strong text (#2563EB on #DBE7FE is 4.15:1); Perplexity-orange and coral fills carry dark ink text, not white (white on them is 2.7:1 and 3.2:1).
- The grey competitor colours fail a generic categorical palette check on purpose: they mean "everyone else". Every chart therefore names its series beside the marks or in a legend.
- Nav keeps the "Overview" and "Actions" labels (the design says "Check-in" and "To-do") because the rest of the app's copy says "Go to Overview" and "Add to Actions". URLs are unchanged either way. Nav keeps its Lucide icons and group labels.
- The composer ("Ask about your results") is disabled with "coming soon": there is no endpoint that answers questions. The follow-up chips link to existing pages.
- The PDF report (`src/modules/reports/v2/pdf`) keeps its own print design (black and white friendly, the agency's accent colour). Not restyled.
- Emails: colour constants and corner radius follow the theme (`src/modules/email/templates/_components/theme.ts`); fonts fall back to the system sans because mail apps do not load web fonts.

## What changed

| Area | Files | Result |
|---|---|---|
| Tokens, fonts, motion, focus | `src/app/globals.css`, `src/app/layout.tsx`, `src/app/global-error.tsx` | Palette, radius scale, gradients, keyframes, 3px focus outline, Figtree and Young Serif |
| shadcn primitives | `src/components/ui/*` | Buttons (12px, plus `brand` and `chip` pill variants, 44px on touch screens), 20px cards, pill badges, tabs and segmented controls, 16px inputs, white tooltips, 20px dialogs, toasts, skeletons, progress |
| App shell | `src/components/app/*` | 220px nav on the ground colour, heading-font wordmark, the business's own icon in the switcher, white-pill current page, quiet top bar, serif page titles, banners (coral trouble, brand-wash info), KPI tiles, skeletons |
| Charts | `src/components/charts/*` | LineAreaChart, RadialBars, ScoreGauge, BubbleChart, SlopeChart, GapChart, LollipopRows, RadarChart, StackedShareBar, RankedBars, Donut, DotMatrix, Sparkline, ProgressRing, Legend |
| Check-in pieces | `src/components/checkin/*` | CheckInLayout (column plus right rail), DayRule, UserBubble, AiMessage, Explain, FollowUps, Composer, RailCard, StatRows, RailNotice, StatusPill |
| Overview | `src/app/(app)/dashboard/*`, `src/components/overview/*` | Conversation per C-Overview |
| Competitors | `src/app/(app)/competitors/*`, `src/components/competitors/*` | Conversation per C-Competitors; manage page restyled |
| Compare | `src/app/(app)/competitors/compare/*`, `src/components/competitors/compare/*` | Conversation per C-Compare |
| Sources | `src/app/(app)/sources/*`, `src/components/sources/*` | Conversation per C-Sources |
| Questions, Actions, Reports | their pages and `components/{questions,actions,opportunities,report}` | Questions as a conversation; Actions as a board of white cards with status pills; Reports as printable serif cards |
| Billing, Settings, credits, usage | `src/app/(app)/settings/*`, `components/{settings,usage}` | White cards, heading-font titles and numbers, plan choices with brand tint, brand-wash notices |
| Auth and onboarding | `components/geo`, `components/onboarding`, `app/{login,signup,...}`, `app/(app)/onboarding` | Centred white cards, heading-font headings and wordmark |
| Admin | `src/app/internal/admin/**` | Dense tables with sticky headers, pill filters, heading-font stat numbers |
| Marketing and public pages | `src/app/(marketing)`, `pricing`, `agency`, `apps`, `compare`, `ads`, `start-ai-business`, `contact`, `privacy`, `terms`, `components/{marketing,site,legal}` | Same palette and fonts, hero as a mini check-in thread, about 370 hard-coded colours replaced with tokens |
| Emails | `src/modules/email/templates/_components/theme.ts` | Theme colours and 12px corners |
| Design preview | `src/app/(internal)/design-preview` | Lists the new tokens and type scale |

Tests touched: `src/modules/email/render.test.ts` (12px corners instead of 4px); `tests/e2e/why-behind.spec.ts` (the dot matrix labels your row "<name> (you)"; the Overview rail row reads name, standing, score); `tests/e2e/overview.spec.ts` (counts the line chart's `chart-line` groups instead of Recharts paths). No assertion was dropped.

## Data gaps (design elements left out or changed because the data is not there)

- Overview: the quoted AI answer with highlighted names is left out; the page loads no answer text. The progress ring on the top fixes is left out; fixes carry no count of the answers they are about. The fixes link to the board instead of an "Add to to-do" button, because they are already on it. The trial or billing notice stays in the app's banner slot, not the rail.
- Actions: no progress ring on action cards, for the same reason (only evidence text, no structured count).
- Competitors: the bubble chart (Google rating against visibility) shows only after "Show Google details", because ratings and reviews come live from Google Places and are never stored. Without a Places match a business is left off the chart. The slope chart's left side is the oldest of the last 10 scans the page loads, not always the very first scan; its sentence names that date.
- Compare: the website radar has 4 axes, not 5; the existing website check measures four things. The 30-day score line from the old trend chart is not drawn on the gap chart. "On Google" fills in only after "Show Google details".
- Sources: the industry word ("a pizza place") is not stored, so the question reads "a business like mine". The mix bar and donut count the listed sites (at most 50). There is no per-site "Done" state, so a site already on the board shows "In Actions" with its column.
- The composer cannot answer questions; it is disabled and says "coming soon".
- The share link (`/r/[token]`) redirects to the PDF, so there is no share page to theme.

## Checks run

- `npx tsc --noEmit`: clean.
- `npx eslint src`: 0 errors, 4 warnings, all in files with the same warnings before this branch (3 boundary warnings in the auth forms, one long file in billing fake-stripe).
- `node --experimental-strip-types scripts/check-copy.ts`: clean (1,542 files). `npm run check:copy` itself fails on this machine's Node 22.14 without that flag.
- `npm run build`: passes. It logs "[pricing] listPlanPrices failed: fetch failed" because `.env` points at a local database that is not running; the page falls back as before.
- Unit tests next to touched files: pass (email render, questions, actions, admin, marketing, pricing).
- Screenshots of every route at 1440px and 390px against a seeded demo account (Cheezious, six scans): every route returns its page, none scrolls sideways. Saved in the session scratchpad, not in the repo.
- E2E (Playwright, isolated test database): the full run (278 tests, 3 workers) was stopped by Claude Code at test 264 because the machine ran low on memory. It had 23 failures:
  - 8 were real and are fixed: the Competitors page lost its Google and "also named" messages when there are no competitors or no scans (restored); two tests counted Recharts line paths and one read the rail row in the old order (tests updated to the new markup: `chart-line` groups, "name, standing, score"); the picked fix on Actions lost its `border-primary` class (restored); and three pages scrolled sideways at 360px with very long names (rail values, ranked bar labels and listed sites now wrap or truncate; and the rise animation now ends with no transform, which had made each card the frame for the fixed question panel).
  - 15 were mobile tests late in the run that timed out on page loads and toasts while memory ran out.
  - Reruns with one worker after the fixes: responsive (all 4 widths, every page) 4 passed; competitors, overview and why-behind on desktop 28 passed; settings, settings-emails, scan-toast, share and smoke on mobile 24 passed; sources, top-up, why-behind, competitors, overview, questions, opportunities and app-shell on mobile 53 passed.
  - Not rerun after the late fixes: the rest of the desktop project (it passed in the full run before them) and the 14 tests the full run never reached outside the reruns above.

## Not done or not seen

- Seen only in code, not in the browser: the Billing page with a live plan (the demo's Stripe ids are fake, so it shows the "couldn't find your plan" state), the onboarding wizard steps (opening them would create a draft business), `/apps/[slug]` (no directory rows locally), and the Overview "no score yet" state.
- The PDF report keeps its own print design.
- DECISIONS.md D-46 to D-50 and docs/design/DESIGN.md still describe the old look; they need updating if this theme is accepted.
- `docs/design/files/` (the reference mockups) is left untracked; add it if the team wants it in the repo.
- One intermittent 404 for a resource showed in the console on some app pages during screenshots; it did not repeat on reload.
