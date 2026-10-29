"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { ExternalLink, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/opportunities/CopyButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/modules/auth";
import type { ShareLink } from "@/modules/reports";

export type CreateAction = (input: unknown) => Promise<ActionResult<ShareLink>>;
export type RevokeAction = (input: unknown) => Promise<ActionResult<null>>;

const noSubscribe = () => () => {};
const FAILED = "Something went wrong. Try again in a moment.";

/**
 * The Reports page share panel: one link per report (the current one, or a saved one) that opens the report PDF,
 * never the dashboard, with Copy and Turn off (D-90).
 */
export function SharePanel({
  businessId,
  reportId,
  link,
  onLink,
  create,
  revoke,
}: {
  businessId: string;
  reportId: string | null;
  link: ShareLink | null;
  onLink: (link: ShareLink | null) => void;
  create: CreateAction;
  revoke: RevokeAction;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [pending, startTransition] = useTransition();
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const url = link ? `${origin}${link.path}` : "";
  const updates = reportId ? "It opens this saved report and never changes." : "It opens the latest report, which updates after each scan.";

  function run<T>(action: () => Promise<ActionResult<T>>, done: (data: T) => void) {
    setError(null);
    startTransition(async () => {
      const result = await action().catch(() => null);
      if (!result) return setError(FAILED);
      if (!result.ok) return setError(result.error);
      done(result.data);
    });
  }

  return (
    <section id="share-panel" aria-labelledby="share-panel-title" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5" data-testid="share-panel">
      <div className="flex flex-col gap-1">
        <h2 id="share-panel-title" className="text-base font-semibold tracking-[-0.02em]">
          {link ? "Share link is on" : "Share link is off"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {link
            ? `Anyone with the link can open the report PDF, not your dashboard. They don't need to log in. ${updates}`
            : "Create a link your client can open without logging in. It opens the report PDF only, never your dashboard."}
        </p>
      </div>

      {link ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              readOnly
              value={url}
              aria-label="Share link"
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-[13px]"
              data-testid="share-url"
            />
            <div className="flex shrink-0 gap-2">
              <CopyButton text={url} label="Copy" copiedNote="Link copied" />
              {!confirmOff && (
                <Button variant="ghost" size="sm" className="text-low-text hover:bg-low-bg hover:text-low-text" onClick={() => setConfirmOff(true)} data-testid="revoke-link">
                  Turn off
                </Button>
              )}
            </div>
          </div>
          {confirmOff ? (
            <div role="group" aria-labelledby="revoke-warning" className="flex flex-col gap-3 rounded-md border border-low/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p id="revoke-warning" className="text-sm text-low-text">
                Clients with this link will lose access.
              </p>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" disabled={pending} onClick={() => setConfirmOff(false)} autoFocus>
                  Keep it
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => revoke({ id: link.id }),
                      () => {
                        onLink(null);
                        setConfirmOff(false);
                        toast.success("Link turned off. Anyone who opens it now is told it is no longer available.");
                      },
                    )
                  }
                  data-testid="confirm-revoke"
                >
                  {pending && <Loader2 aria-hidden className="animate-spin" />}
                  Turn off link
                </Button>
              </div>
            </div>
          ) : (
            <a
              href={link.path}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open the shared PDF
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
        </>
      ) : (
        <Button className="w-fit" disabled={pending} onClick={() => run(() => create({ businessId, reportId }), onLink)} data-testid="create-link">
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Link2 aria-hidden />}
          Create link
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm text-low-text">
          {error}
        </p>
      )}
    </section>
  );
}
