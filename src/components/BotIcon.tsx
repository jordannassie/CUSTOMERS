"use client";

/**
 * BotIcon — custom robot image replaces all Bot icon usages.
 * Renders the Customers.Direct bot at the specified pixel size.
 */
interface BotIconProps {
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false" | string;
}

export default function BotIcon({ size = 16, className = "" }: BotIconProps) {
  return (
    <img
      src="https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/bot/Bot.png"
      alt="Direct Agent"
      width={size}
      height={size}
      className={`inline-block object-contain shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
}
