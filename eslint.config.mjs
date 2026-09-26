import { defineConfig, globalIgnores } from "eslint/config";
import { builtinRules } from "eslint/use-at-your-own-risk";
import boundaries from "eslint-plugin-boundaries";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Architecture rules from MVP_SPEC 18.1 (B-05).

// ESLint allows one severity per rule, so rules that need a second severity run as local copies.
const local = {
  rules: {
    "max-lines-hard": builtinRules.get("max-lines"),
    "no-select-star": builtinRules.get("no-restricted-syntax"),
  },
};

const NO_PROCESS_ENV = {
  selector: "MemberExpression[object.name='process'][property.name='env']",
  message: "Read environment variables through env from src/lib/env.ts.",
};
const NO_GET_SESSION = {
  selector: "CallExpression[callee.object.property.name='auth'][callee.property.name='getSession']",
  message: "getSession() reads an unverified cookie; use getUser() or getClaims() for trust decisions.",
};
const NO_SELECT_STAR = {
  // Head-only counts (select("*", { count, head: true })) return no rows, so they are allowed.
  selector:
    "CallExpression[callee.property.name='select'][arguments.0.value='*']:not(:has(Property[key.name='head'][value.value=true]))",
  message: "Select only the columns the screen needs; select(\"*\") is allowed only in a dal.ts.",
};

// Existing files that break a rule below. They get a warning instead of an error until the
// task that rewrites them removes them from these lists; every new file gets the error.
const LEGACY_SELECT_STAR = [
  "src/app/api/geo/businesses/route.ts",
  "src/app/api/geo/seo/route.ts",
  "src/app/dashboard/billing/page.tsx",
  "src/app/dashboard/seo/page.tsx",
  "src/app/internal/admin/accounts/page.tsx",
  "src/app/internal/admin/billing/page.tsx",
  "src/app/internal/admin/businesses/[[]id]/page.tsx",
  "src/lib/billing/accounts.ts",
  "src/lib/geo/dashboard-aggregator.ts",
  "src/lib/geo/dashboard-data.ts",
];
const LEGACY_SUPABASE_IN_COMPONENTS = [
  "src/components/geo/AuthForm.tsx",
  "src/components/geo/ForgotPasswordForm.tsx",
  "src/components/geo/ResetPasswordForm.tsx",
];

const CLIENT_LIBRARIES = ["@supabase/*", "stripe", "@stripe/*", "openai", "@anthropic-ai/sdk"];
const CLIENT_WRAPPERS = ["src/lib/supabase/**", "src/lib/stripe.ts", "src/lib/geo/providers/**"];

const dependencyPolicies = [
  // Components never talk to Supabase, Stripe or AI providers, or to a module's data layer.
  ...CLIENT_LIBRARIES.map((source) => ({
    from: { element: { type: "component" } },
    disallow: { to: { module: { origin: "external", source } } },
  })),
  ...CLIENT_WRAPPERS.map((path) => ({
    from: { element: { type: "component" } },
    disallow: { to: { file: { path } } },
  })),
  {
    from: { element: { type: "component" } },
    disallow: { to: { element: { type: "module", fileInternalPath: "**/dal.ts" } } },
  },
  // Modules use each other only through their index.ts.
  {
    from: { element: { type: "module" } },
    disallow: {
      to: {
        element: {
          type: "module",
          captured: { moduleName: "!{{ from.element.captured.moduleName }}" },
          fileInternalPath: "!index.ts",
        },
      },
    },
  },
  // proxy.ts does cookie redirects only; no feature logic.
  {
    from: { file: { categories: "proxy" } },
    disallow: { to: { element: { type: "module" } } },
  },
];

// checkAllOrigins makes the rule look at npm packages too, not only local files.
const dependencyOptions = { default: "allow", checkAllOrigins: true, policies: dependencyPolicies };

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries, local },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      "boundaries/elements": [
        { type: "module", pattern: "src/modules/*", capture: ["moduleName"] },
        { type: "component", pattern: "src/components" },
        { type: "app", pattern: "src/app" },
        { type: "lib", pattern: "src/lib" },
      ],
      "boundaries/files": [{ category: "proxy", pattern: "src/proxy.ts" }],
    },
    rules: {
      "boundaries/dependencies": ["error", dependencyOptions],
      "no-restricted-syntax": ["error", NO_PROCESS_ENV, NO_GET_SESSION],
      "local/no-select-star": ["error", NO_SELECT_STAR],
    },
  },
  {
    files: ["src/lib/env.ts"],
    rules: { "no-restricted-syntax": ["error", NO_GET_SESSION] },
  },
  {
    files: ["src/**/dal.ts"],
    rules: { "local/no-select-star": "off" },
  },
  {
    files: LEGACY_SELECT_STAR,
    rules: { "local/no-select-star": ["warn", NO_SELECT_STAR] },
  },
  {
    files: LEGACY_SUPABASE_IN_COMPONENTS,
    rules: { "boundaries/dependencies": ["warn", dependencyOptions] },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/modules/**/*.{ts,tsx}"],
    plugins: { local },
    rules: {
      "max-lines": ["warn", { max: 250 }],
      "local/max-lines-hard": ["error", { max: 400 }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Netlify generated build artifacts
    ".netlify/**",
  ]),
]);

export default eslintConfig;
