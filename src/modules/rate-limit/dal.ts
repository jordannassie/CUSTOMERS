import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { windowStart, type RateLimitStore } from "./service";

/** Counts in the shared rate_limit_hits table (migration 039), so every server instance sees the same count. */
export function databaseStore(): RateLimitStore {
  return {
    async hit(key, windowMs, now) {
      const { data, error } = await createServiceClient().rpc("rate_limit_hit", {
        p_key: key,
        p_window_start: new Date(windowStart(now, windowMs)).toISOString(),
      });
      if (error) throw new Error(`rate_limit_hit failed: ${error.message}`);
      return data;
    },
  };
}
