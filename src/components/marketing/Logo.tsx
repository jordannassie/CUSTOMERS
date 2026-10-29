import Image from "next/image";
import Link from "next/link";

// `preload` replaces the `priority` prop, deprecated in Next.js 16.
export function Logo({ className, preload = false }: { className?: string; preload?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Customers.Direct home"
      className="inline-flex shrink-0 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Image
        src="/images/logos/logo-black.png"
        alt="Customers.Direct"
        width={2172}
        height={724}
        preload={preload}
        className={className ?? "h-9 w-auto"}
      />
    </Link>
  );
}
