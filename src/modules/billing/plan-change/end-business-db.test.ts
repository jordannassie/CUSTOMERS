import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";

// Deleting a business when Stripe has no plan to end for it: no webhook will cancel its business_subscriptions row,
// so endBusinessPlan does, or the account purge (which skips businesses with a row that is not canceled) never
// removes it. Against the local database; Stripe is a stub that has no such subscription.

const service = createServiceClient();
const userIds: string[] = [];
const missing = Object.assign(new Error("No such subscription"), { type: "StripeInvalidRequestError", code: "resource_missing", statusCode: 404 });

vi.mock("../account/access", () => ({
  billingAccess: async (data: { context: unknown }) => ({
    mode: "stripe",
    context: data.context,
    stripe: { retrieveSubscription: async () => Promise.reject(missing) },
  }),
}));
vi.spyOn(console, "warn").mockImplementation(() => {});

const { endBusinessPlan } = await import("./end-business");
const { cancelBusinessPlanRow } = await import("./dal");

async function seed(subscriptionId: string | null) {
  const { data, error } = await service.auth.admin.createUser({ email: `vitest-end-business-${randomUUID()}@example.test`, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  const { data: agency } = await service
    .from("agencies")
    .insert({ owner_user_id: data.user.id, name: "End business test", is_test: true, status: "active", stripe_subscription_id: subscriptionId })
    .select("id")
    .single()
    .throwOnError();
  const { data: business } = await service
    .from("businesses")
    .insert({ owner_user_id: data.user.id, agency_id: agency.id, name: "Acme Plumbing", status: "active" })
    .select("id")
    .single()
    .throwOnError();
  await service.from("business_subscriptions").insert({ agency_id: agency.id, business_id: business.id, plan_id: "starter", status: "active" }).throwOnError();
  return { agencyId: agency.id, businessId: business.id };
}

async function rowStatus(businessId: string) {
  const { data } = await service.from("business_subscriptions").select("status").eq("business_id", businessId).single().throwOnError();
  return data.status;
}

afterAll(async () => {
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

describe("endBusinessPlan with no Stripe plan to end", () => {
  it("cancels the business's row when the agency has no subscription", async () => {
    const s = await seed(null);
    expect(await endBusinessPlan(s.agencyId, s.businessId)).toEqual({ endsAt: null });
    expect(await rowStatus(s.businessId)).toBe("canceled");
  });

  it("cancels the business's row when Stripe has no such subscription", async () => {
    const s = await seed(`sub_test_${randomUUID()}`);
    expect(await endBusinessPlan(s.agencyId, s.businessId)).toEqual({ endsAt: null });
    expect(await rowStatus(s.businessId)).toBe("canceled");
  });

  it("only cancels a row of the agency it is given", async () => {
    const mine = await seed(null);
    const other = await seed(null);
    await cancelBusinessPlanRow(mine.agencyId, other.businessId);
    expect(await rowStatus(other.businessId)).toBe("active");
  });
});
