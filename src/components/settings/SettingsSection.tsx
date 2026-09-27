import { cn } from "cn";

// One row of the settings page: what it is on the left, the controls on the right (stacked on a phone).
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
      className="grid gap-4 border-t border-border py-8 first:border-t-0 first:pt-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10"
    >
      <div className="max-w-prose">
        <h2
          id={`${id}-title`}
          className={cn("text-base font-semibold tracking-[-0.02em]", tone === "danger" ? "text-low-text" : "text-foreground")}
        >
          {title}
        </h2>
        <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{description}</div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-md border border-border bg-surface p-5", className)} {...props} />;
}

export const TEXTAREA_CLASS =
  "min-h-20 w-full rounded-lg border border-input bg-surface px-3 py-2 text-base outline-none transition-colors placeholder:text-text-hint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
      {message}
    </p>
  );
}
