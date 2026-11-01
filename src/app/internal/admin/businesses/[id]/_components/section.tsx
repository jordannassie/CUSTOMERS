import AdminEmpty from "../../../_components/admin-empty";

export default function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id={id} className="text-[16px] font-semibold">
          {title}
        </h2>
        {note && <p className="text-[13px] text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** A section with nothing in it: the admin empty state without a title. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <AdminEmpty>{children}</AdminEmpty>;
}
