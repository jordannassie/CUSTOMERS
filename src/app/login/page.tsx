import Link from "next/link";
import AuthForm from "@/components/geo/AuthForm";

export const metadata = {
  title: "Log In",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center px-4 py-16">
      <Link href="/ai-search" className="mb-8 text-[#0F172A] font-black text-xl tracking-tight">
        Customers<span className="text-[#2563EB]">.Direct</span>
      </Link>
      <AuthForm mode="login" />
    </div>
  );
}
