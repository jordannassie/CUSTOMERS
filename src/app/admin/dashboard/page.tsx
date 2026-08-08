"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  business_name: string;
  website: string;
  status: string;
  created_at: string;
}

function normalizeUrl(url: string): string {
  if (!url) return "#";
  return /^https?:\/\//i.test(url) ? url : "https://" + url;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads");
      if (res.status === 401) {
        router.push("/admin");
        return;
      }
      const data = await res.json();
      setLeads(data.leads ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [router]);

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin");
    } catch {
      setLogoutLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLeads();
  }, [fetchLeads]);

  return (
    <main className="min-h-screen bg-[#EFF6FF]">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-black italic text-lg text-[#0F172A]">Customers.Direct</span>
            <h1 className="text-base font-bold text-[#64748B]">Strategy Call Leads</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="text-sm font-semibold text-[#2563EB] border border-[#2563EB] px-4 py-2 rounded-full hover:bg-[#EFF6FF] transition-colors disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className="text-sm font-semibold text-white bg-[#0F172A] px-4 py-2 rounded-full hover:bg-[#1e293b] transition-colors disabled:opacity-50"
            >
              {logoutLoading ? "Logging out…" : "Logout"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-[#64748B] font-medium">Loading leads…</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 text-[#64748B] font-medium">
            No leads yet. Strategy call submissions will appear here.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Date", "Name", "Phone", "Email", "Business", "Website", "Status"].map((col) => (
                      <th key={col} className="text-left px-5 py-3.5 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-[#64748B] whitespace-nowrap text-xs">{formatDate(lead.created_at)}</td>
                      <td className="px-5 py-4 font-semibold text-[#0F172A] whitespace-nowrap">{lead.full_name}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <a href={`tel:${lead.phone}`} className="text-[#2563EB] hover:underline">{lead.phone}</a>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <a href={`mailto:${lead.email}`} className="text-[#2563EB] hover:underline">{lead.email}</a>
                      </td>
                      <td className="px-5 py-4 text-[#0F172A] whitespace-nowrap">{lead.business_name}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <a href={normalizeUrl(lead.website)} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline truncate max-w-[160px] block">
                          {lead.website}
                        </a>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="bg-[#DBEAFE] text-[#2563EB] text-xs font-bold px-2.5 py-1 rounded-full capitalize">
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-4">
              {leads.map((lead) => (
                <div key={lead.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold text-[#0F172A]">{lead.full_name}</div>
                      <div className="text-xs text-[#64748B]">{lead.business_name}</div>
                    </div>
                    <span className="bg-[#DBEAFE] text-[#2563EB] text-xs font-bold px-2.5 py-1 rounded-full capitalize">
                      {lead.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B] mb-3">{formatDate(lead.created_at)}</div>
                  <div className="flex flex-col gap-1.5">
                    <a href={`tel:${lead.phone}`} className="text-sm text-[#2563EB] hover:underline">{lead.phone}</a>
                    <a href={`mailto:${lead.email}`} className="text-sm text-[#2563EB] hover:underline">{lead.email}</a>
                    <a href={normalizeUrl(lead.website)} target="_blank" rel="noopener noreferrer" className="text-sm text-[#2563EB] hover:underline truncate">
                      {lead.website}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
