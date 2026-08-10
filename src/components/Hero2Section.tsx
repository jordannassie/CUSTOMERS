"use client";

import { useState, useEffect, useRef } from "react";

const IMAGE_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/aliens/9859418e-4aaa-457f-8cc3-e841889b625e.png";
const VIDEO_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/aliens/AlienHorizontal.mp4";

export default function Hero2Section() {
  const [open, setOpen]           = useState(false);
  const [buffering, setBuffering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pre-fetch into a blob URL the moment the component mounts.
  // Using a blob: src means the browser serves video from memory — no network
  // wait when the user taps Play, even on slow mobile connections.
  const [videoSrc, setVideoSrc] = useState(VIDEO_URL);

  useEffect(() => {
    let objectUrl: string | null = null;
    const controller = new AbortController();

    fetch(VIDEO_URL, { signal: controller.signal })
      .then(res => res.blob())
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setVideoSrc(objectUrl);
        // Point the already-mounted video element at the local blob
        if (videoRef.current) {
          videoRef.current.src = objectUrl;
          videoRef.current.load();
        }
      })
      .catch(() => { /* network error — keep original URL */ });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  // Play/pause when modal opens or closes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (open) {
      setBuffering(v.readyState < 3); // show spinner only if not yet ready
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
      setBuffering(false);
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

        {/* Bottom-left play button — under the headline text */}
        <div className="absolute bottom-8 left-6 sm:bottom-10 sm:left-10 lg:left-16">
          <div className="flex items-center gap-3 transition-transform duration-300 group-hover:scale-105">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/60 flex items-center justify-center shadow-xl shrink-0">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-white text-sm sm:text-base font-bold tracking-wide drop-shadow-lg">
              Watch Video
            </span>
          </div>
        </div>
      </section>

      {/* ── Modal — always in DOM, visibility toggled so video buffers in background */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 transition-opacity duration-300"
        style={{
          backgroundColor: "rgba(0,0,0,0.92)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
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

        {/* Video container */}
        <div
          className="relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Buffering spinner */}
          {buffering && open && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 rounded-2xl">
              <div className="flex flex-col items-center gap-3">
                <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-white/70 text-sm font-medium">Loading video…</span>
              </div>
            </div>
          )}

          {/* Video — always mounted so it buffers as soon as the page loads */}
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            playsInline
            preload="auto"
            onWaiting={() => setBuffering(true)}
            onCanPlayThrough={() => setBuffering(false)}
            onCanPlay={() => setBuffering(false)}
            onPlaying={() => setBuffering(false)}
            onEnded={() => setOpen(false)}
            className="w-full h-auto block bg-black"
            style={{ maxHeight: "80vh" }}
          />
        </div>
      </div>
    </>
  );
}
