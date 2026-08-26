/**
 * DomainFavicon — fetches a 16px favicon via Google's public favicon service.
 * Uses a plain <img> tag (not next/image) to avoid requiring remote domain config.
 * Falls back gracefully if the favicon 404s.
 */
"use client";

import { useState } from "react";

export function DomainFavicon({
  domain,
  size = 16,
  className = "",
}: {
  domain: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Fallback: grey square placeholder
    return (
      <span
        className={`inline-block rounded-sm bg-[#F0F0EC] shrink-0 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size * 2}`}
      alt={domain}
      width={size}
      height={size}
      className={`rounded-sm shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      aria-hidden="true"
    />
  );
}
