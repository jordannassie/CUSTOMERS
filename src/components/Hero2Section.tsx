"use client";

import { useState, useEffect, useRef } from "react";

const IMAGE_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/aliens/9859418e-4aaa-457f-8cc3-e841889b625e.png";
const VIDEO_URL =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/aliens/AlienHorizontal.mp4";

type LoadState = "loading" | "ready" | "error";

export default function Hero2Section() {
  const [open, setOpen]         = useState(false);
  const [loadState, setLoad]    = useState<LoadState>("loading");
  const [progress, setProgress] = useState(0); // 0–100
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const blobRef  = useRef<string | null>(null);

  // Download the entire video as a blob on mount so playback is instant.
  // Only blob:// src means ZERO network stalls during playback.
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(VIDEO_URL, { signal: controller.signal });
        if (!res.ok || !res.body) throw new Error("fetch failed");

        const total = Number(res.headers.get("content-length") ?? 0);
        const reader = res.body.getReader();
        const chunks: BlobPart[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total > 0) setProgress(Math.round((received / total) * 100));
        }

        const blob = new Blob(chunks, { type: "video/mp4" });
        const url  = URL.createObjectURL(blob);
        blobRef.current = url;
        setVideoSrc(url);
        setLoad("ready");
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        // Fallback: let the browser stream it normally
        setVideoSrc(VIDEO_URL);
        setLoad("ready");
      }
    })();

    return () => {
      controller.abort();
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, []);

  // Play/pause when modal opens or closes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    if (open) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [open, videoSrc]);

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
      <section       className={`relative w-full bg-black overflow-hidden group ${loadState === "ready" ? "cursor-pointer" : "cursor-default"}`}
        onClick={() => loadState === "ready" && setOpen(true)}
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

        {/* Bottom-left play button */}
        <div className="absolute bottom-8 left-6 sm:bottom-10 sm:left-10 lg:left-16">
          <div className="flex items-center gap-3 transition-transform duration-300 group-hover:scale-105">
            {/* Circle — progress ring while loading, play icon when ready */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0">
              {loadState === "loading" ? (
                <>
                  {/* Progress ring */}
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
                    <circle cx="28" cy="28" r="24" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <circle
                      cx="28" cy="28" r="24"
                      fill="none" stroke="white" strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 24}`}
                      strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
                      style={{ transition: "stroke-dashoffset 0.3s ease" }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-white text-[11px] font-bold">
                    {progress > 0 ? `${progress}%` : "…"}
                  </span>
                </>
              ) : (
                <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-md border-2 border-white/60 flex items-center justify-center shadow-xl">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
            </div>
            <span className="text-white text-sm sm:text-base font-bold tracking-wide drop-shadow-lg">
              {loadState === "loading" ? "Preparing video…" : "Watch Video"}
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
          {/* Video — plays from blob:// so zero network stalls */}
          {videoSrc && (
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              playsInline
              onEnded={() => setOpen(false)}
              className="w-full h-auto block bg-black"
              style={{ maxHeight: "80vh" }}
            />
          )}
        </div>
      </div>
    </>
  );
}
