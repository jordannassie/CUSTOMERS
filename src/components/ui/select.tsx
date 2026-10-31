"use client";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "cn";
import { INVALID_CLASS } from "@/components/ui/field-errors";

// A browser's own select list is as wide as its longest option and, in a narrow window or a phone preview, opens
// past the screen edge. This one keeps 8px from every edge, is never wider than the screen, scrolls inside, wraps
// long options and still jumps to an option as you type (BUG-189).
export type SelectOption = { value: string; label: string; disabled?: boolean };

type Props = {
  id?: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Shown while the value is "". */
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export const SELECT_TRIGGER_CLASS = `flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-surface px-3 text-left text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 data-placeholder:text-muted-foreground md:text-sm ${INVALID_CLASS}`;

export function Select({ id, name, value, onValueChange, options, placeholder, required, disabled, autoComplete, className, ...aria }: Props) {
  return (
    <SelectPrimitive.Root name={name} value={value} onValueChange={onValueChange} required={required} disabled={disabled} autoComplete={autoComplete}>
      <SelectPrimitive.Trigger id={id} className={cn(SELECT_TRIGGER_CLASS, className)} {...aria}>
        <span className="min-w-0 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 max-h-[min(var(--radix-select-content-available-height),20rem)] w-(--radix-select-trigger-width) max-w-[calc(100vw-1rem)] min-w-44 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-float ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          data-testid="select-content"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronUpIcon className="size-4" aria-hidden />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="relative flex w-full cursor-default items-start rounded-md py-2 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
              >
                <SelectPrimitive.ItemText>
                  <span className="break-words whitespace-normal">{o.label}</span>
                </SelectPrimitive.ItemText>
                <span className="absolute top-2.5 right-2 flex size-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="size-4 text-primary" aria-hidden />
                  </SelectPrimitive.ItemIndicator>
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronDownIcon className="size-4" aria-hidden />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
