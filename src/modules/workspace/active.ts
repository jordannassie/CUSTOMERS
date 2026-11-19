// Which business the app opens on. Pure, so the frame and Settings pick the same one.

type Pickable = { id: string; status: string };

/**
 * The saved choice when it is still there; else the newest set-up business; a draft (status "onboarding") only when
 * there is nothing else. Deleting the active business clears the saved choice (migration 042), and falling back to
 * the newest row opened an unfinished draft, which dropped the app frame and sent the user back into setup.
 * `list` is newest first.
 */
export function pickActiveBusiness<T extends Pickable>(list: T[], wanted: string | null | undefined): T | null {
  const saved = wanted ? list.find((b) => b.id === wanted) : undefined;
  if (saved) return saved;
  return list.find((b) => b.status !== "onboarding") ?? list[0] ?? null;
}
