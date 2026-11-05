import Link from "next/link";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

// Check-in: every section sits on the ground colour; white cards inside carry the content.
const TONES = {
  default: "bg-background",
  surface: "bg-background",
  muted: "bg-background",
} as const;

export function Section({
  id,
  tone = "default",
  className,
  children,
  ...props
}: React.ComponentProps<"section"> & { tone?: keyof typeof TONES }) {
  return (
    <section id={id} className={cn("scroll-mt-16 py-14 sm:py-20", TONES[tone], className)} {...props}>
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6">{children}</div>
    </section>
  );
}

export function H2({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "font-serif text-[32px] leading-[1.15] font-normal text-balance sm:text-[44px]",
        className,
      )}
      {...props}
    />
  );
}

export function Lead({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("max-w-[60ch] text-lg text-muted-foreground text-pretty", className)} {...props} />;
}

type CtaLink = { label: string; href: string };

export function CTA({
  title,
  description,
  primary,
  secondary,
}: {
  title: string;
  description?: string;
  primary: CtaLink;
  secondary?: CtaLink;
}) {
  return (
    <div className="flex flex-col items-start gap-6 rounded-xl bg-gradient-user px-6 py-10 text-primary-foreground shadow-user sm:px-12 sm:py-14 md:flex-row md:items-center md:justify-between">
      <div className="flex max-w-xl flex-col gap-3">
        <h2 className="font-serif font-normal text-2xl leading-tight text-balance sm:text-[32px]">{title}</h2>
        {description && <p className="text-[15px] text-primary-foreground">{description}</p>}
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button asChild size="lg" variant="outline" className="rounded-full border-transparent bg-surface text-brand-strong hover:bg-brand-tint hover:text-brand-strong">
          <Link href={primary.href}>{primary.label}</Link>
        </Button>
        {secondary && (
          <Button asChild size="lg" variant="ghost" className="rounded-full border-white/50 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
            <Link href={secondary.href}>{secondary.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
