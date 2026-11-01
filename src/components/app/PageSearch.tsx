"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "cn";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { APP_NAV, type NavItem } from "./nav";

// Pages that live under a menu item, so search finds them too.
const EXTRA: { label: string; href: string; hint: string }[] = [
  { label: "Usage", href: "/settings/usage", hint: "Billing" },
  { label: "Buy credits", href: "/settings/credits", hint: "Billing" },
  { label: "Manage competitors", href: "/competitors/manage", hint: "Competitors" },
];

type Entry = { label: string; href: string; hint: string; icon?: NavItem["icon"] };

/** The top bar's search (Ctrl K): finds any app page by name and opens it. */
export function PageSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const entries = useMemo<Entry[]>(() => {
    const all: Entry[] = [...APP_NAV.map((i) => ({ label: i.label, href: i.href, hint: "Page", icon: i.icon })), ...EXTRA];
    const q = query.trim().toLowerCase();
    return q ? all.filter((e) => e.label.toLowerCase().includes(q) || e.hint.toLowerCase().includes(q)) : all;
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto hidden h-8 w-[280px] items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 text-[13px] text-text-hint outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:flex"
      >
        <Search className="size-3.5" aria-hidden="true" />
        Search pages
        <kbd className="ml-auto rounded-sm border border-border bg-surface px-1.5 font-mono text-[10.5px] text-muted-foreground">Ctrl K</kbd>
      </button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogTitle className="sr-only">Search pages</DialogTitle>
          <DialogDescription className="sr-only">Type a page name, then press Enter to open it.</DialogDescription>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-text-hint" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, entries.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
                if (e.key === "Enter" && entries[index]) go(entries[index].href);
              }}
              placeholder="Go to a page"
              aria-label="Search pages"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-text-hint"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto p-1.5" role="listbox" aria-label="Pages">
            {entries.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No page called &ldquo;{query}&rdquo;.</li>}
            {entries.map((e, i) => {
              const Icon = e.icon;
              return (
                <li key={e.href} role="option" aria-selected={i === index}>
                  <button
                    type="button"
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => go(e.href)}
                    className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm", i === index && "bg-muted")}
                  >
                    {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden="true" /> : <span className="size-4" />}
                    {e.label}
                    <span className="ml-auto text-xs text-text-hint">{e.hint}</span>
                    {i === index && <CornerDownLeft className="size-3.5 text-text-hint" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
