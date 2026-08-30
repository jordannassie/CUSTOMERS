/**
 * PlatformIcon — renders the correct AI platform logo for a given platform name.
 * Uses Supabase-hosted SVGs for new AI icons; ChatGPT uses local SVG.
 */
import Image from "next/image";

export type Platform =
  | "ChatGPT"
  | "Claude"
  | "Perplexity"
  | "Gemini"
  | "Google AI"
  | "Mistral"
  | "Microsoft Copilot"
  | "Deepseek"
  | "Qwen";

const AI_ICON_BASE =
  "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/icons/New%20AI%20Icons";

const ICON_MAP: Partial<Record<Platform, string>> = {
  ChatGPT: "/icons/ai-platforms/chatgpt.svg",
  Claude: `${AI_ICON_BASE}/Claude.svg`,
  Perplexity: `${AI_ICON_BASE}/Perplexity.svg`,
  Gemini: `${AI_ICON_BASE}/Gemini.svg`,
  "Google AI": `${AI_ICON_BASE}/GoogleAI.svg`,
  Mistral: `${AI_ICON_BASE}/Mistral.svg`,
  "Microsoft Copilot": `${AI_ICON_BASE}/MicrosoftCopilot.svg`,
  Deepseek: `${AI_ICON_BASE}/Deepseek.svg`,
  Qwen: `${AI_ICON_BASE}/Qwen.svg`,
};

interface PlatformIconProps {
  platform: string;
  size?: number;
  className?: string;
}

export function PlatformIcon({ platform, size = 16, className = "" }: PlatformIconProps) {
  const src = ICON_MAP[platform as Platform];

  if (!src) {
    // Fallback: initial pill for any unknown platform
    const initial = platform.charAt(0).toUpperCase();
    const px = Math.round(size * 0.55);
    return (
      <span
        className={`inline-flex items-center justify-center rounded-sm font-bold shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          background: "#6B7280",
          color: "#ffffff",
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
