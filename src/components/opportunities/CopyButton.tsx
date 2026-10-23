"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({ text, label, copiedNote }: { text: string; label: string; copiedNote: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(copiedNote);
    } catch {
      toast.error("Could not copy. Your browser blocked access to the clipboard.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} data-testid="copy-button">
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Copied" : label}
    </Button>
  );
}
