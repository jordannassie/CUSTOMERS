"use client";

import { useEffect, useRef, useState } from "react";
import Image, { getImageProps } from "next/image";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "../section";
import { MR_DIRECT_DESK, MR_DIRECT_VIDEO } from "./media";

type State = "idle" | "loading" | "playing" | "paused" | "failed";

// The stored still is a 2 MB PNG; the poster goes through the image optimizer so the browser gets a small WebP.
const POSTER = getImageProps({ src: MR_DIRECT_DESK, alt: "", width: 896, height: 504 }).props.src;

// The live site's Mr. Direct video. The file is a 15 MB HEVC .mov, so it only loads once the section is near the
// screen, and browsers that can't decode HEVC (Firefox, some Chrome builds) see the still picture and a note instead.
export function VideoSection() {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>("idle");
  const [muted, setMuted] = useState(true);

  // Load and start the video when the section scrolls near, unless the visitor asked for less motion.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // Set on the element directly so play() below sees it; React never manages this attribute.
        video.src = MR_DIRECT_VIDEO;
        setState(still ? "paused" : "loading");
        if (still) return;
        video.muted = true;
        // Autoplay can still be blocked; the play button then starts it.
        video.play().catch(() => setState((s) => (s === "failed" ? s : "paused")));
      },
      { rootMargin: "300px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function togglePlay() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setState("failed"));
    else video.pause();
  }

  function toggleSound() {
    const video = ref.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  const failed = state === "failed";

  return (
    <Section aria-label="Meet Mr. Direct">
      <div className="relative mx-auto aspect-video max-w-[896px] overflow-hidden rounded-xl border border-border bg-muted">
        <video
          ref={ref}
          poster={POSTER}
          loop
          muted
          playsInline
          preload="none"
          aria-label="Mr. Direct explains how Customers.Direct finds you more customers from AI answers"
          className={failed ? "hidden" : "block size-full object-cover"}
          onPlaying={() => setState("playing")}
          onPause={() => setState("paused")}
          onError={() => setState("failed")}
        />

        {failed && (
          <div className="absolute inset-0">
            <Image src={MR_DIRECT_DESK} alt="" fill sizes="(min-width: 896px) 896px, 100vw" className="object-cover" />
            <p className="absolute inset-x-4 bottom-4 w-fit rounded-md border border-border bg-surface px-4 py-3 text-[length:calc(13px*var(--px,1))] text-foreground shadow-float sm:left-4">
              This video doesn&apos;t play in this browser. Try Safari or Chrome.
            </p>
          </div>
        )}

        {state === "loading" && (
          <p role="status" className="absolute top-4 left-4 rounded-sm border border-border bg-surface px-3 py-1 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
            Loading video…
          </p>
        )}

        {!failed && state !== "idle" && (
          <div className="absolute right-4 bottom-4 flex gap-2">
            <Button type="button" size="icon" variant="outline" className="bg-surface" onClick={togglePlay} aria-label={state === "playing" ? "Pause video" : "Play video"}>
              {state === "playing" ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </Button>
            <Button type="button" size="icon" variant="outline" className="bg-surface" onClick={toggleSound} aria-label={muted ? "Turn sound on" : "Turn sound off"}>
              {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}
