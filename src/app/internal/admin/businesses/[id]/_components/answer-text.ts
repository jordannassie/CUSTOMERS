// The AI answers are saved as the models wrote them, in markdown: "**[Hungry Ghost Bread](https://...)**". The admin
// answer dialog shows them as plain text instead: links become their words, bold and headings lose their marks, list
// items get a bullet, and line breaks stay. The result is text for a React text node, never HTML. Pure.

const BULLET = "•";

export function plainAnswer(markdown: string): string {
  return (
    markdown
      .replace(/\r\n?/g, "\n")
      // Fenced code: keep what is inside, drop the fences.
      .replace(/^[ \t]*```[^\n]*\n?/gm, "")
      // Images and links become their words; bare <https://...> links keep the address.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\((?:[^()]|\([^)]*\))*\)/g, "$1")
      .replace(/\[(\d+)\]/g, "")
      .replace(/<(https?:\/\/[^>\s]+)>/g, "$1")
      // Headings, quotes and rules.
      .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
      .replace(/^[ \t]*>[ \t]?/gm, "")
      .replace(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/gm, "")
      // Table divider rows, then the outer pipes of each table row.
      .replace(/^[ \t]*\|?([ \t]*:?-{3,}:?[ \t]*\|)+[ \t]*(:?-*:?)?[ \t]*\n?/gm, "")
      .replace(/^[ \t]*\|(.*)\|[ \t]*$/gm, (_, row: string) => row.split("|").map((c) => c.trim()).join("  |  "))
      // List markers become a bullet; numbered lists keep their numbers.
      .replace(/^([ \t]*)[-*+][ \t]+/gm, `$1${BULLET} `)
      // Bold, italic, strikethrough and inline code lose their marks. Underscores count only around whole words.
      .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2")
      .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, "$1$2")
      .replace(/(^|[^\w])_(?=\S)([^_\n]*?\S)_(?!\w)/g, "$1$2")
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "$1")
      .replace(/`([^`\n]+)`/g, "$1")
      // Spaces left before a line end, and runs of blank lines.
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
