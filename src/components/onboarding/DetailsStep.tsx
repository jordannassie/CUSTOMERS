"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { INDUSTRIES, INDUSTRY_LABELS, isIndustry } from "@/lib/industries";
import type { ActionResult } from "@/modules/auth";
import type { AutofillResult, BusinessDetails } from "@/modules/onboarding/schema";
import { parseServices } from "@/modules/settings/service";
import { FieldMessage, INVALID_CLASS, useFieldErrors } from "@/components/ui/field-errors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearAutofill, useStoredAutofill } from "./autofill-store";
import { GoogleAttribution } from "./PlaceBits";
import { FieldHint, StepActions, StepError } from "./StepBits";

export type DetailsInput = {
  businessId: string;
  name: string;
  industry: string;
  description: string;
  services: string[];
  city: string;
  state: string;
  country: string;
  phone: string;
};

type Props = {
  businessId: string;
  details: BusinessDetails;
  industryText: string;
  /** Already confirmed once: show saved values, not a stale auto-fill. */
  confirmed: boolean;
  save: (input: DetailsInput) => Promise<ActionResult<null>>;
};

// MVP_SPEC 3.1 step 4: the user confirms or edits what auto-fill found.
export function DetailsStep(props: Props) {
  const stored = useStoredAutofill(props.businessId);
  const fresh = props.confirmed ? null : stored;
  return <DetailsForm key={fresh ? "autofill" : "saved"} {...props} autofill={fresh} />;
}

const selectClass = `h-11 w-full rounded-lg border border-input bg-surface px-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm ${INVALID_CLASS}`;

type Checked = "name" | "industry" | "otherIndustry" | "city";
const textareaClass =
  "w-full rounded-lg border border-input bg-surface px-3 py-2 text-base outline-none transition-colors placeholder:text-text-hint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

function DetailsForm({ businessId, details, industryText, save, autofill }: Props & { autofill: AutofillResult | null }) {
  const router = useRouter();
  const start = autofill ? { ...details, ...nonEmpty(autofill.details) } : details;
  const [v, setV] = useState({
    ...start,
    industry: start.industry && isIndustry(start.industry) ? start.industry : industryText ? "other" : "",
    otherIndustry: industryText,
    services: start.services.join(", "),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = useFieldErrors<Checked>("details");
  const set = (field: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setV((s) => ({ ...s, [field]: e.target.value }));
    if (field === "name" || field === "industry" || field === "otherIndustry" || field === "city") fields.clear(field);
  };
  const check = (key: Checked) => ({ error: fields.errors[key], errorId: fields.idOf(key) });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bad = fields.show({
      name: v.name.trim() ? undefined : "Enter your business name.",
      industry: v.industry ? undefined : "Choose an industry.",
      otherIndustry: v.industry === "other" && !v.otherIndustry.trim() ? "Say what kind of business it is." : undefined,
      city: v.city.trim() ? undefined : "Enter the city your business is in.",
    });
    if (bad) return;
    const industry = v.industry === "other" ? v.otherIndustry.trim() || "other" : v.industry;
    startTransition(async () => {
      const result = await save({
        businessId,
        name: v.name,
        industry,
        description: v.description,
        services: parseServices(v.services).slice(0, 20),
        city: v.city,
        state: v.state,
        country: v.country,
        phone: v.phone,
      });
      if (!result.ok) return setError(result.error);
      clearAutofill(businessId);
      router.push("/onboarding/competitors");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <AutofillNote autofill={autofill} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Business name" className="sm:col-span-2" {...check("name")}>
          <Input id="name" value={v.name} onChange={set("name")} required maxLength={120} className="h-11 text-base" autoComplete="organization" {...fields.fieldProps("name")} />
        </Field>

        <Field id="industry" label="Industry" className="sm:col-span-2" {...check("industry")}>
          <select id="industry" value={v.industry} onChange={set("industry")} required className={selectClass} {...fields.fieldProps("industry")}>
            <option value="" disabled>
              Choose an industry
            </option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {INDUSTRY_LABELS[i]}
              </option>
            ))}
          </select>
        </Field>
        {v.industry === "other" ? (
          <Field id="other-industry" label="What kind of business is it?" className="sm:col-span-2" {...check("otherIndustry")}>
            <Input
              id="other-industry"
              value={v.otherIndustry}
              onChange={set("otherIndustry")}
              required
              maxLength={80}
              placeholder="Florist"
              className="h-11 text-base"
              {...fields.fieldProps("otherIndustry")}
            />
          </Field>
        ) : null}

        <Field id="description" label="What you do" optional className="sm:col-span-2">
          <textarea id="description" value={v.description} onChange={set("description")} rows={3} maxLength={1000} className={textareaClass} />
        </Field>

        <Field id="services" label="Services" optional hint="Separate with commas. These shape the questions we ask AI." className="sm:col-span-2">
          <textarea id="services" value={v.services} onChange={set("services")} rows={2} placeholder="Emergency repairs, drain cleaning" className={textareaClass} />
        </Field>

        <Field id="city" label="City" {...check("city")}>
          <Input id="city" value={v.city} onChange={set("city")} required maxLength={80} className="h-11 text-base" autoComplete="address-level2" {...fields.fieldProps("city")} />
        </Field>
        <Field id="state" label="State or region" optional>
          <Input id="state" value={v.state} onChange={set("state")} maxLength={80} className="h-11 text-base" autoComplete="address-level1" />
        </Field>
        <Field id="phone" label="Phone" optional>
          <Input id="phone" type="tel" value={v.phone} onChange={set("phone")} maxLength={30} className="h-11 text-base" autoComplete="tel" />
        </Field>
      </div>

      <StepError message={error} />
      <StepActions backHref="/onboarding/website" pending={pending} />
    </form>
  );
}

function nonEmpty(d: BusinessDetails): Partial<BusinessDetails> {
  return Object.fromEntries(Object.entries(d).filter(([, value]) => (Array.isArray(value) ? value.length > 0 : value !== ""))) as Partial<BusinessDetails>;
}

function AutofillNote({ autofill }: { autofill: AutofillResult | null }) {
  if (!autofill) return null;
  const { website, google } = autofill.filledFrom;
  const found = website && google ? "your website and Google" : website ? "your website" : google ? "Google" : null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-md border border-border bg-primary-tint px-4 py-3">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="text-sm">
        <p>{found ? `We filled this in from ${found}. Check it and fix anything that's off.` : autofill.note ?? "We couldn't find your details, so fill them in below."}</p>
        {found && autofill.note ? <p className="mt-1 text-muted-foreground">{autofill.note}</p> : null}
        {google ? <GoogleAttribution what="Business details" className="mt-2" /> : null}
      </div>
    </div>
  );
}

function Field({ id, label, optional, hint, error, errorId, className, children }: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  errorId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
      </Label>
      {children}
      {errorId ? <FieldMessage id={errorId} message={error} /> : null}
      {hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  );
}
