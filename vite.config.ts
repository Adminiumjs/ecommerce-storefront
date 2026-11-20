import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";

import { surfaceJsonPlugin } from "./surface-emit.ts";
import { demoJsonPlugin } from "./demo-emit.ts";
import { CARD_MESSAGES, DEMO_CARD } from "./src/demo/card.ts";
import { MESSAGES } from "./src/i18n/messages/index.ts";
import { APP_KEY, APP_LABEL_KEY, SURFACE_NAV } from "./src/surface-nav.ts";

/*
 * Every build-time flag is defined, always, even when unset: Vite replaces
 * `import.meta.env` with an object of the variables it loaded, so an unset
 * one compiles to a lookup no minifier folds, and code meant for one build
 * ships in another. `define` always writes a literal, so `SURFACE_SIDE` and
 * the rest in `src/surface.ts` fold in every build.
 */
const FLAGS = [
  "VITE_ADMINIUM_SURFACE_SIDE",
  "VITE_ADMINIUM_API_BASE_URL",
  "VITE_ADMINIUM_PUBLISHABLE_KEY",
  "VITE_ADMINIUM_ORDER_KEY",
  "VITE_ADMINIUM_DESIGN_KEY",
] as const;
const define = Object.fromEntries(FLAGS.map((name) => [`import.meta.env.${name}`, JSON.stringify(process.env[name] ?? "")]));

/**
 * Vite's config type plus the block vitest reads out of the same file.
 *
 * NOT `import { defineConfig } from "vitest/config"`, and not
 * `/// <reference types="vitest/config" />` either. The import drags in the copy
 * of Vite nested under `vitest/`, and `tsc -b` then refuses the React plugin —
 * a `PluginOption` from one Vite is not assignable to `PluginOption` from the
 * other — which fails a build whose first half IS `tsc -b`. The triple-slash
 * reference does not augment under this tsconfig's resolution at all. One local
 * interface types the two settings that are actually used, keeps the plugin
 * types on Vite's own copy, and is checked like everything else.
 */
interface ViteWithVitest extends UserConfig {
  test: { testTimeout: number; hookTimeout: number };
}

// https://vite.dev/config/
// `base` defaults to "/" (root deploy). The `build:demo` script overrides it
// with --base=/demo/maker-shop/app/, where the website frames the demo.
const config: ViteWithVitest = {
  define,
  plugins: [
    react(),
    /*
     * `surface.json` beside `index.html`, on surface builds only: Adminium
     * reads it to list the app's sections. A build with no side writes
     * nothing, so the demo and standalone builds stay as they were.
     */
    surfaceJsonPlugin({ appKey: APP_KEY, appLabelKey: APP_LABEL_KEY, nav: SURFACE_NAV, messages: MESSAGES }),
    /*
     * `demo.json` beside the demo build's `index.html`, for the website's demo
     * card: the shopper's screens and the studio's, the shortcuts, the two
     * people, the clock and the add-ons, in the card's eight languages. Only a
     * `/demo/` build writes it.
     */
    demoJsonPlugin({ ...DEMO_CARD, messages: CARD_MESSAGES }),
  ],
  /*
   * How long a suite may take, here rather than as a flag on the command
   * line, so `npm test` as the README gives it is the run CI makes. The
   * screens' render suites draw whole pages in jsdom and the demo's bundle
   * check builds four bundles, so vitest's 5 s default is not enough; a hung
   * test still fails the run instead of holding it. `src/sources.test.ts`
   * checks the line is still here.
   */
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  build: {
    rollupOptions: {
      output: {
        /*
         * Two vendor chunks. React barely changes between releases and the icon
         * set is the biggest dependency, so splitting them keeps the app chunk
         * under Rollup's 500 kB warning and lets a browser reuse both across
         * deploys.
         */
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
          if (id.includes("node_modules/lucide-react")) return "icons";
          /*
           * The vendored Customiser's editor in a chunk of its own: it is
           * another repo's code, reviewed there, and `builtOutput.test.ts`
           * tells it from this app's by the chunk's provenance, which a chunk
           * that mixed the two would not have. Its 3D preview (`stage3d.js`)
           * is left to the editor's own `import()`, so it still loads only
           * when a shopper turns the piece round.
           */
          if (id.endsWith("/vendor/customiser/index.js")) return "customiser";
          return undefined;
        },
      },
    },
  },
};

export default defineConfig(config);
