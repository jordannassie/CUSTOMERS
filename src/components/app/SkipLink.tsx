/** First tab stop on app and admin pages, so keyboard users can jump past the menu. */
export function SkipLink({ target = "main" }: { target?: string }) {
  return (
    <a
      href={`#${target}`}
      className="sr-only rounded-md bg-surface text-sm font-medium text-foreground shadow-float focus:not-sr-only focus:fixed focus:px-4 focus:py-2.5 focus:top-3 focus:left-3 focus:z-[60] focus:ring-3 focus:ring-ring/50 focus:outline-none"
    >
      Skip to content
    </a>
  );
}
