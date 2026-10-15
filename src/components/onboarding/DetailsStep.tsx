"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { countryCode } from "@/lib/countries";
import { INDUSTRIES, INDUSTRY_LABELS, isIndustry, servicesPlaceholder } from "@/lib/industries";
import type { ActionResult } from "@/modules/auth";
import type { AutofillResult, BusinessDetails } from "@/modules/onboarding/schema";
import { domainBrand } from "@/modules/scanning/mention-text";
import { titleBrand } from "@/modules/onboarding/title-brand";
import { ALIASES_MAX, AREA_MAX } from "@/modules/settings/schema";
import { aliasesProblem, aliasExample, parseServices } from "@/modules/settings/service";
import { CountrySelect } from "@/components/ui/country-select";
import { useFieldErrors } from "@/components/ui/field-errors";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { clearAutofill, useStoredAutofill } from "./autofill-store";
import { IndustryCheck } from "./IndustryCheck";
import { GoogleAttribution } from "./PlaceBits";
import { Field, StepActions, StepError } from "./StepBits";

const INDUSTRY_OPTIONS = INDUSTRIES.map((i) => ({ value: i, label: INDUSTRY_LABELS[i] }));

export type DetailsInput = {
  businessId: string;
  name: string;
  industry: string;
  description: string;
  services: string[];
  /** Other names customers and AI use for the business. */
  aliases: string[];
  city: string;
  state: string;
  country: string;
  /** Neighborhood or area; empty saves none. */
  area: string;
  phone: string;
};

type Props = {
  businessId: string;
  /** The website typed on the previous step, for the brand name suggestion (BUG-097). */
  domain?: string | null;
  details: BusinessDetails;
  industryText: string;
  /** Other names the user saved before, if they came back to this step. */
  aliases: string[];
  /** Already confirmed once: show saved values, not a stale auto-fill. */
  confirmed: boolean;
  save: (input: DetailsInput) => Promise<ActionResult<null>>;
};

// MVP_SPEC 3.1 step 4: the user confirms or edits what auto-fill found.
export function DetailsStep(props: Props) {
  const stored = useStoredAutofill(props.businessId);
  const fresh = props.confirmed ? null : stored;
  // Keyed by what it shows: the app keeps a visited step's form, so going Back and entering another website kept
  // the old business's name and details in it until a reload (2026-10-13). New auto-fill now starts a new form.
  const key = fresh ? `autofill:${JSON.stringify(fresh.details)}` : `saved:${props.domain ?? ""}:${props.details.name}`;
  return <DetailsForm key={key} {...props} autofill={fresh} />;
}

type Checked = "name" | "industry" | "otherIndustry" | "aliases" | "city" | "country";
const textareaClass =
  "w-full rounded-lg border border-input bg-surface px-3 py-2 text-base outline-none transition-colors placeholder:text-text-hint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

function DetailsForm({ businessId, domain, details, industryText, aliases, save, autofill }: Props & { autofill: AutofillResult | null }) {
  const router = useRouter();
  const start = autofill ? { ...details, ...nonEmpty(autofill.details) } : details;
  const [v, setV] = useState({
    ...start,
    industry: start.industry && isIndustry(start.industry) ? start.industry : industryText ? "other" : "",
    // Auto-fill names an unlisted type from Google, "Bookstore" (BUG-123); what the user saved wins.
    otherIndustry: industryText || autofill?.details.industryText || "",
    services: start.services.join(", "),
    aliases: aliases.join(", "),
    // Auto-fill may give "US" or "United States"; the select holds the code. No default (BUG-086).
    country: countryCode(start.country),
  });
  const [error, setError] = useState<string | null>(null);
  // Google and the website disagree on the industry: highlighted until the user picks one themselves.
  const [industryChecked, setIndustryChecked] = useState(!autofill?.industryCheck);
  const [pending, startTransition] = useTransition();
  const fields = useFieldErrors<Checked>("details");
  const set = (field: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setV((s) => ({ ...s, [field]: e.target.value }));
    if (field === "name" || field === "industry" || field === "otherIndustry" || field === "aliases" || field === "city") fields.clear(field);
    if (field === "industry") setIndustryChecked(true);
  };
  const check = (key: Checked) => ({ error: fields.errors[key], errorId: fields.idOf(key) });
  // Google names one branch ("Cheezious Golra Mor Branch"); customers and AI use the brand (BUG-097).
  // A Google page title as the name ("Bedigital.pk - Digitizing Businesses") gets the same suggestion (2026-10-15).
  const brand = domainBrand(v.name, domain) ?? titleBrand(v.name, domain);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bad = fields.show({
      name: v.name.trim() ? undefined : "Enter your business name.",
      industry: v.industry ? undefined : "Choose an industry.",
      otherIndustry: v.industry === "other" && !v.otherIndustry.trim() ? "Say what kind of business it is." : undefined,
      aliases: aliasesProblem(parseServices(v.aliases)),
      city: v.city.trim() ? undefined : "Enter the city your business is in.",
      country: v.country ? undefined : "Choose the country your business is in.",
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
        aliases: parseServices(v.aliases),
        city: v.city,
        state: v.state,
        country: v.country,
        area: v.area,
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
        <Field id="name" label="Business name" className="sm:col-span-2" hint="The name customers know you by. AI answers use it too." {...check("name")}>
          <Input id="name" value={v.name} onChange={set("name")} required maxLength={120} className="h-11 text-base" autoComplete="organization" {...fields.fieldProps("name")} />
          {brand ? (
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground" data-testid="brand-suggestion">
              Is this one branch? Customers may know you as {brand}.
              <button
                type="button"
                onClick={() => setV((s) => ({ ...s, name: brand }))}
                className="py-1 text-primary underline-offset-4 hover:underline"
              >
                Use {brand}
              </button>
            </p>
          ) : null}
        </Field>

        <Field id="industry" label="Industry" className="sm:col-span-2" {...check("industry")}>
          <Select
            id="industry"
            value={v.industry}
            onValueChange={(industry) => {
              setV((s) => ({ ...s, industry }));
              fields.clear("industry");
              setIndustryChecked(true);
            }}
            options={INDUSTRY_OPTIONS}
            placeholder="Choose an industry"
            required
            className={industryChecked ? undefined : "border-mid ring-3 ring-mid/30"}
            {...fields.fieldProps("industry")}
            {...(industryChecked ? {} : { "aria-describedby": "industry-check" })}
          />
          {!industryChecked && autofill?.industryCheck ? <IndustryCheck id="industry-check" {...autofill.industryCheck} /> : null}
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
          <textarea id="services" value={v.services} onChange={set("services")} rows={2} placeholder={servicesPlaceholder(v.industry)} className={textareaClass} />
        </Field>

        <Field
          id="aliases"
          label="Other names"
          optional
          hint={`Short names, old names or other spellings customers use, separated with commas, up to ${ALIASES_MAX}. AI answers that use them count for you.`}
          className="sm:col-span-2"
          {...check("aliases")}
        >
          <Input
            id="aliases"
            value={v.aliases}
            onChange={set("aliases")}
            maxLength={1300}
            placeholder={aliasExample(v.name)}
            className="h-11 text-base"
            autoComplete="off"
            {...fields.fieldProps("aliases", "aliases-hint")}
          />
        </Field>

        <Field id="city" label="City" {...check("city")}>
          <Input id="city" value={v.city} onChange={set("city")} required maxLength={80} className="h-11 text-base" autoComplete="address-level2" {...fields.fieldProps("city")} />
        </Field>
        <Field id="area" label="Neighborhood or area" optional hint="For example: East Austin. We'll also ask AI about businesses in this part of the city.">
          <Input id="area" value={v.area} onChange={set("area")} maxLength={AREA_MAX} className="h-11 text-base" aria-describedby="area-hint" />
        </Field>
        <Field id="state" label="State or region" optional>
          <Input id="state" value={v.state} onChange={set("state")} maxLength={80} className="h-11 text-base" autoComplete="address-level1" />
        </Field>
        <Field id="country" label="Country" {...check("country")}>
          <CountrySelect
            id="country"
            value={v.country}
            onValueChange={(country) => {
              setV((s) => ({ ...s, country }));
              fields.clear("country");
            }}
            required
            {...fields.fieldProps("country")}
          />
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
