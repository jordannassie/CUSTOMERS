import { describe, expect, it } from "vitest";
import { TOOL_LABELS, toolFromParam, toolHref } from "./tools";

describe("tool filter", () => {
  it("reads ?tool= and ignores values it does not know", () => {
    expect(toolFromParam("chatgpt")).toBe("openai");
    expect(toolFromParam("Claude")).toBe("anthropic");
    expect(toolFromParam(["perplexity", "claude"])).toBe("perplexity");
    expect(toolFromParam("gemini")).toBeNull();
    expect(toolFromParam(undefined)).toBeNull();
  });

  it("links each choice", () => {
    expect(toolHref(null)).toBe("/sources");
    expect(toolHref("anthropic")).toBe("/sources?tool=claude");
    expect(TOOL_LABELS.openai).toBe("ChatGPT");
  });
});
