// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { ConfigEnv, Plugin, UserConfig } from "vite";

/**
 * Anti-regression for the production SSR build.
 *
 * Vite derives the automatic JSX transform (dev `jsxDEV` vs prod `jsx`/`jsxs`)
 * solely from `process.env.NODE_ENV` — NOT from the resolved build mode. A stray
 * `NODE_ENV=development` anywhere in the build environment (local `.env` via
 * `VITE_USER_NODE_ENV`, a Vercel/Dashboard env var, a CI shell) therefore compiles
 * every environment — including the SSR/nitro bundles — against
 * `react/jsx-dev-runtime`.
 *
 * That compiles fine but crashes at runtime on the server: under
 * `NODE_ENV=production` the CommonJS shim `react/jsx-dev-runtime.js` re-exports
 * the *production* jsx runtime, which has no `jsxDEV` export, so the first
 * render fails with:
 *   TypeError: (0 , import_jsx_dev_runtime.jsxDEV) is not a function
 *     at RootShell (.../_ssr/router-*.mjs)
 *
 * Pin the production transform for every `vite build` so compiled artifacts
 * never depend on ambient NODE_ENV. `vite dev` (command === "serve") keeps the
 * dev transform: react is resolved per-request there and NODE_ENV defaults to
 * "development", so jsxDEV exists and better error messages stay.
 */
function pinJsxForProductionBuilds(): Plugin {
  return {
    name: "pistara:pin-jsx-for-production-builds",
    config(userConfig: UserConfig, env: ConfigEnv) {
      if (env.command !== "build") return;
      const prevOxc = userConfig.oxc;
      // `oxc.jsx` may be the string "preserve", so narrow before spreading.
      const prevJsx =
        typeof prevOxc === "object" && typeof prevOxc.jsx === "object" ? prevOxc.jsx : undefined;
      userConfig.oxc = {
        ...prevOxc,
        jsx: {
          ...prevJsx,
          // Ensure the compiled code uses react/jsx-runtime, never jsx-dev-runtime.
          development: false,
        },
      };
    },
  };
}

export default defineConfig({
  plugins: [pinJsxForProductionBuilds()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
});
