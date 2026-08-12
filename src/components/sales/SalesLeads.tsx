"use client";

import { useState } from "react";
import { Plus, Search, Filter, X, Info } from "lucide-react";

interface Lead {
  id: number;
  business: string;
  contact: string;
  phone: string;
  email: string;
  industry: string;
  stage: string;
  lastContact: string;
  nextAction: string;
}

const DEMO_LEADS: Lead[] = [
  { id: 1, business: "Dallas Med Spa", contact: "Sarah Mitchell", phone: "(214) 555-0148", email: "sarah@dallasmeds.com", industry: "Med Spa", stage: "Demo Scheduled", lastContact: "Today", nextAction: "Run demo" },
  { id: 2, business: "Smith Roofing", contact: "James Smith", phone: "(972) 555-0230", email: "james@smithroofing.com", industry: "Roofing", stage: "Follow Up", lastContact: "Yesterday", nextAction: "Send follow-up" },
  { id: 3, business: "Park Dental", contact: "Amy Park", phone: "(469) 555-0091", email: "amy@parkdental.com", industry: "Dental", stage: "Proposal", lastContact: "2 days ago", nextAction: "Send proposal" },
  { id: 4, business: "North Texas HVAC", contact: "Mike Rodriguez", phone: "(817) 555-0375", email: "mike@ntxhvac.com", industry: "HVAC", stage: "Won", lastContact: "3 days ago", nextAction: "Onboarding" },
];

const STAGE_COLORS: Record<string, string> = {
  "Demo Scheduled": "bg-[#EFF6FF] text-[#2563EB]",
  "Follow Up": "bg-amber-50 text-amber-700",
  "Proposal": "bg-[#F5F3FF] text-[#7C3AED]",
  "Won": "bg-green-50 text-green-700",
  "New": "bg-gray-100 text-gray-600",
  "Contacted": "bg-sky-50 text-sky-700",
};

const INDUSTRIES = ["Med Spa", "Dental", "Roofing", "HVAC", "Plumbing", "Law Firm", "Real Estate", "Salon", "Home Services", "Other"];

function AddLeadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (l: Lead) => void }) {
  const [form, setForm] = useState({ business: "", contact: "", email: "", phone: "", website: "", industry: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business || !form.contact) return;
    onAdd({
      id: Date.now(),
      business: form.business,
      contact: form.contact,
      phone: form.phone,
      email: form.email,
      industry: form.industry || "Other",
      stage: "New",
      lastContact: "Today",
      nextAction: "Initial outreach",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Add new lead">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[#0F172A] text-lg">Add New Lead</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { name: "business", label: "Business Name", placeholder: "Dallas Med Spa", required: true },
            { name: "contact", label: "Contact Name", placeholder: "Sarah Mitchell", required: true },
            { name: "email", label: "Email", placeholder: "sarah@example.com", required: false },
            { name: "phone", label: "Phone", placeholder: "(555) 000-0000", required: false },
            { name: "website", label: "Website", placeholder: "example.com", required: false },
          ].map(({ name, label, placeholder, required }) => (
            <div key={name}>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                {label} {required && <span className="text-[#FF6B6B]">*</span>}
              </label>
              <input
                type="text"
                value={form[name as keyof typeof form]}
                onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
                placeholder={placeholder}
                required={required}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#0F172A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">Industry</label>
            <select
              value={form.industry}
              onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <button
            type="submit"
            className="mt-2 w-full bg-[#2563EB] text-white font-bold py-3 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm"
          >
            Add Lead
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SalesLeads() {
  const [leads, setLeads] = useState<Lead[]>(DEMO_LEADS);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = leads.filter(
    (l) =>
      l.business.toLowerCase().includes(search.toLowerCase()) ||
      l.contact.toLowerCase().includes(search.toLowerCase()) ||
      l.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">My Leads</h1>
          <p className="text-sm text-[#64748B] mt-1 flex items-center gap-1.5">
            <Info size={13} aria-hidden="true" />
            Sample data — leads added here are not saved to the database in this preview.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-5 py-2.5 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm"
        >
          <Plus size={15} aria-hidden="true" />
          Add Lead
        </button>
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search leads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#0F172A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          />
        </div>
        <button className="inline-flex items-center gap-2 border border-gray-200 text-[#64748B] font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
          <Filter size={14} aria-hidden="true" />
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100">
                {["Business", "Contact", "Phone", "Email", "Industry", "Stage", "Last Contact", "Next Action"].map((h) => (
                  <th key={h} className="text-left text-xs font-bold uppercase tracking-widest text-[#94A3B8] px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-sm text-[#0F172A]">{lead.business}</td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B]">{lead.contact}</td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B] font-mono whitespace-nowrap">{lead.phone}</td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B]">{lead.email}</td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B]">{lead.industry}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${STAGE_COLORS[lead.stage] ?? "bg-gray-100 text-gray-600"}`}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B] whitespace-nowrap">{lead.lastContact}</td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B]">{lead.nextAction}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-sm text-[#94A3B8] py-10">No leads found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AddLeadModal
          onClose={() => setShowModal(false)}
          onAdd={(lead) => setLeads((prev) => [lead, ...prev])}
        />
      )}
    </div>
  );
}
