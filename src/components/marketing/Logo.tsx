import Image from "next/image";
import Link from "next/link";

// `preload` replaces the `priority` prop, deprecated in Next.js 16. `trimmed` uses the copy cut to the wordmark (the
// full file is about 60% empty margin), so its height is the logo's real height: the site header uses it (owner,
// 2026-11-17: the logo was too small to read).
export function Logo({ className, preload = false, trimmed = false }: { className?: string; preload?: boolean; trimmed?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Customers.Direct home"
      className="inline-flex shrink-0 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Image
        src={trimmed ? "/images/logos/logo-black-sidebar.png" : "/images/logos/logo-black.png"}
        alt="Customers.Direct"
        width={trimmed ? 640 : 2172}
        height={trimmed ? 89 : 724}
        preload={preload}
        className={className ?? "h-9 w-auto"}
      />
    </Link>
  );
}
