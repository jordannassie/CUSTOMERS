import Link from "next/link";
import { cn } from "cn";
import { BrandLogo } from "@/components/app/BrandLogo";

// The Customers.Direct logo linking home (header, footer, status pages). `preload` loads it first above the fold.
export function Logo({ className, preload = false, tone = "dark" }: { className?: string; preload?: boolean; tone?: "dark" | "light" }) {
  return (
    <Link href="/" aria-label="Customers.Direct home" className={cn("inline-flex shrink-0 items-center rounded-md py-1", className)}>
      <BrandLogo height={22} tone={tone} priority={preload} />
    </Link>
  );
}
