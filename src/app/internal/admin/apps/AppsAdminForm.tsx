"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveDirectoryAppAction } from "@/modules/apps-directory/actions";
import type { AdminApp } from "./_components/admin-apps";

type TextField = {
  name: "slug" | "name" | "provider" | "websiteUrl" | "description" | "categories" | "affiliateUrl";
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "url";
  wide?: boolean;
};

// Placeholders start with "e.g." so they never read as a value already filled in (admin audit 2026-11-12).
const TEXT_FIELDS: TextField[] = [
  { name: "slug", label: "Slug", placeholder: "e.g. chatgpt", required: true },
  { name: "name", label: "Name", placeholder: "e.g. ChatGPT", required: true },
  { name: "provider", label: "Provider", placeholder: "e.g. OpenAI", required: true },
  { name: "websiteUrl", label: "Website", placeholder: "https://", required: true, type: "url" },
  { name: "description", label: "Description", required: true, wide: true },
  { name: "categories", label: "Categories", placeholder: "e.g. ai-tools, marketing", required: true, wide: true },
  { name: "affiliateUrl", label: "Affiliate link, only if approved", placeholder: "https://", type: "url", wide: true },
];

const FLAGS = [
  { name: "featured", label: "Featured" },
  { name: "popular", label: "Popular" },
  { name: "topPick", label: "Top pick" },
  { name: "active", label: "Active (shows on /apps)" },
] as const;

function initialValue(app: AdminApp | null, name: TextField["name"]): string {
  if (!app) return "";
  if (name === "categories") return app.categories.join(", ");
  return app[name] ?? "";
}

/** Add an app, or change the one picked in the list: the form starts with that app's current values. */
export function AppsAdminForm({ app, categoryHint, onNew }: { app: AdminApp | null; categoryHint: string; onNew: () => void }) {
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
      <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
        <h2 className="text-[length:calc(16px*var(--px,1))] font-semibold">{app ? `Edit ${app.name}` : "Add an app"}</h2>
        {app && (
          <Button type="button" variant="ghost" size="sm" onClick={onNew}>
            Add a new app instead
          </Button>
        )}
      </div>
      {TEXT_FIELDS.map((field) => (
        <div key={field.name} className={field.wide ? "flex flex-col gap-1.5 sm:col-span-2" : "flex flex-col gap-1.5"}>
          <Label htmlFor={`app-${field.name}`}>{field.label}</Label>
          <Input
            id={`app-${field.name}`}
            name={field.name}
            type={field.type ?? "text"}
            required={field.required}
            // A saved app keeps its slug: a new slug would be a new app.
            readOnly={field.name === "slug" && Boolean(app)}
            defaultValue={initialValue(app, field.name)}
            placeholder={field.placeholder}
            aria-describedby={field.name === "categories" ? "app-categories-hint" : undefined}
            className="placeholder:text-text-hint read-only:bg-muted read-only:text-muted-foreground"
          />
          {field.name === "categories" && (
            <p id="app-categories-hint" className="text-[length:calc(12px*var(--px,1))] text-text-hint">
              Separate with commas. Category ids: {categoryHint}
            </p>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2">
        {FLAGS.map((flag) => (
          <label key={flag.name} className="flex items-center gap-2 text-[length:calc(14px*var(--px,1))]">
            <input
              type="checkbox"
              name={flag.name}
              defaultChecked={app ? app[flag.name] : flag.name === "active"}
              className="size-4 accent-primary"
            />
            {flag.label}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving" : app ? "Save changes" : "Save app"}</Button>
        {error && <p role="alert" className="text-[length:calc(13px*var(--px,1))] text-low-text">{error}</p>}
        {saved && !error && <p className="text-[length:calc(13px*var(--px,1))] text-foreground">Saved.</p>}
      </div>
    </form>
  );
}
