import { Users, DollarSign, TrendingUp, Info } from "lucide-react";

const CUSTOMERS = [
  { name: "North Texas HVAC", industry: "HVAC", startDate: "Jul 2026", plan: "$997/mo", status: "Active", commission: "$120/mo" },
  { name: "Johnson Dental", industry: "Dental", startDate: "Jun 2026", plan: "$997/mo", status: "Active", commission: "$120/mo" },
  { name: "Riverside Law", industry: "Law Firm", startDate: "Jun 2026", plan: "$997/mo", status: "Active", commission: "$120/mo" },
  { name: "Premier Plumbing", industry: "Plumbing", startDate: "May 2026", plan: "$997/mo", status: "Active", commission: "$120/mo" },
  { name: "Lakewood Roofing", industry: "Roofing", startDate: "May 2026", plan: "$997/mo", status: "Setup", commission: "$120/mo" },
  { name: "Allen Real Estate", industry: "Real Estate", startDate: "Apr 2026", plan: "$997/mo", status: "Active", commission: "$120/mo" },
  { name: "Frisco Med Spa", industry: "Med Spa", startDate: "Apr 2026", plan: "$997/mo", status: "Active", commission: "$120/mo" },
  { name: "McKinney HVAC", industry: "HVAC", startDate: "Mar 2026", plan: "$997/mo", status: "Active", commission: "$120/mo" },
  { name: "Plano Dental", industry: "Dental", startDate: "Mar 2026", plan: "$997/mo", status: "Paused", commission: "$0/mo" },
  { name: "Garland Salon", industry: "Salon", startDate: "Feb 2026", plan: "$997/mo", status: "Active", commission: "$120/mo" },
  { name: "Irving Law Group", industry: "Law Firm", startDate: "Feb 2026", plan: "$997/mo", status: "Active", commission: "$120/mo" },
  { name: "Mesquite Home Svcs", industry: "Home Services", startDate: "Jan 2026", plan: "$997/mo", status: "Active", commission: "$120/mo" },
];

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-50 text-green-700",
  Setup: "bg-[#EFF6FF] text-[#2563EB]",
  Paused: "bg-amber-50 text-amber-700",
};

const KPIS = [
  { icon: Users, label: "Active Customers", value: "12" },
  { icon: DollarSign, label: "Monthly Revenue Sold", value: "$11,964" },
  { icon: TrendingUp, label: "Average Account Value", value: "$997" },
];

export default function SalesCustomers() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#0F172A]">My Customers</h1>
        <p className="text-sm text-[#64748B] mt-1 flex items-center gap-1.5">
          <Info size={13} aria-hidden="true" />
          Sample data for demonstration.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {KPIS.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center mb-3">
              <Icon size={17} className="text-[#2563EB]" aria-hidden="true" />
            </div>
            <p className="text-2xl font-black text-[#0F172A]">{value}</p>
            <p className="text-xs text-[#64748B] mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-gray-100">
                {["Customer", "Industry", "Start Date", "Monthly Plan", "Status", "Commission"].map((h) => (
                  <th key={h} className="text-left text-xs font-bold uppercase tracking-widest text-[#94A3B8] px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CUSTOMERS.map((c) => (
                <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-sm text-[#0F172A]">{c.name}</td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B]">{c.industry}</td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B] whitespace-nowrap">{c.startDate}</td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B] font-mono">{c.plan}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#0F172A] font-mono">{c.commission}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
