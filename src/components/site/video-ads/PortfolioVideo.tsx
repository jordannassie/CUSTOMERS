"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

/** How long the loading shimmer may run before the tile settles on its still frame and play button. */
const LOADING_MS = 4000;

export function PortfolioVideo({
  src,
  title,
  note,
  poster,
  compact = false,
}: {
  src: string;
  title: string;
  note: string;
  /** A still frame shown until the video plays (web.dev: a poster is the placeholder). */
  poster?: string;
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
  // iPhone Safari, data saver and reduced motion never fire loadeddata until play, so the shimmer must not wait for it
  // forever: it stops after LOADING_MS and the tile shows its still frame and a play button (/ads, 2026-11-16).
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!seen || ready) return;
    const timer = window.setTimeout(() => setSettled(true), LOADING_MS);
    return () => window.clearTimeout(timer);
  }, [seen, ready]);

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
        className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-foreground shadow-sm"
      >
        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center" role="alert">
            <p className="text-[length:calc(14px*var(--px,1))] leading-relaxed text-white">
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
              poster={poster}
              aria-label={title}
              onLoadedMetadata={() => setReady(true)}
              onLoadedData={() => setReady(true)}
              onError={() => {
                if (seen) setFailed(true);
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={togglePlay}
            />
            {ready || poster ? null : seen && !settled ? (
              <div className="pointer-events-none absolute inset-0 animate-pulse bg-foreground/90" aria-hidden="true" />
            ) : (
              <button
                type="button"
                onClick={togglePlay}
                aria-label={`Play ${title}`}
                className="absolute inset-0 flex items-center justify-center bg-foreground/90 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
              >
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-white/15">
                  <Play size={20} aria-hidden="true" />
                </span>
              </button>
            )}
            <div className={`absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/70 to-transparent ${compact ? "p-2" : "p-3"}`}>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? `Pause ${title}` : `Play ${title}`}
                className={`inline-flex items-center justify-center rounded-xl bg-white text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${compact ? "h-9 w-9" : "h-11 w-11"}`}
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
          <p className="text-[length:calc(15px*var(--px,1))] font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-[length:calc(13px*var(--px,1))] leading-relaxed text-muted-foreground">{note}</p>
        </figcaption>
      )}
    </figure>
  );
}
