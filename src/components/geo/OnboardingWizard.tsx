"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, CheckCircle2, X, Plus, AlertTriangle } from "lucide-react";
import type { ScanResult } from "@/types/geo";
import type { CompetitorSuggestion } from "@/lib/geo/competitor-discovery";
import type { GeneratedPrompt } from "@/lib/geo/prompt-engine";

type Step = "url" | "scanning" | "confirm" | "competitors" | "prompts" | "finishing" | "done";

const INDUSTRY_SUGGESTIONS = [
  "HVAC company",
  "plumber",
  "dentist",
  "law firm",
  "med spa",
  "roofing company",
  "real estate agency",
  "auto repair shop",
  "chiropractor",
  "landscaping company",
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("url");
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [scan, setScan] = useState<ScanResult | null>(null);

  const [form, setForm] = useState({
    name: "",
    industry: "",
    description: "",
    city: "",
    region: "",
    country: "",
  });

  const [businessId, setBusinessId] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<CompetitorSuggestion[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<CompetitorSuggestion[]>([]);
  const [customCompetitor, setCustomCompetitor] = useState("");

  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);

  const [finishingMessage, setFinishingMessage] = useState("Setting things up…");

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) return;
    setStep("scanning");
    try {
      const res = await fetch("/api/geo/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed.");
      const result: ScanResult = data.scan;
      setScan(result);
      setForm({
        name: result.name ?? "",
        industry: "",
        description: result.description ?? "",
        city: result.city ?? "",
        region: result.region ?? "",
        country: result.country ?? "",
      });
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not scan that website.");
      setStep("url");
    }
  }

  async function handleConfirmBusiness(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.industry.trim()) {
      setError("Business name and industry are required.");
      return;
    }
    setStep("scanning");
    try {
      const res = await fetch("/api/geo/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          domain: scan?.domain ?? null,
          industry: form.industry,
          description: form.description || null,
          primary_city: form.city || null,
          primary_region: form.region || null,
          primary_country: form.country || null,
          logo_url: scan?.logoUrl ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save business.");
      setBusinessId(data.businessId);

      const discoverRes = await fetch("/api/geo/competitors/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: data.businessId }),
      });
      const discoverData = await discoverRes.json();
      setSuggestions(discoverData.suggestions ?? []);
      setSelectedCompetitors(discoverData.suggestions ?? []);
      setStep("competitors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("confirm");
    }
  }

  function toggleCompetitor(suggestion: CompetitorSuggestion) {
    setSelectedCompetitors((prev) =>
      prev.some((c) => c.name === suggestion.name)
        ? prev.filter((c) => c.name !== suggestion.name)
        : [...prev, suggestion],
    );
  }

  function addCustomCompetitor() {
    const name = customCompetitor.trim();
    if (!name) return;
    const entry: CompetitorSuggestion = { name, domain: null, source: "manual" };
    setSuggestions((prev) => [...prev, entry]);
    setSelectedCompetitors((prev) => [...prev, entry]);
    setCustomCompetitor("");
  }

  async function handleConfirmCompetitors() {
    if (!businessId) return;
    setError(null);
    setStep("scanning");
    try {
      if (selectedCompetitors.length > 0) {
        const res = await fetch("/api/geo/competitors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business_id: businessId, competitors: selectedCompetitors }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Could not save competitors.");
        }
      }

      const genRes = await fetch("/api/geo/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error ?? "Could not generate prompts.");
      setPrompts(genData.prompts ?? []);
      setStep("prompts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("competitors");
    }
  }

  function removePrompt(index: number) {
    setPrompts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirmPrompts() {
    if (!businessId || prompts.length === 0) {
      setError("Keep at least one prompt to track.");
      return;
    }
    setError(null);
    setStep("finishing");
    try {
      setFinishingMessage("Saving your tracked prompts…");
      const res = await fetch("/api/geo/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId, prompts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save prompts.");

      setFinishingMessage("Running your first AI visibility scan — this can take a moment…");
      const runRes = await fetch("/api/geo/visibility/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId }),
      });
      const runData = await runRes.json();

      if (runRes.ok && runData.result?.promptsSucceeded > 0) {
        setFinishingMessage("Generating your first opportunities…");
        await fetch("/api/geo/opportunities/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business_id: businessId }),
        });
      }

      setStep("done");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("prompts");
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <span className="text-[#0F172A] font-black text-xl tracking-tight">
            Customers<span className="text-[#2563EB]">.Direct</span>
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-10" style={{ boxShadow: "0 8px 40px rgba(15,23,42,0.08)" }}>
          {error && (
            <div className="flex items-start gap-2 text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 mb-6">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              {error}
            </div>
          )}

          {step === "url" && (
            <form onSubmit={handleScan}>
              <h1 className="text-2xl font-black text-[#0F172A] mb-2">What&apos;s your website?</h1>
              <p className="text-sm text-[#64748B] mb-6">
                We&apos;ll scan it for the basics — you&apos;ll confirm everything before we save it.
              </p>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourbusiness.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] mb-6"
              />
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold py-3.5 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm"
              >
                Scan My Website
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>
          )}

          {step === "scanning" && (
            <div className="py-12 flex flex-col items-center text-center">
              <Loader2 size={32} className="animate-spin text-[#2563EB] mb-4" />
              <p className="text-sm font-semibold text-[#0F172A]">Working on it…</p>
              <p className="text-xs text-[#94A3B8] mt-1">This uses real data — no placeholder results.</p>
            </div>
          )}

          {step === "confirm" && (
            <form onSubmit={handleConfirmBusiness}>
              <h1 className="text-2xl font-black text-[#0F172A] mb-2">Confirm your business</h1>
              <p className="text-sm text-[#64748B] mb-6">
                {scan?.name || scan?.description
                  ? "We found some of this automatically — please check it's correct."
                  : "We couldn't auto-detect much from your site — please fill this in."}
              </p>

              <div className="flex flex-col gap-4">
                <Field label="Business name">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                  />
                </Field>

                <Field label="Industry / what you do" hint="e.g. HVAC company, dentist, law firm">
                  <input
                    required
                    list="industry-suggestions"
                    value={form.industry}
                    onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                  />
                  <datalist id="industry-suggestions">
                    {INDUSTRY_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </Field>

                <Field label="Description" hint="How AI should understand what you offer">
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] resize-none"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="City">
                    <input
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                    />
                  </Field>
                  <Field label="State / Region">
                    <input
                      value={form.region}
                      onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                    />
                  </Field>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-7 flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold py-3.5 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm"
              >
                Continue
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>
          )}

          {step === "competitors" && (
            <div>
              <h1 className="text-2xl font-black text-[#0F172A] mb-2">Who are your competitors?</h1>
              <p className="text-sm text-[#64748B] mb-6">
                {suggestions.length > 0
                  ? "We found a few nearby businesses in your category — confirm the ones worth tracking, or add your own."
                  : "We couldn't find suggestions automatically — add a few competitors yourself."}
              </p>

              <div className="flex flex-col gap-2 mb-4">
                {suggestions.map((s) => {
                  const checked = selectedCompetitors.some((c) => c.name === s.name);
                  return (
                    <label
                      key={s.name}
                      className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                        checked ? "border-[#2563EB] bg-[#EFF6FF]" : "border-gray-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCompetitor(s)}
                        className="accent-[#2563EB]"
                      />
                      <span className="text-sm font-medium text-[#0F172A]">{s.name}</span>
                      {s.domain && <span className="text-xs text-[#94A3B8] ml-auto">{s.domain}</span>}
                    </label>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  value={customCompetitor}
                  onChange={(e) => setCustomCompetitor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomCompetitor();
                    }
                  }}
                  placeholder="Add a competitor by name"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
                <button
                  type="button"
                  onClick={addCustomCompetitor}
                  className="shrink-0 flex items-center gap-1.5 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0F172A] hover:bg-gray-50"
                >
                  <Plus size={15} aria-hidden="true" />
                  Add
                </button>
              </div>

              <button
                type="button"
                onClick={handleConfirmCompetitors}
                className="w-full mt-7 flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold py-3.5 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm"
              >
                Continue
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {step === "prompts" && (
            <div>
              <h1 className="text-2xl font-black text-[#0F172A] mb-2">Prompts we&apos;ll track</h1>
              <p className="text-sm text-[#64748B] mb-6">
                These are the buyer-intent questions we&apos;ll ask AI models on your behalf. Remove any
                that don&apos;t fit.
              </p>

              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto mb-6 pr-1">
                {prompts.map((p, i) => (
                  <div key={`${p.prompt}-${i}`} className="flex items-start gap-3 border border-gray-200 rounded-xl px-4 py-3">
                    <span className="text-sm text-[#0F172A] flex-1">{p.prompt}</span>
                    <button
                      type="button"
                      onClick={() => removePrompt(i)}
                      aria-label="Remove prompt"
                      className="shrink-0 text-[#94A3B8] hover:text-[#DC2626]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#94A3B8] mb-4">{prompts.length} prompts will be tracked.</p>

              <button
                type="button"
                onClick={handleConfirmPrompts}
                className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold py-3.5 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm"
              >
                Save & Run First Scan
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {step === "finishing" && (
            <div className="py-12 flex flex-col items-center text-center">
              <Loader2 size={32} className="animate-spin text-[#2563EB] mb-4" />
              <p className="text-sm font-semibold text-[#0F172A]">{finishingMessage}</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Real AI providers are being queried live — this can take up to a minute.
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="py-12 flex flex-col items-center text-center">
              <CheckCircle2 size={36} className="text-[#16A34A] mb-4" />
              <p className="text-base font-bold text-[#0F172A]">You&apos;re all set.</p>
              <p className="text-xs text-[#94A3B8] mt-1">Taking you to your dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-[#94A3B8] mt-1">{hint}</p>}
    </div>
  );
}
