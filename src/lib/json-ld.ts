// Structured data for search engines, written into a <script type="application/ld+json"> tag. JSON.stringify leaves
// "<" as is, so text from users (an app review's title, say) could close the tag with "</script>" and start its own
// script. Writing "<" as < keeps the same JSON and the tag can never be closed early.
export function jsonLdHtml(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
