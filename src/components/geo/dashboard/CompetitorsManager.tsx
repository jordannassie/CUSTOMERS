"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Loader2, Globe, ExternalLink, Search,
  MapPin, Tag, CheckCircle2, AlertCircle, X, Pencil,
} from "lucide-react";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { DomainFavicon } from "@/components/DomainFavicon";
import type { BusinessCompetitor } from "@/types/geo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaceResult {
  placeId: string;
  name: string;
  city: string | null;
  state: string | null;
  formattedAddress: string | null;
  category: string | null;
  website: string | null;
  domain: string | null;
  phone: string | null;
  mapsUrl: string | null;
}

function EnrichmentBadge({ status, domain }: { status: string; domain: string | null }) {
  if (domain) {
    if (status === "complete") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">
          <CheckCircle2 size={9} /> Verified
        </span>
      );
    }
    return null; // has domain, don't clutter row
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
      <AlertCircle size={9} /> No website
    </span>
  );
}

// ─── Inline domain editor ─────────────────────────────────────────────────────

function DomainEditor({
  competitor,
  onSaved,
}: {
  competitor: BusinessCompetitor;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(competitor.domain ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/geo/competitors/${competitor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: value }),
      });
      if (!res.ok) throw new Error("Save failed");
      setOpen(false);
      onSaved();
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (open) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="example.com"
          className="text-[11px] border border-[#E5E5E1] rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-[#171717]/30"
        />
        <button
          onClick={save}
          disabled={saving}
          className="text-[10px] font-semibold text-[#171717] hover:underline disabled:opacity-50"
        >
          {saving ? <Loader2 size={10} className="animate-spin" /> : "Save"}
        </button>
        <button onClick={() => setOpen(false)} className="text-[10px] text-[#A3A3A0]">
          <X size={12} />
        </button>
        {error && <span className="text-[10px] text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1 text-[11px] text-[#2563EB] hover:underline"
    >
      <Pencil size={10} />
      {competitor.domain ? "Edit" : "Add website"}
    </button>
  );
}

// ─── Search result dropdown item ─────────────────────────────────────────────

function PlaceResultItem({
  result,
  onSelect,
}: {
  result: PlaceResult;
  onSelect: (r: PlaceResult) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="w-full text-left px-3 py-2.5 hover:bg-[#F5F5F2] transition-colors border-b border-[#EEEEEA] last:border-b-0"
    >
      <div className="flex items-start gap-2">
        <CompetitorAvatar name={result.name} size={24} className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#171717] truncate">{result.name}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            {(result.city || result.state) && (
              <span className="flex items-center gap-1 text-[11px] text-[#777773]">
                <MapPin size={9} />
                {[result.city, result.state].filter(Boolean).join(", ")}
              </span>
            )}
            {result.category && (
              <span className="flex items-center gap-1 text-[11px] text-[#A3A3A0]">
                <Tag size={9} />
                {result.category}
              </span>
            )}
            {result.domain && (
              <span className="flex items-center gap-1 text-[11px] text-[#059669]">
                <Globe size={9} />
                {result.domain}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CompetitorsManager({
  businessId,
  competitors,
}: {
  businessId: string;
  competitors: BusinessCompetitor[];
}) {
  const router = useRouter();

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [placesAvailable, setPlacesAvailable] = useState(true);

  // Add state
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete state
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search triggered from onChange — avoids setState inside effects
  function scheduleSearch(q: string) {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }

    if (q.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setSearching(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSearching(true);
      try {
        const res = await fetch(
          `/api/geo/competitors/search?q=${encodeURIComponent(q)}&businessId=${businessId}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error("Search failed");
        const json: { results?: PlaceResult[] } = await res.json();
        setPlacesAvailable(true);
        setSearchResults(json.results ?? []);
        setShowDropdown(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPlacesAvailable(false);
        setSearchResults([]);
        setShowDropdown(true);
      } finally {
        setSearching(false);
      }
    }, 420);
  }

  async function saveCompetitor(payload: {
    name: string;
    domain?: string | null;
    source: string;
    place_id?: string | null;
    formatted_address?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    category?: string | null;
    phone?: string | null;
    enrichment_status?: string;
  }) {
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/geo/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          competitors: [{ confirmed: true, ...payload }],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error ?? "Could not add competitor.");
        return false;
      }
      setQuery("");
      setSearchResults([]);
      setShowDropdown(false);
      router.refresh();
      return true;
    } finally {
      setAdding(false);
    }
  }

  async function handleSelectPlace(place: PlaceResult) {
    setShowDropdown(false);
    await saveCompetitor({
      name: place.name,
      domain: place.domain,
      source: "google_places",
      place_id: place.placeId,
      formatted_address: place.formattedAddress,
      city: place.city,
      region: place.state,
      category: place.category,
      phone: place.phone,
      enrichment_status: place.domain ? "complete" : "partial",
    });
  }

  async function handleAddManually() {
    const name = query.trim();
    if (!name) return;
    setShowDropdown(false);
    await saveCompetitor({ name, source: "manual", enrichment_status: "none" });
  }

  async function remove(id: string) {
    setBusyId(id);
    setConfirmId(null);
    try {
      await fetch(`/api/geo/competitors/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const isQueryLong = query.trim().length >= 2;

  return (
    <div>
      {/* ── Search / add input ── */}
      <div ref={containerRef} className="relative mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A0] pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                scheduleSearch(e.target.value);
              }}
              onFocus={() => {
                if (query.trim().length >= 2) setShowDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowDropdown(false);
                if (e.key === "Enter" && query.trim()) handleAddManually();
              }}
              placeholder="Search businesses or places…"
              className="w-full border border-[#E5E5E1] rounded-lg pl-9 pr-4 py-2.5 text-[13px] text-[#171717] placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#171717]/20 bg-white"
              autoComplete="off"
            />
            {searching && (
              <Loader2
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A0] animate-spin"
              />
            )}
          </div>

          {/* Manual add button — always available as fallback */}
          <button
            type="button"
            onClick={handleAddManually}
            disabled={adding || !query.trim()}
            className="shrink-0 flex items-center gap-1.5 bg-[#171717] text-white rounded-lg px-4 py-2.5 text-[13px] font-semibold hover:bg-[#2A2A2A] disabled:opacity-40 active:scale-[0.97] transition-all"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>

        {/* Search dropdown */}
        {showDropdown && isQueryLong && (
          <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white border border-[#E5E5E1] rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
            {!placesAvailable && (
              <p className="px-3 py-2 text-[11px] text-[#A3A3A0] bg-[#FAFAF8] border-b border-[#EEEEEA]">
                Business search unavailable — use the Add button to save by name.
              </p>
            )}

            {placesAvailable && searchResults.length === 0 && !searching && (
              <p className="px-3 py-2.5 text-[12px] text-[#A3A3A0]">No matching businesses found.</p>
            )}

            {searchResults.map((r) => (
              <PlaceResultItem key={r.placeId} result={r} onSelect={handleSelectPlace} />
            ))}

            {/* Always offer manual add at the bottom */}
            {query.trim() && (
              <button
                type="button"
                onClick={handleAddManually}
                disabled={adding}
                className="w-full text-left px-3 py-2.5 text-[12px] text-[#2563EB] hover:bg-[#F0F4FF] font-medium flex items-center gap-2 border-t border-[#EEEEEA]"
              >
                <Plus size={12} />
                Add &ldquo;{query.trim()}&rdquo; manually
              </button>
            )}
          </div>
        )}

        {addError && (
          <p className="mt-1.5 text-[11px] text-red-500">{addError}</p>
        )}
      </div>

      {/* ── Competitors table ── */}
      {competitors.length === 0 ? (
        <div className="text-center py-12 text-[13px] text-[#A3A3A0]">
          <Globe size={28} className="mx-auto mb-3 text-[#D4D4CF]" />
          <p className="font-medium text-[#171717] mb-1">No competitors added yet</p>
          <p>Search for businesses above to add your first competitor.</p>
        </div>
      ) : (
        <div className="border border-[#E5E5E1] rounded-xl overflow-hidden">
          {/* Header */}
          <div
            className="grid items-center px-4 py-2.5 border-b border-[#EEEEEA] bg-[#FAFAF8]"
            style={{ gridTemplateColumns: "28px 1fr 160px 110px 44px" }}
          >
            {["#", "Competitor", "Domain / Website", "Source", ""].map((h) => (
              <span
                key={h}
                className="text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#EEEEEA]">
            {competitors.map((c, i) => (
              <div
                key={c.id}
                className="grid items-center px-4 py-3 hover:bg-[#F5F5F2] transition-colors group"
                style={{ gridTemplateColumns: "28px 1fr 160px 110px 44px" }}
              >
                {/* Rank */}
                <span className="text-[12px] text-[#A3A3A0] font-semibold tabular-nums">
                  {i + 1}
                </span>

                {/* Name + location */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <CompetitorAvatar name={c.name} size={24} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#171717] truncate">{c.name}</p>
                      {(c.city || c.region) && (
                        <p className="text-[10px] text-[#A3A3A0] flex items-center gap-1 mt-0.5">
                          <MapPin size={8} />
                          {[c.city, c.region].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {c.category && (
                        <p className="text-[10px] text-[#A3A3A0] flex items-center gap-1">
                          <Tag size={8} />
                          {c.category}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Domain */}
                <div className="min-w-0">
                  {c.domain ? (
                    <a
                      href={`https://${c.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 group/link hover:text-[#171717] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DomainFavicon domain={c.domain} size={12} />
                      <span className="text-[11px] text-[#777773] group-hover/link:text-[#171717] truncate">
                        {c.domain}
                      </span>
                      <ExternalLink
                        size={10}
                        className="text-[#D4D4CF] group-hover/link:text-[#777773] shrink-0"
                      />
                    </a>
                  ) : null}
                  {/* Edit / add website */}
                  <DomainEditor
                    competitor={c}
                    onSaved={() => router.refresh()}
                  />
                  {!c.domain && (
                    <EnrichmentBadge status={c.enrichment_status} domain={c.domain} />
                  )}
                </div>

                {/* Source */}
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0F0EC] text-[#777773] w-fit">
                  {c.source ?? "manual"}
                </span>

                {/* Delete */}
                <div className="flex items-center justify-end">
                  {confirmId === c.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => remove(c.id)}
                        disabled={busyId === c.id}
                        className="text-[10px] font-semibold text-[#DC2626] hover:underline"
                      >
                        {busyId === c.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-[10px] text-[#A3A3A0] hover:text-[#777773]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(c.id)}
                      aria-label={`Remove ${c.name}`}
                      className="text-[#D4D4CF] hover:text-[#DC2626] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
