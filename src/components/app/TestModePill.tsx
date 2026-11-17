import { FlaskConical } from "lucide-react";
import { cn } from "cn";
import { TEST_MODE_MESSAGE } from "@/lib/test-mode";
import { PILL_BOX, PILL_CLASS } from "./pills";

/**
 * A test agency's marker (D-61), in the top bar instead of a bar on every page (owner, 2026-11-17): the app's grey
 * pill, with the full sentence on hover and for screen readers.
 */
export function TestModePill() {
  return (
    <span className={cn(PILL_BOX, PILL_CLASS.plain, "gap-1")} title={TEST_MODE_MESSAGE} data-testid="test-mode-pill">
      <FlaskConical className="size-3" aria-hidden="true" />
      Test mode
      <span className="sr-only">. {TEST_MODE_MESSAGE.replace(/^Test mode: /, "")}</span>
    </span>
  );
}
