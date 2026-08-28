/*
 * INSTALLED from add-ons/packages/host-kit/src/config.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The RUNTIME half: this compiles into the bundle.
 */
/**
 * EVERY HOST-SPECIFIC FACT THE SEAM NEEDS, IN ONE OBJECT.
 *
 * ── WHY THIS FILE IS THE WHOLE POINT OF THE PACKAGE ─────────────────────────
 *
 * The seam exists in two repos. It was hand-copied between them, and the copy
 * drifted in eight measured ways within a fortnight — a guard that exists in
 * one host and not the other, a generic parameter that means two different
 * things, a store wired two ways, a package script silently dropped. None of
 * that is carelessness. It is what hand-copying 2,200 lines of runtime and
 * 3,400 lines of suites DOES, and wave 6 was about to do it four more times.
 *
 * The reason a copy drifts rather than a call is that a copy has host-specific
 * tokens SPRINKLED THROUGH IT, so installing it means editing it, and editing
 * it means every host's copy is a fork from the first keystroke. The worst of
 * those tokens is the class-name prefix: `mp-` in the print works, `br-` in the
 * maker studio, and it is duplicated across FIVE files that must all agree —
 * the mount component, the CSS rule pair, the dock exclusion in the
 * label-pairing gate, the shelf selectors in the claims gate, and the fixture
 * in the slot-content suite. Four of those are test files, so a prefix changed
 * in the component and missed in a suite does not fail: the suite goes on
 * querying a selector that now matches nothing, finds zero offenders, and
 * reports green. THAT IS A GATE GOING BLIND BY A ROUTE NOBODY LOOKS DOWN, and
 * it is the exact shape wave 4b found eleven times.
 *
 * So the prefix is ONE FIELD here and every one of the five reads it. A host
 * that renames its classes changes one line, and a host that changes the field
 * without changing its stylesheet fails `guards/styles.ts` — which is a real
 * failure, in the right place, instead of four silent passes.
 *
 * ── WHAT BELONGS IN HERE AND WHAT DOES NOT ──────────────────────────────────
 *
 * DATA a guard needs in order to run: a name, a prefix, a path, a list of ids,
 * a table. Nothing here is a function that renders, tours or navigates — those
 * are the tier-2 FIXTURES (`Tier2Fixtures` below), and they are a separate
 * argument for a reason worth stating: a config is a value a host can write in
 * a file that imports nothing, and the moment it holds a `render` it drags
 * React, the store and every screen into whatever imports it. `people-ops` and
 * `clinic-desk` have no React test tree at all; their config must still load.
 *
 * ── AND WHAT IS DELIBERATELY NOT PARAMETERISED ──────────────────────────────
 *
 * The banned-word list, the company regex and the idea×language table. They are
 * facts about a RELEASE RULE (17 §2) and about LANGUAGES, not about a shop, and
 * `maker-shop/src/testing/lexicon.ts` already records what happens when a host
 * is allowed to hold its own: registering a portable add-on turned that host's
 * vocabulary gate red until somebody edited a list in `src/testing/`, because
 * Czech "pro kterou" was carved out in one host and not the other. A host that
 * must be edited before a portable add-on passes its gates makes 24 D21 false
 * by a route nobody would look down. The lists live in the kit, every host gets
 * all of them, and a host may ADD nothing.
 */

import type { SlotEmptyBehaviour, SlotId } from '../vendor/host/index.ts';

/**
 * WHICH GUARDS A HOST IS ACTUALLY RUNNING — declared, not inferred.
 *
 * ── THE RULING (31-T04) ─────────────────────────────────────────────────────
 *
 * Six of the eleven guards need nothing but `node:fs` and a TypeScript parser.
 * The other five need a DOM, because the defects they close are defects about
 * PAINT and about what React actually called — `:empty` is not "drew nothing",
 * and a mount inside a JSX comment satisfies a grep. Verified rather than
 * assumed: `people-ops` and `clinic-desk` have zero `.test.tsx`, no `jsdom`
 * devDependency and no DOM environment anywhere in their suites, while
 * `print-shop` and `maker-shop` have `jsdom` and drive React through
 * `react-dom/client` + `act`.
 *
 * So a host declares which tier it installed and the kit HOLDS IT TO IT:
 *
 *   `1` — the six that need no DOM. Every run prints, by name, the five guards
 *         that are not running and the defect each one closes. A host may sit
 *         here; it may not sit here quietly, which is the whole ratchet.
 *   `2` — all eleven. `jsdom` must resolve and every tier-2 guard must be
 *         referenced by one of the host's own suites.
 *
 * DECLARING `1` WHILE HAVING `jsdom` IS A FAILURE, and there is no exemption
 * field to switch that off. A host with a DOM available and five guards
 * switched off is leaving them off for no reason anybody wrote down, and an
 * exemption list is where nine of wave 4b's holes came from. The fix is one
 * word in this file or one line out of `package.json`.
 *
 * ADDING `jsdom` DOES NOT BREACH 25 D11. That rule says an add-on ships no
 * RUNTIME dependency its host lacks — it is about what reaches a browser. A
 * `devDependencies` entry used by `vitest run` reaches no bundle, and both
 * hosts that already have the seam have carried `jsdom` since wave 4b with no
 * change to what they ship. Anybody about to "fix" this by deleting it should
 * read this paragraph and the README's TIER table first.
 */
export type HostKitTier = 1 | 2;

/**
 * The host-specific facts, as one object.
 *
 * Generic over the host's OWN hosted-slot union rather than over `SlotId` —
 * see `AddOnSlot.tsx` for why that distinction is the difference between a
 * compile error and an undecided empty state.
 */
export interface HostKitConfig<S extends SlotId = SlotId> {
  /**
   * The host's own key: `print-shop`, `people-ops`, `ecommerce-storefront`.
   *
   * Used in failure messages and nowhere else. It exists because a guard that
   * fails identically in twelve repos is a guard whose output a reader cannot
   * place, and the first thing anybody asks of a red suite is "which one".
   */
  appKey: string;

  /**
   * The class-name prefix, WITHOUT its trailing hyphen: `mp`, `br`.
   *
   * The five-places problem, collapsed. See this file's header — four of the
   * five places are test files, so disagreement here used to mean silent
   * passes rather than failures.
   */
  classPrefix: string;

  /**
   * THE SLOTS THIS HOST MOUNTS. Not the closed registry — the host's own list.
   *
   * `vendor/host/slots.ts` exports the CLOSED REGISTRY under the name
   * `HOSTED_SLOTS`, which is the same identifier a host uses for the five or
   * nine it actually mounts. Importing the wrong one silently WIDENS every
   * slot check in this kit: the mounts guard would demand mounts for twelve
   * ids, the empty-behaviour table would need twelve rows, and the payload
   * generic would accept ids the host never draws. Whatever a host names its
   * own list, THIS field takes the host's, and `guards/mounts.ts` asserts it
   * is a strict subset of the registry so a mis-import is a named failure.
   */
  hostedSlots: readonly S[];

  /**
   * What this host draws where nothing fills each slot it mounts.
   *
   * Keyed by the host's own union and TOTAL BY TYPE, so a slot added to
   * `hostedSlots` with no decision here is a compile error in the host's own
   * config file. There is deliberately NO shared table: `packages/host`'s
   * `slots.ts` records at length why empty behaviour is a property of the
   * SCREEN a host built and not of the slot id, and the case that settled it —
   * one host mounting `cart.line.preview` three times and behaving two ways —
   * is a case no table keyed by slot id can state.
   */
  slotEmptyBehaviour: Readonly<Record<S, SlotEmptyBehaviour>>;

  /** See `HostKitTier`. Declared by the host; held to by `guards/tier.ts`. */
  tier: HostKitTier;

  /**
   * The host's checkout root, ABSOLUTE.
   *
   * Absolute rather than relative to `process.cwd()`, because two of the
   * guards are driven from the kit's own suites against a synthetic host in a
   * temp directory, and a guard that only works when the process happens to
   * have been started in the right place cannot be proven to bite.
   */
  rootDir: string;

  /** `<rootDir>/src`, absolute. Named separately because a host may move it. */
  srcDir: string;

  /**
   * `<srcDir>/add-ons/vendor`, absolute — where the synced add-on copies land.
   *
   * The kit itself does NOT live here. See `installLayout` below.
   */
  vendorDir: string;

  /**
   * Every locale this host ships, BCP-47, English first.
   *
   * The lexicon gate runs per locale, and a host that passed only `en-US`
   * would be running the one check the release grep already performs and none
   * of the seven it cannot.
   */
  localeTags: readonly string[];

  /**
   * Stylesheets that may carry the slot rule pair, absolute paths.
   *
   * A list rather than one path because the two existing hosts disagree —
   * `print-shop/src/styles/components.css` and
   * `maker-shop/src/styles/screens.css` — and which file a rule lives in is a
   * host's own business. `guards/styles.ts` requires the pair in EXACTLY ONE
   * of them, which is stricter than "somewhere": two copies of a cascade rule
   * is how one gets edited and the other does not.
   */
  stylesheets: readonly string[];

  /**
   * Files exempt from the Affiliation source sweep, each with its REASON.
   *
   * A record rather than a list, so an exemption cannot be added without
   * writing why, and `guards/label-pairing.ts` asserts every entry still names
   * a file that exists and is still subject to the rule it is exempt from. An
   * exemption for a file that no longer names an add-on is an exemption doing
   * nothing but widening the rule.
   *
   * Paths are relative to `rootDir`, so the reason reads the way a reviewer
   * would write it.
   */
  affiliationExempt: Readonly<Record<string, string>>;

  /**
   * Selectors, derived from `classPrefix` unless a host genuinely differs.
   *
   * Every one of these has a default computed from the prefix. The overrides
   * exist because a retrofit target may already have shipped class names that
   * do not follow the pattern, and a kit that forced twelve hosts to rename
   * their CSS on install would not be installed. Overriding one is a decision
   * a reader can see; having twelve hosts each invent their own is not.
   */
  selectors?: Partial<HostKitSelectors>;
}

/**
 * WHAT A GUARD ACTUALLY READS — every host fact except the two slot members.
 *
 * ── WHY A SECOND TYPE, AND WHY IT IS NOT A WEAKENING ───────────────────────
 *
 * `HostKitConfig<S>` is generic over the host's OWN hosted-slot union, and §6
 * of the README argues at length that it must be: `slotEmptyBehaviour` is
 * `Record<S, …>` and TOTAL BY TYPE, so a slot added to `hostedSlots` with no
 * empty-state decision is a compile error in the host's own config, which is
 * where that decision belongs.
 *
 * That totality has a consequence nobody met until a real host wrote a real
 * config. `Record<'a' | 'b', V>` is NOT assignable to `Record<AllTwelve, V>` —
 * it is missing ten properties — so a config typed over a two-slot union
 * cannot be passed to a parameter annotated `HostKitConfig`, which is the
 * default and means `HostKitConfig<SlotId>`. Every guard in this package was
 * annotated that way, so **step 4 of the README produced a config that step 10
 * could not pass to a single guard.** `tsc` reported it nine times over.
 *
 * The kit's own suites never saw it because `synthetic-host.ts` builds its
 * config as `HostKitConfig` and CASTS the table (`as HostKitConfig
 * ['slotEmptyBehaviour']`) — so the fixture routed around the exact defect a
 * host walks into, which is a fair description of why a kit nobody has
 * installed is a document rather than a kit.
 *
 * So the guards take THIS instead. It is the config with the two slot-shaped
 * members dropped, and dropping them is honest rather than convenient: not one
 * of the seven tier-1 guards reads either. `mountsGuard` is the only thing in
 * the package that does, it is generic over `S` already, and it stays that way.
 *
 * A host still writes ONE object, still typed `HostKitConfig<HostedSlotId>`,
 * and passes it to everything. Nothing is cast anywhere.
 */
export type HostFacts = Omit<HostKitConfig<SlotId>, 'hostedSlots' | 'slotEmptyBehaviour'>;

/**
 * The four places a guard has to be able to point at a shape on screen.
 *
 * Each default is `classPrefix` plus the name both existing hosts already use,
 * so a host that follows the pattern configures none of them.
 */
export interface HostKitSelectors {
  /** One fill's wrapper. Written by `AddOnSlot`; keyed off by the CSS pair. */
  slotFill: string;
  /** The host's own content at a filled slot. The other half of the pair. */
  slotSpare: string;
  /**
   * THE REVIEWER'S CONTROL STRIP, which is the one thing excluded from the
   * label-pairing walk.
   *
   * It is a row of toggle chips floating over every view, each labelled with an
   * add-on's name — and two of those names contain a company's mark. A scan
   * that included it would report every surface in the app in eight languages
   * and be switched off inside a week. It is the ONLY exclusion, it is not part
   * of the product, and a paragraph inside a toggle chip is not a surface.
   */
  dock: string;
  /**
   * One add-on's entry on the shelf, in both shapes it takes.
   *
   * Every claims assertion is scoped to ONE of these. A page-wide `toContain`
   * is satisfied by exactly the arrangement that was broken — one card alone on
   * a filtered page with the footnote three sections below it — which makes it
   * worse than no assertion, because it reports coverage for the defect.
   */
  shelfEntry: string;
}

/**
 * The selectors a config resolves to.
 *
 * It takes the two members it reads rather than a whole config, for the reason
 * `HostFacts` above exists: its callers hold configs over different slot
 * unions, and a parameter naming one of them would refuse the others. The
 * earlier spelling was a union of two instantiations — `HostKitConfig<never> |
 * HostKitConfig<SlotId>` — which accepted neither a real host's config nor
 * anything else that was not exactly one of the two.
 */
export function selectorsFor(config: Pick<HostKitConfig<SlotId>, 'classPrefix' | 'selectors'>): HostKitSelectors {
  const p = config.classPrefix;
  return {
    slotFill: `.${p}-slot-fill`,
    slotSpare: `.${p}-slot-spare`,
    dock: `.${p}-dock`,
    shelfEntry: `.${p}-addon-card, .${p}-addon-row`,
    ...config.selectors,
  };
}

/**
 * WHERE THE KIT LANDS IN A HOST, and why it is two directories rather than one.
 *
 * ── THE RUNTIME HALF AND THE GUARD HALF MUST NOT SHARE A ROOF ───────────────
 *
 * `guards/lexicon.ts` SPELLS EVERY BANNED WORD. It is a module that would fail
 * the very release grep it defines if it ever reached a bundle, which is why
 * both existing hosts keep their copy under `src/testing/` and assert that
 * nothing shipped imports that directory. Vendoring the whole kit into
 * `src/add-ons/` would put the word list one ordinary import away from a screen,
 * and the failure would be a red release rather than a red test.
 *
 * So the install splits it:
 *
 *   `src/add-ons/kit/`   the runtime half — `AddOnSlot`, `slot-content`,
 *                        `styles`, `config`. Compiled into the bundle.
 *   `src/testing/kit/`   the guard half. Imported only by the host's suites,
 *                        and `guards/brand.ts` fails any shipped file that
 *                        reaches into it.
 *
 * The host's own `host-kit.config.ts` is NEITHER: it is host-owned, written by
 * hand once, and never synced. It lives at `src/add-ons/host-kit.config.ts`
 * because the runtime half imports it and the guard half imports it, and a
 * file two things import belongs beside the one that ships.
 */
export const INSTALL_LAYOUT = {
  /** Relative to `srcDir`. The runtime half. */
  runtime: 'add-ons/kit',
  /** Relative to `srcDir`. The guard half, which must never ship. */
  guards: 'testing/kit',
  /** Relative to `srcDir`. Host-owned, hand-written, never synced. */
  config: 'add-ons/host-kit.config.ts',
} as const;
