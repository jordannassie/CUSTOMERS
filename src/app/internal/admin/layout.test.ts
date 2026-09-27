import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// The admin layout guard (BUG-020), run against the local database with a real signed-in user.
let current: SupabaseClient<Database>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current }));
const adminEnv = vi.hoisted(() => ({ emails: "" }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return {
    env: new Proxy(env, { get: (target, key) => (key === "ADMIN_EMAILS" ? adminEnv.emails : Reflect.get(target, key)) }),
  };
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("./_components/admin-nav", () => ({ default: () => null }));

const { default: AdminLayout, instant } = await import("./layout");

const service = createServiceClient();
const password = `pw-${randomUUID()}`;
const email = `vitest-admin-layout-${randomUUID()}@example.test`;
let userId: string;

function anonClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

beforeAll(async () => {
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userId = data.user.id;
});

afterAll(async () => {
  if (userId) await service.auth.admin.deleteUser(userId);
});

describe("admin layout guard (B-64)", () => {
  it("sends a signed-out visitor to login and back", async () => {
    current = anonClient();
    await expect(AdminLayout({ children: null })).rejects.toThrow("REDIRECT /login?next=%2Finternal%2Fadmin");
  });

  it("sends a signed-in non-admin to their dashboard", async () => {
    current = anonClient();
    const { error } = await current.auth.signInWithPassword({ email, password });
    if (error) throw error;
    adminEnv.emails = "someone-else@example.test";
    await expect(AdminLayout({ children: null })).rejects.toThrow("REDIRECT /dashboard");
  });

  it("lets an admin in", async () => {
    adminEnv.emails = email;
    await expect(AdminLayout({ children: null })).resolves.toBeTruthy();
  });

  it("every admin page checks requireAdmin itself", () => {
    const root = join(process.cwd(), "src/app/internal/admin");
    const pages = readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith("page.tsx"));
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) {
      expect(readFileSync(join(root, page), "utf8"), page).toMatch(/requireAdmin\(/);
    }
  });

  // BUG-020: behind Suspense the redirect streamed mid-response and looped instead of redirecting.
  it("checks access before anything streams", () => {
    expect(instant).toBe(false);
    expect(readFileSync(join(process.cwd(), "src/app/internal/admin/layout.tsx"), "utf8")).not.toMatch(/<Suspense/);
  });

  // BUG-019: a page awaiting data with no boundary of its own logs "uncached data" on every visit.
  it("every admin page has its own loading boundary or its own Suspense", () => {
    const root = join(process.cwd(), "src/app/internal/admin");
    const pages = readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith("page.tsx"));
    for (const page of pages) {
      const ownBoundary = existsSync(join(root, dirname(page), "loading.tsx"));
      expect(ownBoundary || readFileSync(join(root, page), "utf8").includes("<Suspense"), page).toBe(true);
    }
  });
});
