import Link from "next/link";
import { AppRating } from "@/components/site/apps/AppRating";
import { logoUrl } from "@/modules/apps-directory/catalog";
import { categoryLabel, type AppSource, type DirectoryApp } from "@/modules/apps-directory/types";
import type { NativeSummary } from "@/modules/apps-directory/review-types";

export function AppCard({
  app,
  source,
  badge = false,
  layout = "directory",
  native,
}: {
  app: DirectoryApp;
  source: AppSource;
  badge?: boolean;
  layout?: "home" | "directory";
  native?: NativeSummary;
}) {
  const home = layout === "home";
  const categories = app.categories.map(categoryLabel);
  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-md ${home ? "min-h-[calc(204px*var(--px,1))] items-center p-3 text-center" : "p-3.5"}`}
    >
      <div className={`flex w-full ${home ? "relative justify-center" : "items-start justify-between gap-2"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl(app.websiteUrl)}
          alt=""
          width={56}
          height={56}
          className={`rounded-xl border border-border bg-white object-contain ${home ? "h-14 w-14 p-2" : "h-12 w-12 p-1.5"}`}
        />
        {badge ? (
          <span className={`rounded-full bg-[#0866F5] px-1.5 py-0.5 text-[length:calc(9px*var(--px,1))] font-semibold uppercase tracking-wide text-white ${home ? "absolute right-0 top-0" : ""}`}>
            Top pick
          </span>
        ) : null}
      </div>
      <h3 className={`font-semibold text-foreground ${home ? "mt-2 line-clamp-1 text-[length:calc(13px*var(--px,1))]" : "mt-2.5 text-[length:calc(14px*var(--px,1))]"}`}>
        <Link href={`/apps/${app.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5]">
          {app.name}
        </Link>
      </h3>
      {home ? null : <p className="mt-0.5 line-clamp-1 text-[length:calc(11px*var(--px,1))] text-text-hint">{app.provider}</p>}
      <p className={`line-clamp-2 text-muted-foreground ${home ? "mt-1 flex-1 text-[length:calc(11.5px*var(--px,1))] leading-snug" : "mt-1.5 flex-1 text-[length:calc(12.5px*var(--px,1))] leading-snug"}`}>{app.description}</p>
      <p className={`line-clamp-1 font-medium text-[#0866F5] ${home ? "mt-1 w-full text-[length:calc(10px*var(--px,1))]" : "mt-2 text-[length:calc(11px*var(--px,1))]"}`}>
        {home ? categories[0] : categories.join(" · ")}
      </p>
      <AppRating app={app} source={source} compact={home} native={native} />
      <a
        href={`/apps/go/${app.slug}/${source}`}
        className={`relative z-10 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[#0866F5] font-semibold text-white transition hover:bg-[#0757D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] focus-visible:ring-offset-2 ${home ? "mt-2 h-8 text-[length:calc(12px*var(--px,1))]" : "mt-3 h-9 text-[length:calc(13px*var(--px,1))]"}`}
      >
        Get started
        <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}
