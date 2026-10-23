"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { ExternalLink, Link2, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/opportunities/CopyButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/modules/auth";
import type { ShareLink } from "@/modules/reports";

type CreateAction = (input: unknown) => Promise<ActionResult<ShareLink>>;
type RevokeAction = (input: unknown) => Promise<ActionResult<null>>;

const noSubscribe = () => () => {};
const FAILED = "Something went wrong. Try again in a moment.";

/** Share (B-59): one read-only link per business that the agency can send to their client and turn off. */
export function ShareButton({
  businessId,
  initial,
  create,
  revoke,
}: {
  businessId: string;
  initial: ShareLink | null;
  create: CreateAction;
  revoke: RevokeAction;
}) {
  const [link, setLink] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [pending, startTransition] = useTransition();

  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const url = link ? `${origin}${link.path}` : "";

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
    <Dialog
      onOpenChange={() => {
        setError(null);
        setConfirmOff(false);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="share-button">
          <Share2 aria-hidden />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share this report</DialogTitle>
          <DialogDescription>
            Anyone with the link can see a read-only report with your agency&apos;s name and logo. They don&apos;t need
            to log in.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                value={url}
                aria-label="Share link"
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-[13px]"
                data-testid="share-url"
              />
              <CopyButton text={url} label="Copy link" copiedNote="Link copied" />
            </div>
            {confirmOff ? (
              <div
                role="group"
                aria-labelledby="revoke-warning"
                className="flex flex-col gap-3 rounded-md border border-low/30 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
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
                          setLink(null);
                          setConfirmOff(false);
                          toast.success("Link turned off. Anyone who opens it now sees that it is no longer active.");
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <a
                  href={link.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Open report
                  <ExternalLink aria-hidden className="size-3.5" />
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-low-text hover:bg-low-bg hover:text-low-text"
                  onClick={() => setConfirmOff(true)}
                  data-testid="revoke-link"
                >
                  Turn off link
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">There is no link for this report right now.</p>
            <Button disabled={pending} onClick={() => run(() => create({ businessId }), setLink)} data-testid="create-link">
              {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Link2 aria-hidden />}
              Create link
            </Button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-low-text">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
