"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyPromptButton({ prompt }: { prompt: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Prompt copied. Paste it into Claude to write the page.");
    } catch {
      toast.error("Could not copy. Your browser blocked access to the clipboard.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className="w-fit" onClick={copy}>
      <Copy aria-hidden="true" />
      Copy for Claude
    </Button>
  );
}
