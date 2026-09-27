"use client";

import { useState, type FormEvent } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SuggestFeatureDialog({ businessId, triggerClassName }: { businessId: string; triggerClassName: string }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (!title || !description) {
      setError("Add a short title and a sentence about what you need.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/geo/feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, businessId, pageContext: window.location.pathname }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Your idea wasn't sent. Try again in a moment.");
        return;
      }
      setOpen(false);
      toast.success("Idea sent. Thanks, we read every one.");
    } catch {
      setError("Your idea wasn't sent. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <DialogTrigger className={triggerClassName}>
        <MessageSquarePlus className="size-4" aria-hidden="true" />
        Suggest a feature
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest a feature</DialogTitle>
          <DialogDescription>What would make Customers.Direct more useful for you?</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suggest-title">Your idea</Label>
            <Input id="suggest-title" name="title" maxLength={200} placeholder="Example: a weekly email with my score" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suggest-description">How would it help?</Label>
            <textarea
              id="suggest-description"
              name="description"
              rows={4}
              maxLength={2000}
              className="w-full resize-none rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none placeholder:text-text-hint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-sm text-low-text">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={sending}>
              {sending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {sending ? "Sending" : "Send idea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
