import type { PillTone } from "@/components/checkin";
import type { ActionStatus } from "@/modules/opportunities/board/service";

/** Check-in status pills: Suggested on the brand wash, Done on the brand tint, In progress soft blue, Dismissed grey. */
export const STATUS_TONE: Record<ActionStatus, PillTone> = {
  suggested: "suggested",
  todo: "neutral",
  in_progress: "progress",
  done: "done",
  dismissed: "dismissed",
};
