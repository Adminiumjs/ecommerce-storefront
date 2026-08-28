import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// `base` defaults to "/" (root deploy on Vercel / DigitalOcean). The
// `build:demo` script overrides it with --base=/demo/ecommerce-storefront/ so the
// app can be served from the Adminium demo sub-path.
/*
 * Every build-time flag is defined here, ALWAYS, even when unset.
 *
 * This is not belt-and-braces — it is the difference between the flag folding
 * and not. Vite replaces `import.meta.env` with an object literal holding only
 * the vars it actually loaded, so an UNSET var compiles to a runtime property
 * lookup on that object (`const x = {}; x.VITE_ADMINIUM_SURFACE_SIDE`) which no
 * minifier will fold. The branch then survives, and code meant for one build
 * ships in another. Measured: the demo bundle carried the whole same-origin
 * session transport for exactly this reason, and defining the var to `""`
 * dropped it.
 *
 * `define` always emits a literal, so absence becomes `""` rather than a lookup
 * and `SURFACE_SIDE`/`HOSTED`/`DEMO` in `src/surface.ts` fold in every build.
 */
const FLAGS = [
  "VITE_ADMINIUM_SURFACE_SIDE",
  "VITE_ADMINIUM_API_BASE_URL",
  "VITE_ADMINIUM_PUBLISHABLE_KEY",
] as const;

const define = Object.fromEntries(
  FLAGS.map((name) => [
    `import.meta.env.${name}`,
    JSON.stringify(process.env[name] ?? ""),
  ]),
);

/*
 * THE HOSTED DEV LOOP.
 *
 * A hosted surface is served BY Adminium precisely so it shares an origin with
 * the session cookie — which is what a separate Vite dev server breaks, and why
 * hosted mode looked like it had no HMR. It does: this proxies the API back to
 * a local Adminium, so `vite dev` serves the screens with hot reload while the
 * session and the data still come from the real server.
 *
 * `changeOrigin: false` IS the mechanism, and the common default would break
 * it. CSRF leg A derives the expected origin from the request's own `Host`
 * (`apps/server/src/security/csrf.ts`); `changeOrigin: true` rewrites Host to
 * the target, leaving `Origin: localhost:5217` against `Host: localhost:4715`
 * and 403ing every write. Leaving Host alone keeps them equal.
 *
 * MEASURED, not assumed — reads, writes and HMR all verified against a live
 * instance. With the token a write returns its normal validation response; the
 * same write without one still returns `403 CSRF_FAILED`, so the proxy relaxes
 * nothing. The cookie crosses the port because cookies are host-scoped and
 * ignore ports, which is also why you sign in ONCE on Adminium's own origin and
 * the dev server is already authenticated.
 */
const ADMINIUM_DEV_API = process.env.ADMINIUM_DEV_API ?? "http://127.0.0.1:4600";

const server = {
  proxy: { "/api": { target: ADMINIUM_DEV_API, changeOrigin: false } },
};

export default defineConfig({
  define,
  server,
  plugins: [react()],
});
