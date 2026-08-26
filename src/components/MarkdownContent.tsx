"use client";

/**
 * MarkdownContent — renders AI-generated Markdown text with Customers.Direct styling.
 *
 * Use this wherever AI text is displayed (Direct Agent responses, opportunity
 * descriptions, evidence, Claude prompts, SEO summaries, etc.) to prevent
 * raw `#`, `**`, `*` symbols from appearing.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ComponentPropsWithoutRef } from "react";

interface Props {
  children: string;
  className?: string;
  /** When true, suppresses top/bottom margin on the outermost element */
  compact?: boolean;
}

export default function MarkdownContent({ children, className = "", compact = false }: Props) {
  if (!children?.trim()) return null;

  return (
    <div className={`markdown-content ${compact ? "markdown-compact" : ""} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings — keep them proportional to the surrounding text
          h1: ({ children: c }) => (
            <p className="text-[15px] font-bold text-[#171717] leading-snug mt-3 mb-1 first:mt-0">{c}</p>
          ),
          h2: ({ children: c }) => (
            <p className="text-[14px] font-bold text-[#171717] leading-snug mt-3 mb-1 first:mt-0">{c}</p>
          ),
          h3: ({ children: c }) => (
            <p className="text-[13px] font-semibold text-[#171717] leading-snug mt-2.5 mb-0.5 first:mt-0">{c}</p>
          ),
          h4: ({ children: c }) => (
            <p className="text-[12.5px] font-semibold text-[#555552] leading-snug mt-2 mb-0.5 first:mt-0">{c}</p>
          ),
          h5: ({ children: c }) => (
            <p className="text-[12px] font-semibold text-[#777773] leading-snug mt-2 mb-0.5 first:mt-0">{c}</p>
          ),
          h6: ({ children: c }) => (
            <p className="text-[11.5px] font-semibold text-[#A3A3A0] leading-snug mt-2 mb-0.5 first:mt-0">{c}</p>
          ),
          // Paragraphs
          p: ({ children: c }) => (
            <p className="text-[13px] text-[#555552] leading-relaxed mb-1.5 last:mb-0">{c}</p>
          ),
          // Bold
          strong: ({ children: c }) => (
            <strong className="font-semibold text-[#171717]">{c}</strong>
          ),
          // Italic
          em: ({ children: c }) => (
            <em className="italic text-[#555552]">{c}</em>
          ),
          // Unordered list
          ul: ({ children: c }) => (
            <ul className="list-none pl-0 mb-2 flex flex-col gap-1">{c}</ul>
          ),
          // Ordered list
          ol: ({ children: c }) => (
            <ol className="list-none pl-0 mb-2 flex flex-col gap-1 counter-reset-item">{c}</ol>
          ),
          // List item
          li: ({ children: c }) => (
            <li className="flex items-start gap-2 text-[13px] text-[#555552] leading-relaxed">
              <span className="mt-[5px] w-1 h-1 rounded-full bg-[#A3A3A0] shrink-0" aria-hidden="true" />
              <span className="flex-1">{c}</span>
            </li>
          ),
          // Inline code
          code: ({ children: c, className: cn }) => {
            const isBlock = cn?.includes("language-");
            if (isBlock) {
              return (
                <code className="block bg-[#F5F5F2] border border-[#E5E5E1] rounded-lg px-3 py-2.5 text-[12px] font-mono text-[#171717] whitespace-pre-wrap overflow-x-auto my-2">
                  {c}
                </code>
              );
            }
            return (
              <code className="bg-[#F0F0EC] border border-[#E5E5E1] rounded px-1.5 py-0.5 text-[11.5px] font-mono text-[#171717]">
                {c}
              </code>
            );
          },
          // Code block wrapper
          pre: ({ children: c }) => <div className="my-2">{c}</div>,
          // Blockquote
          blockquote: ({ children: c }) => (
            <blockquote className="border-l-2 border-[#E5E5E1] pl-3 ml-0 my-2 text-[#777773] italic">
              {c}
            </blockquote>
          ),
          // Horizontal rule
          hr: () => <hr className="border-[#EEEEEA] my-3" />,
          // Links
          a: ({ href, children: c }: ComponentPropsWithoutRef<"a">) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563EB] hover:underline underline-offset-2"
            >
              {c}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
