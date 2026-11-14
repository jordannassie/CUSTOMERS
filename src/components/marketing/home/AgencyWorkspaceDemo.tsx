"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Pause, Play, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ExampleTag } from "./example";

// The live site's agency workspace demo, restyled: made-up clients, no network calls. It walks through the clients,
// adds a new one, then starts over. Clicking anything stops it; the button starts it again.
type Client = { name: string; initials: string; score: number; named: string; competitors: number; actions: number; scanned: string; trend: number[] };

const CLIENTS: Client[] = [
  { name: "Northpeak Dental", initials: "ND", score: 74, named: "9 of 12", competitors: 4, actions: 5, scanned: "3 hours ago", trend: [55, 60, 58, 65, 70, 68, 74] },
  { name: "Ridgeline HVAC", initials: "RH", score: 61, named: "7 of 10", competitors: 3, actions: 8, scanned: "Yesterday", trend: [50, 52, 55, 58, 57, 60, 61] },
  { name: "Clearwater Law", initials: "CL", score: 82, named: "11 of 13", competitors: 5, actions: 3, scanned: "6 hours ago", trend: [60, 65, 68, 72, 75, 80, 82] },
];
const NEW_CLIENT: Client = { name: "Summit Fitness", initials: "SF", score: 43, named: "4 of 10", competitors: 3, actions: 11, scanned: "Just now", trend: [35, 38, 36, 39, 41, 42, 43] };

// Each step of the walk-through: which client is open, whether the new one is listed, whether the add form shows.
type Frame = { open: number; added: boolean; form: boolean; ms: number };
const SCRIPT: Frame[] = [
  { open: 0, added: false, form: false, ms: 2200 },
  { open: 1, added: false, form: false, ms: 2200 },
  { open: 2, added: false, form: false, ms: 2200 },
  { open: 2, added: false, form: true, ms: 2000 },
  { open: 3, added: true, form: false, ms: 2600 },
];

// True when the visitor asks for less motion; false while rendering on the server.
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(MOTION_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
}

/** The client's score over the last few scans, as a small line (decoration: the number beside it says the same). */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((v, i) => `${(i * 64) / (values.length - 1)},${22 - ((v - min) / (max - min || 1)) * 18}`).join(" ");
  return (
    <svg viewBox="0 0 64 24" width="64" height="24" aria-hidden="true" className="shrink-0 overflow-visible">
      <polyline points={points} fill="none" className="stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Initials({ client, active }: { client: Client; active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold", active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}
    >
      {client.initials}
    </span>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tracking-[-0.02em] tabular-nums">{children}</span>
    </div>
  );
}

export function AgencyWorkspaceDemo() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  // "auto" plays unless the visitor asks for less motion; "on" and "off" are the visitor's own choice.
  const [mode, setMode] = useState<"auto" | "on" | "off">("auto");
  const [manual, setManual] = useState<Frame | null>(null);
  const playing = mode === "on" || (mode === "auto" && !reduced);

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setStep((s) => (s + 1) % SCRIPT.length), SCRIPT[step].ms);
    return () => clearTimeout(id);
  }, [playing, step]);

  const frame = manual ?? SCRIPT[step];
  const clients = frame.added ? [...CLIENTS, NEW_CLIENT] : CLIENTS;
  const open = clients[Math.min(frame.open, clients.length - 1)];

  function take(next: Frame) {
    setMode("off");
    setManual(next);
  }

  function togglePlay() {
    if (playing) return setMode("off");
    setManual(null);
    setStep(0);
    setMode("on");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface" aria-label="Example agency workspace" role="group">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-primary-tint text-xs font-semibold text-primary-hover">
          A
        </span>
        <span className="text-sm font-semibold">Apex Marketing</span>
        <span className="ml-auto">
          <ExampleTag />
        </span>
      </div>

      <div className="grid sm:grid-cols-[calc(190px*var(--px,1))_minmax(0,1fr)]">
        <div className="flex flex-col gap-1 border-b border-border p-2 sm:border-r sm:border-b-0">
          <p className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">Your clients</p>
          {clients.map((c, i) => {
            const active = !frame.form && c === open;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => take({ open: i, added: frame.added, form: false, ms: 0 })}
                aria-pressed={active}
                className={cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[length:calc(13px*var(--px,1))] transition-colors", active ? "bg-primary-tint font-semibold text-primary-hover" : "hover:bg-muted")}
              >
                <Initials client={c} active={active} />
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
          {!frame.added && (
            <Button type="button" variant="outline" size="sm" className={cn("mt-1 w-fit", frame.form && "border-primary text-primary-hover")} onClick={() => take({ ...frame, form: true, ms: 0 })}>
              <Plus aria-hidden="true" />
              Add client
            </Button>
          )}
        </div>

        <div className="flex min-h-[calc(248px*var(--px,1))] flex-col gap-2.5 p-4">
          {frame.form ? (
            <div className="flex flex-col gap-2.5">
              <p className="text-sm font-semibold">Add a client business</p>
              <p className="rounded-md border border-input px-3 py-2 text-sm">Summit Fitness</p>
              <p className="rounded-md border border-input px-3 py-2 text-sm text-muted-foreground">summitfitness.com</p>
              <Button type="button" className="w-fit" onClick={() => take({ open: 3, added: true, form: false, ms: 0 })}>
                Add client
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold">{open.name}</p>
              <div className="grid grid-cols-2 gap-2.5">
                <Stat label="Visibility score">
                  <span className="flex items-end justify-between gap-2">
                    {open.score}
                    <Sparkline values={open.trend} />
                  </span>
                </Stat>
                <Stat label="Questions that named them">{open.named}</Stat>
                <Stat label="Competitors tracked">{open.competitors}</Stat>
                <Stat label="Open actions">{open.actions}</Stat>
              </div>
              <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">Last scan: {open.scanned}</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <p className="text-xs text-muted-foreground">Made-up clients, to show how it works</p>
        <Button type="button" variant="ghost" size="sm" onClick={togglePlay} aria-label={playing ? "Pause the demo" : "Play the demo"}>
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {playing ? "Pause" : "Play"}
        </Button>
      </div>
    </div>
  );
}
