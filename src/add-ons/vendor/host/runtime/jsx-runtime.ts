/*
 * VENDORED from add-ons/packages/host/src/runtime/jsx-runtime.ts — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The shared contract; the vendored add-on imports it by relative path.
 */
/**
 * The `react/jsx-runtime` shim an add-on's build aliases to (see `./index.ts`).
 *
 * The automatic JSX transform emits `jsx`/`jsxs` calls at module scope, so this
 * is the shim that has to exist before anything else in an add-on's bundle
 * runs — and the reason the runtime is a global rather than an argument to
 * `register()`.
 *
 * `jsx-dev-runtime` aliases here as well. A production build never emits
 * `jsxDEV`, and a bundle that somehow did would be carrying React's development
 * runtime, which `vite.config.ts` already refuses on its own grounds.
 */

import { requireAddOnRuntime } from './index.ts';

const runtime = requireAddOnRuntime().jsx;

export const jsx = runtime.jsx as never;
export const jsxs = runtime.jsxs as never;
export const jsxDEV = runtime.jsx as never;
export const Fragment = runtime.Fragment as never;
