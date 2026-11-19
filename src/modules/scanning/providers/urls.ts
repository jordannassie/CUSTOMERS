import { isMapSearchLink } from "@/lib/cited-links";

// OpenAI tags every cited link with utm_source=openai; dropping it lets the same page match across models.
export function cleanUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // A Maps or Google search link the AI built from a name is not a page it read.
    if (isMapSearchLink(url.toString())) return null;
    if (url.searchParams.get("utm_source") === "openai") url.searchParams.delete("utm_source");
    return url.toString();
  } catch {
    return null;
  }
}
