import { categoryLabel, isCategoryId, type AppSort, type DirectoryApp } from "./types";

export const PAGE_SIZE = 12;

export type DirectoryQuery = {
  q: string;
  category: string;
  sort: AppSort;
  page: number;
};

export type DirectoryResult = {
  featured: DirectoryApp[];
  popular: DirectoryApp[];
  pageItems: DirectoryApp[];
  total: number;
  page: number;
  pageCount: number;
};

export function appsHref(query: { q?: string; category?: string; sort?: AppSort; page?: number }): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category && query.category !== "all") params.set("category", query.category);
  if (query.sort && query.sort !== "name") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return search ? `/apps?${search}` : "/apps";
}

export function mergeCatalog(base: DirectoryApp[], overrides: DirectoryApp[]): DirectoryApp[] {
  const bySlug = new Map(base.map((app) => [app.slug, app]));
  for (const row of overrides) {
    if (!row.active) {
      bySlug.delete(row.slug);
      continue;
    }
    bySlug.set(row.slug, row);
  }
  return [...bySlug.values()];
}

export function queryDirectory(apps: DirectoryApp[], query: DirectoryQuery): DirectoryResult {
  const needle = query.q.trim().toLowerCase();
  let list = apps.filter((app) => app.active);
  if (isCategoryId(query.category)) {
    const category = query.category;
    list = list.filter((app) => app.categories.includes(category));
  }
  if (needle) {
    list = list.filter((app) => {
      const haystack = [
        app.name,
        app.provider,
        app.description,
        ...app.categories.map(categoryLabel),
      ].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }
  list.sort((a, b) => {
    const left = query.sort === "provider" ? a.provider : a.name;
    const right = query.sort === "provider" ? b.provider : b.name;
    return left.localeCompare(right);
  });
  const featured = list.filter((app) => app.featured);
  const popular = list.filter((app) => app.popular && !app.featured);
  const rest = list.filter((app) => !app.featured && !app.popular);
  const pageCount = Math.max(1, Math.ceil(rest.length / PAGE_SIZE) || 1);
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  return {
    featured,
    popular,
    pageItems: rest.slice(start, start + PAGE_SIZE),
    total: list.length,
    page,
    pageCount,
  };
}
