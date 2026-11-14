import Image from "next/image";
import { MR_DIRECT_DESK } from "./media";

/** Mr. Direct at his desk, ringed by the AI assistants we check. Sits beside the compare box in the hero. */
export function HeroPhoto() {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
      <Image
        src={MR_DIRECT_DESK}
        alt="Mr. Direct at his desk with a laptop, surrounded by AI assistant icons"
        fill
        priority
        sizes="(min-width: 1120px) 560px, (min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}
