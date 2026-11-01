import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "./service";

// BUG-284, migration 087: each bucket's limits come from the migrations, and only the server (service role) can
// write, list or remove files. Visitors and signed-in users get no access through the storage API.
const service = createServiceClient();
const anon = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const png = new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" });
let userId = "";
let signedIn: SupabaseClient;
const paths: { bucket: string; path: string }[] = [];

beforeAll(async () => {
  const email = `vitest-storage-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userId = data.user.id;
  signedIn = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await signedIn.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
});

afterAll(async () => {
  for (const { bucket, path } of paths) await service.storage.from(bucket).remove([path]);
  if (userId) await service.auth.admin.deleteUser(userId);
});

describe("storage buckets (migration 087)", () => {
  it("sets each bucket's privacy, size and file types", async () => {
    const { data, error } = await service.storage.listBuckets();
    if (error) throw error;
    const byId = new Map(data.map((b) => [b.id, b]));
    expect(byId.get("business-logos")).toMatchObject({
      public: true,
      file_size_limit: 2097152,
      allowed_mime_types: ["image/png", "image/jpeg", "image/webp"],
    });
    expect(byId.get("reports")).toMatchObject({ public: false, file_size_limit: 10485760, allowed_mime_types: ["application/pdf"] });
  });

  it("refuses a logo of a type the bucket does not take, even from the server", async () => {
    const svg = new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"], { type: "image/svg+xml" });
    const { error } = await service.storage.from("business-logos").upload(`vitest/${randomUUID()}.svg`, svg);
    expect(error).not.toBeNull();
  });

  for (const bucket of ["business-logos", "reports"]) {
    it(`lets only the server write, list and remove in ${bucket}`, async () => {
      const file = bucket === "reports" ? new Blob(["%PDF-1.4\n%%EOF\n"], { type: "application/pdf" }) : png;
      const path = `vitest/${randomUUID()}.${bucket === "reports" ? "pdf" : "png"}`;
      const saved = await service.storage.from(bucket).upload(path, file);
      expect(saved.error).toBeNull();
      paths.push({ bucket, path });

      for (const client of [anon, signedIn]) {
        expect((await client.storage.from(bucket).upload(`vitest/${randomUUID()}.png`, png)).error).not.toBeNull();
        expect((await client.storage.from(bucket).list("vitest")).data ?? []).toEqual([]);
        // Remove answers without an error but must leave the file in place.
        await client.storage.from(bucket).remove([path]);
        expect((await service.storage.from(bucket).list("vitest", { search: path.slice(7) })).data).toHaveLength(1);
      }
    });
  }
});
