"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReadinessCheckResult } from "@/modules/readiness-check";
import { CheckForm } from "./CheckForm";
import { ResultView, ResultSkeleton } from "./ResultView";

async function requestCheck(myUrl: string, competitorUrl: string): Promise<ReadinessCheckResult> {
  const res = await fetch("/api/public/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ myUrl, competitorUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "The check did not finish. Try again.");
  return data as ReadinessCheckResult;
}

export function ReadinessCheck() {
  const router = useRouter();
  const params = useSearchParams();
  const initialMine = params.get("my") ?? "";
  const initialTheirs = params.get("them") ?? "";
  const autoRun = Boolean(initialMine && initialTheirs);

  const [loading, setLoading] = useState(autoRun);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReadinessCheckResult | null>(null);

  const latest = useRef(0);
  const autoRan = useRef(false);

  // Only the newest request may update the screen, so a slow earlier answer cannot overwrite it.
  function fetchResult(mine: string, theirs: string) {
    const id = ++latest.current;
    requestCheck(mine, theirs).then(
      (data) => {
        if (id !== latest.current) return;
        setResult(data);
        setLoading(false);
      },
      (err: unknown) => {
        if (id !== latest.current) return;
        setError(err instanceof Error ? err.message : "The check did not finish. Try again.");
        setLoading(false);
      },
    );
  }

  function run(mine: string, theirs: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    fetchResult(mine, theirs);
  }

  useEffect(() => {
    // Runs once for links from the homepage box (the ref also stops the dev double run using up the rate limit).
    if (!autoRun || autoRan.current) return;
    autoRan.current = true;
    fetchResult(initialMine, initialTheirs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(mine: string, theirs: string) {
    router.replace(`/compare?my=${encodeURIComponent(mine)}&them=${encodeURIComponent(theirs)}`, { scroll: false });
    run(mine, theirs);
  }

  return (
    <div className="flex flex-col gap-8">
      <CheckForm
        initialMine={initialMine}
        initialTheirs={initialTheirs}
        loading={loading}
        onSubmit={handleSubmit}
        serverError={error}
      />
      <div aria-live="polite" aria-busy={loading}>
        {loading && <ResultSkeleton />}
        {result && !loading && <ResultView result={result} />}
      </div>
    </div>
  );
}
