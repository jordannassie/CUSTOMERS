// Bundles the scan worker into Netlify's Frameworks API folder, which Netlify deploys as a background
// function (the -background suffix). Runs after next build (postbuild).
import { build } from "esbuild";

await build({
  entryPoints: ["netlify/worker/scan-worker-background.ts"],
  outfile: ".netlify/v1/functions/scan-worker-background.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // server-only exists to stop client bundles; the react-server build of it is this empty file.
  alias: { "server-only": "./node_modules/server-only/empty.js" },
  // Some bundled CommonJS dependencies call require() for Node built-ins.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: "info",
});
