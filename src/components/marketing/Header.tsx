import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MrDirectAvatar } from "@/components/site/MrDirectAvatar";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { LOGIN_HREF, NAV_LINKS, TRIAL_HREF, TRIAL_LABEL } from "./nav";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-8 px-4 sm:px-6">
        <Logo preload />

        <nav aria-label="Main" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Link
            href="/contact"
            aria-label="Talk to Mr. Direct"
            title="Talk to Mr. Direct"
            className="shrink-0 rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <MrDirectAvatar alt="" className="size-9 border border-border" />
          </Link>
          <Button asChild variant="ghost">
            <Link href={LOGIN_HREF}>Log in</Link>
          </Button>
          <Button asChild>
            <Link href={TRIAL_HREF}>{TRIAL_LABEL}</Link>
          </Button>
        </div>

        <div className="ml-auto lg:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
