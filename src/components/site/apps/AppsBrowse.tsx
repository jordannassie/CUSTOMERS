import Link from "next/link";
import { Search } from "lucide-react";
import { logoUrl, DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";
import { APP_CATEGORIES, type DirectoryApp } from "@/modules/apps-directory/types";
import type { NativeSummary } from "@/modules/apps-directory/review-types";
import { appsHref, type DirectoryQuery, type DirectoryResult } from "@/modules/apps-directory/service";
import { AppCard } from "./AppCard";

const BANNER_SLUGS = ["chatgpt", "canva", "hubspot", "google-ai", "notion"];

function CategoryLinks({ query, className }: { query: DirectoryQuery; className?: string }) {
  const items = [{ id: "all", label: "All Apps" }, ...APP_CATEGORIES];
  return (
    <nav aria-label="App categories" className={className}>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = (query.category || "all") === item.id;
          return (
            <li key={item.id}>
              <Link
                href={appsHref({ q: query.q, category: item.id, sort: query.sort })}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-2.5 py-1.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] ${active ? "bg-[#EFF6FF] text-[#0866F5]" : "text-[#52524E] hover:bg-[#F5F5F2]"}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AppGrid({ apps, ratings, badge }: { apps: DirectoryApp[]; ratings: Record<string, NativeSummary>; badge?: boolean }) {
  if (apps.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {apps.map((app) => (
        <AppCard key={app.slug} app={app} source="directory" badge={badge && app.topPick} native={ratings[app.slug]} />
      ))}
    </div>
  );
}

function FeaturedBanner() {
  const logos = BANNER_SLUGS.map((slug) => DIRECTORY_CATALOG.find((app) => app.slug === slug)).filter((app): app is DirectoryApp => Boolean(app));
  return (
    <section className="mt-5 flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0757D4] to-[#3B82F6] px-5 py-5 text-white sm:px-6 md:h-[168px] md:flex-row md:items-center md:py-0">
      <div className="max-w-xl">
        <h2 className="text-[20px] font-bold leading-snug sm:text-[22px]">Discover the Best AI Tools to Grow Your Business.</h2>
        <p className="mt-1 text-[13.5px] text-white/85">Explore powerful AI apps, software, and services, all in one place.</p>
        <a href="#app-listings" className="mt-3 inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-[#0866F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0866F5]">
          Explore AI Tools <span aria-hidden="true" className="ml-1">→</span>
        </a>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {logos.map((app) => (
          <div key={app.slug} className="flex h-12 w-12 items-center justify-center rounded-xl bg-white sm:h-14 sm:w-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl(app.websiteUrl)} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
          </div>
        ))}
      </div>
    </section>
  );
}

function PopularStrip({ apps }: { apps: DirectoryApp[] }) {
  if (apps.length === 0) return null;
  return (
    <section className="mb-8" aria-label="Popular Apps">
      <h2 className="mb-3 text-[18px] font-semibold text-[#171717]">Popular Apps</h2>
      <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {apps.map((app) => (
          <a
            key={app.slug}
            href={`/apps/${app.slug}`}
            className="flex w-[108px] shrink-0 flex-col items-center rounded-2xl border border-[#E5E5E1] bg-white px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl(app.websiteUrl)} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="mt-2 line-clamp-2 text-[12px] font-semibold leading-tight text-[#171717]">{app.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function AppsBrowse({ query, result, ratings = {} }: { query: DirectoryQuery; result: DirectoryResult; ratings?: Record<string, NativeSummary> }) {
  const pills = [{ id: "all", label: "All" }, ...APP_CATEGORIES.map((category) => ({ id: category.id, label: category.label }))];
  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-16 pt-28 sm:pt-32">
      <h1 className="text-[32px] font-bold tracking-tight text-[#171717] sm:text-[40px]">AI Apps</h1>
      <p className="mt-1.5 max-w-2xl text-[15px] text-[#777773]">Search AI tools, apps, and software for growing a business.</p>

      <form action="/apps" method="get" className="relative mt-5" role="search">
        <label htmlFor="app-search" className="sr-only">Search AI tools, apps, and software</label>
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A0]" />
        <input id="app-search" name="q" type="search" defaultValue={query.q} placeholder="Search AI tools, apps, and software..." className="h-12 w-full rounded-full border border-[#BFDBFE] bg-white pl-11 pr-16 text-[15px] outline-none placeholder:text-[#A3A3A0] focus:border-[#0866F5] focus-visible:ring-2 focus-visible:ring-[#0866F5]" />
        {query.category !== "all" ? <input type="hidden" name="category" value={query.category} /> : null}
        {query.sort !== "name" ? <input type="hidden" name="sort" value={query.sort} /> : null}
        <button type="submit" aria-label="Search apps" className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#0866F5] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] focus-visible:ring-offset-2">→</button>
      </form>

      <div className="mt-3 flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pills.map((pill) => {
          const active = (query.category || "all") === pill.id;
          return (
            <Link key={pill.id} href={appsHref({ q: query.q, category: pill.id, sort: query.sort })} className={`shrink-0 rounded-full border px-3 py-1 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] ${active ? "border-[#0866F5] bg-[#0866F5] text-white" : "border-[#E5E5E1] bg-white text-[#171717] hover:border-[#0866F5]"}`}>
              {pill.label}
            </Link>
          );
        })}
      </div>

      <FeaturedBanner />

      <div className="mt-6 lg:grid lg:grid-cols-[188px_minmax(0,1fr)] lg:gap-6">
        <CategoryLinks query={query} className="hidden lg:block" />
        <details className="mb-4 rounded-xl border border-[#E5E5E1] bg-white px-3 py-2 lg:hidden">
          <summary className="cursor-pointer text-[13px] font-semibold text-[#171717]">Categories</summary>
          <CategoryLinks query={query} className="mt-2" />
        </details>

        <div id="app-listings" className="scroll-mt-28">
          {result.total === 0 ? (
            <p className="rounded-2xl border border-[#E5E5E1] bg-white px-5 py-10 text-center text-[15px] text-[#777773]">No apps match that search. Try another name or category.</p>
          ) : (
            <>
              {result.featured.length > 0 ? (
                <section className="mb-8">
                  <h2 className="mb-3 text-[18px] font-semibold text-[#171717]">Featured Apps</h2>
                  <AppGrid apps={result.featured} ratings={ratings} badge />
                </section>
              ) : null}
              <PopularStrip apps={result.popular} />
              {result.pageItems.length > 0 ? (
                <section>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-[18px] font-semibold text-[#171717]">All Apps</h2>
                    <div className="flex gap-3 text-[13px]">
                      <Link href={appsHref({ ...query, sort: "name", page: 1 })} className={query.sort === "name" ? "font-semibold text-[#0866F5]" : "text-[#777773]"}>Name</Link>
                      <Link href={appsHref({ ...query, sort: "provider", page: 1 })} className={query.sort === "provider" ? "font-semibold text-[#0866F5]" : "text-[#777773]"}>Provider</Link>
                    </div>
                  </div>
                  <AppGrid apps={result.pageItems} ratings={ratings} />
                  <div className="mt-5 flex items-center justify-between text-[14px]">
                    {result.page > 1 ? <Link href={appsHref({ ...query, page: result.page - 1 })} className="font-semibold text-[#0866F5]">Previous</Link> : <span />}
                    <span className="text-[#777773]">Page {result.page} of {result.pageCount}</span>
                    {result.page < result.pageCount ? <Link href={appsHref({ ...query, page: result.page + 1 })} className="font-semibold text-[#0866F5]">Next</Link> : <span />}
                  </div>
                </section>
              ) : null}
            </>
          )}
          <p className="mt-6 text-[12px] text-[#A3A3A0]">Get Started opens each app&apos;s own website.</p>
        </div>
      </div>
    </div>
  );
}
