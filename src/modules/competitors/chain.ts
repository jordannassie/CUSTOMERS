// A tracked branch whose score is its chain's (MVP_SPEC 5.5): AI answers named "Bennu Coffee", not "Bennu Coffee on
// Congress", so the row says so instead of giving the branch the chain's number. Pure.

/** The chain behind a row, and the tracked names it stands for. */
export type ChainOf = { brand: string; tracked: string[] };

type Named = { name: string; chain?: ChainOf | null };

const key = (name: string) => name.trim().toLowerCase();

/** "Bennu Coffee (all locations)" for a chain row, else the tracked name. */
export function rowName(row: Named): string {
  return row.chain ? `${row.chain.brand} (all locations)` : row.name;
}

/** The name a sentence uses: the chain AI named ("Bennu Coffee"), else the tracked name. */
export function namedAs(row: Named): string {
  return row.chain?.brand ?? row.name;
}

/** "You track Bennu Coffee on Congress" under a chain row; null for any other row. */
export function trackedNote(row: Named): string | null {
  if (!row.chain) return null;
  const names = row.chain.tracked;
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  return `You track ${list}`;
}

/**
 * One row per chain. Two tracked branches of Bennu Coffee, or a branch and "Bennu Coffee" itself, would otherwise
 * show the same answers twice as two competitors. Keeps the row compared over the whole window, then the higher
 * score, and lists every tracked name it stands for. Rows without a score are left as they are.
 */
export function mergeChains<T extends Named & { score: number | null; collecting: boolean }>(rows: T[]): T[] {
  const chains = new Set(rows.flatMap((r) => (r.chain && r.score !== null ? [key(r.chain.brand)] : [])));
  const kept = new Map<string, number>();
  const out: T[] = [];
  for (const row of rows) {
    const k = row.score === null ? null : row.chain ? key(row.chain.brand) : chains.has(key(row.name)) ? key(row.name) : null;
    if (k === null) {
      out.push(row);
      continue;
    }
    const at = kept.get(k);
    if (at === undefined) {
      kept.set(k, out.length);
      out.push({ ...row, chain: { brand: row.chain?.brand ?? row.name, tracked: [row.name] } });
      continue;
    }
    const current = out[at];
    const tracked = [...current.chain!.tracked, row.name];
    const better = current.collecting !== row.collecting ? !row.collecting : row.score! > current.score!;
    const base = better ? row : current;
    out[at] = { ...base, chain: { brand: current.chain!.brand, tracked } };
  }
  return out;
}
