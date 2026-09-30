import { redirect } from "next/navigation";

// Only redirects, so it never renders a UI to check for instant navigation (BUG-052).
export const instant = false;

// The Sources page moved to /sources (B-54); old links keep working.
export default function CitationsRedirect() {
  redirect("/sources");
}
