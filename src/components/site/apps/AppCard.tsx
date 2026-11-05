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
      className={`relative flex h-full flex-col rounded-xl border border-transparent bg-surface transition hover:-translate-y-0.5 hover:border-brand-tint-2 ${home ? "min-h-[204px] items-center p-3 text-center" : "p-3.5"}`}
    >
      <div className={`flex w-full ${home ? "relative justify-center" : "items-start justify-between gap-2"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl(app.websiteUrl)}
          alt=""
          width={56}
          height={56}
          className={`rounded-lg border border-border bg-surface object-contain ${home ? "h-14 w-14 p-2" : "h-12 w-12 p-1.5"}`}
        />
        {badge ? (
          <span className={`rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white ${home ? "absolute right-0 top-0" : ""}`}>
            Top Pick
          </span>
        ) : null}
      </div>
      <h3 className={`font-semibold text-foreground ${home ? "mt-2 line-clamp-1 text-[13px]" : "mt-2.5 text-[14px]"}`}>
        <Link href={`/apps/${app.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          {app.name}
        </Link>
      </h3>
      {home ? null : <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{app.provider}</p>}
      <p className={`line-clamp-2 text-muted-foreground ${home ? "mt-1 flex-1 text-[11.5px] leading-snug" : "mt-1.5 flex-1 text-[12.5px] leading-snug"}`}>{app.description}</p>
      <p className={`line-clamp-1 font-medium text-brand ${home ? "mt-1 w-full text-[10px]" : "mt-2 text-[11px]"}`}>
        {home ? categories[0] : categories.join(" · ")}
      </p>
      <AppRating app={app} source={source} compact={home} native={native} />
      <a
        href={`/apps/go/${app.slug}/${source}`}
        className={`relative z-10 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-brand font-semibold text-white transition hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${home ? "mt-2 h-8 text-[12px]" : "mt-3 h-9 text-[13px]"}`}
      >
        Get Started
        <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}
