import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBalance } from "@/modules/credits";
import { CHECKS_AT_ONCE, runScan } from "./service";
import { CLAUDE_OUTAGE_MINUTES, type ClaudeOutage, type OutageReason, type OutageStore } from "./claude-outage/outage";
import { ProviderError } from "./providers/request";
import type { ProviderId, RunCheck } from "./providers/types";
import {
  answeringRunner,
  blockAiHosts,
  createScanAgency,
  createScanBusiness,
  deleteScanUsers,
  extractNames,
  newJob,
  service,
} from "./service.test-helpers";

// Claude out of service (claude-outage/outage.ts): after a rejected key or an empty account, scans leave Claude out for
// a while, hold and charge nothing for it, and try it once when the window is over. Local database, mocked providers,
// and the outage kept in memory, so these tests never open the shared admin alert other scan tests read.
afterAll(deleteScanUsers);

let aiAttempts: string[];
beforeEach(() => {
  aiAttempts = blockAiHosts();
});
afterEach(() => {
  vi.restoreAllMocks();
  expect(aiAttempts).toEqual([]);
});

const NOW = new Date();
const balance = async (agencyId: string) => (await getBalance(agencyId)).balance;

function memoryStore(outage: ClaudeOutage | null = null) {
  const state = { outage };
  const store = {
    read: vi.fn(async () => state.outage),
    mark: vi.fn(async (reason: OutageReason) => {
      state.outage = { since: state.outage?.since ?? NOW, lastSeenAt: NOW, reason };
    }),
    clear: vi.fn(async () => {
      state.outage = null;
    }),
  } satisfies OutageStore;
  return { store, state };
}

const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);
const openOutage = (lastSeenMinutesAgo: number): ClaudeOutage => ({
  since: minutesAgo(lastSeenMinutesAgo + 60),
  lastSeenAt: minutesAgo(lastSeenMinutesAgo),
  reason: "auth",
});

function claudeFails(status: number, message: string, kind: "client" | "rate_limit" = "client") {
  return vi.fn<RunCheck>(async () => {
    throw new ProviderError({ provider: "anthropic", kind, status, attempts: 1, message });
  });
}

function deps(anthropic: RunCheck, store: OutageStore) {
  const all: Record<ProviderId, RunCheck> = { openai: answeringRunner("openai"), anthropic, perplexity: answeringRunner("perplexity") };
  return { checkRunner: (p: ProviderId) => all[p], extractNames, claudeOutage: store, now: () => NOW };
}

async function scan(anthropic: RunCheck, store: OutageStore) {
  const agency = await createScanAgency();
  const business = await createScanBusiness(agency);
  const jobId = await newJob(business);
  const outcome = await runScan(jobId, deps(anthropic, store));
  if (outcome.status === "skipped") throw new Error(`unexpected skip: ${outcome.reason}`);
  return { outcome, agencyId: agency.agencyId, jobId };
}

async function heldFor(jobId: string) {
  const { data } = await service.from("credit_holds").select("amount").eq("scan_job_id", jobId).single();
  return data!.amount;
}

async function runFailures(runId: string) {
  const { data } = await service.from("visibility_runs").select("failed_by_provider").eq("id", runId).single();
  return data!.failed_by_provider as Record<string, { failed: number; skipped?: number }>;
}

const INVALID_KEY = 'anthropic returned 401: 401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}';
const NO_CREDIT = "anthropic returned 400: Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing.";

describe("runScan when Claude is out of service", () => {
  it("marks Claude unavailable on an invalid key and skips the Claude checks not yet started", async () => {
    const { store } = memoryStore();
    const claude = claudeFails(401, INVALID_KEY);
    const { outcome } = await scan(claude, store);

    expect(store.mark).toHaveBeenCalledTimes(1);
    expect(store.mark).toHaveBeenCalledWith("auth", INVALID_KEY);
    // Only the checks already running when the first one failed reached Claude.
    expect(claude.mock.calls.length).toBeLessThanOrEqual(CHECKS_AT_ONCE);
    expect(outcome.skipped).toBe(12 - claude.mock.calls.length);
    expect(outcome).toMatchObject({ status: "done", checks: 36, failed: claude.mock.calls.length, charged: 24 });
    expect((await runFailures(outcome.runId)).anthropic).toMatchObject({ skipped: outcome.skipped });
  });

  it("marks Claude unavailable when the Anthropic account is out of credit", async () => {
    const { store } = memoryStore();
    await scan(claudeFails(400, NO_CREDIT), store);
    expect(store.mark).toHaveBeenCalledTimes(1);
    expect(store.mark.mock.calls[0][0]).toBe("credit");
  });

  it("does not mark Claude unavailable for a rate limit", async () => {
    const { store } = memoryStore();
    const claude = claudeFails(429, "anthropic returned 429: rate_limit_error", "rate_limit");
    const { outcome } = await scan(claude, store);

    expect(store.mark).not.toHaveBeenCalled();
    expect(claude).toHaveBeenCalledTimes(12);
    expect(outcome).toMatchObject({ failed: 12, skipped: 0, charged: 24 });
  });

  it("holds and charges nothing for Claude while it is unavailable", async () => {
    const { store } = memoryStore(openOutage(5));
    const claude = answeringRunner("anthropic");
    const { outcome, agencyId, jobId } = await scan(claude, store);

    expect(claude).not.toHaveBeenCalled();
    expect(await heldFor(jobId)).toBe(24);
    expect(outcome).toMatchObject({ status: "done", checks: 24, failed: 0, charged: 24, released: 0, skipped: 12 });
    expect(await balance(agencyId)).toBe(76);
    expect((await runFailures(outcome.runId)).anthropic).toMatchObject({ failed: 0, skipped: 12 });
    // Skipped checks are not provider errors: nothing new is logged for them.
    expect(store.mark).not.toHaveBeenCalled();
  });

  it("tries Claude again once the window has passed, and brings it back when it answers", async () => {
    const { store, state } = memoryStore(openOutage(CLAUDE_OUTAGE_MINUTES + 1));
    const claude = answeringRunner("anthropic");
    const { outcome } = await scan(claude, store);

    expect(store.clear).toHaveBeenCalledTimes(1);
    expect(state.outage).toBeNull();
    expect(claude).toHaveBeenCalledTimes(12);
    expect(outcome).toMatchObject({ status: "done", checks: 36, charged: 36, skipped: 0 });
  });

  it("asks Claude only once after the window when the key still fails", async () => {
    const { store } = memoryStore(openOutage(CLAUDE_OUTAGE_MINUTES + 1));
    const claude = claudeFails(401, INVALID_KEY);
    const { outcome } = await scan(claude, store);

    expect(claude).toHaveBeenCalledTimes(1);
    expect(store.mark).toHaveBeenCalledTimes(1);
    expect(store.clear).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ failed: 1, skipped: 11, charged: 24 });
  });
});
