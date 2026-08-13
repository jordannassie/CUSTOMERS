"use client";

import Link from "next/link";
import {
  BarChart3,
  ChevronDown,
  Folder,
  FolderOpen,
  Globe2,
  Minus,
  PhoneCall,
  Plus,
  UsersRound,
} from "lucide-react";
import type { ProspectingFolder } from "@/types/prospecting";

interface ProspectingSidebarProps {
  folders: ProspectingFolder[];
  activeFolder: string;
  onFolderChange: (id: string) => void;
  onRenameFolder: (folder: ProspectingFolder) => void;
  onDeleteFolder: (folder: ProspectingFolder) => void;
  callCount: number;
  callGoal: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export default function ProspectingSidebar({
  folders,
  activeFolder,
  onFolderChange,
  onRenameFolder,
  onDeleteFolder,
  callCount,
  callGoal,
  onIncrement,
  onDecrement,
}: ProspectingSidebarProps) {
  const percentage = Math.min(100, Math.round((callCount / callGoal) * 100));

  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-6">
          <p className="text-xl font-black italic tracking-tight text-slate-950">
            Customers.Direct
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Admin
          </p>
        </div>

        <nav className="space-y-1 px-3 py-5 text-sm font-semibold">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          >
            <BarChart3 size={18} />
            Website Leads
          </Link>
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-[#2563EB]">
            <UsersRound size={18} />
            Prospecting
          </div>
        </nav>

        <div className="min-h-0 flex-1 border-t border-slate-100 px-3 py-5">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Calling lists
          </p>
          <div className="max-h-[34vh] space-y-1 overflow-y-auto">
            <button
              onClick={() => onFolderChange("all")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                activeFolder === "all"
                  ? "bg-slate-100 text-slate-950"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Globe2 size={15} />
              <span className="flex-1">All Prospects</span>
            </button>
            <button
              onClick={() => onFolderChange("unassigned")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                activeFolder === "unassigned"
                  ? "bg-slate-100 text-slate-950"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Folder size={15} />
              <span className="flex-1">Unassigned</span>
            </button>
            {folders.map((folder) => (
              <div key={folder.id} className="group flex items-center">
                <button
                  onClick={() => onFolderChange(folder.id)}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    activeFolder === folder.id
                      ? "bg-blue-50 text-[#2563EB]"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <FolderOpen size={15} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                  <span className="text-xs text-slate-400">{folder.lead_count}</span>
                </button>
                <div className="hidden gap-0.5 group-hover:flex">
                  <button
                    onClick={() => onRenameFolder(folder)}
                    className="px-1 text-xs text-slate-400 hover:text-[#2563EB]"
                    aria-label={`Rename ${folder.name}`}
                  >
                    R
                  </button>
                  <button
                    onClick={() => onDeleteFolder(folder)}
                    className="px-1 text-xs text-slate-400 hover:text-red-500"
                    aria-label={`Delete ${folder.name}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 p-5">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            <PhoneCall size={14} />
            Today&apos;s Calls
          </div>
          <div className="mb-2 flex items-end justify-between">
            <p className="text-2xl font-black text-slate-950">
              {callCount} <span className="text-sm font-semibold text-slate-400">/ {callGoal}</span>
            </p>
            <div className="flex gap-1">
              <button onClick={onDecrement} aria-label="Decrease call count" className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50">
                <Minus size={14} />
              </button>
              <button onClick={onIncrement} aria-label="Increase call count" className="rounded-md bg-[#2563EB] p-1 text-white hover:bg-blue-700">
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${percentage}%` }} />
          </div>
        </div>
      </aside>

      <div className="border-b border-slate-200 bg-white p-4 lg:hidden">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-black italic text-slate-950">Customers.Direct</p>
            <p className="text-xs font-semibold text-[#2563EB]">Prospecting</p>
          </div>
          <Link href="/admin/dashboard" className="text-sm font-semibold text-slate-500">
            Website Leads
          </Link>
        </div>
        <div className="relative">
          <select
            value={activeFolder}
            onChange={(event) => onFolderChange(event.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-slate-700"
          >
            <option value="all">All Prospects</option>
            <option value="unassigned">Unassigned</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name} ({folder.lead_count})
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3 text-slate-400" />
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
          <PhoneCall size={15} className="text-[#2563EB]" />
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Today</span>
          <span className="ml-auto font-black text-slate-950">{callCount} / {callGoal}</span>
          <button onClick={onDecrement} aria-label="Decrease call count"><Minus size={15} /></button>
          <button onClick={onIncrement} aria-label="Increase call count"><Plus size={15} /></button>
        </div>
      </div>
    </>
  );
}
