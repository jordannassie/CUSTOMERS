import { describe, expect, it } from "vitest";
import type { ScanStatus } from "@/modules/jobs";
import { CREDITS_WAIT_MS, FIRST_SCAN_FAILED, creditsWaitNext, firstScanCopy, firstScanPhase, firstScanProblem } from "./first-scan";

const status = (s: Partial<ScanStatus>): ScanStatus => ({
  scanning: false,
  retrying: false,
  stalled: false,
  lastResult: null,
  lastFinishedAt: null,
  blockedReason: null,
  ...s,
});

describe("firstScanPhase", () => {
  it("starts a scan when there has never been one", () => {
    expect(firstScanPhase(status({}))).toBe("start");
  });

  it("keeps waiting while a scan is queued or running, even after an earlier failure", () => {
    expect(firstScanPhase(status({ scanning: true }))).toBe("scanning");
    expect(firstScanPhase(status({ scanning: true, lastResult: "failed" }))).toBe("scanning");
  });

  it("opens the dashboard once a scan finished", () => {
    expect(firstScanPhase(status({ lastResult: "done", lastFinishedAt: "2026-09-28T10:00:00Z" }))).toBe("done");
  });

  it("offers a retry after a failed scan, never an empty dashboard (REL-05)", () => {
    expect(firstScanPhase(status({ lastResult: "failed" }))).toBe("failed");
  });

  it("offers a retry when the scan cannot start, with the reason", () => {
    const blocked = status({ blockedReason: "You're out of credits. Buy a top-up or upgrade." });
    expect(firstScanPhase(blocked)).toBe("failed");
    expect(firstScanProblem(blocked)).toBe("You're out of credits. Buy a top-up or upgrade.");
  });

  it("explains a failed scan when no reason is known", () => {
    expect(firstScanProblem(status({ lastResult: "failed" }))).toBe(FIRST_SCAN_FAILED);
  });
});

describe("waiting for the trial credits (F-48)", () => {
  const outOfCredits = status({ blockedReason: "You're out of credits. Buy a top-up or upgrade." });

  it("waits instead of showing out of credits while the trial credits are on their way", () => {
    expect(firstScanPhase(outOfCredits, true)).toBe("credits");
    expect(firstScanPhase(status({}), true)).toBe("credits");
  });

  it("is unchanged when the credits are already there", () => {
    expect(firstScanPhase(status({}), false)).toBe("start");
    expect(firstScanPhase(outOfCredits, false)).toBe("failed");
  });

  it("never hides a scan that is running or done", () => {
    expect(firstScanPhase(status({ scanning: true }), true)).toBe("scanning");
    expect(firstScanPhase(status({ lastResult: "done" }), true)).toBe("done");
  });

  it("starts the scan once the credits land", () => {
    expect(creditsWaitNext(false, 4_000)).toBe("start");
    expect(creditsWaitNext(false, CREDITS_WAIT_MS + 1)).toBe("start");
  });

  it("keeps checking until the limit, also after a dropped check", () => {
    expect(creditsWaitNext(true, 2_000)).toBe("wait");
    expect(creditsWaitNext(null, 2_000)).toBe("wait");
  });

  it("gives up with a clear message when the credits never arrive", () => {
    expect(creditsWaitNext(true, CREDITS_WAIT_MS)).toBe("late");
    expect(creditsWaitNext(null, CREDITS_WAIT_MS)).toBe("late");
  });
});

describe("firstScanCopy", () => {
  const facts = { business: "Bean House", models: ["ChatGPT", "Claude", "Perplexity"], asked: "12 questions" };

  it("says a scan is running while it runs", () => {
    expect(firstScanCopy("scanning", facts)).toEqual({
      heading: "Running your first scan",
      intro: "We're asking ChatGPT, Claude and Perplexity 12 questions your customers ask, and looking for Bean House in every answer.",
    });
  });

  it("stops claiming the scan is running once it has stalled", () => {
    const copy = firstScanCopy("stalled", facts);
    expect(copy.heading).toBe("Your first scan is taking longer than usual");
    expect(copy.intro).toBe("Bean House is in line to be checked by ChatGPT, Claude and Perplexity.");
    expect(copy.intro).not.toMatch(/asking/);
  });

  it("keeps the credits, failed and done wording", () => {
    expect(firstScanCopy("credits-late", facts).heading).toBe("Your trial credits aren't in yet");
    expect(firstScanCopy("credits", facts).heading).toBe("Getting your first scan ready");
    expect(firstScanCopy("failed", facts).intro).toBe("We couldn't finish checking Bean House.");
    expect(firstScanCopy("done", { ...facts, models: ["ChatGPT"] }).intro).toMatch(/^We asked ChatGPT 12 questions/);
  });

  it("asks before a scan that costs more than the balance, without claiming it runs (D-54)", () => {
    const copy = firstScanCopy("confirm", facts);
    expect(copy).toEqual({
      heading: "Your first scan needs more credits than you have",
      intro: "We're ready to check Bean House with ChatGPT, Claude and Perplexity.",
    });
    expect(copy.intro).not.toMatch(/asking/);
  });
});
