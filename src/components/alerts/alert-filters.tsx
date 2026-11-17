"use client";

import { Select } from "@/components/ui/select";

export type FilterOption<T extends string> = { value: T; label: string; count: number };

const ALL = "all";

/**
 * One filter in the alert box: the app's own Select, as on admin Leads (owner, 2026-11-17: not the dashed chips),
 * compact for the box. It reads "All levels" until something is picked, then the choice and how many there are.
 */
export function FilterSelect<T extends string>({
  name,
  allLabel,
  value,
  options,
  onChange,
}: {
  name: string;
  allLabel: string;
  value: T | "all";
  options: FilterOption<T>[];
  onChange: (value: T | "all") => void;
}) {
  return (
    <Select
      aria-label={`Filter by ${name.toLowerCase()}`}
      data-testid={`alert-filter-${name.toLowerCase()}`}
      value={value}
      onValueChange={(v) => onChange(v as T | "all")}
      placeholder={allLabel}
      options={[
        { value: ALL, label: allLabel },
        ...options.map((o) => ({ value: o.value, label: `${o.label} (${o.count})`, disabled: o.count === 0 && o.value !== value })),
      ]}
      className="h-8 rounded-md px-2.5 text-[length:calc(13px*var(--px,1))] md:text-[length:calc(13px*var(--px,1))]"
    />
  );
}
