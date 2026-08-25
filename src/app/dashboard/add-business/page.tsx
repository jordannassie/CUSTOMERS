import OnboardingWizard from "@/components/geo/OnboardingWizard";

export const metadata = { title: "Add Business", robots: { index: false } };

// /dashboard/* is already gated to signed-in users by src/proxy.ts. This
// page always renders the wizard (unlike /dashboard, which only shows it
// when the user has no completed business yet) so an already-onboarded
// user can add a second, third, etc. business without it colliding with
// their existing one — the wizard always POSTs a brand new businesses row
// scoped to their own owner_user_id, never touches an existing business.
export default function AddBusinessPage() {
  return <OnboardingWizard />;
}
