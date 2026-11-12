import type { DirectoryApp } from "@/modules/apps-directory/types";

// The admin's view of the /apps directory (admin audit 2026-11-12): every app with where its values come from, so a
// row can be opened and edited without retyping it, and the click log reads in plain words.

/** built-in: the list in the code. changed: saved here over a built-in app. added: only saved here. */
export type AppOrigin = "built-in" | "changed" | "added";

export type AdminApp = Pick<
  DirectoryApp,
  "slug" | "name" | "provider" | "description" | "websiteUrl" | "affiliateUrl" | "categories" | "featured" | "popular" | "topPick" | "active"
> & { origin: AppOrigin };

function pick(app: DirectoryApp, origin: AppOrigin): AdminApp {
  const { slug, name, provider, description, websiteUrl, affiliateUrl, categories, featured, popular, topPick, active } = app;
  return { slug, name, provider, description, websiteUrl, affiliateUrl, categories, featured, popular, topPick, active, origin };
}

/** Every app, hidden ones included (unlike /apps), sorted by name. */
export function adminApps(catalog: DirectoryApp[], overrides: DirectoryApp[]): AdminApp[] {
  const saved = new Map(overrides.map((app) => [app.slug, app]));
  const rows = catalog.map((app) => (saved.has(app.slug) ? pick(saved.get(app.slug)!, "changed") : pick(app, "built-in")));
  const builtIn = new Set(catalog.map((app) => app.slug));
  for (const app of overrides) if (!builtIn.has(app.slug)) rows.push(pick(app, "added"));
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export const ORIGIN_LABELS: Record<AppOrigin, string> = {
  "built-in": "Built in",
  changed: "Changed here",
  added: "Added here",
};

/** The flags that are on, as the list shows them; "Hidden" when the app is off /apps. */
export function appFlags(app: Pick<AdminApp, "featured" | "popular" | "topPick" | "active">): string[] {
  return [
    ...(app.active ? [] : ["Hidden"]),
    ...(app.featured ? ["Featured"] : []),
    ...(app.popular ? ["Popular"] : []),
    ...(app.topPick ? ["Top pick"] : []),
  ];
}

const FROM: Record<string, string> = { homepage: "the home page", directory: "the apps list", detail: "its page" };

/** "Opened the website from the home page", for one row of the click log. */
export function clickWords(source: string, destination: string): string {
  const from = FROM[source] ?? "the site";
  if (destination === "view") return "Viewed its page";
  if (destination === "review") return `Opened its reviews from ${from}`;
  if (destination === "affiliate") return `Opened the partner link from ${from}`;
  return `Opened the website from ${from}`;
}

/** The app's name for a slug, or the slug when the app is gone. */
export function appName(apps: Pick<AdminApp, "slug" | "name">[], slug: string): string {
  return apps.find((app) => app.slug === slug)?.name ?? slug;
}
