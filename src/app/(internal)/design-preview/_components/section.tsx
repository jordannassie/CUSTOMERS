export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-border py-12">
      <h2 id={`${id}-title`} className="text-xl font-semibold tracking-[-0.02em]">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Demo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
