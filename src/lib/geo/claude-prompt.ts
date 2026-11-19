// The "Copy for Claude" prompt every rules fix shares: what we found, the ask, and a rule against invented facts. Pure.

export function claudePromptFor(header: string, businessName: string, domain: string | null, evidence: string, ask: string): string {
  return [
    `I want AI assistants like ChatGPT, Claude and Perplexity to recommend ${businessName}${domain ? ` (${domain})` : ""} more often.`,
    "",
    `What Customers.Direct found when it asked AI assistants about us. Do not assume any facts beyond what is stated here:`,
    evidence,
    "",
    header,
    ask,
    "",
    "Important: only use real information about this business that I provide or that you find by reading the actual website. Never invent addresses, phone numbers, services, credentials, awards, or testimonials that weren't given to you.",
  ].join("\n");
}
