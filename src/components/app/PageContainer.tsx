import { cn } from "cn";

// Standard padding and width for app pages; the Overview sets its own. `wide`: a board that needs the room (Actions).
export function PageContainer({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 py-4 sm:px-6 sm:py-5", wide ? "max-w-[1440px]" : "max-w-[1200px]")}>{children}</div>;
}
