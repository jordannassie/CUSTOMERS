import "server-only";
// The live writer for the report's fix wording. liveAiClients reads the API keys, and the usage context makes its
// reporter write one usage_events row per call, charged to the business the report is for.
import { liveAiClients, type UsageContext } from "@/modules/ai/server";
import { createFixWordingWriter } from "./writer";
import type { FixWordingWriter } from "./word-fixes";

/** Null when no AI key is set. The caller checks REPORT_AI_WORDING and the test agency flag before calling this. */
export function liveFixWordingWriter(usage: UsageContext): FixWordingWriter | null {
  return createFixWordingWriter(liveAiClients(usage));
}
