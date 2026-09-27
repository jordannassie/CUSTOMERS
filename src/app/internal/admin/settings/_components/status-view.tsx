import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { ServiceStatus, StatusState, SystemStatus } from "@/modules/system-status";
import RecheckButton from "./recheck-button";

const STATE: Record<StatusState, { label: string; badge: "good" | "low" | "mid" | "outline"; dot: string }> = {
  ok: { label: "Working", badge: "good", dot: "bg-good" },
  error: { label: "Not working", badge: "low", dot: "bg-low" },
  unknown: { label: "Unknown", badge: "mid", dot: "bg-mid" },
  not_configured: { label: "Not set up", badge: "outline", dot: "bg-competitor-3" },
};

const GROUPS: { id: ServiceStatus["group"]; title: string }[] = [
  { id: "ai", title: "AI models" },
  { id: "data", title: "Data, PDFs and email" },
  { id: "payments", title: "Payments" },
  { id: "jobs", title: "Background jobs" },
];

function summary(services: ServiceStatus[]): string {
  const broken = services.filter((s) => s.state === "error").length;
  const working = services.filter((s) => s.state === "ok").length;
  if (broken > 0) return `${broken} of ${services.length} ${broken === 1 ? "service is" : "services are"} not working`;
  return `${working} of ${services.length} services working`;
}

export default function StatusView({ status }: { status: SystemStatus }) {
  const { services } = status;
  const hasBroken = services.some((s) => s.state === "error");
  const checkedAt = new Date(status.checkedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="status-summary" className="rounded-md border border-border bg-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="status-summary" className={cn("text-[20px] font-semibold tracking-[-0.02em]", hasBroken && "text-low-text")}>
              {summary(services)}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Checked live at <span className="tabular">{checkedAt}</span> UTC. Nothing here is cached.
            </p>
          </div>
          <RecheckButton />
        </div>
        <ul aria-hidden className="mt-4 flex gap-1">
          {services.map((s) => (
            <li key={s.id} title={`${s.name}: ${STATE[s.state].label}`} className={cn("h-2 flex-1 rounded-xs", STATE[s.state].dot)} />
          ))}
        </ul>
      </section>

      {GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`group-${group.id}`}>
          <h2 id={`group-${group.id}`} className="mb-2 text-[14px] font-semibold">
            {group.title}
          </h2>
          <ul className="divide-y divide-border rounded-md border border-border bg-surface">
            {services
              .filter((s) => s.group === group.id)
              .map((s) => (
                <ServiceRow key={s.id} service={s} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ServiceRow({ service }: { service: ServiceStatus }) {
  const state = STATE[service.state];
  return (
    <li data-service={service.id} data-state={service.state} className="flex items-start gap-3 px-4 py-3">
      <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", state.dot)} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
          {service.name}
          {service.mode && (
            <Badge variant={service.mode === "live" ? "tint" : "outline"}>
              {service.mode === "live" ? "Live" : "Sandbox"}
            </Badge>
          )}
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{service.detail}</p>
      </div>
      <Badge variant={state.badge} className="mt-0.5">
        {state.label}
      </Badge>
    </li>
  );
}
