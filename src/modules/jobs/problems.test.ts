import { describe, expect, it } from "vitest";
import { REASONS } from "@/modules/entitlements";
import { scanProblem, type ProblemJob } from "./problems";

const now = new Date("2026-11-17T12:00:00Z");
const job = (j: Partial<ProblemJob>): ProblemJob => ({
  id: "j1",
  business_id: "b1",
  status: "failed",
  finished_at: "2026-11-17T10:00:00Z",
  error: "Every check failed: openai: 500 {}",
  run_after: "2026-11-17T09:59:00Z",
  locked_at: "2026-11-17T09:59:30Z",
  ...j,
});

describe("scan alerts for the app's bell (owner, 2026-11-17)", () => {
  it("says a failed scan plainly, never the stored developer text", () => {
    const p = scanProblem(job({}), now)!;
    expect(p).toMatchObject({ businessId: "b1", jobId: "j1", at: "2026-11-17T10:00:00Z" });
    expect(p.reason).not.toMatch(/openai|500|\{/);
  });

  it("keeps a skip for the business itself, in the words the customer sees", () => {
    expect(scanProblem(job({ status: "skipped", error: REASONS.noQuestions }), now)?.reason).toBe(REASONS.noQuestions);
  });

  it("leaves out skips for the whole account: the account alert already says it", () => {
    for (const error of [REASONS.trialOver, REASONS.pastDue, REASONS.outOfCredits, REASONS.paused, "This scan needs 9 credits and you have 2. Buy a top-up or upgrade."]) {
      expect(scanProblem(job({ status: "skipped", error }), now)).toBeNull();
    }
  });

  it("has nothing to say about a scan that ran or is running", () => {
    expect(scanProblem(job({ status: "done", error: null }), now)).toBeNull();
    expect(scanProblem(job({ status: "running", locked_at: "2026-11-17T11:59:00Z", finished_at: null }), now)).toBeNull();
  });
});
