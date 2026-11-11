// Email clients ignore CSS variables, so the Check-in theme tokens (src/app/globals.css) are repeated here as plain
// values. Good is the brand blue, so-so is neutral, bad is the danger coral; no green or yellow.
export const colors = {
  background: "#EEF2F8",
  surface: "#FFFFFF",
  border: "#DCE3EE",
  text: "#141B2D",
  textSecondary: "#545E70",
  textHint: "#667085",
  primary: "#2563EB",
  primaryTint: "#EAF1FF",
  goodText: "#1D4ED8",
  midText: "#3A4456",
  lowText: "#8A3B26",
} as const;

// Figtree is not installed in mail apps, so the stack falls back to each system's sans serif.
export const fontFamily =
  "Figtree, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const radius = "12px";
