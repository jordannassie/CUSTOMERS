import { Users, DollarSign, TrendingUp, Clock, Info } from "lucide-react";

const KPIS = [
  { icon: Users, label: "Active Customers", value: "12", trend: null },
  { icon: DollarSign, label: "MRR Sold", value: "$11,964", trend: null },
  { icon: TrendingUp, label: "Recurring Commission", value: "$1,200", trend: null },
  { icon: Clock, label: "Pending Payout", value: "$800", trend: null },
];

const PIPELINE_ROWS = [
  { biz: "Dallas Med Spa", contact: "Sarah Mitchell", plan: "$997/mo", stage: "Demo Scheduled", stageColor: "bg-[#EFF6FF] text-[#2563EB]" },
  { biz: "Smith Roofing", contact: "James Smith", plan: "$997/mo", stage: "Follow Up", stageColor: "bg-amber-50 text-amber-700" },
  { biz: "Park Dental", contact: "Amy Park", plan: "$997/mo", stage: "Proposal", stageColor: "bg-[#F5F3FF] text-[#7C3AED]" },
  { biz: "North Texas HVAC", contact: "Mike Rodriguez", plan: "$997/mo", stage: "Won", stageColor: "bg-green-50 text-green-700" },
];

const ACTIVITY = [
  { text: "Dallas Med Spa booked a demo", time: "2h ago" },
  { text: "Park Dental moved to Proposal", time: "Yesterday" },
  { text: "North Texas HVAC became a customer", time: "3 days ago" },
  { text: "Commission generated from Johnson Dental", time: "1 week ago" },
];

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
      <Info size={9} aria-hidden="true" />
      Demo Data
    </span>
  );
}

export default function SalesOverview() {
  return (
    <div className="flex flex-col gap-8 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A]">Good morning, Jordan</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Here&apos;s what&apos;s happening with your Customers Direct business.
          </p>
        </div>
        <DemoBadge />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center">
                <Icon size={17} className="text-[#2563EB]" aria-hidden="true" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#0F172A]">{value}</p>
            <p className="text-xs text-[#64748B] mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#0F172A]">Sales Pipeline</h2>
          <DemoBadge />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px]">
            <thead>
              <tr className="border-b border-gray-100">
                {["Business", "Contact", "Plan", "Stage"].map((h) => (
                  <th key={h} className="text-left text-xs font-bold uppercase tracking-widest text-[#94A3B8] px-6 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PIPELINE_ROWS.map(({ biz, contact, plan, stage, stageColor }) => (
                <tr key={biz} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-semibold text-sm text-[#0F172A]">{biz}</td>
                  <td className="px-6 py-3.5 text-sm text-[#64748B]">{contact}</td>
                  <td className="px-6 py-3.5 text-sm text-[#64748B] font-mono">{plan}</td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${stageColor}`}>
                      {stage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#0F172A]">Recent Activity</h2>
          <DemoBadge />
        </div>
        <div className="divide-y divide-gray-50">
          {ACTIVITY.map(({ text, time }) => (
            <div key={text} className="flex items-center justify-between px-6 py-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" aria-hidden="true" />
                <span className="text-sm text-[#0F172A]">{text}</span>
              </div>
              <span className="text-xs text-[#94A3B8] shrink-0">{time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
