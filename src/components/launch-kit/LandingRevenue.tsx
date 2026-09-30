const rows = [
  { clients: 5, price: "$500", revenue: "$2,500/mo" },
  { clients: 10, price: "$500", revenue: "$5,000/mo" },
  { clients: 20, price: "$500", revenue: "$10,000/mo" },
  { clients: 30, price: "$500", revenue: "$15,000/mo" },
  { clients: 40, price: "$500", revenue: "$20,000/mo" },
];

export default function LandingRevenue() {
  return (
    <section className="border-t border-[#E5E5E1] bg-[#F5F5F2]">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-[#2563EB] mb-3">
          Example only
        </p>
        <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#171717]">
          What this can look like at a $500 monthly fee
        </h2>
        <p className="mt-3 text-[15px] text-[#6B6B67] max-w-[560px]">
          These numbers are illustrations. They are not a forecast or a promise.
        </p>

        <div className="mt-8 overflow-x-auto border border-[#E5E5E1] rounded-[4px] bg-white">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-[#F5F5F2] text-[#6B6B67]">
              <tr>
                <th className="font-medium px-4 py-3">Clients</th>
                <th className="font-medium px-4 py-3">Example monthly price</th>
                <th className="font-medium px-4 py-3">Example monthly revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.clients} className="border-t border-[#E5E5E1]">
                  <td className="px-4 py-3 tabular-nums text-[#171717]">{row.clients} clients</td>
                  <td className="px-4 py-3 tabular-nums text-[#171717]">{row.price}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-[#171717]">
                    {row.revenue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div className="border border-[#E5E5E1] bg-white rounded-[4px] p-6">
            <p className="text-[13px] text-[#6B6B67]">Example</p>
            <p className="mt-1 text-[22px] font-bold tracking-[-0.02em] text-[#171717]">
              20 clients × $500/month = $10,000/month
            </p>
          </div>
          <div className="border border-[#E5E5E1] bg-white rounded-[4px] p-6">
            <p className="text-[13px] text-[#6B6B67]">Example</p>
            <p className="mt-1 text-[22px] font-bold tracking-[-0.02em] text-[#171717]">
              40 clients × $500/month = $20,000/month
            </p>
          </div>
        </div>

        <p className="mt-6 text-[13px] leading-6 text-[#737370] max-w-[720px]">
          Examples are illustrative only and are not guaranteed earnings. Results
          depend on your pricing, market, effort, sales ability, and client retention.
        </p>
      </div>
    </section>
  );
}
