import { redirect } from "next/navigation";

export const metadata = { title: "Add Business", robots: { index: false } };

// Adding another business runs the wizard's business steps only (MVP_SPEC 3.1); the website step
// checks the trial's business limit.
export default function AddBusinessPage() {
  redirect("/onboarding/website");
}
