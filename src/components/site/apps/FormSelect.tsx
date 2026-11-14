"use client";

import { useState } from "react";
import { Select, type SelectOption } from "@/components/ui/select";

/** Our Select for a plain form posted to a Server Action: it keeps its own value and submits it under `name`. */
export function FormSelect({
  id,
  name,
  defaultValue,
  options,
  className,
}: {
  id: string;
  name: string;
  defaultValue: string;
  options: SelectOption[];
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return <Select id={id} name={name} value={value} onValueChange={setValue} options={options} placeholder="" required className={className} />;
}
