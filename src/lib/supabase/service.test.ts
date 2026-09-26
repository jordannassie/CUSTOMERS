import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "./service";

// Runs against the local database that `npm test` rebuilds from supabase/migrations.
describe("local test database", () => {
  const service = createServiceClient();
  const email = `vitest-${randomUUID()}@example.test`;
  let userId: string | undefined;

  afterAll(async () => {
    if (userId) await service.auth.admin.deleteUser(userId);
  });

  it("is local, never the shared database", () => {
    expect(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname).toBe("127.0.0.1");
  });

  it("creates a profile when a user signs up", async () => {
    const { data, error } = await service.auth.admin.createUser({ email, email_confirm: true });
    expect(error).toBeNull();
    userId = data.user?.id;

    const { data: profile } = await service.from("profiles").select("id").eq("id", userId!).single();
    expect(profile?.id).toBe(userId);
  });

  it("hides profiles from visitors who are not signed in", async () => {
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data, error } = await anon.from("profiles").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
