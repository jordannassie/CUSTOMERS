"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, RotateCw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import type { ScanStatus } from "@/modules/jobs";
import {
  CREDITS_LATE,
  FIRST_SCAN_FAILED,
  creditsWaitNext,
  firstScanPhase,
  firstScanProblem,
  type FirstScanPhase,
} from "@/modules/onboarding/first-scan";

type ScanAction = (input: unknown) => Promise<ActionResult<ScanStatus>>;
type CreditsCheck = () => Promise<ActionResult<{ waiting: boolean }>>;

const POLL_MS = 2000;
const DOT: Record<string, string> = { openai: "bg-chatgpt", anthropic: "bg-claude", perplexity: "bg-perplexity" };
const NO_CONNECTION = "We couldn't start the scan. Check your connection and try again.";

type Props = {
  businessId: string;
  businessName: string;
  models: { id: string; label: string }[];
  questions: number;
  initial: ScanStatus | null;
  /** The subscription is linked but invoice.paid has not granted the trial credits yet (F-48). */
  awaitingCredits: boolean;
  start: ScanAction;
  getStatus: ScanAction;
  checkCredits: CreditsCheck;
};

function initialPhase(initial: ScanStatus | null, awaitingCredits: boolean): FirstScanPhase {
  if (initial) return firstScanPhase(initial, awaitingCredits);
  return awaitingCredits ? "credits" : "start";
}

// MVP_SPEC 3.1 step 9 (B-38): start the first scan, wait for it, then open the dashboard. A failed scan
// offers a retry here instead of an empty dashboard (REL-05).
export function FirstScan(props: Props) {
  const { businessId, businessName, models, questions, initial, awaitingCredits, start, getStatus, checkCredits } = props;
  const [phase, setPhase] = useState<FirstScanPhase>(() => initialPhase(initial, awaitingCredits));
  const [problem, setProblem] = useState<string | null>(initial && phase === "failed" ? firstScanProblem(initial) : null);
  const [pending, startTransition] = useTransition();
  // Bumped after each poll that changes nothing, so the next one is scheduled.
  const [polls, setPolls] = useState(0);
  const [retrying, setRetrying] = useState(initial?.retrying ?? false);
  const started = useRef(false);
  const creditsSince = useRef<number | null>(null);

  function fail(message: string) {
    setProblem(message);
    setPhase("failed");
  }

  function run() {
    setProblem(null);
    setPhase("scanning");
    startTransition(async () => {
      const result = await start({ businessId }).catch(() => null);
      if (!result) return fail(NO_CONNECTION);
      // 409: a scan is already on its way (a second tab, or a double start), so just wait for it.
      if (!result.ok && result.status !== 409) return fail(result.error);
    });
  }

  function waitForCredits() {
    creditsSince.current = null;
    setProblem(null);
    setPhase("credits");
  }

  // F-48: poll until the webhook grants the trial credits, then start the scan as usual.
  useEffect(() => {
    if (phase !== "credits") return;
    creditsSince.current ??= Date.now();
    const since = creditsSince.current;
    const timer = setTimeout(async () => {
      const result = await checkCredits().catch(() => null);
      const next = creditsWaitNext(result?.ok ? result.data.waiting : null, Date.now() - since);
      if (next === "start") return setPhase("start");
      if (next === "wait") return setPolls((n) => n + 1);
      setProblem(CREDITS_LATE);
      setPhase("credits-late");
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [phase, polls, checkCredits]);

  // Runs once on arrival; the ref stops React's development double effect from starting two scans.
  useEffect(() => {
    if (phase !== "start" || started.current) return;
    started.current = true;
    run();
  });

  useEffect(() => {
    if (phase !== "scanning" || pending) return;
    const timer = setTimeout(async () => {
      const result = await getStatus({ businessId }).catch(() => null);
      // A dropped poll just tries again; the scan itself carries on.
      const next = result?.ok ? firstScanPhase(result.data) : "scanning";
      if (result?.ok) setRetrying(result.data.retrying);
      if (next === "scanning") return setPolls((n) => n + 1);
      if (next === "done") return setPhase("done");
      fail(next === "failed" && result?.ok ? firstScanProblem(result.data) : FIRST_SCAN_FAILED);
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [phase, pending, polls, businessId, getStatus]);

  useEffect(() => {
    // A full load, not router.replace: the app layout was rendered without the app frame during setup, and a
    // client navigation keeps that layout, leaving the dashboard blank.
    if (phase === "done") window.location.replace("/dashboard");
  }, [phase]);

  const creditsLate = phase === "credits-late";
  const failed = phase === "failed" || creditsLate;
  const waiting = phase === "credits" || creditsLate;
  const asked = questions > 0 ? `${questions} ${questions === 1 ? "question" : "questions"}` : "the questions";
  const names = listOf(models.map((m) => m.label));

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-tight">
          {creditsLate
            ? "Your trial credits aren't in yet"
            : failed
              ? "Your first scan didn't finish"
              : waiting
                ? "Getting your first scan ready"
                : phase === "done"
                  ? "Your first scan is done"
                  : "Running your first scan"}
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {waiting
            ? `We start checking ${businessName} as soon as your trial credits are in your account.`
            : failed
              ? `We couldn't finish checking ${businessName}.`
              : phase === "done"
                ? `We asked ${names} ${asked} your customers ask and looked for ${businessName} in every answer.`
                : `We're asking ${names} ${asked} your customers ask, and looking for ${businessName} in every answer.`}
        </p>
      </header>

      <ul className="rounded-md border border-border bg-surface" data-testid="first-scan-models">
        {models.map((model, i) => (
          <li key={model.id} className="flex flex-col gap-2.5 border-b border-border px-4 py-3.5 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span aria-hidden className={cn("size-2 rounded-full", DOT[model.id] ?? "bg-primary")} />
                {model.label}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {phase === "done" ? (
                  <Check aria-label="Done" className="size-4 text-good" />
                ) : waiting ? (
                  "Not started"
                ) : failed ? (
                  "Not finished"
                ) : (
                  questions > 0 ? `Asking ${asked}…` : "Asking…"
                )}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-xs bg-border" aria-hidden>
              {phase === "done" ? (
                <div className="h-full w-full bg-primary" />
              ) : failed || waiting ? null : (
                <div
                  className="h-full w-2/5 animate-scan-sweep bg-primary motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40"
                  style={{ animationDelay: `${i * 220}ms` }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      <div role="status" aria-live="polite" className="flex flex-col gap-4">
        {failed ? (
          <>
            <p className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text" data-testid="first-scan-problem">
              {problem}
            </p>
            <div>
              <Button onClick={creditsLate ? waitForCredits : run} disabled={pending} className="min-w-32">
                {pending ? <Loader2 aria-hidden className="animate-spin" /> : <RotateCw aria-hidden />}
                Try again
              </Button>
            </div>
          </>
        ) : waiting ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="first-scan-credits">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Adding your trial credits…
          </p>
        ) : phase === "done" ? (
          <p className="text-sm text-muted-foreground">Opening your dashboard…</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {retrying
              ? "The scan hit a problem, so we'll try again in a few minutes. You can leave this page. Your score shows on the dashboard when it's done."
              : "This usually takes about a minute. You can leave this page. The scan keeps going and your score shows on the dashboard."}
          </p>
        )}
      </div>
    </div>
  );
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "AI";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
