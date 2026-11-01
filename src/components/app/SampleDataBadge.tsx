import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SAMPLE_DATA_LABEL } from "@/lib/test-mode";

// Next to a score, a competitor list, sources or answers of a test agency (D-61): sample answers, not real results.
export function SampleDataBadge({ show }: { show: boolean | undefined }) {
  if (!show) return null;
  return (
    <Badge variant="mid" className="gap-1" data-testid="sample-data">
      <FlaskConical className="size-3" aria-hidden />
      {SAMPLE_DATA_LABEL}
    </Badge>
  );
}
