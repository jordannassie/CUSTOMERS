// The Actions board's own changes on top of the server's list. A move or an assign shows at once (an override) and
// the server's list always wins after that: router.refresh() (fixes saved, "Add action", "Show Google numbers")
// brings a new list, and every settled override is dropped for it, while one still being saved stays on top. Pure.
import type { ActionItem } from "@/modules/opportunities/board/service";

export type Patch = Partial<Pick<ActionItem, "status" | "completedAt" | "assignedToYou">>;

/** `settledOn`: null while the save runs, then the server list shown when it finished. */
export type Override = { id: string; patch: Patch; settledOn: readonly ActionItem[] | null };
export type Overrides = Readonly<Record<string, Override>>;

/** One key per item and kind of change, so a move and an assign on one card do not undo each other. */
export const overrideKey = (kind: "move" | "assign", id: string) => `${kind}:${id}`;

/** An override counts while it is being saved, and after that only until the server sends a newer list. */
const live = (o: Override, items: readonly ActionItem[]) => o.settledOn === null || o.settledOn === items;

export function withOverrides(items: readonly ActionItem[], overrides: Overrides): ActionItem[] {
  const patches = new Map<string, Patch>();
  for (const o of Object.values(overrides)) {
    if (live(o, items)) patches.set(o.id, { ...patches.get(o.id), ...o.patch });
  }
  if (patches.size === 0) return items as ActionItem[];
  return items.map((i) => (patches.has(i.id) ? { ...i, ...patches.get(i.id) } : i));
}

export function startOverride(all: Overrides, key: string, id: string, patch: Patch): Overrides {
  return { ...all, [key]: { id, patch, settledOn: null } };
}

/** Saved: keep showing it on the list shown now, until the server's next list (which has it) arrives. */
export function settleOverride(all: Overrides, key: string, items: readonly ActionItem[]): Overrides {
  const o = all[key];
  return o ? { ...all, [key]: { ...o, settledOn: items } } : all;
}

/** Not saved: drop it, so the card shows what the server has. */
export function dropOverride(all: Overrides, key: string): Overrides {
  if (!(key in all)) return all;
  const rest = { ...all };
  delete rest[key];
  return rest;
}

/** Settled overrides the server has moved past; dropped so the map does not grow. */
export function pruneOverrides(all: Overrides, items: readonly ActionItem[]): Overrides {
  const kept = Object.entries(all).filter(([, o]) => live(o, items));
  return kept.length === Object.keys(all).length ? all : Object.fromEntries(kept);
}
