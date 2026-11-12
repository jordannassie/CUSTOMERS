// From the live site's hero (2026-11-12): the AI apps as logo chips, the same five as the live site. Logos are the
// live site's files, used as they are.
const AI_ICONS = "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/icons/New%20AI%20Icons";
const APPS = [
  { name: "ChatGPT", logo: "/icons/ai-platforms/chatgpt.svg" },
  { name: "Claude", logo: `${AI_ICONS}/Claude.svg` },
  { name: "Perplexity", logo: `${AI_ICONS}/Perplexity.svg` },
  { name: "Gemini", logo: `${AI_ICONS}/Gemini.svg` },
  { name: "Google AI", logo: `${AI_ICONS}/GoogleAI.svg` },
];

/** The AI apps as logo chips. */
export function AppChips() {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="AI apps">
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
  );
}
