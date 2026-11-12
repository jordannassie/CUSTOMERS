import Image from "next/image";
import { MR_DIRECT_STOREFRONT } from "@/components/marketing/home/media";

/**
 * The log in and sign up page frame (2026-11-12). Everything is anchored to the top, not centred, so switching
 * between Log in and Sign up (different form heights) never moves the logo, the card or the photo. The photo is the
 * live site's, its top level with the card's (the logo above the card takes 95px with its gap). Wide screens only.
 */
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 pt-12 pb-16 sm:pt-16 lg:pt-20">
      <div className="mx-auto grid w-full max-w-6xl justify-items-center gap-8 lg:grid-cols-[calc(420px*var(--px,1))_minmax(0,1fr)] lg:items-start lg:justify-items-stretch lg:gap-16">
        <div className="w-full max-w-[calc(420px*var(--px,1))]">{children}</div>
        <div className="hidden lg:block lg:pt-[95px]">
          <div className="relative aspect-[1672/941] overflow-hidden rounded-md border border-border bg-muted shadow-float">
            <Image
              src={MR_DIRECT_STOREFRONT}
              alt="Mr. Direct in front of the Customers.Direct office, with the AI assistant icons"
              fill
              priority
              sizes="(min-width: 1152px) 650px, 55vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
