"use client";

import { useState } from "react";
import { saveDirectoryAppAction } from "@/modules/apps-directory/actions";

export function AppsAdminForm({ categoryHint }: { categoryHint: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="mt-6 grid gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:grid-cols-2"
      action={async (formData) => {
        const result = await saveDirectoryAppAction(formData);
        setError(result.error ?? null);
        setSaved(!result.error);
      }}
    >
      <label className="text-[13px] text-[#374151]">Slug
        <input name="slug" required className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2" placeholder="chatgpt" />
      </label>
      <label className="text-[13px] text-[#374151]">Name
        <input name="name" required className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2" />
      </label>
      <label className="text-[13px] text-[#374151]">Provider
        <input name="provider" required className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2" />
      </label>
      <label className="text-[13px] text-[#374151]">Website
        <input name="websiteUrl" required type="url" className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2" placeholder="https://" />
      </label>
      <label className="text-[13px] text-[#374151] sm:col-span-2">Description
        <input name="description" required className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2" />
      </label>
      <label className="text-[13px] text-[#374151] sm:col-span-2">Categories
        <input name="categories" required className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2" placeholder={categoryHint} />
      </label>
      <label className="text-[13px] text-[#374151] sm:col-span-2">Affiliate URL, only if approved
        <input name="affiliateUrl" type="url" className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2" placeholder="https://" />
      </label>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="featured" /> Featured</label>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="popular" /> Popular</label>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="topPick" /> Top pick</label>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="active" defaultChecked /> Active</label>
      <button type="submit" className="h-10 rounded-lg bg-[#0866F5] text-[14px] font-semibold text-white sm:col-span-2">Save app</button>
      {error ? <p className="text-[13px] text-[#B91C1C] sm:col-span-2">{error}</p> : null}
      {saved ? <p className="text-[13px] text-[#15803D] sm:col-span-2">Saved.</p> : null}
    </form>
  );
}
