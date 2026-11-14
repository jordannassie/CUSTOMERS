// A tracked branch whose score is its chain's (MVP_SPEC 5.5): AI answers named "Bennu Coffee", not "Bennu Coffee on
// Congress". The row is named by the branch you track, the location you compete with (the user, 2026-10-30: no
// "(all locations)"); sentences about what AI said still use the chain's name (namedAs). Pure.

/** The chain behind a row, and the tracked names it stands for. */
export type ChainOf = { brand: string; tracked: string[] };

type Named = { name: string; chain?: ChainOf | null };

const key = (name: string) => name.trim().toLowerCase();

/**
 * The branch you track for a chain row ("Domino's Pizza | Chaklala-III"), else the tracked name. When two tracked
 * branches share a row it is the one whose score, website and Compare link the row shows (mergeChains keeps it).
 */
export function rowName(row: Named): string {
  if (!row.chain || row.chain.tracked.includes(row.name)) return row.name;
  return row.chain.tracked[0] ?? row.chain.brand;
}

/** The name a sentence uses: the chain AI named ("Bennu Coffee"), else the tracked name. */
export function namedAs(row: Named): string {
  return row.chain?.brand ?? row.name;
}

/**
 * "Also counts Bennu Coffee on 5th" when you track two branches of one chain and they share a row (the row is named by
 * the one it shows); null otherwise, since the row's name is already the branch you track.
 */
export function trackedNote(row: Named): string | null {
  const name = rowName(row);
  const others = row.chain?.tracked.filter((t) => t !== name) ?? [];
  if (others.length === 0) return null;
  const list = others.length > 1 ? `${others.slice(0, -1).join(", ")} and ${others.at(-1)}` : others[0];
  return `Also counts ${list}`;
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
