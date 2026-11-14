// Reading the news model's answers (admin News page): the text the Responses API returned, the JSON inside it, and an
// error message an admin can act on. Pure, so it is tested without calling OpenAI.

type ResponsesOutput = { output?: Array<{ type: string; content?: Array<{ type: string; text: string }> }> };

/** The answer's text, joined from every output_text block; null when there is none, with the item types seen. */
export function outputText(data: ResponsesOutput): { text: string | null; itemTypes: string[] } {
  const itemTypes: string[] = [];
  let text: string | null = null;
  for (const item of data.output ?? []) {
    itemTypes.push(item.type);
    if (item.type !== "message") continue;
    for (const block of item.content ?? []) if (block.type === "output_text") text = (text ?? "") + block.text;
  }
  return { text, itemTypes };
}

/** The JSON object in a model's answer, even when it is wrapped in a ``` code fence or has text around it. */
export function extractAndParseJson(raw: string): unknown {
  let text = raw.trim();
  if (text.startsWith("```")) {
    const nl = text.indexOf("\n");
    text = nl !== -1 ? text.slice(nl + 1) : text.slice(3);
    const close = text.lastIndexOf("```");
    if (close !== -1) text = text.slice(0, close);
    text = text.trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error(`No JSON object found. Preview: ${JSON.stringify(text.slice(0, 300))}`);
  return JSON.parse(text.slice(start, end + 1));
}

/** What went wrong with an OpenAI call, in words an admin can act on. */
export function classifyOpenAIError(status: number, body: string, model: string): string {
  if (status === 401) return "OpenAI authentication failed. Check your API key configuration.";
  if (status === 429) return "OpenAI rate limit reached. Please try again in a moment.";
  if (status === 503 || status === 502) return "OpenAI is temporarily unavailable. Please try again.";
  try {
    const parsed = JSON.parse(body) as { error?: { code?: string; message?: string } };
    const code = parsed?.error?.code ?? "";
    const msg = parsed?.error?.message ?? "";
    if (code === "model_not_found" || msg.includes("model")) return `Model "${model}" not found. Set OPENAI_NEWS_MODEL to a compatible model.`;
    if (code === "unsupported_value" || msg.toLowerCase().includes("tool")) {
      return `Web search is not supported for model "${model}". Try a different model via OPENAI_NEWS_MODEL.`;
    }
    if (msg) return `OpenAI error: ${msg.slice(0, 250)}`;
  } catch {
    // Not JSON: the generic message below.
  }
  return `Generation failed (HTTP ${status}). Please try again.`;
}
