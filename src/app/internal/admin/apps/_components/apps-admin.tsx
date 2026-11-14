"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeDirectoryAppAction } from "@/modules/apps-directory/actions";
import { categoryLabel } from "@/modules/apps-directory/types";
import ConfirmDialog from "../../_components/confirm-dialog";
import { AppsAdminForm } from "../AppsAdminForm";
import { ORIGIN_LABELS, appFlags, type AdminApp } from "./admin-apps";

/** The form over the list: picking a row fills the form with that app, ready to change. */
export function AppsAdmin({ apps, categoryHint }: { apps: AdminApp[]; categoryHint: string }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [removing, startRemove] = useTransition();
  const app = apps.find((a) => a.slug === slug) ?? null;

  function pickApp(next: AdminApp) {
    setSlug(next.slug);
    document.getElementById("app-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function remove(target: AdminApp) {
    startRemove(async () => {
      const result = await removeDirectoryAppAction(target.slug);
      if (result.error) toast.error(result.error);
      else toast.success(target.origin === "added" ? `${target.name} was removed.` : `${target.name} is back to its built-in values.`);
      if (!result.error && target.origin === "added") setSlug(null);
    });
  }

  return (
    <>
      <div id="app-form" className="flex scroll-mt-16 flex-col gap-2">
        {/* A new key per app and origin, so the fields start again with that app's values. */}
        <AppsAdminForm key={app ? `${app.slug}:${app.origin}` : "new"} app={app} categoryHint={categoryHint} onNew={() => setSlug(null)} />
        {app && app.origin !== "built-in" && (
          <div className="flex flex-wrap items-center gap-3 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
            <span>
              {app.origin === "changed"
                ? "This app was changed here. Removing the change brings back the built-in values."
                : "This app was added here. Removing it takes it off /apps."}
            </span>
            <Button type="button" variant="outline" size="sm" disabled={removing} onClick={() => setConfirming(true)}>
              {app.origin === "changed" ? "Remove change" : "Remove app"}
            </Button>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-[length:calc(16px*var(--px,1))] font-semibold">Apps ({apps.length})</h2>
        <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">Pick an app to change it.</p>
        <ul className="flex flex-col gap-1.5">
          {apps.map((row) => (
            <li key={row.slug}>
              <button
                type="button"
                onClick={() => pickApp(row)}
                aria-pressed={row.slug === slug}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-md border border-border bg-card px-4 py-2.5 text-left text-[length:calc(14px*var(--px,1))] transition-colors duration-150 ease-out hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  row.slug === slug && "border-primary bg-primary-tint hover:bg-primary-tint",
                )}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  <code className="rounded-sm bg-muted px-1.5 text-[length:calc(12px*var(--px,1))] text-muted-foreground">{row.slug}</code>
                  <Badge variant={row.origin === "built-in" ? "secondary" : "tint"}>{ORIGIN_LABELS[row.origin]}</Badge>
                  {appFlags(row).map((flag) => (
                    <Badge key={flag} variant={flag === "Hidden" ? "mid" : "outline"}>{flag}</Badge>
                  ))}
                  {row.affiliateUrl && <Badge variant="tint">Affiliate</Badge>}
                </span>
                <span className="text-[length:calc(13px*var(--px,1))] text-muted-foreground sm:text-right">
                  {row.categories.map(categoryLabel).join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {app && (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={app.origin === "changed" ? `Remove the change to ${app.name}?` : `Remove ${app.name}?`}
          message={
            app.origin === "changed"
              ? "The built-in name, links, categories and flags show on /apps again."
              : "It is no longer listed on /apps. You can add it again later."
          }
          confirmLabel={app.origin === "changed" ? "Remove change" : "Remove app"}
          onConfirm={() => remove(app)}
        />
      )}
    </>
  );
}
