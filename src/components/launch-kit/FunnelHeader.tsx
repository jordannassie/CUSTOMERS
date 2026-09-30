import Image from "next/image";
import Link from "next/link";

export default function FunnelHeader({ cta = true }: { cta?: boolean }) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#E5E5E1]">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link href="/" aria-label="Customers.Direct home" className="shrink-0">
          <Image
            src="/images/logos/logo-black.png"
            alt="Customers.Direct"
            width={148}
            height={36}
            priority
            className="h-8 w-auto"
          />
        </Link>
        <nav className="hidden sm:flex items-center gap-5 text-[13px] font-medium text-[#6B6B67] ml-4">
          <Link href="/" className="hover:text-[#171717]">
            For businesses
          </Link>
          <Link href="/agency" className="hover:text-[#171717]">
            For agencies
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/login?next=/academy" className="text-[13px] font-medium text-[#6B6B67] hover:text-[#171717]">
            Log in
          </Link>
          {cta ? (
            <Link
              href="/start-ai-business/checkout"
              className="hidden md:inline-flex items-center justify-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold px-4 py-2 rounded-[4px] transition-colors"
            >
              Start your AI business: $97
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
