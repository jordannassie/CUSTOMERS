"use client";

import { useRef, useState, useCallback } from "react";

const VIDEO_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/Video/Girl%20ugc.mp4";

const industries = [
  {
    title: "Personal Injury",
    subtitle: "We help put your firm in front of people searching for answers.",
  },
  {
    title: "Roofing",
    subtitle: "Reach homeowners who need estimates and repairs.",
  },
  {
    title: "Med Spa",
    subtitle: "Turn your treatments and offers into new conversations.",
  },
  {
    title: "Real Estate",
    subtitle: "Get more buyers, sellers, and listing conversations.",
  },
];

// ─── Volume icons (Lucide paths inline) ──────────────────────────────────────

function IconVolume2() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function IconVolumeX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

// ─── Single video card ────────────────────────────────────────────────────────

interface VideoCardProps {
  title: string;
  subtitle: string;
  isMuted: boolean;
  onToggleAudio: () => void;
}

function VideoCard({ title, subtitle, isMuted, onToggleAudio }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Keep video element muted state in sync with prop
  if (videoRef.current) {
    videoRef.current.muted = isMuted;
  }

  const handleAudioClick = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if ("key" in e && e.key !== "Enter" && e.key !== " ") return;
    onToggleAudio();
  }, [onToggleAudio]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-lg group"
      style={{ aspectRatio: "9/16" }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        autoPlay
        muted={isMuted}
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

      {/* Top-left badge */}
      <div className="absolute top-4 left-4">
        <span className="text-white/80 text-[10px] font-semibold uppercase tracking-wider bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
          Video Ad
        </span>
      </div>

      {/* ── Audio toggle — top-right ─────────────────────────────────────── */}
      {/* On desktop: hidden until group-hover. On touch: always visible.    */}
      <button
        type="button"
        onClick={handleAudioClick}
        onKeyDown={handleAudioClick}
        aria-label={isMuted ? "Turn sound on" : "Mute video"}
        className={[
          // size & shape
          "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center",
          // look
          "bg-black/50 backdrop-blur-sm text-white border border-white/10",
          // transition
          "transition-opacity duration-200",
          // desktop: hide until hover; mobile (touch): always show
          "opacity-0 group-hover:opacity-100 sm-touch:opacity-100",
          // make always visible on touch screens via a media-safe fallback
          "[.touch-device_&]:opacity-100",
        ].join(" ")}
        style={{
          // Ensure it's always visible on touch — we use a CSS custom-media
          // workaround: the inline style keeps it accessible when no hover exists.
        }}
      >
        {isMuted ? <IconVolumeX /> : <IconVolume2 />}
      </button>

      {/* Center play button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="w-14 h-14 bg-white/30 rounded-full flex items-center justify-center border border-white/50 backdrop-blur-sm">
          <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Bottom text */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="text-white font-bold text-base mb-1">{title}</h3>
        <p className="text-white/75 text-xs leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

export default function IndustriesSection() {
  // Index of the card that has audio on; null = all muted
  const [activeAudio, setActiveAudio] = useState<number | null>(null);

  function toggleAudio(idx: number) {
    // If this card is already unmuted → mute it; else unmute it (muting all others)
    setActiveAudio((prev) => (prev === idx ? null : idx));
  }

  return (
    <section id="industries" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A]">
            Video ads made for your business.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {industries.map((industry, idx) => (
            <VideoCard
              key={industry.title}
              title={industry.title}
              subtitle={industry.subtitle}
              isMuted={activeAudio !== idx}
              onToggleAudio={() => toggleAudio(idx)}
            />
          ))}
        </div>

        {/* Make audio button always visible on touch screens */}
        <style>{`
          @media (hover: none) {
            .group button[aria-label] {
              opacity: 1 !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}
