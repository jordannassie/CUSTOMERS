import Link from "next/link";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

const TONES = {
  default: "bg-background",
  surface: "bg-surface",
  muted: "bg-muted",
} as const;

export function Section({
  id,
  tone = "default",
  className,
  children,
  ...props
}: React.ComponentProps<"section"> & { tone?: keyof typeof TONES }) {
  return (
    <section id={id} className={cn("scroll-mt-16 border-t border-border py-16 sm:py-22", TONES[tone], className)} {...props}>
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6">{children}</div>
    </section>
  );
}

export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "inline-flex w-fit items-center rounded-sm bg-primary-tint px-2 py-1 text-[13px] font-medium text-primary-hover",
        className,
      )}
      {...props}
    />
  );
}

export function H2({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "text-[32px] leading-[1.15] font-semibold tracking-[-0.02em] text-balance sm:text-5xl sm:tracking-[-0.035em]",
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
    <div className="flex flex-col items-start gap-6 rounded-md bg-primary px-6 py-10 text-primary-foreground sm:px-12 sm:py-14 md:flex-row md:items-center md:justify-between">
      <div className="flex max-w-xl flex-col gap-3">
        <h2 className="text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-[32px]">{title}</h2>
        {description && <p className="text-[15px] text-primary-foreground">{description}</p>}
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button asChild size="lg" variant="outline" className="border-transparent bg-surface text-primary hover:bg-primary-tint hover:text-primary-hover">
          <Link href={primary.href}>{primary.label}</Link>
        </Button>
        {secondary && (
          <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground">
            <Link href={secondary.href}>{secondary.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
