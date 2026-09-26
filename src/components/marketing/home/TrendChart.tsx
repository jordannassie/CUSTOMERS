const W = 320;
const H = 80;

/** Smooth line through 0 to 100 values, scaled to a w by h box. */
export function smoothPath(data: number[], w: number, h: number): string {
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - (v / 100) * h] as const);
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const mid = ((px + cx) / 2).toFixed(1);
    d += ` C ${mid} ${py.toFixed(1)} ${mid} ${cy.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
  }
  return d;
}

/** Small trend line; the business is always the primary blue (DESIGN.md charts rule). */
export function MiniChart({ values, label }: { values: number[]; label: string }) {
  return (
    <svg viewBox={`0 -2 ${W} ${H + 4}`} preserveAspectRatio="none" className="h-20 w-full" role="img" aria-label={label}>
      {[25, 50, 75].map((v) => (
        <line
          key={v}
          x1="0"
          x2={W}
          y1={H - (v / 100) * H}
          y2={H - (v / 100) * H}
          className="stroke-border"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path
        d={smoothPath(values, W, H)}
        fill="none"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
