import Image from "next/image";
import Link from "next/link";

export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
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
        priority={priority}
        className={className ?? "h-9 w-auto"}
      />
    </Link>
  );
}
