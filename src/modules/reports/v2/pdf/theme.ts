import { StyleSheet } from "@react-pdf/renderer";
import { FONT_FAMILY } from "./fonts";

// The report's look (docs/report-reference.pdf). Sizes are PDF points on a Letter page (612 x 792). No filled or tinted
// boxes: cards are white with a 1pt border, so every page reads the same in black and white. Orange marks problems only,
// and always next to a word that says the same thing. Never set lineHeight on a Page: react-pdf then drops fixed and
// dynamic text (the footer and the section labels) from the page.
export const COLORS = {
  ink: "#14181F",
  secondary: "#3F4652",
  muted: "#5B6472",
  border: "#D9DEE7",
  divider: "#E6E9EF",
  problem: "#9A3412",
  white: "#FFFFFF",
} as const;

export const DEFAULT_ACCENT = "#1F4FD1";

/** The agency's accent when it is a plain 3 or 6 digit hex colour, otherwise the default blue. */
export function safeAccent(value: string | null | undefined): string {
  return value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) ? value.trim() : DEFAULT_ACCENT;
}

export const PAGE = { marginX: 48, top: 82, bottom: 78 } as const;
export const CONTENT_WIDTH = 612 - PAGE.marginX * 2;

export const s = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: 10.5,
    color: COLORS.ink,
    backgroundColor: COLORS.white,
    paddingTop: PAGE.top,
    paddingBottom: PAGE.bottom,
    paddingHorizontal: PAGE.marginX,
  },
  coverPage: { paddingTop: 48, paddingBottom: 48 },
  header: {
    position: "absolute",
    top: 43,
    left: PAGE.marginX,
    right: PAGE.marginX,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 38,
    left: PAGE.marginX,
    right: PAGE.marginX,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    fontSize: 9,
    color: COLORS.muted,
  },
  sectionLabel: { fontSize: 9, fontWeight: 700, letterSpacing: 1.3, marginBottom: 7 },
  h1: { fontSize: 22, fontWeight: 700, lineHeight: 1.17, letterSpacing: -0.3, marginBottom: 8 },
  lead: { fontSize: 11.5, color: COLORS.secondary, lineHeight: 1.45 },
  h2: { fontSize: 11, fontWeight: 600, marginBottom: 7 },
  row: { flexDirection: "row" },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.white },
  label: { fontSize: 9.5, color: COLORS.muted },
  small: { fontSize: 9.5, color: COLORS.secondary, lineHeight: 1.4 },
  muted: { color: COLORS.muted },
  bold: { fontWeight: 700 },
  semibold: { fontWeight: 600 },
  caps: { fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: COLORS.secondary },
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
});

/** Clamp a text block to a number of lines, ending with an ellipsis, so long AI wording never pushes a card off a page. */
export const lines = (maxLines: number) => ({ maxLines, textOverflow: "ellipsis" as const });
