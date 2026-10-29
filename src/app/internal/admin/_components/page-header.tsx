/** Every admin page's title, one line on what the page is for, and its page actions on the right (wrapping on phones). */
export default function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-center gap-2 text-[24px] font-semibold tracking-[-0.02em] break-words">{title}</h1>
        {subtitle && <div className="mt-1 text-[14px] break-words text-muted-foreground">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
