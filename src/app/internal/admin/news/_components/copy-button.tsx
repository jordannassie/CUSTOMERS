"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({ label, text, getText }: { label: string; text?: string; getText?: () => string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getText ? getText() : (text ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy failed. Please select and copy the text manually.");
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleCopy} className="text-[13px]">
      {copied ? <Check className="text-good-text" aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copied!" : label}
    </Button>
  );
}
