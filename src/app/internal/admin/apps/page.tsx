import { AppWindow } from "lucide-react";
import { requireAdmin } from "@/modules/auth";
import { DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";
import { listClickTotals, listDirectoryOverrides, listRecentClicks } from "@/modules/apps-directory/dal";
import { APP_CATEGORIES } from "@/modules/apps-directory/types";
import AdminEmpty from "../_components/admin-empty";
import { formatDate, plural } from "../_components/format";
import AdminPageHeader from "../_components/page-header";
import { adminApps, appName, clickWords } from "./_components/admin-apps";
import { AppsAdmin } from "./_components/apps-admin";

export const metadata = { title: "AI apps" };

export default async function AdminAppsPage() {
  await requireAdmin({ next: "/internal/admin/apps" });
  const [overrides, clicks, totals] = await Promise.all([listDirectoryOverrides(), listRecentClicks(), listClickTotals()]);
  const apps = adminApps(DIRECTORY_CATALOG, overrides.apps);

  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <AdminPageHeader
        title="AI apps"
        subtitle="The apps on /apps. Saving an app here replaces its built-in values. Leave the affiliate link empty unless a partnership is approved."
      />
      {overrides.unavailable && (
        <p className="rounded-md bg-primary-tint px-4 py-3 text-[length:calc(14px*var(--px,1))] text-foreground">
          The directory tables are not in this database yet (migration 072). The public page still uses the built-in list.
        </p>
      )}
      <AppsAdmin apps={apps} categoryHint={APP_CATEGORIES.map((category) => category.id).join(", ")} />

      {totals.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[length:calc(16px*var(--px,1))] font-semibold">Clicks in the last 30 days</h2>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card text-[length:calc(13px*var(--px,1))]">
            {totals.map((t) => (
              <li key={t.slug} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2">
                <span className="font-medium">{appName(apps, t.slug)}</span>
                <span className="text-muted-foreground">
                  {plural(t.views, "page view", "page views")}, {plural(t.visits, "website visit", "website visits")},{" "}
                  {plural(t.reviews, "review visit", "review visits")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[length:calc(16px*var(--px,1))] font-semibold">Recent clicks</h2>
        {clicks.unavailable || clicks.clicks.length === 0 ? (
          <AdminEmpty icon={AppWindow} title="No clicks yet">Clicks on the /apps pages show here.</AdminEmpty>
        ) : (
          <ul className="flex flex-col gap-1 text-[length:calc(13px*var(--px,1))]">
            {clicks.clicks.map((click) => (
              <li key={`${click.slug}-${click.createdAt}`} className="break-words">
                <span className="text-muted-foreground">{formatDate(click.createdAt, true)}</span>{" "}
                <span className="font-medium">{appName(apps, click.slug)}</span>: {clickWords(click.source, click.destination)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
