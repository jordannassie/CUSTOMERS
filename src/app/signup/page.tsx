import AuthForm from "@/components/geo/AuthForm";

export const metadata = {
  title: "Sign Up — Check Your AI Visibility",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center px-4 py-16">
      <AuthForm mode="signup" />
    </div>
  );
}
