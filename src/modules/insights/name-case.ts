// Puts names back the way they are written after the writer applied sentence case: "Ai almost never mentions you"
// becomes "AI almost never mentions you", "Chatgpt knows you less than perplexity does" becomes "ChatGPT knows you
// less than Perplexity does" (BUG-078). Pure, no I/O.

const BRANDS = ["AI", "ChatGPT", "Claude", "Perplexity", "Google"];

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A title starts with a capital letter, even when the writer began it in lowercase. */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Restores the case of the AI brands and business names wherever they appear as whole words, never inside a domain. */
export function fixNameCase(text: string, names: string[] = []): string {
  let out = text;
  for (const name of [...BRANDS, ...names]) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    // Not next to a letter or digit, and not part of a domain such as khaadi.com or www.khaadi.com.
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}]|[\\p{L}\\p{N}]\\.)${escape(trimmed)}(?![\\p{L}\\p{N}]|\\.[\\p{L}\\p{N}])`, "giu");
    out = out.replace(pattern, trimmed);
  }
  return out;
}
