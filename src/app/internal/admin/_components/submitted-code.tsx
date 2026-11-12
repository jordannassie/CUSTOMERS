import { Badge } from "@/components/ui/badge";

// For leads and feature requests whose text holds web code (src/lib/submitted-text.ts): a badge in the list, and in
// the open item a plain note with the original text folded away.

export function SpamBadge() {
  return (
    <Badge variant="secondary" title="It contains web code, which people don't type in a real message.">
      Looks like spam
    </Badge>
  );
}

/** The note shown above a flagged item, and its original text for anyone who needs it (only non-empty fields). */
export function CodeNotice({ what, original }: { what: string; original: Record<string, string | null | undefined> }) {
  const fields = Object.entries(original).filter((entry): entry is [string, string] => !!entry[1]);
  return (
    <div className="flex flex-col gap-2 rounded-md bg-primary-tint px-4 py-3 text-[length:calc(13px*var(--px,1))] text-foreground">
      <p>
        This {what} contains web code that people don&apos;t type in a real message, so it&apos;s most likely spam or a
        security test. It&apos;s shown below with the code taken out, and nothing in it can run.
      </p>
      {fields.length > 0 && (
        <details>
          <summary className="w-fit cursor-pointer font-medium text-primary-hover">Show the original text</summary>
          <dl className="mt-2 flex flex-col gap-1.5">
            {fields.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="font-medium">{label}</dt>
                <dd className="font-mono text-[length:calc(12px*var(--px,1))] break-all whitespace-pre-wrap">{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
