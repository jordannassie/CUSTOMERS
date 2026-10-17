import { formatUsd } from "../format";

// What setup says about the bill before the owner finishes (BUG-071, D-57). Pure, so the client step can import it.

export type SetupAddOnCopy = { planName: string; priceCents: number; trialing: boolean; todayCents: number };

export function setupAddOnText(a: SetupAddOnCopy): string {
  const monthly = `${formatUsd(a.priceCents)} a month`;
  if (a.trialing) return `This business joins your ${a.planName} plan. It's free during your trial, then ${monthly}.`;
  const today =
    a.todayCents > 0 ? `Finishing setup charges ${formatUsd(a.todayCents)} today for the rest of this billing period.` : "Nothing is charged today.";
  return `This business joins your ${a.planName} plan for ${monthly}. ${today}`;
}
