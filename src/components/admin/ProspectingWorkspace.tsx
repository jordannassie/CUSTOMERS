"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  FolderPlus,
  Loader2,
  MapPin,
  Phone,
  Search,
  Star,
} from "lucide-react";
import ProspectDrawer from "@/components/admin/ProspectDrawer";
import ProspectingSidebar from "@/components/admin/ProspectingSidebar";
import { useDailyCallCounter } from "@/components/admin/useDailyCallCounter";
import {
  PROSPECT_STATUSES,
  type ProspectSearchDepth,
  type ProspectSearchMetadata,
  type ProspectSearchResult,
  type ProspectingFolder,
  type ProspectingLead,
} from "@/types/prospecting";

const POPULAR_SEARCHES = [
  "Med Spas in Dallas TX",
  "Dentists in Frisco TX",
  "Roofers in Fort Worth TX",
  "HVAC companies in Plano TX",
  "Personal Injury Lawyers in Dallas TX",
];

function suggestedFolderName(query: string) {
  const [category, location] = query.trim().split(/\s+in\s+/i);
  if (!location) return query.trim().replace(/\b\w/g, (letter) => letter.toUpperCase()).slice(0, 60);
  const cleanLocation = location.replace(/,?\s+[A-Z]{2}(?:\s+\d{5})?$/i, "").trim();
  const cleanCategory = category.replace(/\b\w/g, (letter) => letter.toUpperCase());
  return `${cleanCategory} — ${cleanLocation}`.slice(0, 80);
}

function externalUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function ResultActions({
  result,
  onCall,
}: {
  result: ProspectSearchResult;
  onCall: (placeId: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {result.phone && (
        <a href={`tel:${result.phone}`} onClick={() => onCall(result.placeId)} className="rounded-md p-2 text-[#2563EB] hover:bg-blue-50" aria-label={`Call ${result.businessName}`}>
          <Phone size={16} />
        </a>
      )}
      {result.website && (
        <a href={externalUrl(result.website)} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={`Open ${result.businessName} website`}>
          <ArrowUpRight size={16} />
        </a>
      )}
      {result.mapsUrl && (
        <a href={result.mapsUrl} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={`Open ${result.businessName} in Google Maps`}>
          <MapPin size={16} />
        </a>
      )}
    </div>
  );
}

export default function ProspectingWorkspace() {
  const router = useRouter();
  const calls = useDailyCallCounter();
  const [view, setView] = useState<"search" | "saved">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProspectSearchResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [searchDepth, setSearchDepth] = useState<ProspectSearchDepth>("deep");
  const [searchMetadata, setSearchMetadata] = useState<ProspectSearchMetadata | null>(null);
  const [searchError, setSearchError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [prospects, setProspects] = useState<ProspectingLead[]>([]);
  const [folders, setFolders] = useState<ProspectingFolder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeFolder, setActiveFolder] = useState("all");
  const [targetFolder, setTargetFolder] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [savedSearch, setSavedSearch] = useState("");
  const [followUpsOnly, setFollowUpsOnly] = useState(false);
  const [sort, setSort] = useState("newest");
  const [drawerProspect, setDrawerProspect] = useState<ProspectingLead | null>(null);
  const [currentTime] = useState(() => Date.now());

  const loadData = useCallback(async () => {
    try {
      const [prospectsResponse, foldersResponse] = await Promise.all([
        fetch("/api/admin/prospects"),
        fetch("/api/admin/prospect-folders"),
      ]);
      if (prospectsResponse.status === 401 || foldersResponse.status === 401) {
        router.push("/admin");
        return;
      }
      const [prospectsData, foldersData] = await Promise.all([
        prospectsResponse.json(),
        foldersResponse.json(),
      ]);
      setProspects(prospectsData.prospects ?? []);
      setFolders(foldersData.folders ?? []);
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const savedPlaceIds = useMemo(
    () => new Set(prospects.map((prospect) => prospect.google_place_id)),
    [prospects],
  );

  const filteredProspects = useMemo(() => {
    const searchTerm = savedSearch.trim().toLowerCase();
    const filtered = prospects.filter((prospect) => {
      if (activeFolder === "unassigned" && prospect.folder_id) return false;
      if (activeFolder !== "all" && activeFolder !== "unassigned" && prospect.folder_id !== activeFolder) return false;
      if (statusFilter !== "all" && prospect.status !== statusFilter) return false;
      if (followUpsOnly && (!prospect.next_follow_up_at || new Date(prospect.next_follow_up_at).getTime() > currentTime)) return false;
      if (
        searchTerm &&
        !`${prospect.business_name} ${prospect.phone ?? ""}`.toLowerCase().includes(searchTerm)
      ) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === "reviews") return (b.review_count ?? 0) - (a.review_count ?? 0);
      if (sort === "opportunity") return b.lead_score - a.lead_score;
      if (sort === "name") return a.business_name.localeCompare(b.business_name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [activeFolder, currentTime, followUpsOnly, prospects, savedSearch, sort, statusFilter]);

  async function runSearch(event?: FormEvent) {
    event?.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchError("");
    setSaveMessage("");
    setSelected(new Set());
    setSearchMetadata(null);
    try {
      const response = await fetch("/api/admin/prospects/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), depth: searchDepth }),
      });
      if (response.status === 401) {
        router.push("/admin");
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Search failed.");
      setResults(data.businesses ?? []);
      setSearchMetadata(data.metadata ?? null);
      setNewFolderName(suggestedFolderName(query));
    } catch (error) {
      setResults([]);
      setSearchError(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function toggleSelection(placeId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  async function createFolder(): Promise<string | null> {
    if (!newFolderName.trim() || creatingFolder) return null;
    setCreatingFolder(true);
    try {
      const response = await fetch("/api/admin/prospect-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName, searchQuery: query }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create folder.");
      setFolders((current) => [data.folder, ...current]);
      setTargetFolder(data.folder.id);
      setNewFolderName("");
      return data.folder.id as string;
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not create folder.");
      return null;
    } finally {
      setCreatingFolder(false);
    }
  }

  async function saveResults(items: ProspectSearchResult[]) {
    if (items.length === 0) {
      setSaveMessage("Select at least one business first.");
      return;
    }
    let folderId = targetFolder;
    if (!folderId && newFolderName.trim()) {
      folderId = (await createFolder()) ?? "";
    }
    if (!folderId) {
      setSaveMessage("Choose or create a Calling List first.");
      return;
    }
    setSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/admin/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospects: items, folderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save prospects.");
      const updates = [
        data.saved ? `${data.saved} saved` : "",
        data.moved ? `${data.moved} moved to the Calling List` : "",
        data.existing ? `${data.existing} already in this list` : "",
      ].filter(Boolean);
      setSaveMessage(updates.length ? `${updates.join(" · ")}.` : "Calling List is already up to date.");
      setSelected(new Set());
      await loadData();
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not save prospects.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSelectedSaved() {
    const placeIds = results
      .filter((item) => selected.has(item.placeId) && savedPlaceIds.has(item.placeId))
      .map((item) => item.placeId);
    if (placeIds.length === 0) {
      setSaveMessage("Select saved businesses to remove.");
      return;
    }
    if (!window.confirm(`Remove ${placeIds.length} saved prospect${placeIds.length === 1 ? "" : "s"}? The Google search results will remain visible.`)) return;

    setSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/admin/prospects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not remove saved prospects.");
      setSaveMessage(`${data.deleted} saved prospect${data.deleted === 1 ? "" : "s"} removed.`);
      setSelected(new Set());
      await loadData();
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not remove saved prospects.");
    } finally {
      setSaving(false);
    }
  }

  async function patchProspect(id: string, patch: Record<string, string | null>) {
    const response = await fetch(`/api/admin/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Update failed.");
    setProspects((current) => current.map((item) => item.id === id ? data.prospect : item));
    setDrawerProspect((current) => current?.id === id ? data.prospect : current);
    if ("folder_id" in patch) {
      const foldersResponse = await fetch("/api/admin/prospect-folders");
      const foldersData = await foldersResponse.json();
      setFolders(foldersData.folders ?? []);
    }
  }

  async function renameFolder(folder: ProspectingFolder) {
    const name = window.prompt("Rename folder", folder.name)?.trim();
    if (!name || name === folder.name) return;
    const response = await fetch(`/api/admin/prospect-folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.ok) await loadData();
  }

  async function deleteFolder(folder: ProspectingFolder) {
    if (!window.confirm(`Delete "${folder.name}"? Its prospects will become unassigned.`)) return;
    const response = await fetch(`/api/admin/prospect-folders/${folder.id}`, { method: "DELETE" });
    if (response.ok) {
      if (activeFolder === folder.id) setActiveFolder("all");
      if (targetFolder === folder.id) setTargetFolder("");
      await loadData();
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  const inputClass = "rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-[#F8FAFC] lg:pl-64">
      <ProspectingSidebar
        folders={folders}
        activeFolder={activeFolder}
        onFolderChange={(folder) => {
          setActiveFolder(folder);
          if (folder !== "all") setTargetFolder(folder);
          setView("saved");
        }}
        onRenameFolder={renameFolder}
        onDeleteFolder={deleteFolder}
        callCount={calls.count}
        callGoal={calls.goal}
        onIncrement={calls.manualIncrement}
        onDecrement={calls.decrement}
      />

      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-7">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-950 sm:text-2xl">Prospecting</h1>
            <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">Find, organize, and call your next customers.</p>
          </div>
          <button onClick={logout} className="text-sm font-semibold text-slate-500 hover:text-slate-950">Logout</button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8">
        <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button onClick={() => setView("search")} className={`rounded-md px-4 py-2 text-sm font-bold transition ${view === "search" ? "bg-[#2563EB] text-white" : "text-slate-500 hover:text-slate-950"}`}>
            Find Businesses
          </button>
          <button onClick={() => setView("saved")} className={`rounded-md px-4 py-2 text-sm font-bold transition ${view === "saved" ? "bg-[#2563EB] text-white" : "text-slate-500 hover:text-slate-950"}`}>
            Saved Prospects <span className="ml-1 opacity-70">{prospects.length}</span>
          </button>
        </div>

        {view === "search" ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <h2 className="text-lg font-black text-slate-950">Find Businesses</h2>
              <p className="mt-1 text-sm text-slate-500">Search Google for businesses to contact.</p>
              <form onSubmit={runSearch} className="mt-5 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Try "Med Spa in Dallas TX"' maxLength={200} className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-base text-slate-950 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100" />
                </div>
                <button type="submit" disabled={searching || !query.trim()} className="flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {searching ? <><Loader2 size={17} className="animate-spin" /> Searching areas…</> : "Search"}
                </button>
              </form>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Search depth</span>
                <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {([
                    ["quick", "Quick"],
                    ["standard", "Standard"],
                    ["deep", "All Available"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={searching}
                      onClick={() => setSearchDepth(value)}
                      className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                        searchDepth === value
                          ? "bg-white text-[#2563EB] shadow-sm"
                          : "text-slate-500 hover:text-slate-950"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400">
                  {searchDepth === "quick"
                    ? "Fast single search"
                    : searchDepth === "standard"
                      ? "Searches several city areas"
                      : "Scans and subdivides the full city"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((suggestion) => (
                  <button key={suggestion} onClick={() => setQuery(suggestion)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]">
                    {suggestion}
                  </button>
                ))}
              </div>
            </section>

            {searchError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{searchError}</div>}

            {!searching && results.length === 0 && !searchError && (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#2563EB]"><Search size={22} /></div>
                <h2 className="text-xl font-black text-slate-950">Find your next customers.</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Search any business category and city to build a focused calling list.</p>
              </section>
            )}

            {results.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                    <div>
                      <h2 className="font-black text-slate-950">{results.length} businesses found</h2>
                      <p className="text-sm text-slate-500">
                        {selected.size} selected · {results.filter((item) => savedPlaceIds.has(item.placeId)).length} already saved
                        {searchMetadata?.expanded ? ` · ${searchMetadata.areasSearched} areas searched` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <select value={targetFolder} onChange={(event) => setTargetFolder(event.target.value)} className={inputClass}>
                        <option value="" disabled>Choose a Calling List</option>
                        {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                      </select>
                      <div className="flex">
                        <input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="New folder name" className={`${inputClass} min-w-0 rounded-r-none`} />
                        <button onClick={() => void createFolder()} disabled={!newFolderName.trim() || creatingFolder} className="flex items-center gap-2 rounded-r-lg bg-slate-950 px-3 text-xs font-bold text-white disabled:opacity-40" aria-label="Create and select Calling List"><FolderPlus size={16} /> Create List</button>
                      </div>
                      <button onClick={() => void saveResults(results.filter((item) => selected.has(item.placeId)))} disabled={saving || selected.size === 0 || (!targetFolder && !newFolderName.trim())} className="rounded-lg border border-[#2563EB] px-4 py-2.5 text-sm font-bold text-[#2563EB] hover:bg-blue-50 disabled:opacity-40">
                        Save Selected
                      </button>
                      <button onClick={() => void saveResults(results)} disabled={saving || (!targetFolder && !newFolderName.trim())} className="rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40">
                        {saving ? "Saving…" : "Save All Results"}
                      </button>
                      {results.some((item) => selected.has(item.placeId) && savedPlaceIds.has(item.placeId)) && (
                        <button onClick={() => void removeSelectedSaved()} disabled={saving} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-40">
                          Remove Selected Saved
                        </button>
                      )}
                    </div>
                  </div>
                  {!targetFolder && !newFolderName.trim() && (
                    <p className="mt-3 text-sm font-semibold text-amber-700">
                      Choose an existing Calling List, or type a new list name first.
                    </p>
                  )}
                  {saveMessage && <p className="mt-3 text-sm font-semibold text-[#2563EB]">{saveMessage}</p>}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3"><input type="checkbox" aria-label="Select all results" checked={results.length > 0 && results.every((item) => selected.has(item.placeId))} onChange={(event) => setSelected(event.target.checked ? new Set(results.map((item) => item.placeId)) : new Set())} /></th>
                        <th className="px-5 py-3">Business</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Rating</th><th className="px-5 py-3">Opportunity</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result) => {
                        const isSaved = savedPlaceIds.has(result.placeId);
                        return (
                          <tr key={result.placeId} className="border-t border-slate-100 hover:bg-slate-50/70">
                            <td className="px-5 py-4"><input type="checkbox" checked={selected.has(result.placeId)} onChange={() => toggleSelection(result.placeId)} aria-label={`Select ${result.businessName}`} /></td>
                            <td className="max-w-xs px-5 py-4"><p className="font-bold text-slate-950">{result.businessName}</p><p className="mt-1 truncate text-xs text-slate-500">{result.category} · {result.address}</p></td>
                            <td className="px-5 py-4 text-slate-700">{result.phone ?? "—"}</td>
                            <td className="px-5 py-4"><span className="inline-flex items-center gap-1 font-semibold text-slate-700"><Star size={14} className="fill-amber-400 text-amber-400" />{result.rating ?? "—"} <span className="font-normal text-slate-400">({result.reviewCount ?? 0})</span></span></td>
                            <td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#2563EB]">{result.leadScore}</span></td>
                            <td className="px-5 py-4">{isSaved ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><Check size={14} /> Saved</span> : <span className="text-xs font-semibold text-slate-400">New</span>}</td>
                            <td className="px-5 py-4"><ResultActions result={result} onCall={calls.increment} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {results.map((result) => {
                    const isSaved = savedPlaceIds.has(result.placeId);
                    return (
                      <article key={result.placeId} className="p-4">
                        <div className="flex items-start gap-3">
                          <input type="checkbox" checked={selected.has(result.placeId)} onChange={() => toggleSelection(result.placeId)} className="mt-1" aria-label={`Select ${result.businessName}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between gap-2"><h3 className="font-bold text-slate-950">{result.businessName}</h3>{isSaved && <span className="shrink-0 text-xs font-bold text-emerald-600">Saved</span>}</div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{result.address}</p>
                            <p className="mt-2 text-sm font-semibold text-slate-700">{result.phone ?? "No phone returned"}</p>
                            <div className="mt-3 flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">★ {result.rating ?? "—"} ({result.reviewCount ?? 0}) · Score {result.leadScore}</span><ResultActions result={result} onCall={calls.increment} /></div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                <div><h2 className="font-black text-slate-950">Saved Prospects</h2><p className="text-sm text-slate-500">{filteredProspects.length} businesses in this view</p></div>
                <div className="grid gap-2 sm:grid-cols-2 xl:flex">
                  <input value={savedSearch} onChange={(event) => setSavedSearch(event.target.value)} placeholder="Search name or phone…" className={inputClass} />
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}><option value="all">All statuses</option>{PROSPECT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                  <select value={sort} onChange={(event) => setSort(event.target.value)} className={inputClass}><option value="newest">Newest</option><option value="rating">Highest Rating</option><option value="reviews">Most Reviews</option><option value="opportunity">Highest Opportunity</option><option value="name">Business Name</option></select>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={followUpsOnly} onChange={(event) => setFollowUpsOnly(event.target.checked)} /> Follow-ups due</label>
                </div>
              </div>
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm font-semibold text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading prospects…</div>
            ) : filteredProspects.length === 0 ? (
              <div className="py-20 text-center"><p className="font-bold text-slate-950">No prospects in this view.</p><button onClick={() => setView("search")} className="mt-2 text-sm font-semibold text-[#2563EB]">Find businesses</button></div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1080px] text-sm">
                    <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Business</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Rating</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Calling List</th><th className="px-5 py-3">Follow Up</th><th className="px-5 py-3"></th></tr></thead>
                    <tbody>
                      {filteredProspects.map((prospect) => (
                        <tr key={prospect.id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => setDrawerProspect(prospect)}>
                          <td className="max-w-sm px-5 py-4"><p className="font-bold text-slate-950">{prospect.business_name}</p><p className="mt-1 truncate text-xs text-slate-500">{prospect.category} · {prospect.city}, {prospect.state}</p></td>
                          <td className="px-5 py-4">{prospect.phone ? <a href={`tel:${prospect.phone}`} onClick={(event) => { event.stopPropagation(); calls.increment(prospect.google_place_id); }} className="font-semibold text-[#2563EB]">{prospect.phone}</a> : "—"}</td>
                          <td className="px-5 py-4">★ {prospect.rating ?? "—"} <span className="text-slate-400">({prospect.review_count ?? 0})</span></td>
                          <td className="px-5 py-4"><select value={prospect.status} onClick={(event) => event.stopPropagation()} onChange={(event) => void patchProspect(prospect.id, { status: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700">{PROSPECT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></td>
                          <td className="px-5 py-4">
                            <select
                              value={prospect.folder_id ?? ""}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => void patchProspect(prospect.id, { folder_id: event.target.value })}
                              className="max-w-44 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
                              aria-label={`Move ${prospect.business_name} to a Calling List`}
                            >
                              <option value="" disabled>Choose a list</option>
                              {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                            </select>
                          </td>
                          <td className="px-5 py-4 text-slate-500">{prospect.next_follow_up_at ? new Date(prospect.next_follow_up_at).toLocaleDateString() : "—"}</td>
                          <td className="px-5 py-4 text-right text-slate-400"><ChevronRight size={17} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-slate-100 md:hidden">
                  {filteredProspects.map((prospect) => (
                    <button key={prospect.id} onClick={() => setDrawerProspect(prospect)} className="w-full p-4 text-left hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{prospect.business_name}</h3><p className="mt-1 text-xs text-slate-500">{prospect.category} · {prospect.city}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-[#2563EB]">{prospect.status}</span></div>
                      <div className="mt-3 flex items-center justify-between text-sm"><span className="font-semibold text-[#2563EB]">{prospect.phone ?? "No phone"}</span><span className="text-xs text-slate-500">★ {prospect.rating ?? "—"} ({prospect.review_count ?? 0})</span></div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <ProspectDrawer prospect={drawerProspect} folders={folders} onClose={() => setDrawerProspect(null)} onSave={patchProspect} onCall={(prospect) => calls.increment(prospect.google_place_id)} />
    </main>
  );
}
