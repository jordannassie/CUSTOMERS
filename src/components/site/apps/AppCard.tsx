import { logoUrl } from "@/modules/apps-directory/catalog";
import { categoryLabel, type AppSource, type DirectoryApp } from "@/modules/apps-directory/types";

export function AppCard({ app, source, badge = false }: { app: DirectoryApp; source: AppSource; badge?: boolean }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#E5E5E1] bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl(app.websiteUrl)} alt="" width={44} height={44} className="h-11 w-11 rounded-xl border border-[#E5E5E1] bg-white object-contain p-1.5" />
        {badge ? (
          <span className="rounded-full bg-[#0866F5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Top Pick</span>
        ) : null}
      </div>
      <h3 className="text-[16px] font-semibold text-[#171717]">{app.name}</h3>
      <p className="mt-0.5 text-[12px] text-[#A3A3A0]">{app.provider}</p>
      <p className="mt-2 line-clamp-2 flex-1 text-[13.5px] leading-relaxed text-[#777773]">{app.description}</p>
      <p className="mt-3 text-[11px] font-medium text-[#0866F5]">{app.categories.map(categoryLabel).join(" · ")}</p>
      <a
        href={`/apps/go/${app.slug}/${source}`}
        className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0866F5] text-[13.5px] font-semibold text-white transition hover:bg-[#0757D4]"
      >
        Get Started
        <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}
