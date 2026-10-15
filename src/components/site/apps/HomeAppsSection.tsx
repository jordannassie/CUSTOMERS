import Link from "next/link";
import { Search } from "lucide-react";
import { DIRECTORY_CATALOG, HOME_FEATURED_SLUGS } from "@/modules/apps-directory/catalog";
import type { DirectoryApp } from "@/modules/apps-directory/types";
import { AppCard } from "./AppCard";

const PILLS = [
  { label: "All", href: "/apps" },
  { label: "AI Search", href: "/apps?category=ai-search" },
  { label: "Marketing", href: "/apps?category=marketing" },
  { label: "Content", href: "/apps?category=content-design" },
  { label: "Sales", href: "/apps?category=sales" },
  { label: "Automation", href: "/apps?category=automation" },
  { label: "Productivity", href: "/apps?category=productivity" },
];

export function HomeAppsSection() {
  const featured = HOME_FEATURED_SLUGS.map((slug) => DIRECTORY_CATALOG.find((app) => app.slug === slug)).filter((app): app is DirectoryApp => Boolean(app));
  return (
    <section id="ai-apps" className="border-b border-[#EEEEEA] bg-[#FAFAF8] px-4 py-12 sm:py-14">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-[#171717] sm:text-[34px]">Discover the Best AI Tools</h2>
            <p className="mt-1 text-[15px] text-[#777773]">Find the right AI tools to grow your business.</p>
          </div>
          <Link href="/apps" className="text-[14px] font-semibold text-[#0866F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] focus-visible:ring-offset-2">
            View All Apps →
          </Link>
        </div>

        <form action="/apps" method="get" className="relative" role="search">
          <label htmlFor="home-app-search" className="sr-only">Search AI tools, apps, and software</label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A0]" />
          <input
            id="home-app-search"
            name="q"
            type="search"
            placeholder="Search AI tools, apps, and software..."
            className="h-12 w-full rounded-full border border-[#BFDBFE] bg-white pl-11 pr-16 text-[15px] text-[#171717] shadow-sm outline-none placeholder:text-[#A3A3A0] focus:border-[#0866F5] focus-visible:ring-2 focus-visible:ring-[#0866F5]"
          />
          <button type="submit" aria-label="Search apps" className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#0866F5] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] focus-visible:ring-offset-2">
            →
          </button>
        </form>

        <div className="mt-3 flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PILLS.map((pill) => (
            <Link key={pill.href} href={pill.href} className="shrink-0 rounded-full border border-[#E5E5E1] bg-white px-3 py-1 text-[13px] font-medium text-[#171717] hover:border-[#0866F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5]">
              {pill.label}
            </Link>
          ))}
        </div>

        <h3 className="mb-3 mt-6 text-[16px] font-semibold text-[#171717]">Featured AI Tools</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {featured.map((app) => (
            <AppCard key={app.slug} app={app} source="homepage" badge={app.topPick} layout="home" />
          ))}
        </div>
      </div>
    </section>
  );
}
