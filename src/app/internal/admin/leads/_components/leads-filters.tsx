import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { INTEREST_LABELS, SOURCE_LABELS, STATUS_OPTIONS } from "./lead-types";

// Radix Select has no "" value, so "All ..." is this one in the list and "" everywhere else (the URL, the filter).
const ALL = "__all";

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
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 sm:w-44">
      <Label htmlFor={id} className="text-[13px]">{label}</Label>
      <Select
        id={id}
        value={value || ALL}
        onValueChange={(v) => onChange(v === ALL ? "" : v)}
        options={[{ value: ALL, label: allLabel }, ...options.map(([v, l]) => ({ value: v, label: l }))]}
        placeholder={allLabel}
        className="h-9 text-[14px] md:text-[14px]"
      />
    </div>
  );
}

export function LeadsFilters({
  search,
  interest,
  source,
  status,
  unread,
  onSearch,
  onFilter,
  onToggleUnread,
}: {
  search: string;
  interest: string;
  source: string;
  status: string;
  unread: boolean;
  onSearch: (value: string) => void;
  onFilter: (key: "interest" | "source" | "status", value: string) => void;
  onToggleUnread: () => void;
}) {
  return (
    // Narrow screens: Search on its own row, the three filters in two columns, "Unread only" on its own line, so
    // nothing scrolls sideways at 360px (2026-10-16). From sm up they sit in one row as before.
    <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap sm:gap-4">
      <div className="col-span-2 flex min-w-0 flex-col gap-1 sm:w-64">
        <Label htmlFor="leads-search" className="text-[13px]">Search</Label>
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
        value={interest}
        allLabel="All interests"
        options={Object.entries(INTEREST_LABELS)}
        onChange={(v) => onFilter("interest", v)}
      />
      <FilterSelect
        id="leads-source"
        label="Source"
        value={source}
        allLabel="All sources"
        options={Object.entries(SOURCE_LABELS)}
        onChange={(v) => onFilter("source", v)}
      />
      <FilterSelect
        id="leads-status"
        label="Status"
        value={status}
        allLabel="All statuses"
        options={STATUS_OPTIONS.map((o) => [o.value, o.label])}
        onChange={(v) => onFilter("status", v)}
      />
      {/* Filled while on, so it reads as switched on at a glance, not as one more outline button. */}
      <Button
        type="button"
        variant={unread ? "default" : "outline"}
        aria-pressed={unread}
        onClick={onToggleUnread}
        className="col-span-2 justify-self-start sm:col-span-1"
      >
        {unread && <Check aria-hidden />}
        Unread only
      </Button>
    </div>
  );
}
