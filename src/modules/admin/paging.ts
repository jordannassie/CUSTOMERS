// Server-paged admin lists (admin audit 2026-11-12). A page number past the last page (an old link, or a list that
// shrank) made PostgREST answer "range not satisfiable" and the page show the error screen. This shows the last
// page instead.

type PageResult = { error: { code?: string; message?: string } | null; count: number | null };

/** PostgREST's answer to a range that starts past the last row. */
export function pastLastPage(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "PGRST103" || /range not satisfiable/i.test(error?.message ?? "");
}

/**
 * Runs `run(from, to)` for the page; past the end it runs page 1 to learn the count, then the last page. `run` must
 * build a fresh query each call (a query runs once). Returns the result and the page it is for.
 */
export async function readPage<R extends PageResult>(
  page: number,
  size: number,
  run: (from: number, to: number) => PromiseLike<R>,
): Promise<{ result: R; page: number }> {
  const result = await run((page - 1) * size, page * size - 1);
  if (page <= 1 || !pastLastPage(result.error)) return { result, page };
  const first = await run(0, size - 1);
  const last = Math.max(1, Math.ceil((first.count ?? 0) / size));
  if (first.error || last === 1) return { result: first, page: 1 };
  return { result: await run((last - 1) * size, last * size - 1), page: last };
}
