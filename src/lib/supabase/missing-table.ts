// True when a query failed because its table does not exist yet (a migration not applied on this database): Postgres
// 42P01, PostgREST PGRST205, or an error that names one of the tables. Features merged before their migration ran
// (video ads, the apps directory, reviews, the newsletter) show "unavailable" instead of failing.
export function isMissingTable(error: { code?: string; message?: string } | null, tables: RegExp): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || tables.test(error.message ?? "");
}
