// Bundles the scan worker into Netlify's Frameworks API folder, which Netlify deploys as a background
// function (the -background suffix). Runs after next build, as part of npm run build.
import { build } from "esbuild";

// The site URLs the app build filled from Netlify's build variables (src/lib/build-urls.ts, BUG-283), baked in the
// same way, so the worker's emails link to the same address when they are not set on Netlify. next build has already
// failed a live build without an https address. Same rule as build-urls.ts, repeated here since this file is plain JS.
const netlifyUrl = process.env.CONTEXT === "production" ? process.env.URL : process.env.DEPLOY_PRIME_URL;
const define = {};
for (const key of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL"]) {
  const url = process.env[key]?.trim() || (process.env.CONTEXT ? netlifyUrl?.trim() : undefined);
  if (url) define[`process.env.${key}`] = JSON.stringify(url);
}

await build({
  define,
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
