import { redirect } from "next/navigation";

// The Opportunities page moved to /opportunities (B-52); old links keep working.
export default function OpportunitiesRedirect() {
  redirect("/opportunities");
}
