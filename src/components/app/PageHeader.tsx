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
};

// The one app page header (DESIGN.md, Rhythm): title, description and any line under them 12px apart, the same on a
// phone and a desktop. Pages put their content 24px under it.
export function PageHeader({ title, description, descriptionTestId, actions, clampTitle, children }: Props) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h1
          className={cn(
            "text-2xl font-semibold tracking-[-0.02em] break-words",
            clampTitle ? "line-clamp-2" : "flex flex-wrap items-center gap-2",
          )}
          title={clampTitle}
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-[680px] text-[15px] text-muted-foreground" data-testid={descriptionTestId}>
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
