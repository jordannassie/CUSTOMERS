import { redirect } from "next/navigation";

// Only redirects, so it never renders a UI to check for instant navigation (BUG-052).
export const instant = false;

// The Opportunities page moved to /opportunities (B-52); old links keep working.
export default function OpportunitiesRedirect() {
  redirect("/opportunities");
}
