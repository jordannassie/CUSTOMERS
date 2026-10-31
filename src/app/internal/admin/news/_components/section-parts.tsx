import type { ReactNode } from "react";

export function SectionLetter({ letter }: { letter: string }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-muted text-[12px] font-semibold text-muted-foreground">
      {letter}
    </span>
  );
}

export function PanelSection({ letter, title, action, note, children }: {
  letter: string;
  title: string;
  action?: ReactNode;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-surface p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SectionLetter letter={letter} />
          <h3 className="text-[14px] font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      {note && <p className="mb-2 text-[12px] text-muted-foreground">{note}</p>}
      {children}
    </section>
  );
}
