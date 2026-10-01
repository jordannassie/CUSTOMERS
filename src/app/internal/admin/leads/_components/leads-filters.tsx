import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { INTEREST_LABELS, SOURCE_LABELS, STATUS_OPTIONS } from "./lead-types";

const selectClass =
  "h-9 rounded-md border border-input bg-surface px-3 text-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

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
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-[13px]">{label}</Label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">{allLabel}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
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
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex w-full flex-col gap-1 sm:w-64">
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
      <Button
        type="button"
        variant="outline"
        aria-pressed={unread}
        onClick={onToggleUnread}
        className={cn(unread && "border-primary/30 bg-primary-tint text-primary-hover")}
      >
        Unread only
      </Button>
    </div>
  );
}
