import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { AppsBrowse } from "@/components/site/apps/AppsBrowse";
import { DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";
import { listDirectoryOverrides } from "@/modules/apps-directory/dal";
import { directorySearchSchema } from "@/modules/apps-directory/schema";
import { mergeCatalog, queryDirectory } from "@/modules/apps-directory/service";
import { listNativeSummaries } from "@/modules/apps-directory/review-dal";
import { env } from "@/lib/env";

const TITLE = "AI Apps Directory";
const DESCRIPTION = "Search AI tools, apps, and software for marketing, sales, support, and everyday work.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://customers.direct/apps" },
  openGraph: {
    title: `${TITLE} | Customers.Direct`,
    description: DESCRIPTION,
    url: "https://customers.direct/apps",
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AppsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const parsed = directorySearchSchema.safeParse({
    q: first(raw.q),
    category: first(raw.category),
    sort: first(raw.sort),
    page: first(raw.page),
  });
  const query = parsed.success ? parsed.data : directorySearchSchema.parse({});
  const overrides = await listDirectoryOverrides();
  const apps = mergeCatalog(DIRECTORY_CATALOG, overrides.apps);
  const result = queryDirectory(apps, query);
  const ratings = await listNativeSummaries();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AI Apps Directory",
    itemListElement: [...result.featured, ...result.popular, ...result.pageItems].map((app, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: app.name,
      url: `https://customers.direct/apps/${app.slug}`,
      description: app.description,
    })),
  };

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#FAFAF8]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
        <AppsBrowse query={query} result={result} ratings={ratings} embedSrc={env.NEXT_PUBLIC_BEEHIIV_EMBED_SRC} />
      </main>
      <SiteFooter />
    </>
  );
}
