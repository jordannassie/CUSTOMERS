import SalesDashboard from "@/components/sales/SalesDashboard";

export const metadata = {
  title: "Sales Dashboard — Customers Direct",
  description: "Preview of the Customers Direct Sales Dashboard. Sample data shown for demonstration.",
};

export default function SalesDashboardPage() {
  return (
    <div className="relative">
      {/* Preview badge */}
      <div className="fixed top-4 right-4 z-[60] flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 shadow-lg">
        <div className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-amber-800">Dashboard Preview</p>
          <p className="text-[10px] text-amber-700">Sample data shown for demonstration.</p>
        </div>
      </div>

      <SalesDashboard />
    </div>
  );
}
