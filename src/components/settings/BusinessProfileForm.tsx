"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import type { SettingsBusiness } from "@/modules/settings";
import { AREA_MAX } from "@/modules/settings/schema";
import { normalizeWebsite, parseServices } from "@/modules/settings/service";
import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/ui/country-select";
import { FieldMessage, useFieldErrors } from "@/components/ui/field-errors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, Panel, TEXTAREA_CLASS } from "./SettingsSection";

export type SaveAction = (input: unknown) => Promise<ActionResult<null>>;

type Fields = Omit<SettingsBusiness, "id" | "services" | "models" | "frequency"> & { services: string };
type Checked = "name" | "website";

export function BusinessProfileForm({ business, save }: { business: SettingsBusiness; save: SaveAction }) {
  const initial: Fields = {
    name: business.name,
    website: business.website,
    industry: business.industry,
    services: business.services.join(", "),
    city: business.city,
    region: business.region,
    country: business.country,
    area: business.area,
    phone: business.phone,
  };
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = (Object.keys(form) as (keyof Fields)[]).some((key) => form[key] !== saved[key]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = useFieldErrors<Checked>("profile");
  const typed = normalizeWebsite(form.website);
  const newWebsite = typed.ok ? typed.domain : form.website.trim();
  const websiteChanged = newWebsite !== (business.website || null);

  const field = (key: keyof Fields) => ({
    id: `profile-${key}`,
    name: key,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (key === "name" || key === "website") fields.clear(key);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bad = fields.show({
      name: form.name.trim() ? undefined : "Enter the business name.",
      website: typed.ok ? undefined : "Enter a website like yourbusiness.com, or leave it empty.",
    });
    if (bad) return;
    startTransition(async () => {
      const result = await save({ businessId: business.id, ...form, services: parseServices(form.services) });
      if (!result.ok) return setError(result.error);
      setSaved(form);
      toast.success("Business profile saved");
    });
  }

  return (
    <Panel>
      <form onSubmit={submit} className="flex flex-col gap-5" aria-label="Business profile" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Row label="Business name" htmlFor="profile-name" error={fields.errors.name}>
            <Input {...field("name")} required maxLength={120} autoComplete="organization" {...fields.fieldProps("name")} />
          </Row>
          <Row label="Industry" htmlFor="profile-industry" hint="For example: plumber, dentist, coffee shop.">
            <Input {...field("industry")} maxLength={80} />
          </Row>
        </div>

        <Row label="Website" htmlFor="profile-website" hint="Leave empty if the business has no website." error={fields.errors.website}>
          <Input
            {...field("website")}
            maxLength={253}
            inputMode="url"
            placeholder="yourbusiness.com"
            {...fields.fieldProps("website", "profile-website-hint")}
          />
        </Row>
        {websiteChanged && business.website && (
          <div
            data-testid="website-warning"
            className="flex gap-3 rounded-md border border-mid/40 bg-mid-bg px-4 py-3 text-[13px] text-mid-text"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Your next scan will look for {newWebsite ?? "no website"} in AI answers instead of {business.website}. Past results stay as they are, so your score may move after the change.
            </p>
          </div>
        )}

        <Row label="Services" htmlFor="profile-services" hint="Separate services with commas.">
          <textarea {...field("services")} rows={2} className={TEXTAREA_CLASS} />
        </Row>

        <div className="grid gap-5 sm:grid-cols-2">
          <Row label="City" htmlFor="profile-city">
            <Input {...field("city")} maxLength={80} autoComplete="address-level2" />
          </Row>
          <Row label="Neighborhood or area" htmlFor="profile-area" hint="Optional, for example East Austin. We use it to suggest questions about your part of the city.">
            <Input {...field("area")} maxLength={AREA_MAX} autoComplete="off" aria-describedby="profile-area-hint" />
          </Row>
          <Row label="State or region" htmlFor="profile-region">
            <Input {...field("region")} maxLength={80} autoComplete="address-level1" />
          </Row>
          <Row label="Country" htmlFor="profile-country">
            <CountrySelect
              id="profile-country"
              name="country"
              value={form.country}
              onValueChange={(country) => setForm((f) => ({ ...f, country }))}
              className="h-9 w-full rounded-lg border border-input bg-surface px-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            />
          </Row>
          <Row label="Phone" htmlFor="profile-phone">
            <Input {...field("phone")} maxLength={30} type="tel" autoComplete="tel" />
          </Row>
        </div>

        <FormError message={error} />
        <div>
          <Button type="submit" disabled={pending || !dirty}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Save profile
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function Row({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldMessage id={`${htmlFor}-error`} message={error} />
      {hint && (
        <p id={`${htmlFor}-hint`} className="text-xs text-text-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
