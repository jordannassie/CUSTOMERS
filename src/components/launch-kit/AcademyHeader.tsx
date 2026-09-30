import Link from "next/link";
import Image from "next/image";

export default function AcademyHeader() {
  return (
    <header className="border-b border-[#E5E5E1] bg-white">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link href="/academy" className="shrink-0">
          <Image
            src="/images/logos/logo-black.png"
            alt="Customers.Direct"
            width={140}
            height={32}
            className="h-7 w-auto"
          />
        </Link>
        <span className="text-[13px] text-[#6B6B67]">Academy</span>
        <div className="ml-auto flex items-center gap-4 text-[13px]">
          <Link href="/agency/activate" className="text-[#2563EB] font-medium">
            Agency software
          </Link>
          <Link href="/dashboard" className="text-[#6B6B67] hover:text-[#171717]">
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
