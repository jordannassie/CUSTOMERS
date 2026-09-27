import { redirect } from "next/navigation";

// The Sources page moved to /sources (B-54); old links keep working.
export default function CitationsRedirect() {
  redirect("/sources");
}
