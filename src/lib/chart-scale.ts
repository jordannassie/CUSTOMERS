// The top of a chart's Y axis, sized to its data (redesign brief): scores of 5 to 20 on a 0 to 100 axis read as flat
// lines. Pure.

const STEPS = [10, 20, 25, 40, 50, 60, 75, 100];

/** The smallest round top that fits every value, never under 10 or over 100. */
export function axisTop(values: (number | null | undefined)[]): number {
  const most = Math.max(0, ...values.filter((v): v is number => typeof v === "number" && Number.isFinite(v)));
  return STEPS.find((s) => s >= most) ?? 100;
}

/** Three labels: 0, the middle and the top. */
export function axisTicks(top: number): number[] {
  return [0, top / 2, top];
}

/** A sparkline's points scaled to the series' own low and high, so a small change still shows its shape. */
export function sparkPoints(values: (number | null)[], width: number, height: number): string {
  const known = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (known.length === 0) return "";
  const lo = Math.min(...known.map((p) => p.v));
  const hi = Math.max(...known.map((p) => p.v));
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const y = (v: number) => (hi === lo ? height / 2 : height - ((v - lo) / (hi - lo)) * height);
  return known.map((p) => `${(p.i * step).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
}
