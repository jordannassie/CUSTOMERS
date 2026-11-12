import { Check } from "lucide-react";
import { NO_HANDLER } from "@/modules/feedback/lead-rules";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { LeadsView } from "./lead-query";

// Radix Select has no "" value, so "All ..." is this one in the list and "" everywhere else (the URL, the filter).
const ALL = "__all";

export type FilterKey = "interest" | "source" | "status" | "replied" | "handler" | "unread";

type Option = [value: string, label: string];

/** One filter: our Select, so its list stays on screen at 360px (2026-10-16), same values and "All ..." default. */
function FilterSelect({
  id,
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  allLabel: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 sm:w-44">
      <Label htmlFor={id} className="text-[length:calc(13px*var(--px,1))]">{label}</Label>
      <Select
        id={id}
        value={value || ALL}
        onValueChange={(v) => onChange(v === ALL ? "" : v)}
        options={[{ value: ALL, label: allLabel }, ...options.map(([v, l]) => ({ value: v, label: l }))]}
        placeholder={allLabel}
        className="h-9 text-[length:calc(14px*var(--px,1))] md:text-[length:calc(14px*var(--px,1))]"
      />
    </div>
  );
}

export function LeadsFilters({
  view,
  search,
  admins,
  options,
  onSearch,
  onFilter,
}: {
  view: LeadsView;
  search: string;
  admins: string[];
  options: { interest: Option[]; source: Option[]; status: Option[] };
  onSearch: (value: string) => void;
  onFilter: (key: FilterKey, value: string) => void;
}) {
  // A handler in the address who is no longer an admin still shows, so the filter never hides what it is set to.
  const handlers = [...new Set([...admins, ...(view.handler && view.handler !== NO_HANDLER ? [view.handler] : [])])];
  return (
    // Narrow screens: Search on its own row, the filters in two columns, "Unread only" on its own line, so nothing
    // scrolls sideways at 360px (2026-10-16). From sm up they wrap in rows.
    <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap sm:gap-4">
      <div className="col-span-2 flex min-w-0 flex-col gap-1 sm:w-64">
        <Label htmlFor="leads-search" className="text-[length:calc(13px*var(--px,1))]">Search</Label>
        <Input
          id="leads-search"
          type="search"
          placeholder="Search name, email or company"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <FilterSelect
        id="leads-interest"
        label="Interest"
        value={view.interest}
        allLabel="All interests"
        options={options.interest}
        onChange={(v) => onFilter("interest", v)}
      />
      <FilterSelect
        id="leads-source"
        label="Source"
        value={view.source}
        allLabel="All sources"
        options={options.source}
        onChange={(v) => onFilter("source", v)}
      />
      <FilterSelect
        id="leads-status"
        label="Status"
        value={view.status}
        allLabel="All statuses"
        options={options.status}
        onChange={(v) => onFilter("status", v)}
      />
      <FilterSelect
        id="leads-replied"
        label="Replied"
        value={view.replied}
        allLabel="Replied or not"
        options={[["yes", "Replied"], ["no", "Not replied yet"]]}
        onChange={(v) => onFilter("replied", v)}
      />
      <FilterSelect
        id="leads-handler"
        label="Handled by"
        value={view.handler}
        allLabel="Anyone"
        options={[[NO_HANDLER, "Nobody yet"], ...handlers.map((email): Option => [email, email])]}
        onChange={(v) => onFilter("handler", v)}
      />
      {/* Filled while on, so it reads as switched on at a glance, not as one more outline button. */}
      <Button
        type="button"
        variant={view.unread ? "default" : "outline"}
        aria-pressed={view.unread}
        onClick={() => onFilter("unread", view.unread ? "" : "1")}
        className="col-span-2 justify-self-start sm:col-span-1"
        title="Leads nobody has opened yet"
      >
        {view.unread && <Check aria-hidden />}
        Unread only
      </Button>
    </div>
  );
}
