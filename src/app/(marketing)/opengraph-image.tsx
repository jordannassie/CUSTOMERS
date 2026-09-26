import { ImageResponse } from "next/og";

export const alt = "Customers.Direct: see if ChatGPT, Claude and Perplexity recommend your business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse cannot read CSS variables, so these copy the DESIGN.md token values.
const TOKENS = {
  background: "#FAFAF8",
  text: "#171717",
  secondary: "#6B6B67",
  primary: "#2563EB",
  border: "#E5E5E1",
  chatgpt: "#10A37F",
  claude: "#D97757",
  perplexity: "#20808D",
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
