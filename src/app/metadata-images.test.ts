import { describe, expect, it } from "vitest";
import OpengraphImage, { size as ogSize } from "./opengraph-image";
import Icon, { size as iconSize } from "./icon";
import AppleIcon, { size as appleSize } from "./apple-icon";

// Rendered here rather than in e2e: in next dev, the image optimizer blocks sharp's SVG loader for the
// whole process, so these routes 500 once any next/image has been served. The build prerenders them.
async function pngSize(response: Response) {
  const bytes = Buffer.from(await response.arrayBuffer());
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("metadata images", () => {
  it.each([
    ["link preview", OpengraphImage, ogSize],
    ["favicon", Icon, iconSize],
    ["home screen icon", AppleIcon, appleSize],
  ])("renders the %s as a PNG at its declared size", async (_, render, size) => {
    expect(await pngSize(render())).toEqual(size);
  });
});
