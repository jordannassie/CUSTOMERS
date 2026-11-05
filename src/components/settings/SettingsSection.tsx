import { cn } from "cn";

// One card of the settings page (Check-in theme): what it is on the left with a serif title, the controls on the
// right, stacked on a phone.
export function SettingsSection({
  id,
  title,
  description,
  tone = "default",
  children,
}: {
  id: string;
  title: string;
  description: React.ReactNode;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="mb-4 grid scroll-mt-20 gap-4 rounded-xl bg-card px-5 py-[22px] last:mb-0 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10"
    >
      <div className="max-w-prose">
        <h2
          id={`${id}-title`}
          className={cn("font-serif text-xl font-normal", tone === "danger" ? "text-danger" : "text-foreground")}
        >
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-border bg-surface p-5", className)} {...props} />;
}

export const TEXTAREA_CLASS =
  "min-h-20 w-full rounded-lg border border-input bg-surface px-3 py-2 text-base outline-none transition-colors placeholder:text-text-hint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[12px] bg-low-bg px-3 py-2 text-[13px] text-low-text">
      {message}
    </p>
  );
}
