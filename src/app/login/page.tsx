import AuthForm from "@/components/geo/AuthForm";

export const metadata = {
  title: "Log In",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-6xl bg-transparent flex flex-col md:flex-row items-stretch gap-8">
        {/* Left: Auth form */}
        <div className="w-full md:w-[420px] mx-auto">
          <AuthForm mode="login" />
        </div>

        {/* Right: Image area (hidden on small screens) */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="w-full h-[420px] rounded-2xl overflow-hidden border border-[#E5E5E1] bg-white" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)" }}>
            <img
              src={"https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/banners/banner2/ChatGPT%20Image%20Aug%2026,%202026,%2012_44_50%20PM%20(6).png"}
              alt="Welcome banner"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
