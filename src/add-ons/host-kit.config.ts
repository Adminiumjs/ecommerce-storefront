/**
 * EVERY FACT ABOUT THIS APP THE HOST KIT NEEDS, in one object.
 *
 * HOST-OWNED AND NEVER SYNCED. `scripts/host-kit.sh` refuses to write this file
 * and refuses to compare it, because everything in it is a fact about this
 * storefront rather than about the seam — a path, a prefix, a list of the slots
 * this app draws, the languages it ships. The kit's own README calls it the
 * whole point of the package: the reason a hand-copied seam drifted eight ways
 * in a fortnight is that the host-specific tokens were SPRINKLED THROUGH IT, so
 * installing meant editing, and a copy that must be edited to be installed is a
 * fork from the first keystroke.
 *
 * ── THE TWO FIELDS WORTH READING TWICE ─────────────────────────────────────
 *
 * `hostedSlots` takes THIS APP'S three, not the closed registry's twelve. The
 * import trap the kit warns about is real and this file dodges it by renaming
 * at the import in `./slots.ts` rather than here — see that file.
 *
 * `classPrefix` is `sf`, which is this app's own prefix and predates the seam:
 * `sf-screen`, `sf-btn`, `sf-fld`, `sf-gi` are all over `styles/base.css` and
 * every screen. It appears in five places that must agree — the mount
 * component's className, the CSS rule pair, the dock exclusion in the
 * label-pairing gate, the shelf selectors in the claims gate, and the fixture
 * in the slot-content suite — and four of those are test files, which go GREEN
 * when they match nothing. One field, `selectorsFor`, five readers.
 */

import type { HostKitConfig } from "./kit/index.ts";
import { LOCALE_TAGS } from "../i18n/locales";
import { HOSTED_SLOTS, SLOT_EMPTY_BEHAVIOUR, type HostedSlotId } from "./slots.ts";

/**
 * THE THREE FILESYSTEM PATHS, AND THE ONE AWKWARD THING ABOUT THEM.
 *
 * ── THIS FILE IS IMPORTED BY BOTH HALVES OF THE SEAM ───────────────────────
 *
 * `rootDir`, `srcDir` and `vendorDir` are read ONLY by the guards, which run
 * under Node. But the config is one object on purpose — the whole argument for
 * the package is that the component and the gates must not be able to disagree
 * about the prefix — and the component is a browser module, so these three
 * strings are compiled into the shipped bundle whether or not anything reads
 * them there. They are inert: no screen touches them, and `node:fs` is nowhere
 * near this file.
 *
 * ── WHICH IS WHY THEY ARE STRING WORK AND NOT `new URL()` ──────────────────
 *
 * The obvious spelling is `new URL('../', import.meta.url).pathname`, and it
 * builds — with a warning on every single build: Vite treats
 * `new URL(<literal>, import.meta.url)` as an ASSET REFERENCE, cannot resolve a
 * directory as one, and says so. A warning that fires every time and means
 * nothing is a warning that trains a reader to skim past the one that does.
 *
 * So the path is computed by cutting up `import.meta.url` as text, which Vite
 * has no opinion about. Under Node it is a `file:` URL and this yields a real
 * absolute path; in a browser it yields a meaningless-but-harmless string that
 * nothing reads.
 *
 * ABSOLUTE, and not relative to `process.cwd()`: `vitest` is started from
 * wherever somebody happened to be, and a gate that only works from one
 * directory is a gate CI eventually runs from another.
 *
 * `decodeURIComponent`, because a checkout path containing a space arrives here
 * as `%20` and every one of the guards would then walk a directory that does
 * not exist — reporting no findings, and reporting them green.
 */
function dirUp(levels: number): string {
  const here = decodeURIComponent(import.meta.url).replace(/^file:\/\//, "");
  let path = here.replace(/\/[^/]*$/, "");
  for (let i = 0; i < levels; i += 1) path = path.replace(/\/[^/]*$/, "");
  return path;
}

/** `src/add-ons/`, with its trailing slash — the directory this file is in. */
const HERE = `${dirUp(0)}/`;
const ROOT_DIR = dirUp(2);
const SRC_DIR = dirUp(1);

export const hostKit: HostKitConfig<HostedSlotId> = {
  appKey: "ecommerce-storefront",
  classPrefix: "sf",
  hostedSlots: HOSTED_SLOTS,
  slotEmptyBehaviour: SLOT_EMPTY_BEHAVIOUR,

  /**
   * TIER 2 — all eleven guards, four of which need a DOM.
   *
   * The kit's ratchet is that a host may sit at tier 1 but may not sit there
   * quietly: every run prints, by name, the guards that are off and the defect
   * each one leaves open. This host does not sit there. Reaching tier 2 cost
   * one `devDependencies` line (`jsdom`) — `react-dom` was already a runtime
   * dependency, and both hosts that had the seam first drive React through
   * `react-dom/client` and `act` with no testing library at all, which is what
   * this app's own slot suites do.
   *
   * That dependency does not breach 25 D11. The rule is about what reaches a
   * BROWSER; a devDependency `vitest` uses reaches no bundle, and `vite build`
   * output is unchanged by it.
   *
   * The four it buys are the four about PAINT, and two of them are the reason
   * this retrofit is not a grep: `:empty` is not "drew nothing", and a mount
   * inside a JSX comment satisfies a search.
   */
  tier: 2,

  rootDir: ROOT_DIR,
  srcDir: SRC_DIR,
  vendorDir: `${HERE}vendor`,

  /**
   * Every language this storefront ships, English first.
   *
   * Read from `i18n/locales.ts` rather than written out, because that table is
   * already the app's single source of truth for the set — the picker, the
   * message parity guard and the `<html lang>` stamp all read it — and a second
   * list here would be a second thing to forget. The lexicon gate runs PER
   * LOCALE, and a host that passed only `en-US` would be repeating the release
   * grep and performing none of the seven checks it cannot.
   */
  localeTags: LOCALE_TAGS,

  /**
   * The stylesheet that may carry the slot rule pair.
   *
   * One entry because this app has two stylesheets and only one of them holds
   * rules: `styles/tokens.css` is custom properties and nothing else. The
   * styles guard requires the pair in EXACTLY ONE of the files named here,
   * which is stricter than "somewhere" — two copies of a cascade rule is how
   * one gets edited and the other does not.
   */
  stylesheets: [`${SRC_DIR}/styles/base.css`],

  /**
   * Files exempt from the Affiliation source sweep, each with its reason.
   *
   * EMPTY, and it should stay that way. The sweep asks whether a component that
   * prints an add-on's name or monogram also mounts the not-affiliated line;
   * exactly one component in this app prints either, and it mounts it. An entry
   * here is a decision a reviewer can see, and the kit asserts every entry
   * still names a file that exists and is still subject to the rule — because
   * an exemption for a file that no longer names an add-on is an exemption
   * doing nothing but widening the rule, silently.
   */
  affiliationExempt: {},
};
