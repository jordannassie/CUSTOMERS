"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, MapPin } from "lucide-react";
import type { ActionResult } from "@/modules/auth";
import type { AutofillResult } from "@/modules/onboarding/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAutofill } from "./autofill-store";
import { FieldHint, StepActions, StepError } from "./StepBits";

type Props = {
  defaultDomain: string;
  defaultNoWebsite: boolean;
  backHref?: string;
  save: (
    input: { domain: string } | { name: string; city: string },
  ) => Promise<ActionResult<{ businessId: string; autofill: AutofillResult }>>;
};

// MVP_SPEC 3.1 step 3. Auto-fill runs here and takes a few seconds, so the wait gets its own screen.
export function WebsiteStep({ defaultDomain, defaultNoWebsite, backHref, save }: Props) {
  const router = useRouter();
  const [noWebsite, setNoWebsite] = useState(defaultNoWebsite);
  const [domain, setDomain] = useState(defaultDomain);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await save(noWebsite ? { name, city } : { domain });
      if (!result.ok) return setError(result.error);
      saveAutofill(result.data.businessId, result.data.autofill);
      router.push("/onboarding/details");
    });
  }

  if (pending) return <Reading what={noWebsite ? `${name} in ${city}` : domain} noWebsite={noWebsite} />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {noWebsite ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="business-name">Business name</Label>
            <Input id="business-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} autoFocus className="h-11 text-base" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="business-city">City</Label>
            <Input id="business-city" value={city} onChange={(e) => setCity(e.target.value)} required maxLength={100} autoComplete="address-level2" className="h-11 text-base" />
            <FieldHint>We look the business up on Google to fill in the rest.</FieldHint>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="website">Business website</Label>
          <div className="relative">
            <Globe aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-hint" />
            <Input
              id="website"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
              maxLength={300}
              autoFocus
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="yourbusiness.com"
              aria-describedby="website-hint"
              className="h-11 pl-9 text-base"
            />
          </div>
          <FieldHint id="website-hint">We read your site and Google to fill in the details for you. You check everything next.</FieldHint>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setNoWebsite(!noWebsite);
          setError(null);
        }}
        className="-my-2.5 w-fit py-2.5 text-sm text-primary underline-offset-4 hover:underline"
      >
        {noWebsite ? "I have a website" : "I don't have a website"}
      </button>

      <StepError message={error} />
      <StepActions backHref={backHref} pending={pending} label="Find my business" />
    </form>
  );
}

function Reading({ what, noWebsite }: { what: string; noWebsite: boolean }) {
  const lines = noWebsite
    ? ["Looking you up on Google", "Getting your details ready"]
    : [`Reading ${what}`, "Looking you up on Google", "Getting your details ready"];
  return (
    <div role="status" aria-live="polite" className="rounded-md border border-border bg-surface p-6">
      <div className="flex items-center gap-3">
        <Loader2 aria-hidden className="size-5 animate-spin text-primary" />
        <p className="text-[15px] font-medium">Finding {what}</p>
      </div>
      <ul className="mt-5 flex flex-col gap-3">
        {lines.map((line, i) => (
          <li key={line} className="flex items-center gap-3 text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in" style={{ animationDelay: `${i * 600}ms`, animationFillMode: "both" }}>
            {i === 0 && !noWebsite ? <Globe aria-hidden className="size-4" /> : <MapPin aria-hidden className="size-4" />}
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-text-hint">This usually takes a few seconds.</p>
    </div>
  );
}
