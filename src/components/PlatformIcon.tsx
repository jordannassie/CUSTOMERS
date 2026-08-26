/**
 * PlatformIcon — renders the correct AI platform logo for a given platform name.
 * Uses locally-hosted SVGs from /icons/ai-platforms/.
 * Claude has no downloadable logo so renders a styled initial fallback.
 */
import Image from "next/image";

export type Platform = "ChatGPT" | "Claude" | "Perplexity" | "Gemini" | "Google AI";

const ICON_MAP: Partial<Record<Platform, string>> = {
  ChatGPT: "/icons/ai-platforms/chatgpt.svg",
  Perplexity: "/icons/ai-platforms/perplexity.svg",
  Gemini: "/icons/ai-platforms/gemini.svg",
  "Google AI": "/icons/ai-platforms/google.svg",
};

// Claude brand colours (no official downloadable logo)
const CLAUDE_BG = "#D97757";
const CLAUDE_TEXT = "#ffffff";

interface PlatformIconProps {
  platform: string;
  size?: number;
  className?: string;
}

export function PlatformIcon({ platform, size = 16, className = "" }: PlatformIconProps) {
  const src = ICON_MAP[platform as Platform];

  if (!src) {
    // Fallback: initial pill (used for Claude and any unknown platform)
    const initial = platform.charAt(0).toUpperCase();
    const px = Math.round(size * 0.55);
    return (
      <span
        className={`inline-flex items-center justify-center rounded-sm font-bold shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          background: CLAUDE_BG,
          color: CLAUDE_TEXT,
          fontSize: px,
          lineHeight: 1,
        }}
        aria-label={platform}
      >
        {initial}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={platform}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      unoptimized
    />
  );
}

/** Inline platform pill: icon + name, used in filter bars and chips */
export function PlatformPill({
  platform,
  size = 14,
  className = "",
}: PlatformIconProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <PlatformIcon platform={platform} size={size} />
      <span>{platform}</span>
    </span>
  );
}
