"use client";

import { useState, useEffect, useRef } from "react";

const IMAGE_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/aliens/9859418e-4aaa-457f-8cc3-e841889b625e.png";
const VIDEO_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/aliens/AlienHorizontal.mp4";

export default function Hero2Section() {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play on open, pause/reset on close
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (open) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* ── Banner with play button ─────────────────────────────────────── */}
      <section className="relative w-full bg-black overflow-hidden group cursor-pointer"
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Play video"
        onKeyDown={e => e.key === "Enter" && setOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMAGE_URL}
          alt="Apparently humans love DMs."
          className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.02]"
          style={{ maxHeight: "90vh", objectFit: "cover", objectPosition: "center" }}
        />

        {/* Dark scrim on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300" />

        {/* Centered play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex flex-col items-center gap-3 transition-transform duration-300 group-hover:scale-110"
          >
            {/* Circle */}
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/60 flex items-center justify-center shadow-2xl"
            >
              {/* Play triangle */}
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1.5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-white text-sm sm:text-base font-bold tracking-wide drop-shadow-lg">
              Watch Video
            </span>
          </div>
        </div>
      </section>

      {/* ── Modal video player ──────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
          style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
          onClick={() => setOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close video"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Video container — stop click propagation so clicking video doesn't close modal */}
          <div
            className="relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <video
              ref={videoRef}
              src={VIDEO_URL}
              controls
              autoPlay
              playsInline
              onEnded={() => setOpen(false)}
              className="w-full h-auto block bg-black"
              style={{ maxHeight: "80vh" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
