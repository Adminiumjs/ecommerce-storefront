/**
 * The static list this storefront registers at startup (24 §5.9).
 *
 * ── THE IMPORT BELOW IS THE ONLY PLACE THIS APP NAMES AN ADD-ON ────────────
 *
 * Acceptance criterion 5, and it is grep-checked rather than promised: no
 * shipped file outside `./vendor/` and the registration line above mentions a
 * company or an add-on's key. Their settings, their defaults, the words on
 * their forms, their eight-locale strings, their seeded activity and what their
 * parcels weigh all arrive inside the object `register()` returns — so swapping
 * the delivery company is one line here and one repository over there.
 *
 * The claim is about SHIPPED source. `src/add-ons/addOns.test.ts` and this
 * app's manifest suite name an add-on on purpose: a suite that asserted the
 * seam without ever naming what is on the far side of it would be asserting
 * nothing.
 *
 * ── AN EMPTY REGISTRY IS A VALID STATE, AND THAT IS WHY IT IS A LIST ───────
 *
 * `state/store.ts` boots `createRegistry([])` and this list is handed to it at
 * bootstrap, rather than being built inside the store. Three reasons, and the
 * first is the one that mattered to this retrofit:
 *
 *   1. THE SEAM LANDS BEFORE ANY ADD-ON DOES. With an empty registry every slot
 *      draws its fallback and the app is unchanged on screen, so the mount
 *      points, the CSS pair and every guard were installable, reviewable and
 *      green before a single carrier rate existed. That is also the D6 check
 *      worth having, and it is not hypothetical here: it is what
 *      `slotRender.test.tsx` asserts.
 *   2. THE STORE STOPS IMPORTING ADD-ON BUNDLES. Every screen imports the
 *      store; under the other arrangement every screen's module graph contains
 *      every add-on.
 *   3. CONNECTED MODE NEEDS IT. In Phase B the list comes from
 *      `GET /api/v1/add-ons` and the bundles are `import()`ed with their SRI
 *      hashes. Only the SOURCE of the list changes — which is only true if the
 *      list is not baked in at module load.
 *
 * ── `./vendor/` IS A SYNCED COPY, NOT A FORK ───────────────────────────────
 *
 * The add-ons are one repository — `add-ons`, a package each — and this app is
 * standalone with no npm package tying them together, so the demo build gets a
 * copy. Every vendored file says so in its own header. Edit the package and
 * re-run `scripts/sync-add-ons.sh`, which ships in this repo so a cloner and CI
 * can both run it; a hand-edit under `vendor/` is invisible until it is a bug
 * in two places at once.
 */

import { registerAddOnMessages } from "../i18n/messages/index.ts";
import { register as shippingDhl } from "./vendor/shipping-dhl/index.ts";
import { defaultSettingsFor, type AddOn, type AddOnSettings } from "./vendor/host/index.ts";

/**
 * Registered once, at module load, because REGISTRATION IS WHERE THE MESSAGES
 * ARRIVE.
 *
 * An add-on's strings travel on the add-on object and are merged here rather
 * than imported by `i18n/messages/index.ts`, which would have made the HOST's
 * key vocabulary a function of which add-ons happen to be vendored. Doing it at
 * module load rather than in a mount effect is deliberate: this module is
 * imported by the store, which every screen imports, so the merge is complete
 * before the first render reads a bundle.
 *
 * `registerAddOnMessages` THROWS on a bundle that is not complete in all eight
 * locales. Its own header says what that replaced and why a boot that dies is
 * better than a screen with a dotted key on it in one language.
 */
const REGISTERED: readonly AddOn[] = [shippingDhl()];
for (const addOn of REGISTERED) {
  if (addOn.messages !== undefined) registerAddOnMessages(addOn.key, addOn.messages);
}

/**
 * Everything the manage drawer shows.
 *
 * One entry, and no described-but-not-built shelf rows beside it. The two hosts
 * that had this seam first each carry a `shelf.ts` of catalogue copy — four
 * entries apiece that say "not in this demo" — and this app deliberately has
 * none: a customer-facing storefront's drawer is a list of what is CONNECTED to
 * this shop, not a marketplace page, and a row that cannot be switched on would
 * be an advertisement inside a checkout.
 */
export function demoAddOns(): AddOn[] {
  return [...REGISTERED];
}

/**
 * What every add-on starts from, keyed by add-on key and OPAQUE to this app.
 *
 * The credentialled add-on's two `secret: true` settings are absent by
 * CONSTRUCTION rather than by omission (24 D15): they live in its server half,
 * `register()` does not put them in `settings`, and a store the browser can
 * read is precisely where a key must never appear. Nothing here ever holds one.
 */
export const DEFAULT_ADD_ON_SETTINGS: AddOnSettings = defaultSettingsFor(REGISTERED);

/** The keys the drawer puts a control against. */
export const DEMO_KEYS: readonly string[] = REGISTERED.map((a) => a.key);
