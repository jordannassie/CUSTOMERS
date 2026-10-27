// Where the owner makes a fix: the labels. Only an import-free lib file, so screens in the browser can use them too.
import type { Where } from "@/lib/fix-where";

export type { Where };

export const WHERE_TEXT: Record<Where, string> = {
  website: "Your website",
  google_listing: "Your Google listing",
  other_places: "Other places AI looks",
};

