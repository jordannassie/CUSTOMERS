# Provider response fixtures

All fixtures are hand-built, not recorded from a live call: live calls wait for the new keys (B-01). Replace each with the recorded answer from its smoke call. Recorded answers for full test scans go in `tests/fixtures/ai-answers/` (B-31).

- `openai-coffee-orange.json`: built to the documented Responses API shape (web_search_call items, output_text with url_citation annotations, usage).
- `anthropic-coffee-orange.json`: built to the documented Messages API web search example (https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool, read 2026-09-27) and the `@anthropic-ai/sdk` types: server_tool_use, web_search_tool_result with web_search_result items, text blocks with web_search_result_location citations, usage.server_tool_use.web_search_requests.
- `perplexity-coffee-orange.json`: built to the documented Agent API response (https://docs.perplexity.ai/docs/agent-api/tools/web-search and the `ResponsesResponse` schema in https://docs.perplexity.ai/openapi.json, read 2026-09-27): a search_results item, a message with output_text, `[n]` markers and a url_citation annotation, usage.tool_calls_details.search_web.invocation and usage.cost.
