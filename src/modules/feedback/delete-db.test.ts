import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { deleteFeatureRequest } from "./dal";
import { deleteLead } from "./leads/dal";

// Admin Delete for leads and feature requests (owner, 2026-11-16) against the local database.
const service = createServiceClient();
const users: string[] = [];
afterAll(async () => {
  for (const id of users) await service.auth.admin.deleteUser(id);
});

describe("deleting from the admin", () => {
  it("removes a lead for good, and says when it was already gone", async () => {
    const { data: lead } = await service
      .from("contact_submissions")
      .insert({ name: "Delete Test", email: `vitest-delete-${randomUUID()}@example.test`, message: "Please remove me" })
      .select("id")
      .single()
      .throwOnError();
    expect(await deleteLead(lead.id)).toEqual({ ok: true, found: true });
    expect((await service.from("contact_submissions").select("id").eq("id", lead.id)).data).toEqual([]);
    expect(await deleteLead(lead.id)).toEqual({ ok: true, found: false });
  });

  it("removes a feature request for good, and says when it was already gone", async () => {
    const { data: user } = await service.auth.admin.createUser({ email: `vitest-delete-${randomUUID()}@example.test`, email_confirm: true });
    users.push(user.user!.id);
    const { data: request } = await service
      .from("feature_requests")
      .insert({ user_id: user.user!.id, title: "Delete me", description: "A test request" })
      .select("id")
      .single()
      .throwOnError();
    expect(await deleteFeatureRequest(request.id)).toEqual({ ok: true, found: true });
    expect((await service.from("feature_requests").select("id").eq("id", request.id)).data).toEqual([]);
    expect(await deleteFeatureRequest(request.id)).toEqual({ ok: true, found: false });
  });
});
