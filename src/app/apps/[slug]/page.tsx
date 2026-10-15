import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { AppCard } from "@/components/site/apps/AppCard";
import { AppRating } from "@/components/site/apps/AppRating";
import { DIRECTORY_CATALOG, logoUrl } from "@/modules/apps-directory/catalog";
import { listDirectoryOverrides, recordAppClick } from "@/modules/apps-directory/dal";
import { isAllowedReviewUrl, utmFromReferer } from "@/modules/apps-directory/schema";
import { mergeCatalog, relatedApps } from "@/modules/apps-directory/service";
import { categoryLabel } from "@/modules/apps-directory/types";
import { headers } from "next/headers";

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
  const app = apps.find((item) => item.slug === slug);
  return { app, apps };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const { app } = await loadApp(slug);
  if (!app) return { title: "App not found" };
  const title = `${app.name} by ${app.provider}`;
  const description = app.description;
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

  const requestHeaders = await headers();
  const fromReferer = utmFromReferer(requestHeaders.get("referer"));
  const utm = {
    utmSource: first(raw.utm_source) ?? fromReferer.utmSource,
    utmMedium: first(raw.utm_medium) ?? fromReferer.utmMedium,
    utmCampaign: first(raw.utm_campaign) ?? fromReferer.utmCampaign,
  };
  await recordAppClick({
    slug: app.slug,
    source: "detail",
    kind: "view",
    utmSource: utm.utmSource,
    utmMedium: utm.utmMedium,
    utmCampaign: utm.utmCampaign,
  });

  const related = relatedApps(apps, app);
  const reviews = isAllowedReviewUrl(app.reviewUrl);
  const structured = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.description,
    url: `https://customers.direct/apps/${app.slug}`,
    applicationCategory: "BusinessApplication",
    provider: { "@type": "Organization", name: app.provider },
  };

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
                <AppRating app={app} source="detail" link={false} />
              </div>
            </div>
            <p className="mt-5 text-[16px] leading-relaxed text-[#171717]">{app.description}</p>
            <p className="mt-3 text-[13px] font-medium text-[#0866F5]">{app.categories.map(categoryLabel).join(" · ")}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href={`/apps/go/${app.slug}/detail`} className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0866F5] px-4 text-[14px] font-semibold text-white hover:bg-[#0757D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] focus-visible:ring-offset-2">
                Get Started <span aria-hidden="true" className="ml-1">→</span>
              </a>
              {reviews ? (
                <a href={`/apps/go/${app.slug}/review/detail`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center text-[14px] font-semibold text-[#0866F5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5]">
                  Read Reviews <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </div>
          </div>
          {related.length > 0 ? (
            <section className="mt-10">
              <h2 className="mb-3 text-[18px] font-semibold text-[#171717]">Related apps</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {related.map((item) => (
                  <AppCard key={item.slug} app={item} source="detail" />
                ))}
              </div>
            </section>
          ) : null}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
