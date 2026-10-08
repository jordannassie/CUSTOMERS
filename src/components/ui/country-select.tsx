"use client";

import { useMemo } from "react";
import { countryOptions } from "@/lib/countries";
import { INVALID_CLASS } from "@/components/ui/field-errors";

// A native select keeps the phone keyboard and type-to-jump (BUG-086). Value is an ISO code; "" means not set.
export const SELECT_CLASS = `h-11 w-full rounded-lg border border-input bg-surface px-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm ${INVALID_CLASS}`;

type Props = Omit<React.ComponentProps<"select">, "children" | "onChange" | "value"> & {
  value: string;
  onValueChange: (code: string) => void;
};

export function CountrySelect({ value, onValueChange, className, ...rest }: Props) {
  const options = useMemo(() => countryOptions(), []);
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      autoComplete="country"
      className={className ?? SELECT_CLASS}
      {...rest}
    >
      <option value="">Choose a country</option>
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
