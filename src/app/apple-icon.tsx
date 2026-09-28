import { brandIcon } from "@/components/marketing/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return brandIcon(size.width, { rounded: false });
}
