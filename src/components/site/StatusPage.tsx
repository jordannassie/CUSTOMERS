import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/marketing/Logo";

type Props = {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
  /** A small fact that helps the reader or support, such as the address that was not found. */
  detail?: { label: string; value: React.ReactNode };
  /** Inside the app frame, which already has the logo and the page's <main>. */
  embedded?: boolean;
};

// Full-screen page for 404s and crashes: logo, what happened, what to do next.
export function StatusPage({ icon: Icon, title, children, actions, detail, embedded = false }: Props) {
  const body = (
    <div className="w-full max-w-[560px]">
      <div className="flex size-10 items-center justify-center rounded-md border border-border bg-surface text-primary">
        <Icon aria-hidden className="size-5" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-tight">{title}</h1>
      <div className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
      <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
      {detail ? (
        <dl className="mt-10 border-t border-border pt-4 text-[13px]">
          <dt className="text-text-hint">{detail.label}</dt>
          <dd className="mt-1 font-mono break-all text-foreground">{detail.value}</dd>
        </dl>
      ) : null}
    </div>
  );

  if (embedded) return <div className="px-5 py-16 sm:px-8">{body}</div>;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto w-full max-w-[1120px] px-5 pt-6 sm:px-8 sm:pt-8">
        <Logo className="h-8 w-auto" />
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 items-center px-5 py-16 sm:px-8">{body}</main>
    </div>
  );
}
