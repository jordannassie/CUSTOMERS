import { AppWindow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/modules/auth";
import { DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";
import { listDirectoryOverrides, listRecentClicks } from "@/modules/apps-directory/dal";
import { mergeCatalog } from "@/modules/apps-directory/service";
import { APP_CATEGORIES } from "@/modules/apps-directory/types";
import AdminEmpty from "../_components/admin-empty";
import { formatDate } from "../_components/format";
import AdminPageHeader from "../_components/page-header";
import { AppsAdminForm } from "./AppsAdminForm";

export const metadata = { title: "AI apps" };

export default async function AdminAppsPage() {
  await requireAdmin({ next: "/internal/admin/apps" });
  const [overrides, clicks] = await Promise.all([listDirectoryOverrides(), listRecentClicks()]);
  const apps = mergeCatalog(DIRECTORY_CATALOG, overrides.apps).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="AI apps directory"
        subtitle="Saving an app overrides the built-in list for that slug on /apps. Leave the affiliate link empty unless a partnership is approved."
      />
      {overrides.unavailable && (
        <p className="rounded-md border border-border bg-mid-bg px-4 py-3 text-[14px] text-mid-text">
          The directory tables are not in this database yet (migration 072). The public page still uses the built-in list.
        </p>
      )}
      <AppsAdminForm categoryHint={APP_CATEGORIES.map((category) => category.id).join(", ")} />

      <section className="flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold">Apps ({apps.length})</h2>
        <ul className="flex flex-col gap-2">
          {apps.map((app) => (
            <li key={app.slug} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-card px-4 py-3 text-[14px]">
              <span className="font-medium">{app.name}</span>
              <span className="text-muted-foreground">{app.slug}, {app.categories.join(", ")}</span>
              {app.affiliateUrl && <Badge variant="tint">Affiliate</Badge>}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold">Recent clicks</h2>
        {clicks.unavailable || clicks.clicks.length === 0 ? (
          <AdminEmpty icon={AppWindow} title="No clicks yet">Clicks on the /apps pages show here.</AdminEmpty>
        ) : (
          <ul className="flex flex-col gap-1 text-[13px]">
            {clicks.clicks.map((click) => (
              <li key={`${click.slug}-${click.createdAt}`} className="break-words">
                <span className="text-muted-foreground">{formatDate(click.createdAt, true)}</span> {click.slug}, {click.source}, {click.destination}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
