import "server-only";
import { env } from "@/lib/env";
import { classifyOpenAIError, extractAndParseJson, outputText } from "./service";

// The admin News page's one call to OpenAI: a prompt answered with web search and a strict JSON schema, through the
// Responses API. The model is OPENAI_NEWS_MODEL (env.ts).

export type NewsAsk = {
  /** For logs: "news/search" or "news/article". */
  label: string;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  timeoutMs: number;
  /** Shown when the call runs past timeoutMs ("Search timed out. Please try again."). */
  timeoutMessage: string;
};

/** The parsed JSON answer, or the HTTP status and message for the admin. */
export type NewsAnswer = { ok: true; data: unknown } | { ok: false; status: number; error: string };

export async function askNewsModel(ask: NewsAsk): Promise<NewsAnswer> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, status: 503, error: "OpenAI API key is not configured." };
  const model = env.OPENAI_NEWS_MODEL;

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        tools: [{ type: "web_search" }],
        text: { format: { type: "json_schema", name: ask.schemaName, strict: true, schema: ask.schema } },
        input: ask.prompt,
      }),
      signal: AbortSignal.timeout(ask.timeoutMs),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timeout") || msg.toLowerCase().includes("abort")) return { ok: false, status: 504, error: ask.timeoutMessage };
    console.error(`[${ask.label}] fetch error: ${msg}`);
    return { ok: false, status: 502, error: "Could not reach OpenAI. Please try again." };
  }

  if (!res.ok) {
    const rawBody = await res.text();
    console.error(`[${ask.label}] OpenAI HTTP ${res.status} | preview=${rawBody.slice(0, 300)}`);
    return { ok: false, status: 502, error: classifyOpenAIError(res.status, rawBody, model) };
  }

  const { text, itemTypes } = outputText(await res.json());
  if (text === null) {
    console.error(`[${ask.label}] No output_text | item_types=[${itemTypes.join(", ")}]`);
    const error = itemTypes.length === 0 ? "OpenAI returned an empty response. Please try again." : `No text output (types: ${itemTypes.join(", ")}). Please try again.`;
    return { ok: false, status: 502, error };
  }

  try {
    return { ok: true, data: extractAndParseJson(text) };
  } catch (e) {
    console.error(`[${ask.label}] JSON parse failed: ${e} | preview=${text.slice(0, 400)}`);
    return { ok: false, status: 502, error: "AI returned an unexpected format. Please try again." };
  }
}
