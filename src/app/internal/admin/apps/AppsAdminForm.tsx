"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveDirectoryAppAction } from "@/modules/apps-directory/actions";

type TextField = { name: string; label: string; placeholder?: string; required?: boolean; type?: "url"; wide?: boolean };

const TEXT_FIELDS: TextField[] = [
  { name: "slug", label: "Slug", placeholder: "chatgpt", required: true },
  { name: "name", label: "Name", required: true },
  { name: "provider", label: "Provider", required: true },
  { name: "websiteUrl", label: "Website", placeholder: "https://", required: true, type: "url" },
  { name: "description", label: "Description", required: true, wide: true },
  { name: "categories", label: "Categories", required: true, wide: true },
  { name: "affiliateUrl", label: "Affiliate link, only if approved", placeholder: "https://", type: "url", wide: true },
];

const FLAGS = [
  { name: "featured", label: "Featured", checked: false },
  { name: "popular", label: "Popular", checked: false },
  { name: "topPick", label: "Top pick", checked: false },
  { name: "active", label: "Active", checked: true },
];

export function AppsAdminForm({ categoryHint }: { categoryHint: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-2 sm:p-6"
      action={async (formData) => {
        setPending(true);
        const result = await saveDirectoryAppAction(formData);
        setPending(false);
        setError(result.error ?? null);
        setSaved(!result.error);
      }}
    >
      {TEXT_FIELDS.map((field) => (
        <div key={field.name} className={field.wide ? "flex flex-col gap-1.5 sm:col-span-2" : "flex flex-col gap-1.5"}>
          <Label htmlFor={`app-${field.name}`}>{field.label}</Label>
          <Input
            id={`app-${field.name}`}
            name={field.name}
            type={field.type ?? "text"}
            required={field.required}
            placeholder={field.name === "categories" ? categoryHint : field.placeholder}
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2">
        {FLAGS.map((flag) => (
          <label key={flag.name} className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" name={flag.name} defaultChecked={flag.checked} className="size-4 accent-primary" />
            {flag.label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving" : "Save app"}</Button>
        {error && <p role="alert" className="text-[13px] text-low-text">{error}</p>}
        {saved && !error && <p className="text-[13px] text-good-text">Saved.</p>}
      </div>
    </form>
  );
}
