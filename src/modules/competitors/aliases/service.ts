// Other names for tracked competitors (migration 055). Pure.

/** The same names, ignoring case, order and repeats. */
export function sameAliases(a: readonly string[], b: readonly string[]): boolean {
  const key = (list: readonly string[]) => [...new Set(list.map((n) => n.trim().toLowerCase()))].sort().join("\n");
  return key(a) === key(b);
}
