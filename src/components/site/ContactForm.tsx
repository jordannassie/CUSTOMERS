"use client";

import { useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type InterestValue = "ai_visibility" | "agency" | "book_demo" | "other";

// AEO topics only (MVP_SPEC 12.3); the values match what /api/contact stores.
const INTERESTS: { value: InterestValue; label: string }[] = [
  { value: "ai_visibility", label: "Checking my business in AI answers" },
  { value: "agency", label: "Using it for my agency's clients" },
  { value: "book_demo", label: "Booking a demo call" },
  { value: "other", label: "Something else" },
];

const MESSAGE_PLACEHOLDERS: Record<InterestValue, string> = {
  ai_visibility: "Tell us about your business and the questions you want to show up for.",
  agency: "Tell us about your agency and how many client businesses you manage.",
  book_demo: "Tell us about your business and what you would like to see in the demo.",
  other: "How can we help?",
};

export type ContactSource = "contact_page" | "chat" | "agency" | "other";

function interestFromParam(param: string | null): InterestValue {
  if (param === "ai_visibility" || param === "agency" || param === "book_demo" || param === "other") return param;
  // Older links used ?topic=sales or ?topic=enterprise.
  if (param === "sales" || param === "enterprise") return "ai_visibility";
  return "other";
}

const fieldClass =
  "w-full rounded-lg border border-input bg-surface px-3 py-2 text-base outline-none placeholder:text-text-hint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

interface ContactFormProps {
  /** Overrides the ?interest= URL param. */
  initialInterest?: InterestValue;
  source?: ContactSource;
  /** Single column, for the chat widget. */
  compact?: boolean;
  onSuccess?: () => void;
}

export default function ContactForm({ initialInterest, source = "contact_page", compact = false, onSuccess }: ContactFormProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const urlInterest =
    initialInterest ?? interestFromParam(searchParams?.get("interest") ?? searchParams?.get("topic"));
  const [interest, setInterest] = useState<InterestValue>(urlInterest);
  const [syncedInterest, setSyncedInterest] = useState(urlInterest);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Follow the URL when it changes while mounted (e.g. navigating to /contact?interest=agency).
  if (syncedInterest !== urlInterest) {
    setSyncedInterest(urlInterest);
    setInterest(urlInterest);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, website, phone, interest, message, source, page_path: pathname ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't send your message. Please try again.");
      } else {
        setSuccess(true);
        onSuccess?.();
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const box = cn("rounded-md border border-border bg-surface", compact ? "p-4 sm:p-5" : "p-6 sm:p-8");

  if (success) {
    return (
      <div className={cn(box, "flex flex-col items-center gap-4 text-center")} role="status">
        <CheckCircle2 className="size-8 text-good" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold">Thanks, we have your message</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">We will reply to you by email.</p>
        </div>
      </div>
    );
  }

  const isAgency = interest === "agency";
  const pair = compact ? "flex flex-col gap-5" : "grid gap-5 sm:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className={cn(box, "flex flex-col gap-5")} noValidate>
      <input type="text" name="_honey" className="hidden" aria-hidden="true" tabIndex={-1} />

      <div className={pair}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cf-name">Name</Label>
          <Input id="cf-name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cf-email">Email</Label>
          <Input
            id="cf-email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            autoComplete="email"
          />
        </div>
      </div>

      <div className={pair}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cf-company">{isAgency ? "Agency name" : "Business name"} (optional)</Label>
          <Input id="cf-company" maxLength={200} value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cf-website">Website (optional)</Label>
          <Input
            id="cf-website"
            maxLength={500}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder={isAgency ? "youragency.com" : "yourbusiness.com"}
            autoComplete="url"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cf-phone">Phone (optional)</Label>
        <Input id="cf-phone" type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cf-interest">What is it about?</Label>
        <select
          id="cf-interest"
          required
          value={interest}
          onChange={(e) => setInterest(e.target.value as InterestValue)}
          className={cn(fieldClass, "h-9 py-1")}
        >
          {INTERESTS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cf-message">Message</Label>
        <textarea
          id="cf-message"
          required
          maxLength={5000}
          rows={compact ? 4 : 6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={MESSAGE_PLACEHOLDERS[interest]}
          className={cn(fieldClass, "resize-none")}
        />
      </div>

      {error && (
        <p className="rounded-md bg-low-bg px-4 py-3 text-sm text-low-text" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" aria-label="Sending" /> : "Send message"}
      </Button>

      <p className="text-center text-[13px] text-text-hint">
        We only use your details to reply to you.{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy policy
        </Link>
      </p>
    </form>
  );
}
