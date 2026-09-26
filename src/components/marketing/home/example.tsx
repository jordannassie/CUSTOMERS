export type ModelName = "ChatGPT" | "Claude" | "Perplexity";

export const MODEL_DOT: Record<ModelName, string> = {
  ChatGPT: "bg-chatgpt",
  Claude: "bg-claude",
  Perplexity: "bg-perplexity",
};

/** Every demo on the homepage uses made-up businesses, so each one says so (MVP_SPEC 12.2). */
export function ExampleTag() {
  return (
    <span className="shrink-0 rounded-sm border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Example
    </span>
  );
}
