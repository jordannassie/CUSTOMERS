import { Badge } from "@/components/ui/badge";

// For leads and feature requests whose text holds web code (src/lib/submitted-text.ts): only a badge, no explanation
// (owner, 2026-11-17). The text is shown with the code removed.

export function SpamBadge() {
  return (
    <Badge variant="secondary">
      Looks like spam
    </Badge>
  );
}
