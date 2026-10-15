import { requireAdmin } from "@/lib/admin/require";
import { DIRECTORY_CATALOG } from "@/modules/apps-directory/catalog";
import { listDirectoryOverrides, listRecentClicks } from "@/modules/apps-directory/dal";
import { mergeCatalog } from "@/modules/apps-directory/service";
import { APP_CATEGORIES } from "@/modules/apps-directory/types";
import { AppsAdminForm } from "./AppsAdminForm";

export const metadata = { title: "AI apps | Admin", robots: { index: false } };

export default async function AdminAppsPage() {
  await requireAdmin();
  const overrides = await listDirectoryOverrides();
  const clicks = await listRecentClicks();
  const apps = mergeCatalog(DIRECTORY_CATALOG, overrides.apps).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-4xl p-6 sm:p-8">
      <h1 className="text-[24px] font-bold text-[#111827]">AI apps directory</h1>
      <p className="mt-2 text-[14px] text-[#6B7280]">
        Saving an app stores it in directory_apps and overrides the built-in catalog for that slug. Leave affiliate URL empty unless a partnership is approved.
      </p>
      {overrides.unavailable ? (
        <p className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[14px] text-[#92400E]">
          The directory tables are not available yet. Apply migration 025. The public page still uses the built-in catalog.
        </p>
      ) : null}
      <AppsAdminForm categoryHint={APP_CATEGORIES.map((category) => category.id).join(", ")} />
      <ul className="mt-8 flex flex-col gap-2">
        {apps.map((app) => (
          <li key={app.slug} className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[14px] text-[#111827]">
            <span className="font-semibold">{app.name}</span>
            <span className="text-[#6B7280]"> · {app.slug} · {app.categories.join(", ")}</span>
            {app.affiliateUrl ? <span className="text-[#0866F5]"> · affiliate</span> : null}
          </li>
        ))}
      </ul>
      <h2 className="mt-10 text-[18px] font-semibold text-[#111827]">Recent clicks</h2>
      {clicks.unavailable || clicks.clicks.length === 0 ? (
        <p className="mt-2 text-[14px] text-[#6B7280]">No clicks stored yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1 text-[13px] text-[#374151]">
          {clicks.clicks.map((click) => (
            <li key={`${click.slug}-${click.createdAt}`}>{click.createdAt.slice(0, 16).replace("T", " ")} · {click.slug} · {click.source} · {click.destination}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
