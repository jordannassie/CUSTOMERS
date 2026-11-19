/**
 * Like Promise.all over `items`, with at most `limit` of `fn` running at once; results keep the items' order. Google
 * Places refused (429) when a page asked about you and every competitor in one burst (owner, 2026-11-17).
 */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return results;
}
