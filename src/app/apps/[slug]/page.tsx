import { Suspense } from "react";
import { PublicPageSkeleton } from "@/components/site/PublicPageSkeleton";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import { AppCard } from "@/components/site/apps/AppCard";
import { AppRating } from "@/components/site/apps/AppRating";
import { ReviewList } from "@/components/site/apps/ReviewList";
import { DIRECTORY_CATALOG, logoUrl } from "@/modules/apps-directory/catalog";
import { listDirectoryOverrides, recordAppClick } from "@/modules/apps-directory/dal";
import { utmFromReferer } from "@/modules/apps-directory/schema";
import { mergeCatalog, relatedApps } from "@/modules/apps-directory/service";
import { categoryLabel } from "@/modules/apps-directory/types";
import { currentReviewer, findOwnReview, listNativeSummaries, listPublishedReviews } from "@/modules/apps-directory/reviews/dal";
import { softwareReviewJsonLd } from "@/modules/apps-directory/review-service";
import { NewsletterSignup } from "@/components/site/NewsletterSignup";
import { env } from "@/lib/env";

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

async function AppDetailPageContent({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
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
      <Header />
      <main className="min-h-screen bg-[#FAFAF8]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />
        <article className="mx-auto max-w-[880px] px-4 pb-12 pt-2 sm:pt-3">
          <Link href="/apps" className="text-[13px] font-semibold text-[#0866F5]">All apps</Link>
          <section id="overview" className="mt-3 scroll-mt-28 rounded-2xl border border-[#E5E5E1] bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-2xl border border-[#E5E5E1] bg-white p-2.5 sm:h-[120px] sm:w-[120px] sm:p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl(app.websiteUrl, 256)} alt="" width={120} height={120} className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#171717] sm:text-[32px]">{app.name}</h1>
                {app.provider !== app.name ? <p className="mt-1 text-[14px] text-[#777773]">{app.provider}</p> : null}
                <p className="mt-1.5 text-[13px] font-semibold text-[#0866F5]">{app.categories.map(categoryLabel).join(" · ")}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#171717]">{app.description}</p>
                <AppRating app={app} source="detail" native={published.summary} showEmpty />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a href={`/apps/go/${app.slug}/detail`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0866F5] px-5 text-[15px] font-semibold text-white hover:bg-[#0757D4]">Get Started <span aria-hidden="true" className="ml-1">→</span></a>
              <Link href={`/apps/${app.slug}/review`} className="inline-flex h-11 items-center justify-center rounded-xl border border-[#0866F5] bg-white px-5 text-[15px] font-semibold text-[#0866F5]">Write a Review</Link>
            </div>
            {own && own.status !== "published" ? <p className="mt-3 text-[13px] text-[#777773]">Your review is {own.status}. It is not part of the public rating yet.</p> : null}
          </section>

          <nav className="mt-4 flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="App sections">
            {["Overview", "Reviews", "Pricing", "Alternatives"].map((label) => (
              <a key={label} href={`#${label.toLowerCase()}`} className="shrink-0 rounded-full border border-[#E5E5E1] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#171717] hover:border-[#0866F5]">{label}</a>
            ))}
          </nav>

          <section id="reviews" className="mt-4 scroll-mt-28 rounded-2xl border border-[#E5E5E1] bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[20px] font-bold text-[#171717]">Reviews</h2>
              <Link href={`/apps/${app.slug}/review`} className="text-[13px] font-semibold text-[#0866F5]">Write a Review</Link>
            </div>
            {published.summary.count > 0 ? <p className="mb-3 text-[13px] text-[#777773]">{published.summary.count} published Customers.Direct reviews.</p> : null}
            {raw.reported ? <p className="mb-3 text-[13px] text-[#777773]">Thanks. A moderator will look at that report.</p> : null}
            <ReviewList slug={app.slug} reviews={published.reviews} signedIn={Boolean(reviewer)} />
          </section>

          <section id="pricing" className="mt-4 scroll-mt-28 rounded-2xl border border-[#E5E5E1] bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-[20px] font-bold text-[#171717]">Pricing</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#777773]">Pricing is set by {app.provider}. Customers.Direct does not list a price for this app. Get Started opens the provider site.</p>
          </section>

          <section id="alternatives" className="mt-4 scroll-mt-28">
            <h2 className="text-[20px] font-bold text-[#171717]">Alternatives</h2>
            {related.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {related.map((item) => <AppCard key={item.slug} app={item} source="detail" native={ratings[item.slug]} />)}
              </div>
            ) : <p className="mt-2 text-[14px] text-[#777773]">No related apps are listed yet.</p>}
          </section>
          <NewsletterSignup placement="detail" variant="detail" embedSrc={env.NEXT_PUBLIC_BEEHIIV_EMBED_SRC} formId={env.NEXT_PUBLIC_BEEHIIV_FORM_ID} embed />
        </article>
      </main>
      <Footer />
    </>
  );
}


// Reads the request (search params, the signed-in user), so it streams inside Suspense (Cache Components).
export default function AppDetailPage(props: { params: Params; searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PublicPageSkeleton />}>
      <AppDetailPageContent {...props} />
    </Suspense>
  );
}
