import "server-only";
import { CHECK_MODELS } from "@/modules/scanning";
import { scanningAdapter } from "./scanning-adapter";

export const openAIAdapter = scanningAdapter(
  "openai",
  "ChatGPT (OpenAI API)",
  `Asked the OpenAI Responses API (model: ${CHECK_MODELS.openai}) with web search near the business location. ` +
    `This is an API call, not a live ChatGPT.com conversation with its memory or personalization.`,
);
