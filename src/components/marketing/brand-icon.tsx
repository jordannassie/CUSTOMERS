import { ImageResponse } from "next/og";

// ImageResponse cannot read CSS variables, so this copies the DESIGN.md primary token.
const PRIMARY = "#2563EB";

// The check mark from the logo, white on the brand blue, for the favicon and home screen icon.
// iOS rounds the home screen icon itself, so that one stays square.
export function brandIcon(px: number, { rounded }: { rounded: boolean }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PRIMARY,
          borderRadius: rounded ? Math.round(px / 8) : 0,
        }}
      >
        <svg width={px * 0.62} height={px * 0.62} viewBox="0 0 24 24" fill="none">
          <path d="M4 12.5l5 5L20 6.5" stroke="white" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: px, height: px },
  );
}
