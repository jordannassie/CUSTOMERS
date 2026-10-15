import Link from "next/link";
import { APP_CATEGORIES, type DirectoryApp } from "@/modules/apps-directory/types";
import { appsHref, type DirectoryQuery, type DirectoryResult } from "@/modules/apps-directory/service";
import { AppCard } from "./AppCard";

function CategoryLinks({ query, className }: { query: DirectoryQuery; className?: string }) {
  const items = [{ id: "all", label: "All Apps" }, ...APP_CATEGORIES];
  return (
    <nav aria-label="App categories" className={className}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = (query.category || "all") === item.id;
          return (
            <li key={item.id}>
              <Link
                href={appsHref({ q: query.q, category: item.id, sort: query.sort })}
                aria-current={active ? "page" : undefined}
                className={`block rounded-xl px-3 py-2 text-[13.5px] font-medium ${active ? "bg-[#EFF6FF] text-[#0866F5]" : "text-[#171717] hover:bg-[#F5F5F2]"}`}
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

function AppGrid({ apps, badge }: { apps: DirectoryApp[]; badge?: boolean }) {
  if (apps.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {apps.map((app) => (
        <AppCard key={app.slug} app={app} source="directory" badge={badge && app.topPick} />
      ))}
    </div>
  );
}

export function AppsBrowse({ query, result }: { query: DirectoryQuery; result: DirectoryResult }) {
  const pills = [{ id: "all", label: "All" }, ...APP_CATEGORIES.map((category) => ({ id: category.id, label: category.label }))];
  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-20 pt-28 sm:pt-32">
      <h1 className="text-[36px] font-bold tracking-tight text-[#171717] sm:text-[44px]">AI Apps</h1>
      <p className="mt-2 max-w-2xl text-[16px] text-[#777773]">Search AI tools, apps, and software for growing a business.</p>

      <form action="/apps" method="get" className="relative mt-6" role="search">
        <label htmlFor="app-search" className="sr-only">Search AI tools, apps, and software</label>
        <input id="app-search" name="q" type="search" defaultValue={query.q} placeholder="Search AI tools, apps, and software..." className="h-14 w-full rounded-full border border-[#BFDBFE] bg-white pl-5 pr-16 text-[15px] outline-none placeholder:text-[#A3A3A0] focus:border-[#0866F5]" />
        {query.category !== "all" ? <input type="hidden" name="category" value={query.category} /> : null}
        <button type="submit" aria-label="Search apps" className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#0866F5] text-white">→</button>
      </form>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {pills.map((pill) => {
          const active = (query.category || "all") === pill.id;
          return (
            <Link key={pill.id} href={appsHref({ q: query.q, category: pill.id, sort: query.sort })} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${active ? "border-[#0866F5] bg-[#0866F5] text-white" : "border-[#E5E5E1] bg-white text-[#171717]"}`}>
              {pill.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <CategoryLinks query={query} className="hidden lg:block" />
        <details className="mb-6 rounded-2xl border border-[#E5E5E1] bg-white p-3 lg:hidden">
          <summary className="cursor-pointer text-[14px] font-semibold text-[#171717]">Categories</summary>
          <CategoryLinks query={query} className="mt-3" />
        </details>

        <div>
          {result.total === 0 ? (
            <p className="rounded-2xl border border-[#E5E5E1] bg-white px-5 py-10 text-center text-[15px] text-[#777773]">No apps match that search. Try another name or category.</p>
          ) : (
            <>
              {result.featured.length > 0 ? (
                <section className="mb-10">
                  <h2 className="mb-4 text-[20px] font-semibold text-[#171717]">Featured Apps</h2>
                  <AppGrid apps={result.featured} badge />
                </section>
              ) : null}
              {result.popular.length > 0 ? (
                <section className="mb-10">
                  <h2 className="mb-4 text-[20px] font-semibold text-[#171717]">Popular Apps</h2>
                  <AppGrid apps={result.popular} />
                </section>
              ) : null}
              {result.pageItems.length > 0 ? <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[20px] font-semibold text-[#171717]">All Apps</h2>
                  <div className="flex gap-2 text-[13px]">
                    <Link href={appsHref({ ...query, sort: "name", page: 1 })} className={query.sort === "name" ? "font-semibold text-[#0866F5]" : "text-[#777773]"}>Name</Link>
                    <Link href={appsHref({ ...query, sort: "provider", page: 1 })} className={query.sort === "provider" ? "font-semibold text-[#0866F5]" : "text-[#777773]"}>Provider</Link>
                  </div>
                </div>
                <AppGrid apps={result.pageItems} />
                <div className="mt-6 flex items-center justify-between text-[14px]">
                  {result.page > 1 ? <Link href={appsHref({ ...query, page: result.page - 1 })} className="font-semibold text-[#0866F5]">Previous</Link> : <span />}
                  <span className="text-[#777773]">Page {result.page} of {result.pageCount}</span>
                  {result.page < result.pageCount ? <Link href={appsHref({ ...query, page: result.page + 1 })} className="font-semibold text-[#0866F5]">Next</Link> : <span />}
                </div>
              </section> : null}
            </>
          )}
          <p className="mt-8 text-[12px] text-[#A3A3A0]">Get Started opens each app&apos;s own website.</p>
        </div>
      </div>
    </div>
  );
}
