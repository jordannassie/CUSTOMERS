import { cn } from "cn";

// Standard padding and width for app pages; the Overview sets its own. `wide`: a board that needs the room (Actions).
export function PageContainer({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 py-4 sm:px-6 sm:py-5", wide ? "max-w-[calc(1440px*var(--px,1))]" : "max-w-[calc(1200px*var(--px,1))]")}>{children}</div>;
}
