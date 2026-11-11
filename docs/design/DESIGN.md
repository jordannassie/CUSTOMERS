# Customers.Direct Design System

The Check-in theme. Owner-approved 2026-11-05; headings changed to Plus Jakarta Sans 2026-11-07. Decisions D-94 to D-97 in [DECISIONS.md](../DECISIONS.md) (they replace D-46 to D-50). Visual reference: the mockups in [files/](./files/) (`C-Overview`, `C-Competitors`, `C-Compare`, `C-Sources`). [palette-preview.html](./palette-preview.html) shows the old look and is kept only as history.

Read this before building any screen. Use the tokens below, never raw colour codes in components. Every word follows [WRITING.md](./WRITING.md).

## Feel

Calm, friendly, clear. White cards sit on a cool blue-grey ground, and the main pages read as a short conversation: you ask a question, the AI answers in a few cards with one chart each. One strong blue always means "you" or "act here".

- **Marketing site**: the same palette and fonts; the hero is a small check-in thread.
- **App** (onboarding, dashboard, admin): quiet and clear. Data first.

### Colour rules

- **You are always brand blue.** Your line, bar, dot, row and bubble.
- **The leading competitor is coral** (`rival`). Only one business gets coral.
- **Every other competitor is grey** (`competitor-1` to `competitor-3`), and their names always sit beside the marks or in a legend.
- **Positive states are blue.** "Good" and "Done" use the brand blue and its tints. Bad or needs attention uses coral. So-so is neutral grey.
- **No green and no yellow** anywhere in the app.

## Colours

All tokens live in `src/app/globals.css` as `--cd-*` variables in `:root` and are mapped into Tailwind v4 by `@theme inline`. All text pairs pass WCAG AA (4.5:1 or more).

| Role | Token | Tailwind class | Value |
|---|---|---|---|
| Ground (page) | `--cd-background` | `bg-background`, `bg-ground` | `#EEF2F8` |
| Surface (cards) | `--cd-surface` | `bg-surface`, `bg-card` | `#FFFFFF` |
| Inner panels | `--cd-muted` | `bg-muted` | `#F4F6FB` |
| Sunken (bar tracks, skeletons) | `--cd-sunken` | `bg-sunken` | `#F1F4F9` |
| Chart tracks, gridlines | `--cd-track` | `bg-track` | `#EDF1F7` |
| Border (decorative) | `--cd-border` | `border-border` | `#DCE3EE` |
| Border strong (chips, composer) | `--cd-border-strong` | `border-border-strong` | `#C9D3E3` |
| Divider (rows in a card) | `--cd-divider` | `border-divider` | `#E5EAF3` |
| Input border | `--cd-input-border` | `border-input` | `#8A94A6` (3:1 on white) |
| Ink (headings, body) | `--cd-text` | `text-foreground`, `text-ink` | `#141B2D` |
| Text 2 (explanations) | `--cd-text-2` | `text-ink-2` | `#3A4456` |
| Muted text | `--cd-text-secondary` | `text-muted-foreground` | `#545E70` |
| Hint, axis labels | `--cd-text-hint` | `text-text-hint` | `#667085` (4.97:1) |
| Brand | `--cd-primary` | `bg-primary`, `bg-brand`, `text-brand` | `#2563EB` |
| Brand strong (hover, text on tints) | `--cd-primary-hover` | `bg-primary-hover`, `text-brand-strong` | `#1D4ED8` |
| Brand light, lighter (gradients) | `--cd-primary-light`, `--cd-primary-lighter` | `bg-brand-light`, `bg-brand-lighter` | `#3B82F6`, `#60A5FA` |
| Brand wash (notices, Suggested) | `--cd-primary-tint` | `bg-brand-tint`, `bg-primary-tint` | `#EAF1FF` |
| Brand tint (Done, your marks) | `--cd-primary-tint-2` | `bg-brand-tint-2` | `#DBE7FE` |
| Brand tint soft (your row, quick wins) | `--cd-primary-tint-3` | `bg-brand-tint-3` | `#E6EEFF` |
| Brand ink (text on a tint) | `--cd-primary-ink` | `text-brand-ink` | `#1E3A8A` |
| Leading competitor | `--cd-rival` | `bg-rival` | `#D9735A` |
| Rival text, ink | `--cd-rival-text`, `--cd-rival-ink` | `text-rival-text`, `text-rival-ink` | `#B9553D`, `#8A3B26` |
| Rival tint, mark | `--cd-rival-tint`, `--cd-rival-mark` | `bg-rival-tint`, `bg-rival-mark` | `#FBEDE8`, `#F7D9D3` |
| Danger text | `--cd-danger` | `text-danger`, `text-destructive` | `#8A3B26` (the coral ink; no separate red) |
| Other competitors | `--cd-competitor-1..3` (and `--cd-series-3..5`) | `bg-competitor-1` to `-3` | `#5B6475`, `#AAB2BF`, `#C3CBD8` |
| ChatGPT | `--cd-chatgpt`, `--cd-chatgpt-strong` | `bg-chatgpt`, `text-chatgpt-strong` | `#98A2B3`, `#5B6475` |
| Claude | `--cd-claude` | `bg-claude` | brand `#2563EB` |
| Perplexity | `--cd-perplexity` | `bg-perplexity` | `#D98C3F` (dark text on it) |

Status tokens keep their old names so existing code works: `good` / `good-text` / `good-bg` are brand, brand strong and brand tint; `mid` / `mid-text` / `mid-bg` are grey `#5B6475`, text 2 and track; `low` / `low-text` / `low-bg` are coral, danger and rival tint.

Rules:
- Status **text** uses the `-text` or `-ink` shade on its tint, never the bright fill colour.
- Coral and Perplexity orange fills carry dark ink text, never white (white on them is 3.2:1 and 2.7:1).
- "Done" pills use brand strong text on brand tint (brand on brand tint is only 4.15:1).
- Series colours come from `src/lib/series-colors.ts` (`series-2` is coral, `series-3` to `-5` are greys), so the colour rules hold on every chart.

## Typography

- **Figtree** (400, 500, 600, 700) for the whole interface, loaded in `src/app/layout.tsx` as `--font-figtree`. Body text is 15px.
- **Plus Jakarta Sans semibold** for page titles (28px), card titles (18px), the lead sentence of each AI message (20 to 22px, or 22 to 26px for the first one), big numbers and the wordmark. Use the `font-display` class (`--font-jakarta`; `CardTitle` uses the matching `font-heading`). To try another heading font, change it in `layout.tsx` and in `--font-display` / `--font-heading` in `globals.css`.
- Numbers (scores, credits, money) use tabular figures (`tabular` or `tabular-nums`).
- Small text: 13px for pills, notes and day rules; 12px for axis labels and captions. Nothing smaller.
- Max 2 weights per screen besides headings.
- Emails fall back to the system sans because mail apps do not load web fonts.

## Shape and space

- **Corners**:

| Element | Radius | Class |
|---|---|---|
| Pills: status pills, badges, chips, brand buttons, follow-ups | full | `rounded-full` |
| Controls: tabs, segmented controls, small buttons | 10px | `rounded-md` |
| Buttons | 12px | `rounded-[12px]` (the Button default) |
| Inputs, inner cards, the composer | 16px | `rounded-lg` |
| Cards, rail cards, dialogs | 20px | `rounded-xl` |
| Chat bubbles | 20px with one 6px corner | the user bubble's tail is bottom right; the first AI card's is top left by the avatar, the last one's bottom left |
| Small marks (tooltip arrow, kbd) | 3 to 6px | `rounded-xs`, `rounded-sm` |

- **Spacing**: 4px grid (4, 8, 12, 16, 20, 24, 28, 32, 48, 64).
- **Rhythm**:
  - Page header: `PageHeader` (`src/components/app/PageHeader.tsx`). Title, description and any line under them are 12px apart; content starts 24px below.
  - Cards: 24px padding (`Card`), 20px for rail cards. Title, description and first content are 12px apart.
  - 18px between messages in a conversation, 14px between rail cards, 28px between the column and the rail.
  - Kept tight on purpose: a list row's name and its detail (0 to 4px), a label above its field (8px).

## Effects

- **User bubble**: `bg-gradient-user` (135deg, `#3B82F6` to `#1D4ED8`), white text, `shadow-user` (`0 8px 20px` brand at 25%).
- **AI avatar**: a 36px circle in `bg-gradient-ai` (135deg, `#60A5FA` to `#2563EB`) with a white Lucide `Check` (the check from the logo). The workspace badge and primary pills may use the same gradient.
- **Floating layers** (tooltips, popovers, menus, dialogs, toasts): white, `border-border`, `shadow-float` (`0 12px 30px` ink at 14%). Tooltips are white, not dark.
- **Cards have no shadow.** White on the ground colour is enough.
- No other gradients. Never gradient text.

## Motion

| Class | What it does | Use |
|---|---|---|
| `animate-rise` | fades in and moves up 10px, 0.5s | messages and cards, staggered (0.4s, then 0.5s apart) |
| `animate-fade` | fades in, 0.6s | chart areas, labels, dashed lines |
| `animate-pop` | scales from 0 with a small overshoot, 0.6s | dots and markers |
| `animate-grow-x` | grows from the left, 0.8s | bars |
| `animate-draw` | draws a line along its path, 1.6s | chart lines (paths with `pathLength="1"`) |

- All use `backwards` fill: hidden during their delay, and no transform left behind afterwards (a kept transform would trap fixed panels and menus inside the card).
- All stop under `prefers-reduced-motion` (the rule at the end of `globals.css` cuts duration and delay to zero); Recharts charts read `useReducedMotion()`.
- Hovers: 150 to 200ms, colour only. No `transition: all`.

## Layout

- **App shell**: a 220px nav on the ground colour (`AppShell`), with the business's own icon in the switcher, Lucide icons, group labels, and the current page as a white pill. Nav labels stay "Overview" and "Actions" (D-96). Pages put their white cards straight on the ground.
- **Check-in conversation** (`src/components/checkin`), used on **Overview, Competitors, Compare, Sources and Questions**:
  - `CheckInLayout`: the conversation column (max 820px) and a right rail (260 to 340px) that wraps under the column on phones.
  - `DayRule`: a thin rule with a note, for example "Monthly check-in, from your Oct 17 scan".
  - `UserBubble`: the question on the right.
  - `AiMessage`: answer cards on the left (`place` sets the bubble corners; `lead` is the heading-font sentence; `aside` holds a chart or two big numbers beside it), with `Explain` for the plain line under the lead.
  - `FollowUps`: white pill links to other pages. `Composer`: "Ask about your results", not shown until an endpoint can answer (D-97).
  - Rail: `RailCard`, `StatRows` (label left, value right, divider above), `RailNotice` (brand wash). `StatusPill` for Suggested, Done, In progress, Dismissed and needs attention.
- **Plain white cards** everywhere else: Actions (a board of cards with status pills), Reports, Billing, Settings, credits and usage, auth and onboarding (centred cards), and admin (dense tables with sticky headers and pill filters).
- Marketing pages: content max width 1120px.
- The PDF report keeps its own print design (black and white friendly, the agency's accent colour).

## Charts

Components in `src/components/charts` (exported from `index.ts`, colours from `chart-kit.ts`):

| Component | Shows |
|---|---|
| `LineAreaChart` | scores over time, you with a brand area under your line, each line labelled at its end |
| `RadialBars` | one arc per AI tool, the share of its answers that named you |
| `ScoreGauge` | one score on a half ring |
| `BubbleChart` | Google rating against visibility (after "Show Google details") |
| `SlopeChart` | first scan against latest, per business |
| `GapChart` | you against the leader, the gap shaded |
| `LollipopRows` | you and one competitor per AI tool, joined by a line |
| `RadarChart` | website checks, you against a competitor |
| `StackedShareBar` | every use of a source as one 100% bar, by what it does for you |
| `RankedBars` | ranked rows on a sunken track, with a badge for each AI tool (plain HTML, names wrap) |
| `Donut` | uses split by status, one number in the hole |
| `DotMatrix` | business by AI tool, circle size is the share (a table) |
| `Sparkline` | a small trend in a row or tile |
| `ProgressRing` | how much of a whole one thing covers |
| `Legend`, `ChartTooltipCard` | legends and the white tooltip card |

Rules:
- You brand blue, the leader coral, everyone else grey. AI tools use their own tokens.
- Every chart has `role="img"` and an `aria-label` that sums up what it shows in a sentence. `RankedBars` is a labelled figure and `DotMatrix` a labelled table, so their rows stay readable. A `Sparkline` or `ProgressRing` beside a number that says the same is decoration and is hidden from screen readers; given a label, it becomes an image.
- Every chart has a legend or names its series right beside the marks (the greys mean "everyone else", so colour alone never identifies a business).
- A missing scan breaks the line (`knownRuns`); never draw a value we do not have.
- On phones a wide chart scrolls inside its own box (`overflow-x-auto` with a minimum width), never the page, and shows a visible hint that it scrolls.
- Recharts is used for the bubble chart, the radar and the donut; the rest are plain SVG.

## Accessibility

- Text contrast 4.5:1 or more; input borders `#8A94A6` for 3:1 against white (WCAG 1.4.11). Decorative borders may be lighter.
- Touch targets at least 44px: buttons grow to 44px on touch screens (`pointer-coarse:min-h-11`), chips and the composer's send button are 44px.
- Keyboard focus: a 3px brand outline, 2px offset, on every link, button, tab and menu item (unlayered rule in `globals.css`). Inputs keep their focus ring.
- No page scrolls sideways at 360px: long names and domains wrap or truncate.

## Components

- **shadcn/ui** on Tailwind v4, themed through the variables below: Button (plus `brand` and `chip` pill variants), Input, Card, Table, Tabs, Dialog, Sheet, DropdownMenu, Badge, Progress, Tooltip, Skeleton, Sonner (toasts), Form.
- **Icons**: Lucide only. No emoji icons.
- Every screen designs its **empty, loading (skeleton) and error** states.

## Banned

- Green or yellow, and any colour that competes with the brand blue for "you"
- Gradient text, purple or rainbow gradients, glassy blur; gradients only on the user bubble, AI avatar and primary pills
- Shadows on cards
- Pure black `#000000`
- Stock photos, fake testimonials, fake logos, AI-made "team" photos
- Raw hex colours in components (use tokens)
- Disabled "coming soon" controls, non-working controls, "NEW" badges
- Jargon in UI text (see the wording table in [MVP_SPEC.md](../MVP_SPEC.md#84-wording-d-32))

## Build process for each screen

1. Open the matching mockup in `docs/design/files/` and the relevant parts of this file.
2. Build with the `frontend-design` skill, one section at a time, from the `checkin` and `charts` components.
3. Playwright screenshots at 1440px and 390px wide; compare, fix, repeat.
4. `npx tsc --noEmit`, `npx eslint src`, `npm run build`, Lighthouse accessibility check.
5. Review, then commit.

## shadcn theme mapping

| shadcn variable | Token |
|---|---|
| `--background` | `--cd-background` (`#EEF2F8`) |
| `--foreground` | `--cd-text` |
| `--card`, `--popover` | `--cd-surface` |
| `--primary` / `--primary-foreground` | `--cd-primary` / `#FFFFFF` |
| `--secondary`, `--muted`, `--accent` | `--cd-muted` |
| `--muted-foreground` | `--cd-text-secondary` |
| `--border` | `--cd-border` |
| `--input` | `--cd-input-border` |
| `--ring` | `--cd-primary` |
| `--destructive` | `--cd-danger` |
| `--radius` | `12px` |
| `--chart-1` to `--chart-5` | primary, competitor 1 to 3, text hint |
| `--sidebar` | `--cd-background` (accent `--cd-primary-tint`) |
