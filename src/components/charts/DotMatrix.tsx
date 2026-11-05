import { cn } from "cn";

export type DotMatrixRow = {
  key: string;
  label: React.ReactNode;
  emphasis?: boolean;
  /** One value per column, 0 to 100; null when that tool gave no answers to count. */
  values: (number | null)[];
};

type Props = {
  columns: { label: string; color: string; dark?: boolean }[];
  rows: DotMatrixRow[];
  ariaLabel: string;
  unit?: string;
};

// Check-in dot matrix (C-Competitors): business by AI tool, the circle's size is the share and the value is printed in
// it. Zero and "not checked" are a small grey dot (the value stays in the screen reader text).
export function DotMatrix({ columns, rows, ariaLabel, unit = "%" }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse" aria-label={ariaLabel}>
        <thead>
          <tr>
            <th className="w-[38%]" />
            {columns.map((c) => (
              <th key={c.label} scope="col" className="pb-2 text-center text-[13px] font-normal text-muted-foreground">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, k) => (
            <tr key={r.key} className="border-t border-track">
              <th scope="row" className={cn("h-14 py-2 text-left text-[15px]", r.emphasis ? "font-bold text-brand" : "font-medium")}>
                {r.label}
              </th>
              {r.values.map((v, j) => {
                const c = columns[j];
                const on = v !== null && v > 0;
                const size = on ? Math.round(18 + (v as number) * 0.42) : 10;
                return (
                  <td key={j} className="h-14 py-2 text-center">
                    <span
                      className={cn("mx-auto flex animate-pop items-center justify-center rounded-full text-xs font-bold", c.dark ? "text-foreground" : "text-white")}
                      style={{ width: size, height: size, background: on ? c.color : "var(--cd-border)", animationDelay: `${0.4 + (k * columns.length + j) * 0.03}s` }}
                    >
                      {on ? Math.round(v as number) : ""}
                      <span className="sr-only">{v === null ? "no answers" : `${Math.round(v)}${unit}`}</span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
