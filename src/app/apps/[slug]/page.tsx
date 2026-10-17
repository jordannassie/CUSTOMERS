import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { AppCard } from "@/components/site/apps/AppCard";
import { AppRating } from "@/components/site/apps/AppRating";
import { ReviewList } from "@/components/site/apps/ReviewList";
import { DIRECTORY_CATALOG, logoUrl } from "@/modules/apps-directory/catalog";
import { listDirectoryOverrides, recordAppClick } from "@/modules/apps-directory/dal";
import { utmFromReferer } from "@/modules/apps-directory/schema";
import { mergeCatalog, relatedApps } from "@/modules/apps-directory/service";
import { categoryLabel } from "@/modules/apps-directory/types";
import { currentReviewer, findOwnReview, listNativeSummaries, listPublishedReviews } from "@/modules/apps-directory/review-dal";
import { softwareReviewJsonLd } from "@/modules/apps-directory/review-service";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim().slice(0, 80) ?? "";
  return trimmed || null;
}

async function loadApp(slug: string) {
  const overrides = await listDirectoryOverrides();
  const apps = mergeCatalog(DIRECTORY_CATALOG, overrides.apps).filter((item) => item.active);
  return { app: apps.find((item) => item.slug === slug), apps };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const { app } = await loadApp(slug);
  if (!app) return { title: "App not found" };
  const summary = await listPublishedReviews(app.slug, null);
  const title = `${app.name} by ${app.provider}`;
  const description = summary.summary.count > 0
    ? `${app.description} ${summary.summary.count} Customers.Direct reviews.`
    : app.description;
  const canonical = `https://customers.direct/apps/${app.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: `${title} | Customers.Direct`, description, url: canonical },
  };
}

export default async function AppDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug } = await params;
  const raw = await searchParams;
  const { app, apps } = await loadApp(slug);
  if (!app) notFound();
  const reviewer = await currentReviewer();
  const published = await listPublishedReviews(app.slug, reviewer?.userId ?? null);
  const own = reviewer ? await findOwnReview(reviewer.userId, app.slug) : null;
  const ratings = await listNativeSummaries();
  const requestHeaders = await headers();
  const fromReferer = utmFromReferer(requestHeaders.get("referer"));
  await recordAppClick({
    slug: app.slug,
    source: "detail",
    kind: "view",
    utmSource: first(raw.utm_source) ?? fromReferer.utmSource,
    utmMedium: first(raw.utm_medium) ?? fromReferer.utmMedium,
    utmCampaign: first(raw.utm_campaign) ?? fromReferer.utmCampaign,
  });
  const related = relatedApps(apps, app);
  const structured = softwareReviewJsonLd({
    name: app.name,
    description: app.description,
    slug: app.slug,
    provider: app.provider,
    summary: published.summary,
    reviews: published.reviews,
  });

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#FAFAF8]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />
        <article className="mx-auto max-w-[880px] px-4 pb-16 pt-28 sm:pt-32">
          <Link href="/apps" className="text-[13px] font-semibold text-[#0866F5]">All apps</Link>
          <div className="mt-4 rounded-2xl border border-[#E5E5E1] bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl(app.websiteUrl)} alt="" width={64} height={64} className="h-16 w-16 rounded-2xl border border-[#E5E5E1] bg-white object-contain p-2" />
              <div>
                <h1 className="text-[28px] font-bold tracking-tight text-[#171717]">{app.name}</h1>
                <p className="mt-1 text-[14px] text-[#777773]">{app.provider}</p>
                <AppRating app={app} source="detail" native={published.summary} showEmpty />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href={`/apps/go/${app.slug}/detail`} className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0866F5] px-4 text-[14px] font-semibold text-white hover:bg-[#0757D4]">Get Started <span aria-hidden="true" className="ml-1">→</span></a>
              <Link href={`/apps/${app.slug}/review`} className="inline-flex h-10 items-center justify-center rounded-xl border border-[#0866F5] px-4 text-[14px] font-semibold text-[#0866F5]">Write a Review</Link>
            </div>
            {own && own.status !== "published" ? <p className="mt-3 text-[13px] text-[#777773]">Your review is {own.status}. It is not part of the public rating yet.</p> : null}
          </div>

          <nav className="mt-6 flex flex-wrap gap-4 text-[13px] font-semibold text-[#0866F5]" aria-label="App sections">
            <a href="#overview">Overview</a>
            <a href="#reviews">Reviews</a>
            <a href="#pricing">Pricing</a>
            <a href="#alternatives">Alternatives</a>
          </nav>

          <section id="overview" className="mt-6 scroll-mt-28">
            <h2 className="text-[18px] font-semibold text-[#171717]">Overview</h2>
            <p className="mt-2 text-[16px] leading-relaxed text-[#171717]">{app.description}</p>
            <p className="mt-3 text-[13px] font-medium text-[#0866F5]">{app.categories.map(categoryLabel).join(" · ")}</p>
          </section>

          <section id="reviews" className="mt-8 scroll-mt-28">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-semibold text-[#171717]">Reviews</h2>
              <Link href={`/apps/${app.slug}/review`} className="text-[13px] font-semibold text-[#0866F5]">Write a Review</Link>
            </div>
            <p className="mb-3 text-[13px] text-[#777773]">
              {published.summary.count > 0 ? `${published.summary.count} published Customers.Direct reviews.` : "Not yet rated on Customers.Direct."}
            </p>
            {raw.reported ? <p className="mb-3 text-[13px] text-[#777773]">Thanks. A moderator will look at that report.</p> : null}
            <ReviewList slug={app.slug} reviews={published.reviews} signedIn={Boolean(reviewer)} />
          </section>

          <section id="pricing" className="mt-8 scroll-mt-28">
            <h2 className="text-[18px] font-semibold text-[#171717]">Pricing</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#777773]">Pricing is set by {app.provider}. Customers.Direct does not list a price for this app. Get Started opens the provider site.</p>
          </section>

          <section id="alternatives" className="mt-8 scroll-mt-28">
            <h2 className="text-[18px] font-semibold text-[#171717]">Alternatives</h2>
            {related.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {related.map((item) => <AppCard key={item.slug} app={item} source="detail" native={ratings[item.slug]} />)}
              </div>
            ) : <p className="mt-2 text-[14px] text-[#777773]">No related apps are listed yet.</p>}
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
