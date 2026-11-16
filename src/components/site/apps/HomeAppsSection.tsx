import Link from "next/link";
import { Search } from "lucide-react";
import { DIRECTORY_CATALOG, HOME_FEATURED_SLUGS } from "@/modules/apps-directory/catalog";
import type { DirectoryApp } from "@/modules/apps-directory/types";
import type { NativeSummary } from "@/modules/apps-directory/review-types";
import { AppCard } from "./AppCard";

// The moving row (owner, 2026-11-16): the featured six first, then the other business apps. Developer and hosting tools
// (GitHub, Vercel, Supabase...) stay on /apps; a local business owner is not looking for them here.
const NOT_ON_HOME = new Set(["development", "infrastructure", "security"]);
const STRIP_SIZE = 20;

export function homeStripApps(): DirectoryApp[] {
  const featured = HOME_FEATURED_SLUGS.map((slug) => DIRECTORY_CATALOG.find((app) => app.slug === slug)).filter((app): app is DirectoryApp => Boolean(app));
  const rest = DIRECTORY_CATALOG.filter((app) => !featured.includes(app) && !app.categories.some((c) => NOT_ON_HOME.has(c)));
  return [...featured, ...rest].slice(0, STRIP_SIZE);
}

const PILLS = [
  { label: "All", href: "/apps" },
  { label: "AI Search", href: "/apps?category=ai-search" },
  { label: "Marketing", href: "/apps?category=marketing" },
  { label: "Content", href: "/apps?category=content-design" },
  { label: "Sales", href: "/apps?category=sales" },
  { label: "Automation", href: "/apps?category=automation" },
  { label: "Productivity", href: "/apps?category=productivity" },
];

export function HomeAppsSection({ ratings = {} }: { ratings?: Record<string, NativeSummary> }) {
  const apps = homeStripApps();
  const row = (copy?: boolean) => (
    // The second copy makes the loop seamless; it is hidden from screen readers and keyboard (inert).
    <ul aria-hidden={copy || undefined} inert={copy || undefined} className={`flex shrink-0 gap-3 pr-3 ${copy ? "motion-reduce:hidden" : ""}`}>
      {apps.map((app) => (
        <li key={app.slug} className="w-[calc(196px*var(--px,1))] shrink-0">
          <AppCard app={app} source="homepage" badge={app.topPick} layout="home" native={ratings[app.slug]} />
        </li>
      ))}
    </ul>
  );
  return (
    <section id="ai-apps" className="border-b border-[#EEEEEA] bg-background py-12 sm:py-14">
      {/* Same width as the other home sections (Section in marketing/section.tsx). */}
      <div className="mx-auto max-w-[calc(1120px*var(--px,1))] px-4 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[length:calc(28px*var(--px,1))] font-bold tracking-tight text-foreground sm:text-[length:calc(34px*var(--px,1))]">Discover the best AI tools</h2>
            <p className="mt-1 text-[length:calc(15px*var(--px,1))] text-muted-foreground">Find the right AI tools to grow your business.</p>
          </div>
          <Link href="/apps" className="text-[length:calc(14px*var(--px,1))] font-semibold text-[#0866F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] focus-visible:ring-offset-2">
            View all apps →
          </Link>
        </div>

        <form action="/apps" method="get" className="relative" role="search">
          <label htmlFor="home-app-search" className="sr-only">Search AI tools, apps, and software</label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-hint" />
          <input
            id="home-app-search"
            name="q"
            type="search"
            placeholder="Search AI tools, apps, and software..."
            className="h-12 w-full rounded-full border border-[#BFDBFE] bg-white pl-11 pr-16 text-[length:calc(15px*var(--px,1))] text-foreground shadow-sm outline-none placeholder:text-text-hint focus:border-[#0866F5] focus-visible:ring-2 focus-visible:ring-[#0866F5]"
          />
          <button type="submit" aria-label="Search apps" className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#0866F5] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] focus-visible:ring-offset-2">
            →
          </button>
        </form>

        <div className="mt-3 flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PILLS.map((pill) => (
            <Link key={pill.href} href={pill.href} className="shrink-0 rounded-full border border-border bg-white px-3 py-1 text-[length:calc(13px*var(--px,1))] font-medium text-foreground hover:border-[#0866F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5]">
              {pill.label}
            </Link>
          ))}
        </div>

        <h3 className="mb-3 mt-6 text-[length:calc(16px*var(--px,1))] font-semibold text-foreground">Featured AI Tools</h3>
        {/* Moves like the question strip; stops under the pointer or keyboard focus. With reduced motion it is a row
            that scrolls by hand. py-2: room for the card shadow and hover lift inside the clipped scroller. */}
        <div className="-mx-4 overflow-hidden px-4 py-2 sm:-mx-6 sm:px-6 motion-reduce:overflow-x-auto">
          <div className="marquee-scroll flex w-max" style={{ animationDuration: `${apps.length * 3}s` }}>
            {row()}
            {row(true)}
          </div>
        </div>
      </div>
    </section>
  );
}
