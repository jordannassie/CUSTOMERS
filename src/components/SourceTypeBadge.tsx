/** Shared badge for source/domain type classification */

const TYPE_MAP: Record<string, { bg: string; text: string }> = {
  UGC:        { bg: "#EFF6FF", text: "#1D4ED8" },
  Editorial:  { bg: "#FFF7ED", text: "#C2410C" },
  Reference:  { bg: "#F5F3FF", text: "#6D28D9" },
  Competitor: { bg: "#FEF2F2", text: "#DC2626" },
  You:        { bg: "#F0FDF4", text: "#15803D" },
  Citation:   { bg: "#ECFEFF", text: "#0E7490" },
  Directory:  { bg: "#F0F9FF", text: "#0369A1" },
};

export function SourceTypeBadge({
  type,
  size = "sm",
}: {
  type: string;
  size?: "xs" | "sm";
}) {
  const style = TYPE_MAP[type] ?? { bg: "#F0F0EC", text: "#777773" };
  const cls = size === "xs"
    ? "text-[9px] px-1.5 py-px"
    : "text-[10px] px-2 py-0.5";
  return (
    <span
      className={`inline-block font-semibold rounded-full shrink-0 ${cls}`}
      style={{ background: style.bg, color: style.text }}
    >
      {type}
    </span>
  );
}
