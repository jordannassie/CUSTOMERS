"use client";

import { useTransition } from "react";
import { ClipboardCopy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { EmailSnapshot, ShareLink } from "@/modules/reports";
import { reportEmailText } from "@/modules/reports/v2/email-text";
import type { CreateAction } from "./SharePanel";

const FAILED = "We couldn't copy the summary. Try again in a moment.";

/** The share link could not be made; its message is meant for the user, unlike the browser's clipboard errors. */
class LinkFailed extends Error {}

/**
 * Copy email summary (D-90): the report's numbers and top 3 fixes as plain text, with the share link that opens the
 * PDF, ready to paste into an email. Without a link it makes one first, since the summary points to it.
 */
export function CopyEmailSummary({
  businessId,
  reportId,
  summary,
  link,
  onLink,
  create,
}: {
  businessId: string;
  reportId: string | null;
  summary: EmailSnapshot;
  link: ShareLink | null;
  onLink: (link: ShareLink) => void;
  create: CreateAction;
}) {
  const [pending, startTransition] = useTransition();

  async function text(): Promise<string> {
    let shared = link;
    if (!shared) {
      const made = await create({ businessId, reportId }).catch(() => null);
      if (!made?.ok) throw new LinkFailed(made?.error ?? FAILED);
      shared = made.data;
      onLink(shared);
    }
    return reportEmailText(summary, `${window.location.origin}${shared.path}`);
  }

  function copy() {
    startTransition(async () => {
      try {
        // Safari only allows a copy inside the click itself, so the text is handed over as a promise when a link is made.
        if (!link && typeof ClipboardItem !== "undefined") {
          const blob = text().then((t) => new Blob([t], { type: "text/plain" }));
          await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
        } else {
          await navigator.clipboard.writeText(await text());
        }
        toast.success(link ? "Email summary copied." : "Email summary copied, with a new share link.");
      } catch (error) {
        toast.error(error instanceof LinkFailed ? error.message : FAILED);
      }
    });
  }

  return (
    <Button variant="outline" disabled={pending} onClick={copy} aria-busy={pending} data-testid="copy-email-summary">
      {pending ? <Loader2 aria-hidden className="animate-spin" /> : <ClipboardCopy aria-hidden />}
      Copy email summary
    </Button>
  );
}
