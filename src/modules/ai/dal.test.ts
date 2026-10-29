// The logging that keeps a Claude outage visible (D-84), against the local test database.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { runJob } from "./clients";
import { ALERT_AI_FALLBACK, ALERT_ANTHROPIC_CREDIT, liveReporter, type ClaudeOutageRow, type OutageHooks } from "./dal";
import { ANTHROPIC_CREDIT_ERROR, anthropicMessage, fakeAiClients, jsonResponse, openaiResponse, providerFetch } from "./fixtures";
import { z } from "zod";

const service = createServiceClient();
const userIds: string[] = [];
const task = `test_job_${randomUUID().slice(0, 8)}`;

async function makeUser(): Promise<string> {
  const { data, error } = await service.auth.admin.createUser({ email: `ai-${randomUUID()}@example.com`, password: randomUUID(), email_confirm: true });
  if (error) throw error;
  userIds.push(data.user.id);
  return data.user.id;
}

async function clearAlerts() {
  await service.from("system_alerts").delete().in("kind", [ALERT_ANTHROPIC_CREDIT, ALERT_AI_FALLBACK]);
}

afterAll(async () => {
  await clearAlerts();
  await service.from("provider_errors").delete().like("message", `${task}:%`);
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

// The shared Claude outage is kept in memory here: opening the real alert would make scan tests running at the same
// time leave Claude out (BUG-253).
function memoryOutage(initial: ClaudeOutageRow | null = null) {
  let open = initial;
  const hooks = {
    read: vi.fn(async () => open),
    mark: vi.fn(async (reason: NonNullable<ClaudeOutageRow["reason"]>) => {
      open = { since: new Date(), lastSeenAt: new Date(), reason };
    }),
    clear: vi.fn(async () => {
      open = null;
    }),
  } satisfies OutageHooks;
  return hooks;
}

describe("live AI reporter", () => {
  it("asks Claude again once the outage window has passed, and closes the outage when it answers", async () => {
    const longAgo = new Date(Date.now() - 31 * 60_000);
    const outage = memoryOutage({ since: longAgo, lastSeenAt: longAgo, reason: "auth" });
    const { fetch, calls } = providerFetch({ anthropic: [jsonResponse(anthropicMessage('{"ok":true}'))], openai: [jsonResponse(openaiResponse('{"ok":true}'))] });
    const ai = { ...fakeAiClients(fetch), report: liveReporter(undefined, outage) };
    const result = await runJob(ai, { task, model: "claude-haiku-4-5", system: "s", user: "u", schema: z.object({ ok: z.boolean() }), maxTokens: 50, timeoutMs: 5_000 });

    expect(result.provider).toBe("anthropic");
    expect(calls.anthropic).toHaveLength(1);
    expect(outage.clear).toHaveBeenCalledTimes(1);
  });

  it("logs Claude's credit failure, raises both alerts, and records usage of the backup with fellBack", async () => {
    await clearAlerts();
    const accountUserId = await makeUser();
    const { fetch } = providerFetch({ anthropic: [jsonResponse(ANTHROPIC_CREDIT_ERROR, 400)], openai: [jsonResponse(openaiResponse('{"ok":true}'))] });
    const outage = memoryOutage();
    const ai = { ...fakeAiClients(fetch), report: liveReporter({ accountUserId, businessId: null }, outage) };
    await runJob(ai, { task, model: "claude-haiku-4-5", system: "s", user: "u", schema: z.object({ ok: z.boolean() }), maxTokens: 50, timeoutMs: 5_000 });
    // An empty account fails every Claude call the same way: scans and other jobs skip Claude for a while.
    expect(outage.mark).toHaveBeenCalledWith("credit", expect.stringMatching(/credit 400/));

    const errors = await service.from("provider_errors").select("provider, message").like("message", `${task}:%`).throwOnError();
    expect(errors.data).toEqual([
      { provider: "anthropic", message: expect.stringMatching(/claude-haiku-4-5 credit 400: .*credit balance is too low.*\(used the ChatGPT backup\)$/) },
    ]);

    const alerts = await service.from("system_alerts").select("kind, severity, message").is("resolved_at", null).in("kind", [ALERT_ANTHROPIC_CREDIT, ALERT_AI_FALLBACK]).throwOnError();
    expect(alerts.data).toEqual(
      expect.arrayContaining([
        { kind: ALERT_ANTHROPIC_CREDIT, severity: "critical", message: expect.stringMatching(/^Anthropic out of credit\./) },
        { kind: ALERT_AI_FALLBACK, severity: "warning", message: "Claude unavailable, using ChatGPT backup." },
      ]),
    );

    const usage = await service.from("usage_events").select("provider, model, estimated_cost_usd, metadata").eq("account_user_id", accountUserId).throwOnError();
    expect(usage.data).toEqual([
      {
        provider: "openai",
        model: "gpt-4.1-mini-2025-04-14",
        estimated_cost_usd: 0.0006,
        metadata: { task, fellBack: true, primaryError: expect.stringMatching(/^anthropic claude-haiku-4-5 credit 400/) },
      },
    ]);
  });
});
