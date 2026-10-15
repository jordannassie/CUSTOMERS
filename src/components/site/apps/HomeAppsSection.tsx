import Link from "next/link";
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
    <section id="ai-apps" className="border-b border-[#EEEEEA] bg-[#FAFAF8] px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[32px] font-bold tracking-tight text-[#171717] sm:text-[40px]">Discover the Best AI Tools</h2>
            <p className="mt-2 text-[16px] text-[#777773]">Find the right AI tools to grow your business.</p>
          </div>
          <Link href="/apps" className="text-[14px] font-semibold text-[#0866F5]">
            View All Apps →
          </Link>
        </div>

        <form action="/apps" method="get" className="relative" role="search">
          <label htmlFor="home-app-search" className="sr-only">Search AI tools, apps, and software</label>
          <input
            id="home-app-search"
            name="q"
            type="search"
            placeholder="Search AI tools, apps, and software..."
            className="h-14 w-full rounded-full border border-[#BFDBFE] bg-white pl-5 pr-16 text-[15px] text-[#171717] shadow-sm outline-none placeholder:text-[#A3A3A0] focus:border-[#0866F5]"
          />
          <button type="submit" aria-label="Search apps" className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#0866F5] text-white">
            →
          </button>
        </form>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {PILLS.map((pill) => (
            <Link key={pill.href} href={pill.href} className="shrink-0 rounded-full border border-[#E5E5E1] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#171717] hover:border-[#0866F5]">
              {pill.label}
            </Link>
          ))}
        </div>

        <h3 className="mb-4 mt-8 text-[18px] font-semibold text-[#171717]">Featured AI Tools</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((app) => (
            <AppCard key={app.slug} app={app} source="homepage" badge={app.topPick} />
          ))}
        </div>
      </div>
    </section>
  );
}
