import { describe, expect, it } from "vitest";
import { looksLikeCode, websiteHref, withoutCode } from "./submitted-text";

// The strings the QA security run left in the leads and feature requests (2026-11-01).
const QA = {
  name: "QA SEC <img src=x onerror=alert('xss-contact-name')>",
  company: "Co\"><svg onload=alert('xss-contact-co')>",
  message: "QA security test message, please ignore. </script><script>alert('xss-contact-msg')</script>",
  website: "javascript:alert('xss-contact-web')",
  page: "/dashboard\"><img src=x onerror=alert('xss-fr-ctx')>",
};

describe("looksLikeCode", () => {
  it("spots every kind of code the security test used", () => {
    for (const text of Object.values(QA)) expect(looksLikeCode(text), text).toBe(true);
  });

  it("leaves ordinary messages alone, even with angle brackets, links and the word script", () => {
    expect(looksLikeCode("Hi, I run a bakery in Austin. Can you check us? Prices < $200 a month > fine.")).toBe(false);
    expect(looksLikeCode("Our site is https://bakery.com and our video script is ready")).toBe(false);
    expect(looksLikeCode(null, undefined, "")).toBe(false);
  });

  it("is true when any one field holds code", () => {
    expect(looksLikeCode("Sarah", "sarah@bakery.com", QA.message)).toBe(true);
  });
});

describe("withoutCode", () => {
  it("keeps the words and drops the code", () => {
    expect(withoutCode(QA.name)).toBe("QA SEC");
    expect(withoutCode(QA.company)).toBe("Co");
    expect(withoutCode(QA.message)).toBe("QA security test message, please ignore.");
    expect(withoutCode(QA.page)).toBe("/dashboard");
    expect(withoutCode(QA.website)).toBe("");
  });

  it("returns ordinary text unchanged", () => {
    expect(withoutCode("Please add a weekly email.")).toBe("Please add a weekly email.");
  });
});

describe("websiteHref", () => {
  it("links a real address, adding https when it was left out", () => {
    expect(websiteHref("bakery.com")).toBe("https://bakery.com/");
    expect(websiteHref("http://www.bakery.com/menu")).toBe("http://www.bakery.com/menu");
  });

  it("never links a script URL or something that isn't a web address", () => {
    expect(websiteHref(QA.website)).toBeNull();
    expect(websiteHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(websiteHref("not a site")).toBeNull();
    expect(websiteHref("localhost")).toBeNull();
    expect(websiteHref("")).toBeNull();
  });
});
