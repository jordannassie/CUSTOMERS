"use client";

const REVENUE_ROWS = [
  { clients: 5,   low: "$1,495",  mid: "$2,495",  high: "$3,750"  },
  { clients: 10,  low: "$2,990",  mid: "$4,990",  high: "$7,500"  },
  { clients: 25,  low: "$7,475",  mid: "$12,475", high: "$18,750" },
  { clients: 50,  low: "$14,950", mid: "$24,950", high: "$37,500" },
  { clients: 100, low: "$29,900", mid: "$49,900", high: "$75,000" },
];

export default function AgencyPageContent() {
  return (
    <div className="bg-[#FAFAF8] min-h-[60vh] flex items-center">
      <section className="w-full py-20 sm:py-28 px-4">
        <div className="max-w-[1200px] mx-auto">

          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#171717] leading-tight tracking-tight mb-4">
              Turn AI Visibility Into Recurring Revenue
            </h1>
            <p className="text-base text-[#777773] max-w-xl mx-auto">
              Customers.Direct gives you the platform. You choose what to charge your clients.
            </p>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <div className="min-w-[520px] max-w-3xl mx-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="text-left pb-6 pr-6 text-[11px] font-bold uppercase tracking-widest text-[#A3A3A0] w-28"
                    >
                      Active<br />Clients
                    </th>
                    <th scope="col" className="pb-6 px-3 text-center">
                      <div className="bg-[#F5F5F2] rounded-xl px-4 py-3 border border-[#E5E5E1]">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-1">Per Client</div>
                        <div className="text-lg font-black text-[#171717]">
                          $299<span className="text-sm font-semibold text-[#A3A3A0]">/mo</span>
                        </div>
                      </div>
                    </th>
                    <th scope="col" className="pb-6 px-3 text-center relative">
                      <div className="bg-[#EFF6FF] rounded-xl px-4 py-3 border-2 border-[#2563EB] relative">
                        <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                          <span className="bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full whitespace-nowrap">
                            Sweet Spot
                          </span>
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">Per Client</div>
                        <div className="text-lg font-black text-[#2563EB]">
                          $499<span className="text-sm font-semibold text-[#2563EB]/60">/mo</span>
                        </div>
                      </div>
                    </th>
                    <th scope="col" className="pb-6 px-3 text-center">
                      <div className="bg-[#F5F5F2] rounded-xl px-4 py-3 border border-[#E5E5E1]">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-1">Per Client</div>
                        <div className="text-lg font-black text-[#171717]">
                          $750<span className="text-sm font-semibold text-[#A3A3A0]">/mo</span>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {REVENUE_ROWS.map(({ clients, low, mid, high }, i) => (
                    <tr key={clients} className={i % 2 === 0 ? "bg-[#FAFAF8]" : "bg-white"}>
                      <td className="py-4 pr-6 text-sm font-bold text-[#171717] pl-3 rounded-l-xl">
                        {clients} clients
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span className="text-sm font-semibold text-[#555552] tabular-nums">{low}/mo</span>
                      </td>
                      <td className="py-4 px-3 text-center bg-[#EFF6FF] border-x border-[#BFDBFE]">
                        <span className="text-sm font-black text-[#2563EB] tabular-nums">{mid}/mo</span>
                      </td>
                      <td className="py-4 px-3 text-center rounded-r-xl">
                        <span className="text-sm font-semibold text-[#555552] tabular-nums">{high}/mo</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-xs text-[#A3A3A0] mt-6 max-w-md mx-auto leading-relaxed">
            Illustrative agency revenue only. You choose your own pricing, services and packages.
          </p>

        </div>
      </section>
    </div>
  );
}
