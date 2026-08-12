import { DollarSign, Clock, CheckCircle, Info } from "lucide-react";

const HISTORY = [
  { customer: "North Texas HVAC", plan: "$997/mo", commission: "$120", type: "Recurring", status: "Paid", payout: "Aug 1, 2026" },
  { customer: "Johnson Dental", plan: "$997/mo", commission: "$120", type: "Recurring", status: "Paid", payout: "Aug 1, 2026" },
  { customer: "Riverside Law", plan: "$997/mo", commission: "$120", type: "Recurring", status: "Paid", payout: "Aug 1, 2026" },
  { customer: "Premier Plumbing", plan: "$997/mo", commission: "$120", type: "Recurring", status: "Pending", payout: "Sep 1, 2026" },
  { customer: "Lakewood Roofing", plan: "$997/mo", commission: "$120", type: "New Customer", status: "Pending", payout: "Sep 1, 2026" },
  { customer: "Allen Real Estate", plan: "$997/mo", commission: "$120", type: "Recurring", status: "Scheduled", payout: "Sep 1, 2026" },
  { customer: "Frisco Med Spa", plan: "$997/mo", commission: "$120", type: "Recurring", status: "Scheduled", payout: "Sep 1, 2026" },
  { customer: "McKinney HVAC", plan: "$997/mo", commission: "$120", type: "Recurring", status: "Paid", payout: "Aug 1, 2026" },
];

const STATUS_COLORS: Record<string, string> = {
  Paid: "bg-green-50 text-green-700",
  Pending: "bg-amber-50 text-amber-700",
  Scheduled: "bg-[#EFF6FF] text-[#2563EB]",
};

const TYPE_COLORS: Record<string, string> = {
  Recurring: "bg-[#F5F3FF] text-[#7C3AED]",
  "New Customer": "bg-[#EFF6FF] text-[#2563EB]",
};

const TOP_CARDS = [
  { icon: DollarSign, label: "Earned (All Time)", value: "$4,320" },
  { icon: Clock, label: "Pending", value: "$800" },
  { icon: CheckCircle, label: "Paid This Month", value: "$480" },
];

export default function SalesCommissions() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#0F172A]">Commissions</h1>
        <p className="text-sm text-[#64748B] mt-1 flex items-center gap-1.5">
          <Info size={13} aria-hidden="true" />
          Sample data for demonstration.
        </p>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TOP_CARDS.map(({ icon: Icon, label, value }) => (
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

      {/* History table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#0F172A]">Commission History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-gray-100">
                {["Customer", "Plan", "Commission", "Type", "Status", "Payout Date"].map((h) => (
                  <th key={h} className="text-left text-xs font-bold uppercase tracking-widest text-[#94A3B8] px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HISTORY.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-sm text-[#0F172A]">{row.customer}</td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B] font-mono">{row.plan}</td>
                  <td className="px-5 py-3.5 text-sm font-bold text-[#0F172A] font-mono">{row.commission}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${TYPE_COLORS[row.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#64748B] whitespace-nowrap">{row.payout}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 text-xs text-amber-800 leading-relaxed">
        Commission amounts shown in this preview are sample data and do not represent
        a finalized Customers Direct compensation plan.
      </div>
    </div>
  );
}
