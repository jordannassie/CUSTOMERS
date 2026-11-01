// Pinned check models (MVP_SPEC 5.1, D-68). Changing one means rerunning its eval suite (MVP_SPEC 25).
export const CHECK_MODELS = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-haiku-4-5",
  // Sonar through the Agent API; the old Sonar Chat Completions endpoint retired on 2026-09-27.
  perplexity: "perplexity/sonar",
} as const;

export type CheckModel = (typeof CHECK_MODELS)[keyof typeof CHECK_MODELS];
