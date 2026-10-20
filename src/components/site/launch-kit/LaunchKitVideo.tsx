import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import { Play } from "lucide-react";
import { LAUNCH_KIT_AD_IMAGE } from "@/config/launch-kit-assets";

const VIDEO_SRC = "/videos/ai-business-launch-intro.mp4";

const LESSONS = [
  { n: "1", title: "How the AI business model works" },
  { n: "2", title: "Finding the right businesses" },
  { n: "3", title: "Running a client report" },
];

export function launchKitIntroVideoExists(): boolean {
  return existsSync(join(process.cwd(), "public/videos/ai-business-launch-intro.mp4"));
}

export default function LaunchKitVideo({ hasVideo }: { hasVideo: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-[#E5E5E1] bg-[#171717] shadow-[0_12px_40px_rgba(23,23,23,0.12)]">
      <div className="relative aspect-video bg-[#111111]">
        {hasVideo ? (
          <video
            className="w-full h-full object-cover"
            controls
            poster={LAUNCH_KIT_AD_IMAGE}
            src={VIDEO_SRC}
            preload="metadata"
          />
        ) : (
          <div className="absolute inset-0">
            <Image
              src={LAUNCH_KIT_AD_IMAGE}
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 700px, 100vw"
              priority
            />
            <div className="absolute inset-0 bg-[#171717]/45" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0866F5] flex items-center justify-center shadow-lg"
                aria-hidden="true"
              >
                <Play size={28} className="text-white ml-1" fill="white" />
              </div>
              <p className="mt-5 text-[16px] sm:text-[18px] font-semibold text-white">
                Watch: How the AI business model works
              </p>
              <p className="mt-1 text-[12px] uppercase tracking-wider text-white/80">
                Launch Kit preview
              </p>
            </div>
          </div>
        )}
      </div>
      <ul className="divide-y divide-white/10">
        {LESSONS.map((lesson) => (
          <li key={lesson.n} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-[11px] font-semibold text-white/40 tabular-nums w-14">
              Module {lesson.n}
            </span>
            <span className="text-[13px] text-white/85">{lesson.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
