import { expect, type Page } from "@playwright/test";

/**
 * Setup pre-ticks the 3 nearest suggestions when nothing is saved yet (2026-11-16, CompetitorPicker `preselect`). A
 * test that picks its own competitors checks those 3 are there, then removes them to start from none.
 */
export async function clearPreselected(page: Page) {
  const list = page.getByRole("list", { name: "Picked competitors" }).filter({ visible: true });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  const remove = list.getByRole("button", { name: /^Remove / });
  while ((await remove.count()) > 0) await remove.first().click();
  await expect(list.getByRole("listitem")).toHaveCount(0);
}
