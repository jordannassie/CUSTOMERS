# Customers.Direct Design System

Locked 2026-09-25. Visual reference: [palette-preview.html](./palette-preview.html). Decisions D-46 to D-52 in [DECISIONS.md](../DECISIONS.md).

Read this before building any screen. Use the tokens below, never raw colour codes in components.

## Feel

Calm, confident, precise. Warm off-white canvas, crisp type, one strong blue that always means "you" or "act here". Premium comes from spacing and restraint, not effects.

- **Marketing site**: a bit more expressive; one or two standout moments (hero, score demo).
- **App** (onboarding, dashboard, admin): quiet and clear. Data first.

## Colours

All text pairs pass WCAG AA (4.5:1 or more). Ratios measured against white or the page background.

| Token | Value | Use |
|---|---|---|
| `background` | `#FAFAF8` | Page |
| `surface` | `#FFFFFF` | Cards, panels, inputs |
| `muted` | `#F5F5F2` | Sidebar, table headers, bar tracks |
| `border` | `#E5E5E1` | Card and divider lines (decorative) |
| `input-border` | `#8F8F8A` | Input and control borders (3.3:1) |
| `text` | `#171717` | Headings, body (17:1) |
| `text-secondary` | `#6B6B67` | Supporting text (5.1:1) |
| `text-hint` | `#737370` | Captions, placeholders (4.6:1) |
| `primary` | `#2563EB` | Main buttons, links, active menu item, "you" in charts (white on it 5.2:1) |
| `primary-hover` | `#1D4ED8` | Hover and pressed |
| `primary-tint` | `#EFF6FF` | Selected rows, labels, eyebrow chips |
| `good` / `good-text` / `good-bg` | `#16A34A` / `#15803D` / `#F0FDF4` | Score 70 to 100, positive change |
| `mid` / `mid-text` / `mid-bg` | `#D97706` / `#B45309` / `#FFFBEB` | Score 40 to 69, warnings |
| `low` / `low-text` / `low-bg` | `#DC2626` / `#B91C1C` / `#FEF2F2` | Score 0 to 39, errors, high-impact fixes |
| `chatgpt` | `#10A37F` | ChatGPT dots and bars only |
| `claude` | `#D97757` | Claude dots and bars only |
| `perplexity` | `#20808D` | Perplexity dots and bars only |
| `competitor-1/2/3` | `#525250` / `#A3A3A0` / `#C9C9C4` | Competitors in charts (strongest competitor darkest) |

Rules:
- One blue only. `#3B82F6` and `#0866F5` are removed.
- The bright status colours (`good`, `mid`, `low`) are for fills, rings, dots and bars. Status **text** uses the `-text` shade on its `-bg`.
- Model colours never colour text; labels stay `text`.
- Charts: the business is always `primary`, competitors are greys. Nothing else competes with the blue.

## Typography

- **Geist** for everything; **Geist Mono** only for codes and IDs.
- Numbers (scores, credits, money) use tabular figures.
- Scale: 12 / 13 / 14 (UI default) / 15 (body) / 18 / 20 / 24 / 32 / 48 / 60.
- Headings: weight 600 to 700, letter spacing -0.02em (large marketing headings -0.035em).
- Max 2 weights per screen besides headings.

## Shape and space

- **Corners**: 4px on buttons, inputs, cards, chips, menus and dialogs. 3px on badges. 2px on progress bars. Round only for score rings, avatars and colour dots.
- **Spacing**: 4px grid (4, 8, 12, 16, 20, 24, 32, 48, 64, 88).
- **Shadows**: none on cards (border only). A soft shadow only on floating layers: menus, popovers, dialogs, toasts.
- **Layout**: content max width 1120px on marketing pages; dashboard uses a 240px sidebar and fluid content.

## Motion

- 150 to 200ms, ease-out. Animate only opacity, transform, and background/border colour.
- No `transition: all`. Respect `prefers-reduced-motion` (disable movement).
- Allowed moments: score ring fill on load, number count-up, hover states, dialog and toast entry.

## Components

- **shadcn/ui** on Tailwind v4, themed with the tokens above: Button, Input, Card, Table, Tabs, Dialog, Sheet, DropdownMenu, Badge, Progress, Tooltip, Skeleton, Sonner (toasts), Form.
- **Charts**: shadcn charts (Recharts).
- **Icons**: Lucide only. No emoji icons.
- **Custom signature pieces**: visibility score ring, competitor leaderboard, per-model bars, usage widget, "Copy for Claude" button.
- Every screen designs its **empty, loading (skeleton) and error** states.

## Banned

- Gradient text, purple or "AI" gradients, glassy blur everywhere
- Pure black `#000000`
- Feature-card grids of identical boxes
- Stock photos, fake testimonials, fake logos, AI-made "team" photos
- Raw hex colours in components (use tokens)
- `rounded-full` / `rounded-2xl` on buttons and cards
- Disabled "coming soon" buttons, non-working controls, "NEW" badges
- Jargon in UI text (see the wording table in [MVP_SPEC.md](../MVP_SPEC.md#84-wording-d-32))

## Build process for each screen

1. Screenshot of the chosen reference plus the relevant parts of this file.
2. Build with the `frontend-design` skill, one section at a time.
3. Playwright screenshots at 1440px and 390px wide; compare, fix, repeat.
4. `npx tsc --noEmit`, `npx eslint src`, `npm run build`, Lighthouse accessibility check.
5. Review, then commit.

## shadcn theme mapping

| shadcn variable | Token |
|---|---|
| `--background` | `background` |
| `--foreground` | `text` |
| `--card`, `--popover` | `surface` |
| `--primary` / `--primary-foreground` | `primary` / `#FFFFFF` |
| `--secondary`, `--muted`, `--accent` | `muted` |
| `--muted-foreground` | `text-secondary` |
| `--border` | `border` |
| `--input` | `input-border` |
| `--ring` | `primary` |
| `--destructive` | `low` |
| `--radius` | `4px` |
