import "server-only";
import { CHECK_MODELS } from "@/modules/scanning";
import { scanningAdapter } from "./scanning-adapter";

export const perplexityAdapter = scanningAdapter(
  "perplexity",
  "Perplexity (Sonar API)",
  `Asked the Perplexity Agent API (model: ${CHECK_MODELS.perplexity}) with web search near the business location. ` +
    `This is an API call, not the consumer Perplexity.ai app.`,
);
