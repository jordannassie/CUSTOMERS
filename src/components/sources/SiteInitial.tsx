/** The site's first letter in a small tile; a stand-in for a logo, since we don't load other sites' images. */
export function SiteInitial({ host }: { host: string }) {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-muted text-[13px] font-semibold text-muted-foreground uppercase"
      aria-hidden="true"
    >
      {host.charAt(0)}
    </span>
  );
}
