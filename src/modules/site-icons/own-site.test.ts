import { describe, expect, it } from "vitest";
import type { SafeResponse } from "@/lib/net/safe-fetch";
import { iconLinks, imageType, ownSiteIcon } from "./own-site";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const ICO = Buffer.from([0x00, 0x00, 0x01, 0x00, 1, 2]);
const page = (url: string, html: string): SafeResponse => ({ status: 200, ok: true, url, contentType: "text/html; charset=utf-8", text: html, bytes: Buffer.from(html) });
const file = (url: string, bytes: Buffer, contentType = ""): SafeResponse => ({ status: 200, ok: true, url, contentType, text: "", bytes });
const missing = (url: string): SafeResponse => ({ status: 404, ok: false, url, contentType: "text/html", text: "Not found", bytes: Buffer.from("Not found") });

describe("iconLinks", () => {
  it("lists declared icons best first, as full addresses", () => {
    const html = `<head><link rel="icon" href="/favicon-16.png" sizes="16x16"><link rel='shortcut icon' href=img/fav.ico>
      <link rel="apple-touch-icon" sizes="180x180" href="https://cdn.example.com/touch.png"><link rel="icon" href="/fav-32.png" sizes="32x32">
      <link rel="mask-icon" href="/mask.svg"><link rel="stylesheet" href="/a.css"></head>`;
    expect(iconLinks(html, "https://dominos.com.pk/menu/")).toEqual([
      "https://cdn.example.com/touch.png",
      "https://dominos.com.pk/fav-32.png",
      "https://dominos.com.pk/favicon-16.png",
      "https://dominos.com.pk/menu/img/fav.ico",
    ]);
  });

  it("ignores other schemes", () => {
    expect(iconLinks(`<link rel="icon" href="javascript:alert(1)"><link rel="icon" href="file:///etc/passwd">`, "https://x.com/")).toEqual([]);
  });
});

describe("imageType", () => {
  it("knows images by their first bytes, whatever the server says", () => {
    expect(imageType(PNG, "application/octet-stream")).toBe("image/png");
    expect(imageType(ICO, "")).toBe("image/x-icon");
    expect(imageType(Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>'), "text/plain")).toBe("image/svg+xml");
  });

  it("refuses a web page sent as an icon", () => {
    expect(imageType(Buffer.from("<!doctype html><html>Not found</html>"), "text/html")).toBeNull();
  });
});

describe("ownSiteIcon", () => {
  it("reads the home page and loads the icon it declares", async () => {
    const asked: string[] = [];
    const icon = await ownSiteIcon("dominos.com.pk", async (url) => {
      asked.push(url);
      if (url === "https://dominos.com.pk/") return page(url, `<link rel="icon" href="/static/fav.png">`);
      if (url === "https://dominos.com.pk/static/fav.png") return file(url, PNG, "image/png");
      return missing(url);
    });
    expect(icon).toMatchObject({ type: "image/png" });
    expect(asked).toEqual(["https://dominos.com.pk/", "https://dominos.com.pk/static/fav.png"]);
  });

  it("falls back to www., then /favicon.ico, and skips icons that are web pages", async () => {
    const icon = await ownSiteIcon("jfcpizza.com", async (url) => {
      if (url === "https://jfcpizza.com/") throw new Error("connect ECONNREFUSED");
      if (url === "https://www.jfcpizza.com/") return page(url, `<link rel="icon" href="/broken.png">`);
      if (url === "https://www.jfcpizza.com/broken.png") return page(url, "<html>404</html>");
      if (url === "https://www.jfcpizza.com/favicon.ico") return file(url, ICO);
      return missing(url);
    });
    expect(icon).toMatchObject({ type: "image/x-icon" });
  });

  it("says none when the page was read and declares no icon that loads", async () => {
    expect(await ownSiteIcon("plain.example.com", async (url) => (url.endsWith("/") ? page(url, "<p>hi</p>") : missing(url)))).toBe("none");
  });

  it("says failed when the site or its icon could not be fetched this time, so it is asked again later", async () => {
    expect(await ownSiteIcon("down.example.com", async () => { throw new Error("timeout"); })).toBe("failed");
    const slowIcon = await ownSiteIcon("dominos.com.pk", async (url) => {
      if (url === "https://dominos.com.pk/") return page(url, `<link rel="icon" href="/fav.png">`);
      throw new Error("timeout");
    });
    expect(slowIcon).toBe("failed");
  });
});
