"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

export function PortfolioVideo({
  src,
  title,
  note,
  compact = false,
}: {
  src: string;
  title: string;
  note: string;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      const visible = Boolean(entry?.isIntersecting);
      setInView(visible);
      if (visible) setSeen(true);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!inView) {
      video.pause();
      return;
    }
    if (!ready || failed || !video.paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduce || connection?.saveData) return;
    video.muted = true;
    video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [inView, ready, failed]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video || failed) return;
    if (!seen) setSeen(true);
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => setFailed(true));
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video || failed) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (!video.muted && video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => setFailed(true));
    }
  }

  return (
    <figure className="mx-auto w-full">
      <div
        ref={frameRef}
        className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-[#E5E5E1] bg-[#171717] shadow-sm"
      >
        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center" role="alert">
            <p className="text-[14px] leading-relaxed text-white">
              This video could not be loaded. Refresh the page to try again.
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              src={seen ? src : undefined}
              playsInline
              muted
              loop
              preload={seen ? "metadata" : "none"}
              aria-label={title}
              onLoadedData={() => setReady(true)}
              onError={() => {
                if (seen) setFailed(true);
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={togglePlay}
            />
            {ready ? null : (
              <div className="pointer-events-none absolute inset-0 animate-pulse bg-[#2A2A2A]" aria-hidden="true" />
            )}
            <div className={`absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/70 to-transparent ${compact ? "p-2" : "p-3"}`}>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? `Pause ${title}` : `Play ${title}`}
                className={`inline-flex items-center justify-center rounded-xl bg-white text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${compact ? "h-9 w-9" : "h-11 w-11"}`}
              >
                {playing ? <Pause size={compact ? 14 : 18} aria-hidden="true" /> : <Play size={compact ? 14 : 18} aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? `Unmute ${title}` : `Mute ${title}`}
                className={`inline-flex items-center justify-center rounded-xl bg-white/15 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${compact ? "h-9 w-9" : "h-11 w-11"}`}
              >
                {muted ? <VolumeX size={compact ? 14 : 18} aria-hidden="true" /> : <Volume2 size={compact ? 14 : 18} aria-hidden="true" />}
              </button>
            </div>
          </>
        )}
      </div>
      {compact ? null : (
        <figcaption className="mt-4 text-center">
          <p className="text-[15px] font-semibold text-[#171717]">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#777773]">{note}</p>
        </figcaption>
      )}
    </figure>
  );
}
