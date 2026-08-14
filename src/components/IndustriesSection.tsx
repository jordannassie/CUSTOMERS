"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const industries = [
  {
    title: "Personal Injury",
    subtitle: "We help put your firm in front of people searching for answers.",
    video: "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/Video/UGC/Lawyer%20ugc.mp4",
  },
  {
    title: "Roofing",
    subtitle: "Reach homeowners who need estimates and repairs.",
    video: "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/Video/UGC/ROOF%20ugc.mp4",
  },
  {
    title: "Med Spa",
    subtitle: "Turn your treatments and offers into new conversations.",
    video: "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/Video/UGC/MEDSPA%20ugc.mp4",
  },
  {
    title: "Real Estate",
    subtitle: "Get more buyers, sellers, and listing conversations.",
    video: "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/Video/UGC/Dentistugc.mp4",
  },
];

// ─── Volume icons ─────────────────────────────────────────────────────────────

function IconVolume2() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}
function IconVolumeX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

// ─── Single card ──────────────────────────────────────────────────────────────

interface VideoCardProps {
  title: string;
  subtitle: string;
  video: string;
  isMuted: boolean;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onToggleAudio: () => void;
  isTouch: boolean;
}

function VideoCard({ title, subtitle, video, isMuted, onHoverEnter, onHoverLeave, onToggleAudio, isTouch }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync muted state → video element imperatively to avoid rerender race
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = isMuted;
    if (!isMuted) {
      v.volume = 1;
      // Attempt to play unmuted; catch browser autoplay policy silently
      v.play().catch(() => {
        v.muted = true;
      });
    }
  }, [isMuted]);

  const handleAudioClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleAudio();
  }, [onToggleAudio]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-lg group"
      style={{ aspectRatio: "9/16" }}
      onMouseEnter={isTouch ? undefined : onHoverEnter}
      onMouseLeave={isTouch ? undefined : onHoverLeave}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={video}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

      {/* Top-left badge */}
      <div className="absolute top-4 left-4">
        <span className="text-white/80 text-[10px] font-semibold uppercase tracking-wider bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
          Video Ad
        </span>
      </div>

      {/* Speaker button — top-right */}
      {/* Desktop: hidden until hover. Mobile (touch): always visible. */}
      <button
        type="button"
        onClick={handleAudioClick}
        aria-label={isMuted ? "Turn sound on" : "Mute video"}
        className={[
          "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center",
          isMuted ? "bg-black/50 backdrop-blur-sm text-white border border-white/10" : "bg-green-500 text-white border border-green-400",
          "transition-opacity duration-200",
          isTouch ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        ].join(" ")}
      >
        {isMuted ? <IconVolumeX /> : <IconVolume2 />}
      </button>

      {/* Bottom text */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="text-white font-bold text-base mb-1">{title}</h3>
        <p className="text-white/75 text-xs leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function IndustriesSection() {
  // null = all muted
  const [activeAudio, setActiveAudio] = useState<number | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  // Detect touch-primary device once on mount
  useEffect(() => {
    const timer = window.setTimeout(
      () => setIsTouch(window.matchMedia("(hover: none)").matches),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);

  // Desktop: hover enters → unmute that card
  const handleHoverEnter = useCallback((idx: number) => {
    setActiveAudio(idx);
  }, []);

  // Desktop: hover leaves → mute
  const handleHoverLeave = useCallback(() => {
    setActiveAudio(null);
  }, []);

  // Manual speaker click — toggle current card
  const handleToggle = useCallback((idx: number) => {
    setActiveAudio((prev) => (prev === idx ? null : idx));
  }, []);

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
              video={industry.video}
              isMuted={activeAudio !== idx}
              onHoverEnter={() => handleHoverEnter(idx)}
              onHoverLeave={handleHoverLeave}
              onToggleAudio={() => handleToggle(idx)}
              isTouch={isTouch}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
