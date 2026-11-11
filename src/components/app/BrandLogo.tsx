import Image from "next/image";
import { cn } from "cn";

// The Customers.Direct logo, cropped tight (public/images/logos/*-trim.png, 891 x 120), so its height is the text's
// height and it lines up with whatever sits beside it. The image is decorative: callers put the name in the link label.
const RATIO = 891 / 120;

export function BrandLogo({ height = 22, tone = "dark", className, priority = false }: {
  /** Rendered height in px; the width follows the logo's shape. */
  height?: number;
  /** "light" for dark or blue backgrounds. */
  tone?: "dark" | "light";
  className?: string;
  /** Load it first (headers above the fold). */
  priority?: boolean;
}) {
  return (
    <Image
      src={tone === "light" ? "/images/logos/logo-white-trim.png" : "/images/logos/logo-black-trim.png"}
      alt=""
      width={Math.round(height * RATIO)}
      height={height}
      priority={priority}
      className={cn("block shrink-0", className)}
      style={{ width: "auto", height }}
    />
  );
}
