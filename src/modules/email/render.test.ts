import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderEmail } from "./render";
import NoticeEmail, { type NoticeEmailProps } from "./templates/notice";

const props: NoticeEmailProps = {
  preview: "Your first check is ready",
  heading: "Your first check is ready",
  paragraphs: ["We asked ChatGPT, Claude and Perplexity the questions your customers ask."],
  action: { label: "See your results", href: "https://app.example/dashboard" },
  baseUrl: "https://app.example/",
};

describe("email templates", () => {
  it("renders the shared layout as HTML and a plain text version", async () => {
    const { html, text } = await renderEmail(createElement(NoticeEmail, props));

    expect(html).toMatch(/^<!DOCTYPE html/i);
    expect(html).toContain('src="https://app.example/images/logos/logo-black.png"');
    expect(html).toContain("Your first check is ready");
    expect(html).toContain('href="https://app.example/dashboard"');
    expect(html).toContain('href="https://app.example/settings"');
    // DESIGN.md look: the one blue for the button, 4px corners, no pure black.
    expect(html).toContain("#2563EB");
    expect(html).toContain("border-radius:4px");
    expect(html).not.toMatch(/#000000|#000[;"]/i);

    expect(text).toContain("YOUR FIRST CHECK IS READY");
    expect(text).toContain("We asked ChatGPT, Claude and Perplexity");
    expect(text).toContain("https://app.example/dashboard");
    expect(text).not.toContain("<");
  });

  it("shows the unsubscribe link only when one is given", async () => {
    const without = await renderEmail(createElement(NoticeEmail, props));
    expect(without.html).not.toContain("Unsubscribe");

    const url = "https://app.example/email/unsubscribe?token=v1.abc";
    const withLink = await renderEmail(createElement(NoticeEmail, { ...props, unsubscribeUrl: url }));
    expect(withLink.html).toContain("Unsubscribe from weekly reports");
    expect(withLink.html).toContain(`href="${url}"`);
    expect(withLink.text).toContain(url);
  });

  it("renders its preview props, as the React Email preview does", async () => {
    const { html } = await renderEmail(createElement(NoticeEmail, NoticeEmail.PreviewProps));
    expect(html).toContain(NoticeEmail.PreviewProps.heading);
  });
});
