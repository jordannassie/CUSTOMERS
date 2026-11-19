// Email clients ignore CSS variables, so the DESIGN.md tokens are repeated here as plain values.
export const colors = {
  background: "#FAFAF8",
  surface: "#FFFFFF",
  border: "#E5E5E1",
  text: "#171717",
  textSecondary: "#6B6B67",
  textHint: "#737370",
  primary: "#2563EB",
  primaryTint: "#EFF6FF",
  goodText: "#15803D",
  midText: "#B45309",
  lowText: "#B91C1C",
} as const;

// Geist is not installed in mail apps, so the stack falls back to each system's sans serif.
export const fontFamily =
  "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const radius = "4px";
