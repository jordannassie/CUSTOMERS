import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";
import { databaseStore } from "./dal";
import { createLimiter, LIMITS, rateLimitKey, windowStart } from "./service";

// SEC-07: the shared store against this worktree's local database.
const service = createServiceClient();
const store = databaseStore();
const HOUR = LIMITS.compare.windowMs;
const testIp = () => `198.18.${randomInt(256)}.${randomInt(256)}`;

describe("shared rate limit store", () => {
  it("counts parallel hits on one key without losing any", async () => {
    const key = rateLimitKey("compare", testIp());
    const now = Date.now();
    const counts = await Promise.all(Array.from({ length: 25 }, () => store.hit(key, HOUR, now)));
    expect(counts.sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));

    const { data } = await service.from("rate_limit_hits").select("count").eq("key", key).single();
    expect(data?.count).toBe(25);
  });

  it("starts a new count in the next window", async () => {
    const key = rateLimitKey("contact", testIp());
    const now = windowStart(Date.now(), HOUR) + HOUR - 1;
    expect(await store.hit(key, HOUR, now)).toBe(1);
    expect(await store.hit(key, HOUR, now)).toBe(2);
    expect(await store.hit(key, HOUR, now + 1)).toBe(1);
  });

  it("blocks the hit over the limit across limiter instances, as separate servers would", async () => {
    const ip = testIp();
    const [serverA, serverB] = [createLimiter(databaseStore()), createLimiter(databaseStore())];
    const now = Date.now();
    const results = await Promise.all(
      Array.from({ length: LIMITS.compare.max + 2 }, (_, i) => (i % 2 ? serverA : serverB)("compare", ip, now)),
    );
    expect(results.filter(Boolean)).toHaveLength(LIMITS.compare.max);
  });

  it("stores a hash, never the raw IP", async () => {
    const ip = testIp();
    await createLimiter(store)("contact", ip);
    const { data } = await service.from("rate_limit_hits").select("key").like("key", "contact:%");
    const keys = (data ?? []).map((row) => row.key);
    expect(keys).toContain(rateLimitKey("contact", ip));
    expect(keys.some((key) => key.includes(ip))).toBe(false);
  });

  it("is closed to signed-out visitors", async () => {
    const anon = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data } = await anon.from("rate_limit_hits").select("key");
    expect(data ?? []).toEqual([]);
    const { error } = await anon.rpc("rate_limit_hit", { p_key: "x", p_window_start: new Date().toISOString() });
    expect(error).not.toBeNull();
  });
});
