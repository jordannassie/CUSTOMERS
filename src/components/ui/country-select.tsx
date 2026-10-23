"use client";

import { useMemo } from "react";
import { countryOptions } from "@/lib/countries";
import { Select } from "@/components/ui/select";

// Value is an ISO code; "" means not set (BUG-086). The list stays on screen on phones and narrow windows (BUG-189).
type Props = {
  id?: string;
  name?: string;
  value: string;
  onValueChange: (code: string) => void;
  required?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function CountrySelect(props: Props) {
  const options = useMemo(() => countryOptions().map((o) => ({ value: o.code, label: o.name })), []);
  return <Select {...props} options={options} placeholder="Choose a country" autoComplete="country" />;
}
