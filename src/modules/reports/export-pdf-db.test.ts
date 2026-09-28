import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// B-60 against the local database, with renderPdf mocked: no Browserless call and no Chrome.
vi.hoisted(() => vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.customers.test"));

const service = createServiceClient();
const userIds: string[] = [];
let session: SupabaseClient | null = null;
const renderPdf = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () =>
    session ??
    createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } }),
}));
vi.mock("./pdf", async (original) => ({ ...(await original<typeof import("./pdf")>()), renderPdf }));

const { createShareLink, exportPdf } = await import("./actions");

const FRIENDLY = "PDF could not be created. Try again, or use Print, Save as PDF.";

async function createOwner() {
  const email = `vitest-pdf-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "Northside Marketing", is_test: true, status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await service
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Sunrise Coffee Bar", status: "active" })
    .select("id")
    .single()
    .throwOnError();
  const client = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { businessId: business.id, client };
}

async function liveLinks(businessId: string) {
  const { data } = await service.from("report_shares").select("token").eq("business_id", businessId).is("revoked_at", null).throwOnError();
  return data;
}

beforeEach(() => {
  session = null;
  renderPdf.mockReset();
  renderPdf.mockResolvedValue(new TextEncoder().encode("%PDF-1.7 test"));
});
afterAll(async () => {
  for (const id of userIds.splice(0)) await service.auth.admin.deleteUser(id);
});

describe("exportPdf", () => {
  it("needs a session", async () => {
    expect(await exportPdf({ businessId: randomUUID() })).toMatchObject({ ok: false, status: 401 });
    expect(renderPdf).not.toHaveBeenCalled();
  });

  it("prints the business's share page and names the file after it", async () => {
    const owner = await createOwner();
    session = owner.client;
    const result = await exportPdf({ businessId: owner.businessId });
    if (!result.ok) throw new Error(result.error);

    expect(result.data.fileName).toMatch(/^sunrise-coffee-bar-ai-visibility-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(Buffer.from(result.data.base64, "base64").toString()).toBe("%PDF-1.7 test");
    expect(renderPdf).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/app\.customers\.test\/r\/[A-Za-z0-9_-]{43}$/), "Sunrise Coffee Bar");
    // The link made only for the PDF is off again, so no public link appears that the agency never shared.
    expect(await liveLinks(owner.businessId)).toEqual([]);
  });

  it("reuses the live share link and leaves it on", async () => {
    const owner = await createOwner();
    session = owner.client;
    const link = await createShareLink({ businessId: owner.businessId });
    if (!link.ok) throw new Error("create failed");
    expect(await exportPdf({ businessId: owner.businessId })).toMatchObject({ ok: true });
    expect(renderPdf).toHaveBeenCalledWith(`https://app.customers.test${link.data.path}`, "Sunrise Coffee Bar");
    expect(await liveLinks(owner.businessId)).toEqual([{ token: link.data.path.slice(3) }]);
  });

  it("refuses another agency's business and bad input", async () => {
    const [owner, other] = await Promise.all([createOwner(), createOwner()]);
    session = owner.client;
    expect(await exportPdf({ businessId: other.businessId })).toMatchObject({ ok: false, status: 404 });
    expect(await exportPdf({ businessId: "not-a-uuid" })).toMatchObject({ ok: false, status: 400 });
    expect(renderPdf).not.toHaveBeenCalled();
    expect(await liveLinks(other.businessId)).toEqual([]);
  });

  it("shows the friendly error when the render fails, and still turns the link off", async () => {
    const owner = await createOwner();
    session = owner.client;
    renderPdf.mockRejectedValue(new Error("timed out"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await exportPdf({ businessId: owner.businessId })).toEqual({ ok: false, status: 502, error: FRIENDLY });
    expect(await liveLinks(owner.businessId)).toEqual([]);
  });
});
