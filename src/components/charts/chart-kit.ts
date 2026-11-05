// Shared geometry and colours for the Check-in charts. Pure: no React, no data access.

/** Chart colours, all CSS variables from globals.css. You are always brand blue, the leader coral, the rest grey. */
export const CHART = {
  you: "var(--cd-primary)",
  youLight: "var(--cd-primary-light)",
  rival: "var(--cd-rival)",
  rivalText: "var(--cd-rival-text)",
  rivalInk: "var(--cd-rival-ink)",
  rivalTint: "var(--cd-rival-tint)",
  rivalMark: "var(--cd-rival-mark)",
  grey1: "var(--cd-competitor-1)",
  grey2: "var(--cd-competitor-2)",
  grey3: "var(--cd-competitor-3)",
  track: "var(--cd-track)",
  sunken: "var(--cd-sunken)",
  grid: "var(--cd-track)",
  border: "var(--cd-border)",
  borderStrong: "var(--cd-border-strong)",
  ink: "var(--cd-text)",
  ink2: "var(--cd-text-2)",
  muted: "var(--cd-text-secondary)",
  axis: "var(--cd-text-hint)",
  surface: "var(--cd-surface)",
  danger: "var(--cd-danger)",
  chatgpt: "var(--cd-chatgpt)",
  chatgptStrong: "var(--cd-chatgpt-strong)",
  claude: "var(--cd-claude)",
  perplexity: "var(--cd-perplexity)",
} as const;

export type Point = readonly [number, number];

/** A smooth path through the points (Catmull-Rom as cubic Béziers, the mockup's curve). */
export function smoothPath(pts: readonly Point[]): string {
  if (pts.length === 0) return "";
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

/** Runs of consecutive known values, as [index, value] pairs, so a missing scan breaks the line instead of faking it. */
export function knownRuns(values: readonly (number | null)[]): [number, number][][] {
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  values.forEach((v, i) => {
    if (v === null || Number.isNaN(v)) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push([i, v]);
  });
  if (run.length) runs.push(run);
  return runs;
}

/** The point at `deg` degrees clockwise from twelve o'clock. */
export function polar(cx: number, cy: number, r: number, deg: number): Point {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** An arc from d0 to d1 degrees (clockwise from twelve o'clock). */
export function arcPath(cx: number, cy: number, r: number, d0: number, d1: number): string {
  const a = polar(cx, cy, r, d0);
  const b = polar(cx, cy, r, d1);
  return `M${a[0].toFixed(1)},${a[1].toFixed(1)} A${r},${r} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
}

/** A round top for a 0 to `max` axis, and its gridline values (4 or 5 steps). */
export function niceScale(max: number, floor = 10): { top: number; ticks: number[] } {
  const m = Math.max(max, floor);
  const step = [5, 10, 20, 25, 50].find((s) => m / s <= 5) ?? Math.ceil(m / 5 / 10) * 10;
  const top = Math.ceil(m / step) * step;
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) };
}

/**
 * Pushes label positions apart so none sit closer than `gap`, keeping their order, within [min, max]. Used for the
 * names at the end of lines and on both sides of the slope chart.
 */
export function spreadLabels(ys: readonly number[], gap: number, min: number, max: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const out = order.map((o) => o.y);
  for (let k = 1; k < out.length; k++) out[k] = Math.max(out[k], out[k - 1] + gap);
  const over = out.length ? out[out.length - 1] - max : 0;
  if (over > 0) for (let k = 0; k < out.length; k++) out[k] -= over;
  for (let k = out.length - 2; k >= 0; k--) out[k] = Math.min(out[k], out[k + 1] - gap);
  if (out.length && out[0] < min) {
    const shift = min - out[0];
    for (let k = 0; k < out.length; k++) out[k] += shift;
  }
  const result = new Array<number>(ys.length);
  order.forEach((o, k) => (result[o.i] = out[k]));
  return result;
}

/** "+3", "-2" or "0" for a change in points. */
export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Round to whole numbers for labels. */
export const whole = (n: number) => Math.round(n);
