import { ImageResponse } from "next/og";

export const alt = "Customers.Direct: see if ChatGPT, Claude and Perplexity recommend your business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse cannot read CSS variables, so these copy the Check-in token values from globals.css.
const TOKENS = {
  background: "#EEF2F8",
  text: "#141B2D",
  secondary: "#545E70",
  primary: "#2563EB",
  border: "#DCE3EE",
  chatgpt: "#98A2B3",
  claude: "#2563EB",
  perplexity: "#D98C3F",
};

const MODELS = [
  { name: "ChatGPT", color: TOKENS.chatgpt },
  { name: "Claude", color: TOKENS.claude },
  { name: "Perplexity", color: TOKENS.perplexity },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: TOKENS.background,
          borderTop: `12px solid ${TOKENS.primary}`,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: TOKENS.text }}>Customers.Direct</div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: TOKENS.text,
            maxWidth: 980,
          }}
        >
          See if AI recommends your business
        </div>
        <div style={{ display: "flex", gap: 40, fontSize: 30, color: TOKENS.secondary }}>
          {MODELS.map(({ name, color }) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: color }} />
              {name}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
