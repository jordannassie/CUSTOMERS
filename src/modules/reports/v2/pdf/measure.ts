import { Font } from "@react-pdf/renderer";
import { FONT_FAMILY } from "./fonts";

// Measures text with the same Inter files react-pdf draws with, so fit.ts can count lines before the PDF is drawn.

/** Width in points of `text` at `size`. */
export type Measure = (text: string, size: number, weight: 400 | 600) => number;

/** Loads Inter regular and semibold from react-pdf's font store; null when they cannot be read. */
export async function loadMeasure(): Promise<Measure | null> {
  try {
    const weights = [400, 600] as const;
    await Promise.all(weights.map((fontWeight) => Font.load({ fontFamily: FONT_FAMILY, fontWeight })));
    const fonts = new Map(weights.map((w) => [w, Font.getFont({ fontFamily: FONT_FAMILY, fontWeight: w }).data]));
    if ([...fonts.values()].some((f) => !f)) return null;
    return (text, size, weight) => {
      const font = fonts.get(weight)!;
      return (font.layout(text).advanceWidth / font.unitsPerEm) * size;
    };
  } catch {
    return null;
  }
}

/**
 * Lines `text` takes at `width`, wrapping word by word the way react-pdf does: it squeezes the spaces of a line by up
 * to a third to fit one more word (seen: 481pt of natural text set on a 467pt line). A 0.5% margin keeps borderline
 * lines on the safe side. A count that runs low only shortens the text; the card height stays within its limits.
 */
export function countLines(measure: Measure, text: string, size: number, weight: 400 | 600, width: number): number {
  const space = measure(" ", size, weight);
  let lines = 1;
  let used = 0;
  let spaces = 0;
  for (const word of text.trim().split(/\s+/)) {
    const w = measure(word, size, weight);
    const next = used + space + w;
    if (used > 0 && next - ((spaces + 1) * space) / 3 > width * 0.995) {
      lines += 1;
      used = w;
      spaces = 0;
    } else if (used > 0) {
      used = next;
      spaces += 1;
    } else {
      used = w;
    }
  }
  return lines;
}
