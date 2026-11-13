import type { ReactNode } from "react";
import { Check, FileText, MessageSquare, Play, DollarSign } from "lucide-react";

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_24px_rgba(23,23,23,0.06)] flex flex-col min-h-[calc(220px*var(--px,1))]">
      <div className="flex-1">{children}</div>
      <h3 className="mt-3 text-[length:calc(14px*var(--px,1))] font-semibold text-foreground">{title}</h3>
    </div>
  );
}

export default function LaunchKitWhatYouGet() {
  return (
    <section className="bg-background border-t border-border">
      <div className="max-w-[calc(1120px*var(--px,1))] mx-auto px-4 sm:px-6 py-14 sm:py-16">
        <p className="text-[length:calc(11px*var(--px,1))] font-semibold uppercase tracking-wider text-[#0866F5] mb-2">
          What you get
        </p>
        <h2 className="text-[length:calc(28px*var(--px,1))] sm:text-[length:calc(34px*var(--px,1))] font-bold tracking-tight text-foreground max-w-[calc(640px*var(--px,1))]">
          Everything you need to get your first client.
        </h2>
        <p className="mt-3 text-[length:calc(15px*var(--px,1))] leading-6 text-muted-foreground max-w-[calc(640px*var(--px,1))]">
          Step-by-step training, proven templates and live software to help you start
          and grow your AI business.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card title="AI business launch training">
            <div className="relative rounded-xl overflow-hidden aspect-[16/10] bg-foreground">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="w-10 h-10 rounded-full bg-[#0866F5] flex items-center justify-center">
                  <Play size={16} className="text-white ml-0.5" fill="white" />
                </span>
              </div>
              <p className="absolute bottom-2 left-2 text-[length:calc(10px*var(--px,1))] text-white/80">Preview</p>
            </div>
            <p className="mt-2 text-[length:calc(12px*var(--px,1))] text-muted-foreground leading-4">
              Simple step-by-step videos showing how the model works.
            </p>
          </Card>

          <Card title="Your offer">
            <div className="rounded-xl border border-border bg-background p-2 space-y-1.5">
              {[
                ["Starter", "$500/mo"],
                ["Growth", "$1,000/mo"],
                ["Pro", "$2,000/mo"],
              ].map(([name, price]) => (
                <div
                  key={name}
                  className={`flex justify-between text-[length:calc(11px*var(--px,1))] px-2 py-1.5 rounded-lg ${
                    name === "Growth" ? "bg-primary-tint text-[#0866F5] font-semibold" : "text-foreground"
                  }`}
                >
                  <span>{name}</span>
                  <span className="tabular-nums">{price}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[length:calc(12px*var(--px,1))] text-muted-foreground leading-4">
              Exactly what service to sell and how to explain it.
            </p>
          </Card>

          <Card title="Prospecting scripts">
            <div className="rounded-xl border border-border bg-background p-3 text-[length:calc(11px*var(--px,1))] leading-4 text-muted-foreground">
              Hi. I checked how your business appears in ChatGPT. A few competitors
              are showing up ahead of you. Want the report?
            </div>
            <p className="mt-2 text-[length:calc(12px*var(--px,1))] text-muted-foreground leading-4">
              DM, email and text templates for reaching local businesses.
            </p>
          </Card>

          <Card title="Proposal template">
            <div className="rounded-xl border border-border bg-white p-3 shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-[#0866F5]" />
                <span className="text-[length:calc(11px*var(--px,1))] font-semibold text-foreground">AI visibility proposal</span>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 bg-border rounded w-full" />
                <div className="h-1.5 bg-border rounded w-4/5" />
                <div className="h-1.5 bg-primary-tint rounded w-3/5" />
              </div>
            </div>
            <p className="mt-2 text-[length:calc(12px*var(--px,1))] text-muted-foreground leading-4">
              A copy-and-paste proposal you can send to clients.
            </p>
          </Card>

          <Card title="Pricing guide">
            <div className="rounded-xl border border-border p-3 space-y-1.5">
              {[
                ["Basic", "$500/mo"],
                ["Growth", "$1,000/mo"],
                ["Pro", "$2,000/mo"],
              ].map(([name, price]) => (
                <div key={name} className="flex justify-between text-[length:calc(12px*var(--px,1))] text-foreground">
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={12} className="text-[#0866F5]" />
                    {name}
                  </span>
                  <span className="tabular-nums font-semibold">{price}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[length:calc(12px*var(--px,1))] text-muted-foreground leading-4">
              How to create your monthly packages and position your value.
            </p>
          </Card>

          <Card title="Live software access">
            <div className="rounded-xl border border-border p-3">
              <p className="text-[length:calc(10px*var(--px,1))] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                AI visibility comparison
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted p-2 text-center">
                  <p className="text-[length:calc(18px*var(--px,1))] font-bold tabular-nums text-muted-foreground">42%</p>
                  <p className="text-[length:calc(10px*var(--px,1))] text-text-hint">You</p>
                </div>
                <div className="rounded-lg bg-primary-tint p-2 text-center">
                  <p className="text-[length:calc(18px*var(--px,1))] font-bold tabular-nums text-[#0866F5]">81%</p>
                  <p className="text-[length:calc(10px*var(--px,1))] text-text-hint">Top competitor</p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[length:calc(12px*var(--px,1))] text-muted-foreground leading-4">
              Use Customers.Direct to run reports and find opportunities.
            </p>
          </Card>

          <Card title="First client checklist">
            <ul className="space-y-1.5">
              {[
                "Find 20 local businesses",
                "Run free AI reports",
                "Send your message",
                "Show the report",
                "Close your first client",
              ].map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-[length:calc(11px*var(--px,1))] text-foreground">
                  <Check size={12} className="text-[#0866F5] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Bonus resources">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                "Outreach spreadsheet",
                "Client report template",
                "Follow-up sequence",
                "Presentation deck",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-border bg-background px-2 py-2 text-[length:calc(10px*var(--px,1))] leading-3 text-foreground flex items-start gap-1"
                >
                  <MessageSquare size={10} className="text-[#0866F5] mt-0.5 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
