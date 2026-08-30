"use client";

/**
 * AgencyWorkspaceDemo
 * Animated agency dashboard illustration — fictional brands, no network calls.
 * Reused on the homepage AgencySection and the /agency page.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { PauseCircle, PlayCircle, Plus } from "lucide-react";

// ─── Brand data (all fictional / illustrative) ────────────────────────────────

interface Brand {
  id: string;
  name: string;
  initials: string;
  color: string;
  aiScore: number;
  promptsWon: string;
  competitors: number;
  opportunities: number;
  lastScan: string;
  trend: number[];
}

const BRANDS: Brand[] = [
  {
    id: "northpeak",
    name: "Northpeak Dental",
    initials: "ND",
    color: "#2563EB",
    aiScore: 74,
    promptsWon: "9/12",
    competitors: 4,
    opportunities: 5,
    lastScan: "3 hrs ago",
    trend: [55, 60, 58, 65, 70, 68, 74],
  },
  {
    id: "ridgeline",
    name: "Ridgeline HVAC",
    initials: "RH",
    color: "#059669",
    aiScore: 61,
    promptsWon: "7/10",
    competitors: 3,
    opportunities: 8,
    lastScan: "1 day ago",
    trend: [50, 52, 55, 58, 57, 60, 61],
  },
  {
    id: "clearwater",
    name: "Clearwater Law",
    initials: "CL",
    color: "#7C3AED",
    aiScore: 82,
    promptsWon: "11/13",
    competitors: 5,
    opportunities: 3,
    lastScan: "6 hrs ago",
    trend: [60, 65, 68, 72, 75, 80, 82],
  },
];

const NEW_BRAND: Brand = {
  id: "summit",
  name: "Summit Fitness",
  initials: "SF",
  color: "#EA580C",
  aiScore: 43,
  promptsWon: "4/10",
  competitors: 3,
  opportunities: 11,
  lastScan: "Just now",
  trend: [35, 38, 36, 39, 41, 42, 43],
};

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ points }: { points: number[] }) {
  const w = 40, h = 18;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map((p) => h - ((p - min) / range) * (h - 4) - 2);
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const last = xs.length - 1;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="mb-0.5">
      <polyline points={pts} fill="none" stroke="#4F8EF7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[last]} cy={ys[last]} r="2.2" fill="#4F8EF7" />
    </svg>
  );
}

// ─── Brand avatar ─────────────────────────────────────────────────────────────

function Avatar({ brand, size = 32 }: { brand: Brand; size?: number }) {
  return (
    <div
      className="rounded-lg flex items-center justify-center shrink-0 font-bold text-white"
      style={{ width: size, height: size, background: brand.color, fontSize: Math.round(size * 0.33) }}
      aria-hidden="true"
    >
      {brand.initials}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AgencyWorkspaceDemo() {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [brands, setBrands] = useState<Brand[]>(BRANDS);
  const [selectedId, setSelectedId] = useState(BRANDS[0].id);
  const [showForm, setShowForm] = useState(false);
  const [pulsingAdd, setPulsingAdd] = useState(false);
  const [newSlideIn, setNewSlideIn] = useState(false);
  const [paused, setPaused] = useState(prefersReduced);
  const [userPaused, setUserPaused] = useState(prefersReduced);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);

  const selected = brands.find((b) => b.id === selectedId) ?? brands[0];

  // Pause on hidden tab
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setPaused(true);
      else if (!userPaused) setPaused(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [userPaused]);

  // Cleanup
  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Animation sequence
  useEffect(() => {
    if (paused || prefersReduced) return;
    clearTimer();

    const runId = ++runIdRef.current;
    let dead = false;
    const isAlive = () => !dead && runIdRef.current === runId && !paused;

    function delay(ms: number): Promise<void> {
      return new Promise((res) => {
        timerRef.current = setTimeout(res, ms);
      });
    }

    async function seq() {
      // Cycle existing brands
      for (const b of BRANDS) {
        if (!isAlive()) return;
        setSelectedId(b.id);
        await delay(2000);
      }

      // Pulse + Add Brand
      if (!isAlive()) return;
      setPulsingAdd(true);
      await delay(700);
      if (!isAlive()) return;
      setPulsingAdd(false);

      // Show form
      if (!isAlive()) return;
      setShowForm(true);
      await delay(1800);

      // Add brand
      if (!isAlive()) return;
      setShowForm(false);
      setNewSlideIn(true);
      setBrands([...BRANDS, NEW_BRAND]);
      await delay(380);
      if (!isAlive()) return;
      setNewSlideIn(false);
      setSelectedId(NEW_BRAND.id);
      await delay(2200);

      // Cycle all brands
      for (const b of [...BRANDS, NEW_BRAND]) {
        if (!isAlive()) return;
        setSelectedId(b.id);
        await delay(1600);
      }

      // Reset
      if (!isAlive()) return;
      setBrands(BRANDS);
      setSelectedId(BRANDS[0].id);
      setShowForm(false);
      setNewSlideIn(false);
      setPulsingAdd(false);
    }

    seq();
    return () => {
      dead = true;
      clearTimer();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, prefersReduced]);

  const handleBrandClick = (id: string) => {
    setSelectedId(id);
    setUserPaused(true);
    setPaused(true);
  };

  const handleAddClick = () => {
    setUserPaused(true);
    setPaused(true);
    if (!brands.find((b) => b.id === NEW_BRAND.id)) setShowForm((v) => !v);
  };

  const handleConfirmAdd = () => {
    setShowForm(false);
    setNewSlideIn(true);
    setBrands([...BRANDS, NEW_BRAND]);
    setTimeout(() => {
      setNewSlideIn(false);
      setSelectedId(NEW_BRAND.id);
    }, 350);
  };

  const handleTogglePlay = () => {
    if (userPaused) {
      // Reset and resume
      setBrands(BRANDS);
      setSelectedId(BRANDS[0].id);
      setShowForm(false);
      setNewSlideIn(false);
      setPulsingAdd(false);
      setUserPaused(false);
      setPaused(false);
    } else {
      setUserPaused(true);
      setPaused(true);
    }
  };

  return (
    <div
      className="bg-[#1A1A1A] rounded-2xl border border-white/10 overflow-hidden"
      style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      aria-label="Agency dashboard — illustrative sample data"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: "#0866F5" }}
          aria-hidden="true"
        >
          A
        </div>
        <span className="text-[14px] font-bold text-white tracking-tight">Apex Marketing Co.</span>
        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-[#4F8EF7] bg-[#4F8EF7]/15 border border-[#4F8EF7]/30 px-2 py-0.5 rounded-md whitespace-nowrap">
          Agency Workspace
        </span>
      </div>

      {/* ── Body ── */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-[168px] shrink-0 border-r border-white/8 py-3 px-2 flex flex-col">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2 px-2">
            Your Brands
          </p>
          <div className="flex flex-col gap-0.5 flex-1">
            {brands.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => handleBrandClick(brand.id)}
                className={`flex items-center gap-2.5 px-2 py-2 rounded-xl w-full text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
                  brand.id === selectedId ? "bg-white/12" : "hover:bg-white/6"
                }`}
                style={{
                  transition: "opacity 350ms ease, transform 350ms ease, background-color 150ms",
                  opacity: newSlideIn && brand.id === NEW_BRAND.id ? 0 : 1,
                  transform: newSlideIn && brand.id === NEW_BRAND.id ? "translateY(6px)" : "translateY(0)",
                }}
              >
                <Avatar brand={brand} size={30} />
                <span
                  className={`text-[12px] font-semibold truncate ${
                    brand.id === selectedId ? "text-white" : "text-white/45"
                  }`}
                >
                  {brand.name}
                </span>
                {brand.id === selectedId && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4F8EF7] shrink-0" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>

          {/* + Add Brand */}
          <button
            type="button"
            onClick={handleAddClick}
            aria-label="Add a brand"
            className={`mt-2 mx-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
              pulsingAdd
                ? "border-[#4F8EF7] text-[#4F8EF7] bg-[#4F8EF7]/15"
                : "border-white/15 text-white/40 hover:text-white/70 hover:border-white/30"
            }`}
          >
            <Plus size={10} aria-hidden="true" />
            Add Brand
          </button>
        </div>

        {/* Main panel */}
        <div className="flex-1 p-3 flex flex-col gap-2">
          {showForm ? (
            <div className="flex flex-col gap-2 h-full justify-center px-1">
              <p className="text-[11px] font-bold text-white/60 mb-1">Add a client brand</p>
              <div className="bg-white/8 rounded-lg px-3 py-2 border border-white/12 text-[12px] text-white/80">
                Summit Fitness
              </div>
              <div className="bg-white/8 rounded-lg px-3 py-2 border border-white/12 text-[12px] text-white/45">
                summitfitness.com
              </div>
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="mt-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold rounded-lg px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              >
                Add Brand
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : selected ? (
            <>
              <div className="flex items-center gap-2 mb-0.5">
                <Avatar brand={selected} size={20} />
                <span className="text-[12px] font-bold text-white truncate">{selected.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* AI Visibility */}
                <div className="bg-white/6 rounded-xl border border-white/8 px-3 py-2.5">
                  <p className="text-[8.5px] text-white/35 uppercase tracking-wide font-semibold mb-1">AI Visibility</p>
                  <div className="flex items-end gap-2">
                    <span className="text-[22px] font-bold text-white leading-none">{selected.aiScore}</span>
                    <Sparkline points={selected.trend} />
                  </div>
                </div>
                {/* Prompts Won */}
                <div className="bg-white/6 rounded-xl border border-white/8 px-3 py-2.5">
                  <p className="text-[8.5px] text-white/35 uppercase tracking-wide font-semibold mb-1">Prompts Won</p>
                  <span className="text-[22px] font-bold text-white leading-none">{selected.promptsWon}</span>
                </div>
                {/* Competitors */}
                <div className="bg-white/6 rounded-xl border border-white/8 px-3 py-2.5">
                  <p className="text-[8.5px] text-white/35 uppercase tracking-wide font-semibold mb-1">Competitors</p>
                  <span className="text-[18px] font-bold text-white leading-none">{selected.competitors} tracked</span>
                </div>
                {/* Opportunities */}
                <div className="bg-white/6 rounded-xl border border-white/8 px-3 py-2.5">
                  <p className="text-[8.5px] text-white/35 uppercase tracking-wide font-semibold mb-1">Open Opps</p>
                  <span className="text-[22px] font-bold text-white leading-none">{selected.opportunities}</span>
                </div>
              </div>
              <div className="bg-white/6 rounded-xl border border-white/8 px-3 py-2">
                <p className="text-[8.5px] text-white/35 uppercase tracking-wide font-semibold mb-0.5">Last Scan</p>
                <span className="text-[15px] font-bold text-white">{selected.lastScan}</span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between border-t border-white/8 px-4 py-2">
        <p className="text-[9.5px] text-white/22 italic">Interactive demo · Sample data</p>
        {!prefersReduced && (
          <button
            type="button"
            onClick={handleTogglePlay}
            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/55 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded"
            aria-label={userPaused ? "Resume autoplay" : "Pause autoplay"}
          >
            {userPaused ? (
              <><PlayCircle size={12} aria-hidden="true" />{" "}Resume</>
            ) : (
              <><PauseCircle size={12} aria-hidden="true" />{" "}Pause</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
