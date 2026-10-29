// Where the owner makes a fix: the labels. Only an import-free lib file, so screens in the browser can use them too.
import { WHERE_LABEL, type Where } from "@/lib/fix-where";

export type { Where };

/** The same names as the Actions board's groups (WHERE_LABEL). */
export const WHERE_TEXT: Record<Where, string> = WHERE_LABEL;
