"use client";

import { useSyncExternalStore } from "react";

type Swatch = { token: string; name: string; note?: string; className: string };

const GROUPS: { title: string; swatches: Swatch[] }[] = [
  {
    title: "Canvas and text",
    swatches: [
      { token: "background", name: "Ground", note: "Page behind the cards", className: "bg-background" },
      { token: "surface", name: "Surface", className: "bg-surface" },
      { token: "muted", name: "Muted", className: "bg-muted" },
      { token: "border", name: "Border", note: "Decorative lines", className: "bg-border" },
      { token: "sunken", name: "Sunken", note: "Bar tracks, skeletons", className: "bg-sunken" },
      { token: "track", name: "Track", note: "Chart tracks, gridlines", className: "bg-track" },
      { token: "border-strong", name: "Strong border", className: "bg-border-strong" },
      { token: "input-border", name: "Input border", note: "3.1:1", className: "bg-input" },
      { token: "text", name: "Ink", note: "16:1", className: "bg-foreground" },
      { token: "text-2", name: "Text 2", className: "bg-ink-2" },
      { token: "text-secondary", name: "Muted", note: "6.6:1", className: "bg-muted-foreground" },
      { token: "text-hint", name: "Axis labels", note: "5.0:1", className: "bg-text-hint" },
    ],
  },
  {
    title: "Brand",
    swatches: [
      { token: "primary", name: "Primary", note: "White on it 5.2:1", className: "bg-primary" },
      { token: "primary-hover", name: "Primary hover", className: "bg-primary-hover" },
      { token: "primary-light", name: "Brand light", className: "bg-brand-light" },
      { token: "primary-lighter", name: "Brand lighter", className: "bg-brand-lighter" },
      { token: "primary-tint", name: "Brand wash", note: "Notices", className: "bg-primary-tint" },
      { token: "primary-tint-2", name: "Brand tint", note: "Done pills", className: "bg-brand-tint-2" },
      { token: "primary-tint-3", name: "Brand tint soft", note: "Your row", className: "bg-brand-tint-3" },
      { token: "primary-ink", name: "Text on a tint", className: "bg-brand-ink" },
    ],
  },
  {
    title: "The leading competitor",
    swatches: [
      { token: "rival", name: "Coral", className: "bg-rival" },
      { token: "rival-text", name: "Coral text", className: "bg-rival-text" },
      { token: "rival-tint", name: "Coral tint", className: "bg-rival-tint" },
      { token: "rival-mark", name: "Coral mark", note: "Names in quotes", className: "bg-rival-mark" },
      { token: "danger", name: "Danger text", className: "bg-danger" },
    ],
  },
  {
    title: "Status (fill, text, background)",
    swatches: [
      { token: "good", name: "Good fill", note: "Score 70 to 100, brand blue", className: "bg-good" },
      { token: "good-text", name: "Good text", className: "bg-good-text" },
      { token: "good-bg", name: "Good background", className: "bg-good-bg" },
      { token: "mid", name: "Mid fill", note: "Score 40 to 69, neutral", className: "bg-mid" },
      { token: "mid-text", name: "Mid text", className: "bg-mid-text" },
      { token: "mid-bg", name: "Mid background", className: "bg-mid-bg" },
      { token: "low", name: "Low fill", note: "Score 0 to 39, coral", className: "bg-low" },
      { token: "low-text", name: "Low text", className: "bg-low-text" },
      { token: "low-bg", name: "Low background", className: "bg-low-bg" },
    ],
  },
  {
    title: "AI models and competitors (charts only)",
    swatches: [
      { token: "chatgpt", name: "ChatGPT", className: "bg-chatgpt" },
      { token: "claude", name: "Claude", className: "bg-claude" },
      { token: "perplexity", name: "Perplexity", className: "bg-perplexity" },
      { token: "series-2", name: "Leading competitor", className: "bg-series-2" },
      { token: "competitor-1", name: "Competitor grey 1", className: "bg-competitor-1" },
      { token: "competitor-2", name: "Competitor 2", className: "bg-competitor-2" },
      { token: "competitor-3", name: "Competitor 3", className: "bg-competitor-3" },
    ],
  },
];

const TOKENS = GROUPS.flatMap((g) => g.swatches.map((s) => s.token));
const noSubscribe = () => () => {};

// Values are read from the live CSS variables, so the page shows what globals.css really ships.
// Browsers may shorten #FFFFFF to #FFF; THEME_NOTES.md lists six-digit values.
function toLongHex(value: string) {
  return /^#[0-9A-F]{3}$/.test(value) ? `#${[...value.slice(1)].map((c) => c + c).join("")}` : value;
}

function readTokens() {
  const style = getComputedStyle(document.documentElement);
  return TOKENS.map((t) => toLongHex(style.getPropertyValue(`--cd-${t}`).trim().toUpperCase())).join("|");
}

function useTokenValues(): Record<string, string> {
  const snapshot = useSyncExternalStore(noSubscribe, readTokens, () => "");
  const values = snapshot.split("|");
  return Object.fromEntries(TOKENS.map((t, i) => [t, values[i] ?? ""]));
}

export function Palette() {
  const values = useTokenValues();
  return (
    <div className="flex flex-col gap-8">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <h3 className="text-sm font-medium">{group.title}</h3>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {group.swatches.map((s) => (
              <li key={s.token} className="overflow-hidden rounded-md border border-border bg-surface text-xs">
                <div className={`h-11 border-b border-border ${s.className}`} />
                <div className="px-2.5 py-2">
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="font-mono text-muted-foreground">{values[s.token] || " "}</p>
                  <p className="text-text-hint">{s.note ?? s.token}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
