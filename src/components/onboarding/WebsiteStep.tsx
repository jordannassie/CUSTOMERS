"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, MapPin } from "lucide-react";
import type { ActionResult } from "@/modules/auth";
import { toDomain, type AutofillResult, type PlaceChoice } from "@/modules/onboarding/schema";
import { FieldMessage, useFieldErrors } from "@/components/ui/field-errors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutofillFailed } from "./AutofillFailed";
import { saveAutofill } from "./autofill-store";
import { PlaceChoices, type PickPlaceAction } from "./PlaceChoices";
import { FieldHint, StepActions, StepError } from "./StepBits";

type Props = {
  defaultDomain: string;
  defaultNoWebsite: boolean;
  /** The draft's saved name and city when it has no website, so Back shows them again. */
  defaultName?: string;
  defaultCity?: string;
  backHref?: string;
  /** Chosen on the new-business plan picker, carried through to the business this step creates. */
  plan?: string | null;
  save: (
    input: ({ domain: string } | { name: string; city: string }) & { plan?: string | null; createKey?: string; retry?: boolean },
  ) => Promise<ActionResult<{ businessId: string; autofill: AutofillResult | null }>>;
  /** Saves the Google listing picked with no website, or none (MVP_SPEC 3.3). */
  pick: PickPlaceAction;
};

type Picking = { businessId: string; typed: AutofillResult; choices: PlaceChoice[]; searched: string; note?: string };
type Failed = { businessId: string; typed: AutofillResult };

// MVP_SPEC 3.1 step 3. Auto-fill runs here and takes a few seconds, so the wait gets its own screen.
export function WebsiteStep({ defaultDomain, defaultNoWebsite, defaultName = "", defaultCity = "", backHref, plan = null, save, pick }: Props) {
  const router = useRouter();
  const [noWebsite, setNoWebsite] = useState(defaultNoWebsite);
  const [domain, setDomain] = useState(defaultDomain);
  const [name, setName] = useState(defaultName);
  const [city, setCity] = useState(defaultCity);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<Picking | null>(null);
  // Neither the website nor Google answered: "Try again" runs auto-fill once more for the same draft (2026-10-16).
  const [failed, setFailed] = useState<Failed | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = useFieldErrors<"website" | "name" | "city">("onb");
  // One key for this visit's attempts (migration 067): a double submit or a retry finds the same draft business.
  const createKey = useRef<string | undefined>(undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bad = fields.show(
      noWebsite
        ? { name: name.trim() ? undefined : "Enter your business name.", city: city.trim() ? undefined : "Enter the city your business is in." }
        : { website: !domain.trim() ? "Enter your website, or choose I don't have a website." : toDomain(domain) ? undefined : "Enter a website address like yourbusiness.com." },
    );
    if (bad) return;
    run(false);
  }

  function run(retry: boolean) {
    createKey.current ??= newKey();
    setFailed(null);
    startTransition(async () => {
      const key = createKey.current;
      const result = await save(noWebsite ? { name, city, plan, createKey: key } : { domain, plan, createKey: key, ...(retry ? { retry } : {}) });
      if (!result.ok) {
        // A typo in the address goes on the website field itself (BUG-102).
        if (result.field === "website") return void fields.show({ website: result.error });
        return setError(result.error);
      }
      // Null: the same business sent again, so auto-fill did not run twice; the details step shows what is saved.
      if (result.data.autofill) {
        // No website: Google's listings are only offered; the user picks theirs before anything is filled in.
        const { choices, pickNote, ...typed } = result.data.autofill;
        const businessId = result.data.businessId;
        // No website, or a website that turned us away: Google's listings are only offered, and the user picks.
        if (choices?.length) {
          const searched = noWebsite ? `${name.trim()} in ${city.trim()}` : (toDomain(domain) ?? domain.trim());
          return setPicking({ businessId, typed, choices, searched, note: pickNote });
        }
        if (typed.retry) return setFailed({ businessId, typed });
        saveAutofill(businessId, typed);
      }
      router.push("/onboarding/details");
      // A changed website starts the draft over on the server; never show the details step from before.
      router.refresh();
    });
  }

  if (pending) return <Reading what={noWebsite ? `${name} in ${city}` : domain} noWebsite={noWebsite} />;
  if (picking) return <PlaceChoices {...picking} pick={pick} onBack={() => setPicking(null)} />;
  if (failed) {
    return (
      <AutofillFailed
        note={failed.typed.note ?? ""}
        pending={pending}
        onRetry={() => run(true)}
        onFill={() => {
          saveAutofill(failed.businessId, failed.typed);
          router.push("/onboarding/details");
          router.refresh();
        }}
      />
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {noWebsite ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="business-name">Business name</Label>
            <Input
              id="business-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                fields.clear("name");
              }}
              required
              maxLength={200}
              autoFocus
              className="h-11 text-base"
              {...fields.fieldProps("name")}
            />
            <FieldMessage id={fields.idOf("name")} message={fields.errors.name} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="business-city">City</Label>
            <Input
              id="business-city"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                fields.clear("city");
              }}
              required
              maxLength={100}
              autoComplete="address-level2"
              className="h-11 text-base"
              {...fields.fieldProps("city", "business-city-hint")}
            />
            <FieldMessage id={fields.idOf("city")} message={fields.errors.city} />
            <FieldHint id="business-city-hint">We look the business up on Google so you can pick yours.</FieldHint>
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
              onChange={(e) => {
                setDomain(e.target.value);
                fields.clear("website");
              }}
              required
              maxLength={300}
              autoFocus
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="yourbusiness.com"
              className="h-11 pl-9 text-base"
              {...fields.fieldProps("website", "website-hint")}
            />
          </div>
          <FieldMessage id={fields.idOf("website")} message={fields.errors.website} />
          <FieldHint id="website-hint">We read your site and Google to fill in the details for you. You check everything next.</FieldHint>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setNoWebsite(!noWebsite);
          setError(null);
          fields.show({});
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

// randomUUID needs a secure page (https or localhost); without it the attempt simply has no key.
function newKey(): string | undefined {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined;
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
