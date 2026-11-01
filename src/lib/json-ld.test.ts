import { describe, expect, it } from "vitest";
import { jsonLdHtml } from "./json-ld";

describe("jsonLdHtml", () => {
  it("never lets text close the script tag", () => {
    const { __html } = jsonLdHtml({ name: "Great</script><script>alert(1)</script>" });
    expect(__html).not.toContain("<");
    expect(__html).toContain("\\u003c/script>");
  });

  it("keeps the same data", () => {
    const data = { "@type": "Review", name: "a < b & c > d", rating: 5 };
    expect(JSON.parse(jsonLdHtml(data).__html)).toEqual(data);
  });
});
