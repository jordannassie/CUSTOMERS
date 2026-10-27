import { Check, Minus } from "lucide-react";
import { cn } from "cn";
import type { CompareRow } from "@/modules/competitors";

/** Them and you on each website check (B-91 step 1): a tick, a dash, or a word count. */
export function WebsiteCompare({ name, rows }: { name: string; rows: CompareRow[] }) {
  return (
    <table className="w-full table-fixed text-sm" data-testid="website-compare">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th className="w-[52%] py-1.5 text-left font-medium">
            <span className="sr-only">On their website and yours</span>
          </th>
          <th className="truncate py-1.5 text-left font-medium">{name}</th>
          <th className="py-1.5 text-left font-medium text-primary">You</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border border-t border-border">
        {rows.map((r) => (
          <tr key={r.label}>
            <th scope="row" className="py-2 pr-3 text-left font-normal text-muted-foreground">
              {r.label}
            </th>
            <Cell value={r.them} />
            <Cell value={r.you} gap={r.them === true && r.you === false} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Cell({ value, gap = false }: { value: boolean | number | null; gap?: boolean }) {
  if (value === null) return <td className="py-2 text-xs text-text-hint">Not checked</td>;
  if (typeof value === "number") return <td className="py-2 tabular-nums">{value.toLocaleString("en-US")}</td>;
  return (
    <td className="py-2">
      {value ? (
        <Check className="size-4 text-good-text" aria-label="Yes" />
      ) : (
        <Minus className={cn("size-4", gap ? "text-mid-text" : "text-text-hint")} aria-label="Not found" />
      )}
    </td>
  );
}
