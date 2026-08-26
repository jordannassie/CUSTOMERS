"use client";

/**
 * AIOrbitAnimation — Animated AI platform orbit visual.
 *
 * Shows major AI platforms orbiting a central Customers.Direct hub,
 * communicating "we track your visibility across all major AI search engines."
 *
 * Animation approach:
 * - Pure CSS @keyframes via inline styles / Tailwind (no heavy library)
 * - Respects prefers-reduced-motion
 * - Two orbital rings: inner (faster) and outer (slower)
 * - Each icon counter-rotates so it stays upright as it orbits
 *
 * Performance:
 * - Uses CSS transform only (compositor layer)
 * - No JS animation loop; no requestAnimationFrame
 * - No re-renders after mount
 */

const ORBIT_KEYFRAMES = `
@keyframes orbit-cw {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes orbit-ccw {
  from { transform: rotate(0deg); }
  to   { transform: rotate(-360deg); }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}
@keyframes pulse-ring {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%       { opacity: 0.15; transform: scale(1.04); }
}
@media (prefers-reduced-motion: reduce) {
  .orbit-ring { animation: none !important; }
  .orbit-icon { animation: none !important; }
  .center-float { animation: none !important; }
  .pulse-ring { animation: none !important; }
}
`;

// Platform definitions
interface Platform {
  name: string;
  /** Which orbital ring (inner = 0, outer = 1) */
  ring: 0 | 1;
  /** Starting angle in degrees */
  angle: number;
  /** Icon component */
  icon: React.FC<{ size: number }>;
}

// ─── Inline SVG icons for each platform ──────────────────────────────────────
// Clean, recognisable, sized to 32×32 viewport.

function ChatGPTIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="ChatGPT">
      <rect width="32" height="32" rx="8" fill="#10A37F" />
      <path
        d="M23.4 13.2a5.6 5.6 0 00-.78-6.84 5.62 5.62 0 00-6.07-1.35 5.6 5.6 0 00-3.76-1.51 5.62 5.62 0 00-5.34 3.89 5.6 5.6 0 00-3.74 2.72 5.62 5.62 0 00.69 6.57 5.6 5.6 0 00.78 6.84 5.62 5.62 0 006.07 1.35 5.6 5.6 0 003.76 1.51 5.62 5.62 0 005.35-3.9 5.6 5.6 0 003.74-2.72 5.62 5.62 0 00-.7-6.56zm-8.47 11.86a4.16 4.16 0 01-2.67-.96l.13-.08 4.43-2.56a.74.74 0 00.37-.64v-6.25l1.87 1.08a.07.07 0 01.04.05v5.18a4.18 4.18 0 01-4.17 4.18zM6.93 20.5a4.16 4.16 0 01-.5-2.8l.14.08 4.43 2.56a.73.73 0 00.74 0l5.41-3.12v2.16a.07.07 0 01-.03.06L12.6 21.9a4.18 4.18 0 01-5.67-1.4zm-1.08-9.68a4.16 4.16 0 012.17-1.83v5.26a.73.73 0 00.37.64l5.41 3.12-1.88 1.08a.07.07 0 01-.07 0L7.37 16.6a4.18 4.18 0 01-1.52-5.78zm14.65 3.59l-5.41-3.13L16.96 10a.07.07 0 01.07 0l4.47 2.58a4.18 4.18 0 01-.65 7.54V14.9a.73.73 0 00-.38-.5zm1.87-2.81l-.14-.08-4.43-2.56a.73.73 0 00-.74 0l-5.41 3.12V9.92a.07.07 0 01.03-.06l4.47-2.58a4.18 4.18 0 016.22 4.32zm-11.74 3.87L8.76 14.4a.07.07 0 01-.04-.06V9.16a4.18 4.18 0 016.86-3.21l-.13.08-4.43 2.56a.74.74 0 00-.37.64v6.25zM12 14.02l2.41-1.39 2.41 1.39v2.78L14.41 18 12 16.8z"
        fill="white"
      />
    </svg>
  );
}

function ClaudeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Claude">
      <rect width="32" height="32" rx="8" fill="#D97757" />
      <text
        x="16" y="22"
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fontFamily="Georgia, serif"
        fill="white"
      >
        C
      </text>
    </svg>
  );
}

function PerplexityIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Perplexity">
      <rect width="32" height="32" rx="8" fill="#20B2AA" />
      <path
        d="M16 5L22 10V14L16 10V5Z M16 5L10 10V14L16 10V5Z M10 14L16 18L22 14 M16 18V27 M10 14V22L16 27 M22 14V22L16 27"
        stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none"
      />
    </svg>
  );
}

function GeminiIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Gemini">
      <rect width="32" height="32" rx="8" fill="white" />
      <defs>
        <linearGradient id="gem-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="33%" stopColor="#9B72CB" />
          <stop offset="66%" stopColor="#D96570" />
          <stop offset="100%" stopColor="#F4A261" />
        </linearGradient>
      </defs>
      <path
        d="M16 4C16 4 19 10 19 16C19 22 16 28 16 28C16 28 13 22 13 16C13 10 16 4 16 4Z"
        fill="url(#gem-grad)"
      />
      <path
        d="M4 16C4 16 10 13 16 13C22 13 28 16 28 16C28 16 22 19 16 19C10 19 4 16 4 16Z"
        fill="url(#gem-grad)"
      />
    </svg>
  );
}

function GoogleAIIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Google AI">
      <rect width="32" height="32" rx="8" fill="white" />
      <path d="M22.56 16.25c0-.52-.05-1.02-.12-1.5H16v2.84h3.68a3.14 3.14 0 01-1.36 2.06v1.71h2.2c1.28-1.18 2.04-2.93 2.04-5.11z" fill="#4285F4" />
      <path d="M16 23c1.85 0 3.4-.61 4.53-1.65l-2.2-1.71c-.61.41-1.39.65-2.33.65-1.79 0-3.3-1.21-3.84-2.83H9.9v1.76A6.83 6.83 0 0016 23z" fill="#34A853" />
      <path d="M12.16 17.46a4.1 4.1 0 010-2.62V13.1H9.9A6.83 6.83 0 009 16.15c0 1.1.26 2.14.9 3.06l2.26-1.75z" fill="#FBBC05" />
      <path d="M16 11.2c1.01 0 1.92.35 2.63 1.03l1.97-1.97A6.83 6.83 0 0016 9.3a6.83 6.83 0 00-6.1 3.8l2.26 1.76c.54-1.62 2.05-2.67 3.84-2.67z" fill="#EA4335" />
    </svg>
  );
}

const PLATFORMS: Platform[] = [
  { name: "ChatGPT",    ring: 0, angle: 0,    icon: ChatGPTIcon    },
  { name: "Claude",     ring: 0, angle: 120,  icon: ClaudeIcon     },
  { name: "Perplexity", ring: 0, angle: 240,  icon: PerplexityIcon },
  { name: "Gemini",     ring: 1, angle: 60,   icon: GeminiIcon     },
  { name: "Google AI",  ring: 1, angle: 220,  icon: GoogleAIIcon   },
];

const RINGS = [
  { radius: 96,  duration: 22 },  // inner: 22s
  { radius: 152, duration: 34 },  // outer: 34s
];

// ─── Component ────────────────────────────────────────────────────────────────

import React from "react";

interface AIOrbitAnimationProps {
  /** Diameter of the whole animation container (px). Default 380 on desktop. */
  size?: number;
}

export default function AIOrbitAnimation({ size = 380 }: AIOrbitAnimationProps) {
  const center = size / 2;

  return (
    <>
      {/* Inject keyframes once */}
      <style dangerouslySetInnerHTML={{ __html: ORBIT_KEYFRAMES }} />

      <div
        className="relative select-none"
        style={{ width: size, height: size }}
        aria-label="AI platforms monitored by Customers.Direct: ChatGPT, Claude, Perplexity, Gemini, Google AI"
        role="img"
      >
        {/* ── Orbital ring paths (decorative) ── */}
        {RINGS.map((ring, ri) => (
          <div
            key={ri}
            className="pulse-ring absolute rounded-full border border-[#0866F5]/10 pointer-events-none"
            style={{
              width: ring.radius * 2,
              height: ring.radius * 2,
              top: center - ring.radius,
              left: center - ring.radius,
              animation: `pulse-ring ${5 + ri * 2}s ease-in-out infinite`,
            }}
            aria-hidden="true"
          />
        ))}

        {/* ── Platform icons on orbits ── */}
        {PLATFORMS.map((platform) => {
          const ring = RINGS[platform.ring];
          const orbitDuration = ring.duration;
          // Offset the starting angle via animation-delay (negative = already rotated)
          const delaySeconds = -(platform.angle / 360) * orbitDuration;

          return (
            <div
              key={platform.name}
              className="orbit-ring absolute"
              style={{
                width: ring.radius * 2,
                height: ring.radius * 2,
                top: center - ring.radius,
                left: center - ring.radius,
                animation: `orbit-cw ${orbitDuration}s linear infinite`,
                animationDelay: `${delaySeconds}s`,
                // Position icon at the top of the orbit path
                transformOrigin: "center center",
              }}
            >
              {/* Counter-rotate the icon to keep it upright */}
              <div
                className="orbit-icon absolute"
                style={{
                  top: -20,
                  left: ring.radius - 20,
                  animation: `orbit-ccw ${orbitDuration}s linear infinite`,
                  animationDelay: `${delaySeconds}s`,
                  transformOrigin: "center center",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl shadow-lg shadow-black/10 hover:shadow-xl hover:scale-110 transition-all duration-300 cursor-default"
                  style={{
                    // Slight glow matching platform color
                    filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.12))",
                  }}
                >
                  <platform.icon size={40} />
                </div>
                <span className="sr-only">{platform.name}</span>
              </div>
            </div>
          );
        })}

        {/* ── Central hub ── */}
        <div
          className="center-float absolute"
          style={{
            width: 80,
            height: 80,
            top: center - 40,
            left: center - 40,
            animation: "float 4s ease-in-out infinite",
          }}
        >
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #0866F5 0%, #168BFF 100%)",
              boxShadow: "0 0 0 8px rgba(8, 102, 245, 0.10), 0 0 0 16px rgba(8, 102, 245, 0.06), 0 8px 24px rgba(8, 102, 245, 0.35)",
              borderRadius: 20,
            }}
            aria-hidden="true"
          />
          {/* CD monogram */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl" style={{ borderRadius: 20 }}>
            <span className="text-white font-black text-[18px] leading-none">CD</span>
            <span className="text-white/70 text-[7px] font-semibold tracking-widest uppercase leading-none mt-0.5">
              Direct
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
