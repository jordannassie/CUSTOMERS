import "server-only";
import { CHECK_MODELS } from "@/modules/scanning";
import { scanningAdapter } from "./scanning-adapter";

export const anthropicAdapter = scanningAdapter(
  "anthropic",
  "Claude (Anthropic API)",
  `Asked the Anthropic Messages API (model: ${CHECK_MODELS.anthropic}) with web search near the business location. ` +
    `This is an API call, not the consumer Claude app.`,
);
