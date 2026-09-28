import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import OpengraphImage, { size as ogSize } from "./opengraph-image";

// Rendered here rather than in e2e: in next dev, the image optimizer blocks sharp's SVG loader for the
// whole process, so an ImageResponse route 500s once any next/image has been served. The build prerenders it.
function pngSize(bytes: Buffer) {
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("metadata images", () => {
  it("renders the link preview as a PNG at its declared size", async () => {
    expect(pngSize(Buffer.from(await OpengraphImage().arrayBuffer()))).toEqual(ogSize);
  });

  // Static files, so next dev serves them even after the optimizer has run (BUG-028).
  it.each([
    ["favicon", "icon.png", 32],
    ["home screen icon", "apple-icon.png", 180],
  ])("ships the %s as a square PNG", (_, file, px) => {
    expect(pngSize(readFileSync(new URL(file, import.meta.url)))).toEqual({ width: px, height: px });
  });
});
