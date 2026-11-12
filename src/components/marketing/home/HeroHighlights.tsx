import { Check } from "lucide-react";

// From the live site's hero (2026-11-12): the AI apps we check, as logos, and what a check gives you. Only the three
// apps we ask are shown, to match the headline. Logos are the live site's files, used as they are.
const AI_ICONS = "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/icons/New%20AI%20Icons";
const APPS = [
  { name: "ChatGPT", logo: "/icons/ai-platforms/chatgpt.svg" },
  { name: "Claude", logo: `${AI_ICONS}/Claude.svg` },
  { name: "Perplexity", logo: `${AI_ICONS}/Perplexity.svg` },
];
const GIVES = ["See your AI visibility", "Find what to fix", "Track your competitors", "Get a shareable report"];

export function HeroHighlights() {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-2" aria-label="AI apps we check">
        {APPS.map((app) => (
          <li
            key={app.name}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1 text-[length:calc(13px*var(--px,1))] font-medium text-muted-foreground"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a small logo file, shown at its own size */}
            <img src={app.logo} alt="" width={14} height={14} className="size-3.5" />
            {app.name}
          </li>
        ))}
      </ul>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {GIVES.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-[length:calc(15px*var(--px,1))] font-medium">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check aria-hidden className="size-3" strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
