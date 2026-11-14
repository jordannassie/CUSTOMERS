// The one "likely reason" sentence the Overview, the report and the weekly email show, so all three say the same
// thing (audit, 2026-10-28). Pure.
import type { PickedInstead } from "./picked";
import { whySentence } from "./why/service";

/** "A likely reason: …" for the competitor that matters most; null when there is none to give. */
export function likelyReason(picked: PickedInstead | null | "none-tracked"): string | null {
  return picked && typeof picked === "object" ? whySentence(picked.why) : null;
}
