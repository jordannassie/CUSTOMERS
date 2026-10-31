// Accepts "example.com", "https://example.com/page" and similar; only the host is checked.
export function isValidDomain(value: string): boolean {
  const host = value.trim().replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i.test(host);
}

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
