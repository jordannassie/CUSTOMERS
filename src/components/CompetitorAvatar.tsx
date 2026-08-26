/** Colored initial avatar for competitor names — consistent colour per name */

const PALETTE = [
  "#3B82F6", "#EF4444", "#F59E0B", "#8B5CF6", "#10B981",
  "#EC4899", "#06B6D4", "#6366F1", "#84CC16", "#F97316",
];

function hashName(name: string): number {
  let h = 0;
  for (const c of name) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function CompetitorAvatar({
  name,
  size = 22,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const color = PALETTE[hashName(name) % PALETTE.length];
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.round(size * 0.4),
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
