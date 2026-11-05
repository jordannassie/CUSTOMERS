"use client"

import * as React from "react"
import { cn } from "cn"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

type Option = { value: string; label: string }

/**
 * A choice of two or three options side by side, like Add or Remove. A radio group underneath: arrow keys move
 * between options, and with a name it submits its value in a form like a native radio.
 */
function SegmentedControl({
  options,
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root> & { options: Option[] }) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="segmented-control"
      orientation="horizontal"
      className={cn("inline-flex w-fit gap-1 rounded-full border border-border bg-surface p-1", className)}
      {...props}
    >
      {options.map((o) => (
        <RadioGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className="h-8 rounded-full px-3.5 text-[13px] font-medium text-muted-foreground transition-colors duration-150 ease-out outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 data-[state=checked]:bg-brand data-[state=checked]:text-primary-foreground"
        >
          {o.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  )
}

export { SegmentedControl }
