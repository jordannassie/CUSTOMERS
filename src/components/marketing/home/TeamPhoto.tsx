import Image from "next/image";
import { TEAM_PHOTO } from "./media";

/**
 * The live site's group photo, sized for the top of FinalCta. Built but not shown: the picture is AI-made, and
 * D-34 and DESIGN.md ("Banned") rule out AI-made team photos. To show it, render <TeamPhoto /> above <CTA> in
 * FinalCta.tsx once the owner approves.
 */
export function TeamPhoto() {
  return (
    <div className="relative mx-auto mb-10 aspect-[1672/941] max-w-[672px] overflow-hidden rounded-xl bg-surface">
      <Image src={TEAM_PHOTO} alt="A group in Customers.Direct T-shirts in an office" fill sizes="(min-width: 672px) 672px, 100vw" className="object-cover object-top" />
    </div>
  );
}
