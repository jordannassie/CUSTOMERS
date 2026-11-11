import { cn } from "cn";

type Props = {
  title: React.ReactNode;
  /** The line under the title. */
  description?: React.ReactNode;
  descriptionTestId?: string;
  /** Buttons on the right; on a phone they sit under the text. */
  actions?: React.ReactNode;
  /** Long names (a business): two lines at most, the full name on hover. */
  clampTitle?: string;
  /** More lines under the description, 12px apart like the rest of the header. */
  children?: React.ReactNode;
  /**
   * Check-in pages that open with the user's question bubble: the title is kept for screen readers and the page outline
   * but not shown, so the page does not say the same thing twice. The description becomes one small line.
   */
  quiet?: boolean;
  /** Shown beside the title, or at the start of the small line on a quiet header (the sample data label). */
  badge?: React.ReactNode;
};

// The one app page header (DESIGN.md, Rhythm): title, description and any line under them 12px apart, the same on a
// phone and a desktop. Pages put their content 24px under it.
export function PageHeader({ title, description, descriptionTestId, actions, clampTitle, children, quiet = false, badge }: Props) {
  if (quiet) {
    return (
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <h1 className="sr-only">{title}</h1>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {badge || description ? (
            <p className="flex max-w-[680px] flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-relaxed text-muted-foreground" data-testid={descriptionTestId}>
              {badge}
              {description}
            </p>
          ) : null}
          {children}
        </div>
        {actions ? <div className="shrink-0 sm:max-w-[60%]">{actions}</div> : null}
      </header>
    );
  }
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h1
          className={cn(
            "font-display text-[28px] leading-tight font-semibold break-words",
            clampTitle ? "line-clamp-2" : "flex flex-wrap items-center gap-2",
          )}
          title={clampTitle}
        >
          {title}
          {badge}
        </h1>
        {description ? (
          <p className="max-w-[680px] text-[15px] leading-relaxed text-muted-foreground" data-testid={descriptionTestId}>
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {/* Capped so a long row of buttons (the Overview's) wraps instead of squeezing the title on a tablet. */}
      {actions ? <div className="shrink-0 sm:max-w-[60%]">{actions}</div> : null}
    </header>
  );
}
