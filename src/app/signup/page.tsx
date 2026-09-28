import { Suspense } from "react";
import AuthForm from "@/components/geo/AuthForm";
import AuthFormSkeleton from "@/components/geo/AuthFormSkeleton";

export const metadata = {
  title: "Sign up",
  robots: { index: false },
};

type SearchParams = Promise<{ error?: string }>;

// Only the form waits for ?error=, so the rest of the page stays in the static shell (Cache Components).
async function FormWithError({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  return <AuthForm defaultMode="signup" errorParam={error} />;
}

export default function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-6xl flex flex-col md:flex-row items-center gap-8">
        {/* Left: Auth form defaulting to Sign Up tab */}
        <div className="w-full md:w-[420px] mx-auto md:mx-0">
          <Suspense fallback={<AuthFormSkeleton />}>
            <FormWithError searchParams={searchParams} />
          </Suspense>
        </div>

        {/* Right: Banner image (desktop only) */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div
            className="w-full rounded-2xl overflow-hidden border border-[#E5E5E1] bg-white"
            style={{
              height: "520px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/banners/banner2/ChatGPT%20Image%20Aug%2026,%202026,%2012_44_50%20PM%20(6).png"
              alt="Welcome to Customers.Direct"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
