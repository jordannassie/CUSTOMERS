import Link from "next/link";
import { ArrowRight, Globe, Bot } from "lucide-react";
import type { OwnPage } from "@/lib/geo/dashboard-aggregator";

interface Props {
  pages: OwnPage[];
  domain: string | null;
  totalOwnCitations: number;
}

export default function YourCitedPages({ pages, domain, totalOwnCitations }: Props) {
  if (!domain) {
    return (
      <p className="text-[12px] text-[#A3A3A0] px-1">
        Add your business domain in settings to see which of your pages AI cites.
      </p>
    );
  }

  if (pages.length === 0) {
    return (
      <p className="text-[12px] text-[#A3A3A0] px-1">
        None of your pages were cited in the latest scan.
      </p>
    );
  }

  return (
    <div>
      <p className="text-[10.5px] text-[#A3A3A0] mb-2.5">
        {totalOwnCitations} citation{totalOwnCitations !== 1 ? "s" : ""} to{" "}
        <span className="font-semibold text-[#777773]">{domain}</span>
      </p>

      <div className="flex flex-col gap-1.5">
        {pages.slice(0, 6).map((page) => (
          <div
            key={page.fullUrl}
            className="flex items-center justify-between gap-2 bg-white border border-[#E5E5E1] rounded-lg px-3 py-2 hover:bg-[#F5F5F2] transition-colors group"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <Globe size={11} className="text-[#A3A3A0] shrink-0" aria-hidden="true" />
              <a
                href={page.fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11.5px] text-[#171717] font-medium truncate hover:underline underline-offset-2"
                title={page.fullUrl}
              >
                {page.path}
              </a>
            </span>
            <span className="text-[11px] font-bold text-[#3B82F6] tabular-nums shrink-0">
              {page.count}×
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {pages.length > 0 && (
        <div className="mt-2.5 flex items-center gap-3">
          <Link
            href="/dashboard/citations"
            className="text-[11px] font-semibold text-[#777773] hover:text-[#171717] transition-colors flex items-center gap-1"
          >
            View all citations <ArrowRight size={10} />
          </Link>
          <Link
            href={`/dashboard/direct-agent?q=${encodeURIComponent(
              `How can I get more of my pages cited by AI models?`,
            )}`}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#777773] hover:text-[#171717] transition-colors"
          >
            <Bot size={10} aria-hidden="true" />
            How to get more citations
          </Link>
        </div>
      )}
    </div>
  );
}
