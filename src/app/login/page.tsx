import { Suspense } from "react";
import AuthForm from "@/components/geo/AuthForm";

export const metadata = {
  title: "Log In",
  robots: { index: false },
};

type SearchParams = Promise<{ error?: string }>;

// Only the form waits for ?error=, so the rest of the page stays in the static shell (Cache Components).
async function FormWithError({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  return <AuthForm defaultMode="login" errorParam={error} />;
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-6xl flex flex-col md:flex-row items-center gap-8">
        {/* Left: Auth form with both tabs */}
        <div className="w-full md:w-[420px] mx-auto md:mx-0">
          <Suspense fallback={<AuthForm defaultMode="login" />}>
            <FormWithError searchParams={searchParams} />
          </Suspense>
        </div>

        {/* Right: Banner image (desktop only) */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div
            className="w-full rounded-2xl overflow-hidden border border-[#E5E5E1] bg-white"
            style={{
              aspectRatio: "1672 / 941",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/Mr.Direct/Smug%20Spokesperson%20Among%20AI%20Icons.png"
              alt="Mr. Direct in front of Customers.Direct with AI assistant icons"
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
