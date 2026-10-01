import { redirect } from "next/navigation";

// Only redirects, so it never renders a UI to check for instant navigation (BUG-052).
export const instant = false;

export const metadata = { title: "Add Business", robots: { index: false } };

// Adding another business runs the wizard's business steps only (MVP_SPEC 3.1); the website step
// checks the trial's business limit.
export default function AddBusinessPage() {
  redirect("/onboarding/website");
}
