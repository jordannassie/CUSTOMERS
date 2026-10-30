import { describe, expect, it } from "vitest";
import { classifyOpenAIError, extractAndParseJson, outputText } from "./service";

describe("outputText", () => {
  it("joins the output_text blocks of the message items", () => {
    const data = {
      output: [
        { type: "web_search_call" },
        { type: "message", content: [{ type: "output_text", text: '{"a":' }, { type: "output_text", text: "1}" }] },
      ],
    };
    expect(outputText(data)).toEqual({ text: '{"a":1}', itemTypes: ["web_search_call", "message"] });
  });

  it("says when there is no text, with the item types it saw", () => {
    expect(outputText({ output: [{ type: "web_search_call" }] })).toEqual({ text: null, itemTypes: ["web_search_call"] });
    expect(outputText({})).toEqual({ text: null, itemTypes: [] });
  });
});

describe("extractAndParseJson", () => {
  it("reads JSON inside a code fence or surrounding text", () => {
    expect(extractAndParseJson('```json\n{"stories":[]}\n```')).toEqual({ stories: [] });
    expect(extractAndParseJson('Here you go: {"a":1} done')).toEqual({ a: 1 });
  });

  it("throws when there is no object", () => {
    expect(() => extractAndParseJson("no json here")).toThrow("No JSON object found");
  });
});

describe("classifyOpenAIError", () => {
  it("names the model the admin set when it is unknown", () => {
    expect(classifyOpenAIError(404, JSON.stringify({ error: { code: "model_not_found" } }), "gpt-x")).toContain('Model "gpt-x" not found');
  });

  it("explains auth and rate limits", () => {
    expect(classifyOpenAIError(401, "", "m")).toContain("authentication failed");
    expect(classifyOpenAIError(429, "", "m")).toContain("rate limit");
    expect(classifyOpenAIError(500, "not json", "m")).toBe("Generation failed (HTTP 500). Please try again.");
  });
});
