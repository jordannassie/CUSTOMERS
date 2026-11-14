"use client";

import { titleBrand } from "@/modules/onboarding/title-brand";

/** `aliases`: the long Google name, kept as another name when the short brand is used (2026-10-15). */
export type BrandedPick = { name: string; placesId: string | null; aliases?: string[] };

/**
 * A Google name that is a page title ("BeRejuved Medical Spa & Wellness Studio - NYC") starts on the brand AI answers
 * use, like the business's own name (BUG-097); the long one is kept as another name, and "Use full name" puts it back.
 */
export function withBrand<T extends BrandedPick>(c: T): T {
  const brand = c.placesId ? titleBrand(c.name) : null;
  return brand ? { ...c, name: brand, aliases: [c.name] } : c;
}

/** Under a shortened name: what Google calls it, and a way back to that name. */
export function FullName({ google, onUse }: { google: string; onUse: () => void }) {
  return (
    <span className="flex min-w-0 items-baseline gap-1.5 text-xs text-text-hint" data-testid="google-full-name">
      <span className="min-w-0 truncate" title={google}>
        Google: {google}
      </span>
      <button type="button" onClick={onUse} className="shrink-0 text-primary hover:underline">
        Use full name
      </button>
    </span>
  );
}
