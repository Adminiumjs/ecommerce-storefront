/*
 * INSTALLED from add-ons/packages/host-kit/guards/tier.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * WHICH GUARDS THIS HOST IS ACTUALLY RUNNING — recorded, and held to.
 *
 * ── THE RATCHET, AND WHAT IT IS AGAINST ─────────────────────────────────────
 *
 * Seven of the eleven guards need nothing but `node:fs` and a TypeScript
 * parser. The other four need a DOM, because the defects they close are defects
 * about PAINT and about what React actually called: `:empty` is not "drew
 * nothing", and a mount inside a JSX comment satisfies a grep.
 *
 * A host installing the kit will therefore take the seven, ship, and mean to
 * come back for the four. Nothing in that sentence is unreasonable and nothing
 * in it is a plan — it is how the seam came to exist in two repos with eight
 * measured differences between them. So a host DECLARES which tier it
 * installed, and this guard holds it to the declaration and PRINTS THE COST of
 * the one it did not take, by name, on every single run.
 *
 * A host may sit at tier 1. It may not sit there quietly. That is the whole
 * ratchet, and it is the only mechanism in this package aimed at a person
 * rather than at a defect.
 *
 * ── SEVEN AND FOUR, NOT SIX AND FIVE ────────────────────────────────────────
 *
 * `config.ts`'s header on `HostKitTier` says "six of the eleven" need no DOM
 * and "the other five" do. The enumeration below is SEVEN and FOUR, and the
 * disagreement is worth naming rather than quietly reconciling: that prose was
 * written before the guard set settled, and `label-pairing` is the piece that
 * moves — it is ONE file with TWO halves, a source sweep that needs no DOM and
 * a rendered walk that does. Counted as one guard it lands in tier 2 and the
 * split is six and five; counted as its two halves, which is how it is actually
 * installed and actually run, it is seven and four.
 *
 * THE NAMES BELOW ARE AUTHORITATIVE AND THE COUNTS IN ANY PROSE ARE NOT. That
 * is the same rule this package applies to every other assertion — a count is a
 * number fitted to whichever repo its author had open, and `expect(ALL)
 * .toHaveLength(7)` turned "register one more add-on" into a red suite on a
 * faultless live app. Nothing here counts anything.
 *
 * ── AND ADDING `jsdom` DOES NOT BREACH 25 D11 ───────────────────────────────
 *
 * That rule says an add-on ships no RUNTIME dependency its host lacks — it is
 * about what reaches a browser. A `devDependencies` entry used by `vitest run`
 * reaches no bundle, and both hosts that already have the seam have carried
 * `jsdom` since wave 4b with no change to what they ship. Anybody about to
 * "fix" this by deleting it should read this paragraph first.
 *
 * ── THE DOM DRIVER IS NOT `@testing-library/react`, MEASURED ────────────────
 *
 * The ruling that produced this file names jsdom and `@testing-library/react`
 * as tier 2's dependencies. Measured on 2026-08-28 across all four candidate
 * hosts: `people-ops` and `clinic-desk` have NEITHER, which is what puts them
 * at tier 1 — and `print-shop` and `maker-shop`, the two repos that already
 * carry the whole seam and every tier-2 suite in it, have `jsdom` and DO NOT
 * HAVE `@testing-library/react` EITHER. They drive React through
 * `react-dom/client` and `act`, which is a runtime dependency every one of the
 * fifteen apps already has.
 *
 * So requiring `@testing-library/react` by name would fail the two hosts that
 * are furthest ahead, on their first run, for a dependency that would add
 * nothing they do not already do. A gate that is red on arrival earns an
 * exemption list, and an exemption list is where nine of wave 4b's holes came
 * from. What tier 2 actually needs is a DOM and something that drives React
 * into it; either library satisfies that, and `TIER_2_DEPENDENCIES` says so.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { HostFacts } from '../../add-ons/kit/config.ts';
import { codeOf, ownShippedFiles, suiteFiles } from './files.ts';

/**
 * One guard, named by the SYMBOL a host's suite has to mention to be running it.
 *
 * A symbol rather than a file, because what is being asked is "did this host
 * wire the guard up", and a host that vendored the file and called nothing has
 * a directory rather than a gate.
 */
export interface GuardEntry {
  /** The exported symbol a host's suite names. */
  symbol: string;
  /** What it is, in the words a reader would use. */
  what: string;
  /** THE DEFECT IT CLOSES — printed by name whenever it is not running. */
  closes: string;
}

/** The seven that need no DOM. Every host runs all of these. */
export const TIER_1_GUARDS: readonly GuardEntry[] = [
  {
    symbol: 'lexiconGuard',
    what: 'the vocabulary ban over the message bundle, scoped by 31 D4',
    closes:
      'a retrofit putting `free`, `plan`, `tier`, `billing`, `upgrade`, `premium` or a ' +
      'seven-language spelling of the same idea onto a screen',
  },
  {
    symbol: 'brandGuard',
    what: 'the company-name grep over host source, line by line',
    closes:
      'a real firm named in the host’s own copy for an integration that does not exist ' +
      '(24 AC5) — and shipped code reaching the guard half, which spells every banned word',
  },
  {
    symbol: 'labelPairingSourceGuard',
    what: 'the source sweep half of the affiliation rule',
    closes:
      'a surface nobody thought of printing an add-on’s name with no not-affiliated ' +
      'line (24 AC6) — the half that covers a screen no tour visits',
  },
  {
    symbol: 'payloadCastsGuard',
    what: 'the AST ban on type assertions inside a slot payload',
    closes:
      '`as never` at a mount site, which switches off the one contract that makes an ' +
      'add-on portable and leaves tsc and every suite completely green',
  },
  {
    symbol: 'factsGuard',
    what: 'the eager glob over each vendored add-on’s `add-on-facts.ts`',
    closes:
      'a host-local list of an add-on’s facts — five have been caught — which fails ' +
      'loudly on a portable add-on and SILENTLY on the next credentialled one',
  },
  {
    symbol: 'vendoredGuard',
    what: 'the sync header, self-containment and one-contract checks',
    closes:
      'a rewrite that fired zero times (a `sed -E` backreference matches nothing on ' +
      'BSD) leaving a tree of unresolvable imports the sync’s own status reports green',
  },
  {
    symbol: 'stylesGuard',
    what: 'the two-condition rule pair in the host’s stylesheet',
    closes:
      'a half-copied or one-condition cascade rule, which no DOM assertion can see ' +
      'because jsdom applies no stylesheet — connecting an add-on takes a picture away',
  },
];

/**
 * The four that need a DOM.
 *
 * Two of them are guards this package exports. The other two are SUITES the
 * host writes against the runtime half, because what they assert is behaviour
 * of the host's own component instance — `createAddOnSlot` is a factory and
 * every host binds it to its own registry, so there is no single component
 * here to hand a guard. What this package can check is that the host's suites
 * NAME the symbols, which is as close as a file scan gets to "this is being
 * driven".
 */
export const TIER_2_GUARDS: readonly GuardEntry[] = [
  {
    symbol: 'drewSomething',
    what: 'the slot-content rule: did the fill actually paint anything',
    closes:
      'a fill that returns a bare wrapper, or one whose only child is `display: none`. ' +
      'It is not `:empty`, and treating the two as one puts an empty box on a real screen',
  },
  {
    symbol: 'createAddOnSlot',
    what: 'the mount component’s own render behaviours, driven',
    closes:
      'the host’s own content vanishing when a fill draws nothing, and doubling up when ' +
      'it draws — neither of which is visible without rendering the component',
  },
  {
    symbol: 'labelPairingRenderedGuard',
    what: 'the rendered half of the affiliation rule, text node by text node',
    closes:
      'a company named on an add-on’s own surface with the line one press further in — ' +
      'and the `textContent` version of the same walk, which ran "DHL" and the shop’s ' +
      'name together into one word and reported nothing on 31 surfaces',
  },
  {
    symbol: 'mountsGuard',
    what: 'every hosted slot proved mounted by rendering, with a recording spy',
    closes:
      'a slot declared hosted and drawn by nothing. A mount inside a JSX comment ' +
      'satisfies a grep, which is how one host shipped `nav.add-on.routes` with a real ' +
      'fill and no screen',
  },
];

/** What tier 2 needs on disk, and the ways a host may satisfy it. */
export const TIER_2_DEPENDENCIES = {
  /** No alternative: a DOM is what the four guards are for. */
  dom: ['jsdom', 'happy-dom'] as const,
  /**
   * Something that drives React into that DOM. `react-dom` is what both
   * existing seam hosts use and what all fifteen apps already depend on; see
   * this file's header for why naming only `@testing-library/react` would fail
   * the two hosts furthest ahead.
   */
  driver: ['@testing-library/react', 'react-dom'] as const,
} as const;

/** Every dependency a host declares, whatever section it is in. */
export function declaredDependencies(rootDir: string): Set<string> {
  const path = join(rootDir, 'package.json');
  if (!existsSync(path)) return new Set();
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]);
}

/** Which of these symbols no suite in the host mentions. */
export function guardsNotWired(config: HostFacts, guards: readonly GuardEntry[]): GuardEntry[] {
  const suites = suiteFiles(config).map((file) => codeOf(file));
  return guards.filter((guard) => !suites.some((code) => code.includes(guard.symbol)));
}

/** DECLARE THE TIER SUITE for one host (31-T04). */
export function tierGuard(config: HostFacts): void {
  describe(`${config.appKey} · the guards this host installed (31-T04)`, () => {
    const declared = declaredDependencies(config.rootDir);
    const hasDom = TIER_2_DEPENDENCIES.dom.some((name) => declared.has(name));
    const hasDriver = TIER_2_DEPENDENCIES.driver.some((name) => declared.has(name));

    it('says which tier it is at, and what that costs, on every run', () => {
      const notRunning = config.tier === 2 ? [] : TIER_2_GUARDS;
      // eslint-disable-next-line no-console
      console.log(
        [
          `host kit — ${config.appKey} declares TIER ${config.tier}`,
          `  a DOM is ${hasDom ? 'available' : 'NOT available'} in this host’s dependencies`,
          ...(notRunning.length === 0
            ? ['  every guard in the kit is running']
            : [
                `  ${notRunning.length} guard(s) are NOT running here, and each one closes a`,
                '  defect that has actually shipped:',
                ...notRunning.flatMap((guard) => [
                  `    ${guard.symbol} — ${guard.what}`,
                  `      leaves open: ${guard.closes}`,
                ]),
              ]),
        ].join('\n'),
      );
      expect([1, 2]).toContain(config.tier);
    });

    it('has suites to look at', () => {
      /*
       * THE GUARD ON THE GUARD, and it matters more here than anywhere: every
       * case below asks whether a SUITE mentions a symbol, and a host whose
       * `srcDir` is wrong has no suites, so every guard reads as unwired — or,
       * worse, a future edit inverts one of these and every guard reads as
       * wired. Either way the answer is about the walk and not the host.
       */
      expect(
        suiteFiles(config).length,
        `no .test.ts or .test.tsx found under ${config.srcDir}`,
      ).toBeGreaterThan(0);
    });

    it('wires every guard that needs no DOM, whatever tier it declared', () => {
      const missing = guardsNotWired(config, TIER_1_GUARDS);
      expect(
        missing.map((guard) => `${guard.symbol} — ${guard.what}`),
        '\nThese guards need nothing but node:fs and a TypeScript parser, and no suite in ' +
          'this host calls them. Vendoring the files and calling nothing is a directory, ' +
          'not a gate:\n' +
          missing.map((guard) => `${guard.symbol}\n  leaves open: ${guard.closes}`).join('\n') +
          '\n',
      ).toEqual([]);
    });

    it('does not declare tier 1 while a DOM is sitting right there', () => {
      /*
       * NO EXEMPTION FIELD, and that is deliberate. A host with a DOM available
       * and four guards switched off is leaving them off for no reason anybody
       * wrote down. The fix is one word in the config or one line out of
       * `package.json`, and both are a decision a reader can see in a diff.
       */
      const contradiction = config.tier === 1 && hasDom;
      expect(
        contradiction,
        'this host declares tier 1 and already has a DOM in its dependencies. Either ' +
          'declare tier 2 and wire the four guards, or take the dependency out — there ' +
          'is deliberately no third option',
      ).toBe(false);
    });

    it('at tier 2, has a DOM and something to drive React into it', () => {
      if (config.tier !== 2) return;
      expect(
        hasDom,
        `tier 2 needs one of ${TIER_2_DEPENDENCIES.dom.join(' or ')} as a devDependency`,
      ).toBe(true);
      expect(
        hasDriver,
        `tier 2 needs one of ${TIER_2_DEPENDENCIES.driver.join(' or ')} — both existing ` +
          'seam hosts use react-dom/client with act, which every app already has',
      ).toBe(true);
    });

    it('at tier 2, wires all four of the guards that need one', () => {
      if (config.tier !== 2) return;
      const missing = guardsNotWired(config, TIER_2_GUARDS);
      expect(
        missing.map((guard) => `${guard.symbol} — ${guard.what}`),
        '\nThis host declares tier 2 and no suite of its own names these:\n' +
          missing.map((guard) => `${guard.symbol}\n  leaves open: ${guard.closes}`).join('\n') +
          '\n',
      ).toEqual([]);
    });

    it('installs the payload-cast guard at the same moment as the component', () => {
      /*
       * THE ONE COUPLING THIS PACKAGE ENFORCES, and `payload-casts.ts` explains
       * why at length: the payload contract's entire value is that a wrong
       * shape is a compile error, and a cast is how a compile error is turned
       * off one line at a time. A host that has the component and not the guard
       * has a contract with a hatch in it.
       *
       * Stated over the SOURCES rather than over the config, so a host that
       * mounts the component without declaring anything is still caught.
       */
      if (!componentIsMounted(config)) return;
      const wanted = TIER_1_GUARDS.filter((guard) => guard.symbol === 'payloadCastsGuard');
      expect(
        guardsNotWired(config, wanted).map((guard) => guard.symbol),
        'this host mounts <AddOnSlot> and no suite calls payloadCastsGuard. One ' +
          '`as never` at a mount site defeats the whole payload contract with tsc clean ' +
          'and every other suite green',
      ).toEqual([]);
    });
  });
}

/**
 * Does anything in this host mount the component?
 *
 * DELIBERATELY A GREP, AND DELIBERATELY WEAK, which is the opposite of what
 * `mounts.ts` insists on two files away — so the difference is worth stating.
 * There, the question IS the rule and a mount inside a comment is the defect.
 * Here it is a PRECONDITION for demanding a guard: a comment that mentions the
 * component makes this ask for `payloadCastsGuard` in one host that did not
 * strictly need it yet, which costs one line of a test file. Getting it wrong
 * the other way costs the payload contract.
 *
 * Both the shipped sources and the suites are read, because a host may mount
 * the component only in a screen or only in a fixture, and either is a host
 * with a payload to protect.
 */
export function componentIsMounted(config: HostFacts): boolean {
  const mentions = /<AddOnSlot[\s/>]/;
  return [...ownShippedFiles(config), ...suiteFiles(config)].some((file) =>
    mentions.test(codeOf(file)),
  );
}
