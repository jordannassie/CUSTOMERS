import { Calendar, DollarSign, Info } from "lucide-react";

const STAGES = ["New", "Contacted", "Demo", "Follow Up", "Proposal", "Won"] as const;

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  New: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
  Contacted: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-100" },
  Demo: { bg: "bg-[#EFF6FF]", text: "text-[#2563EB]", border: "border-[#DBEAFE]" },
  "Follow Up": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  Proposal: { bg: "bg-[#F5F3FF]", text: "text-[#7C3AED]", border: "border-[#EDE9FE]" },
  Won: { bg: "bg-green-50", text: "text-green-700", border: "border-green-100" },
};

interface Card {
  id: number;
  business: string;
  contact: string;
  plan: string;
  followUp: string;
  stage: typeof STAGES[number];
}

const CARDS: Card[] = [
  { id: 1, business: "Dallas Med Spa", contact: "Sarah Mitchell", plan: "$997/mo", followUp: "Aug 14", stage: "Demo" },
  { id: 2, business: "Smith Roofing", contact: "James Smith", plan: "$997/mo", followUp: "Aug 13", stage: "Follow Up" },
  { id: 3, business: "Park Dental", contact: "Amy Park", plan: "$997/mo", followUp: "Aug 15", stage: "Proposal" },
  { id: 4, business: "North Texas HVAC", contact: "Mike Rodriguez", plan: "$997/mo", followUp: "Completed", stage: "Won" },
  { id: 5, business: "Westside Salon", contact: "Lisa Chen", plan: "$997/mo", followUp: "Aug 12", stage: "New" },
  { id: 6, business: "Johnson Dental", contact: "Tom Johnson", plan: "$997/mo", followUp: "Aug 13", stage: "Contacted" },
];

function PipelineCard({ card }: { card: Card }) {
  const colors = STAGE_COLORS[card.stage];
  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-4 cursor-default hover:shadow-md transition-shadow"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      <p className="font-bold text-[#0F172A] text-sm mb-1">{card.business}</p>
      <p className="text-xs text-[#64748B] mb-3">{card.contact}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs text-[#64748B]">
          <DollarSign size={11} aria-hidden="true" />
          <span className="font-mono">{card.plan}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
          <Calendar size={11} aria-hidden="true" />
          <span>{card.followUp}</span>
        </div>
      </div>
    </div>
  );
}

export default function SalesPipeline() {
  const cardsByStage = (stage: typeof STAGES[number]) => CARDS.filter((c) => c.stage === stage);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#0F172A]">Pipeline</h1>
        <p className="text-sm text-[#64748B] mt-1 flex items-center gap-1.5">
          <Info size={13} aria-hidden="true" />
          Sample data for demonstration.
        </p>
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[900px]">
          {STAGES.map((stage) => {
            const cards = cardsByStage(stage);
            const colors = STAGE_COLORS[stage];
            return (
              <div key={stage} className="flex-1 min-w-[160px] flex flex-col gap-3">
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${colors.bg} ${colors.border}`}>
                  <span className={`text-xs font-black uppercase tracking-widest ${colors.text}`}>{stage}</span>
                  <span className={`text-xs font-bold ${colors.text}`}>{cards.length}</span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2.5">
                  {cards.map((card) => (
                    <PipelineCard key={card.id} card={card} />
                  ))}
                  {cards.length === 0 && (
                    <div className="text-center py-6 text-xs text-[#94A3B8] border-2 border-dashed border-gray-100 rounded-xl">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
