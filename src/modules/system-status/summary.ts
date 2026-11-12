import type { ServiceStatus } from "./schema";

// The headline of the System status page (admin audit 2026-11-12). A service switched off on purpose (automatic scans
// before launch) is neither working nor broken, so it is left out of the count and named on its own line; "9 of 10
// services working" read as a fault when nothing was wrong.

export type StatusSummary = { title: string; offNote: string | null };

export function statusSummary(services: ServiceStatus[]): StatusSummary {
  const counted = services.filter((s) => s.state !== "off");
  const broken = counted.filter((s) => s.state === "error").length;
  const working = counted.filter((s) => s.state === "ok").length;
  const total = counted.length;
  const services_ = (n: number) => (n === 1 ? "service" : "services");

  let title: string;
  if (broken > 0) title = `${broken} of ${total} ${services_(total)} ${broken === 1 ? "is" : "are"} not working`;
  else if (working === total) title = total === 1 ? "The service is working" : `All ${services_(total)} working`;
  else title = `${working} of ${total} ${services_(total)} working`;

  const off = services.filter((s) => s.state === "off").map((s) => s.name);
  // "Automatic scans are off", "Weekly email is off": the names are nouns, plural when they end in "s".
  const verb = off.length > 1 || /s$/.test(off[0] ?? "") ? "are" : "is";
  const offNote = off.length > 0 ? `${joinNames(off)} ${verb} off until launch.` : null;
  return { title, offNote };
}

function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
