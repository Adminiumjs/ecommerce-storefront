/*
 * INSTALLED from add-ons/packages/host-kit/guards/facts.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * WHAT THE ADD-ONS THIS HOST VENDORS DECLARE ABOUT THEMSELVES — discovered,
 * never listed.
 *
 * ── THE DEFECT, WHICH THIS REPO HAS NOW FOUND FIVE TIMES ────────────────────
 *
 * A host runs release gates over the code it ships, and several of those gates
 * need to know things that are true of an ADD-ON: which addresses it names and
 * cannot call, which of its strings must never reach a browser, which company
 * marks its copy uses. Every one of those started life as a hand-written list
 * INSIDE THE HOST, and every one of them failed the same way twice over.
 *
 * IT FAILED LOUDLY IN ONE DIRECTION. Vendoring a portable add-on into a host,
 * registration alone, turned that host's egress gate red on an address it had
 * never heard of; making the add-on pass required editing a list in the app
 * RECEIVING it. A host that must be edited before a portable add-on passes its
 * gates makes 24 D21 false by a route nobody would look down.
 *
 * AND SILENTLY IN THE OTHER, WHICH IS WORSE. A host's "no credential reached
 * the browser" gate was a list of the two add-ons that happened to exist when
 * it was written. A THIRD credentialled add-on, vendored into either shop,
 * would have shipped its secret setting keys and its real endpoint with that
 * gate FULLY GREEN — a grep cannot look for a needle nobody told it about, and
 * nothing anywhere would have gone red to say so. The two hosts' copies had
 * already drifted apart by one entry, with one of them still commenting on "the
 * last two" of a list that had one.
 *
 * FIVE HOST-LOCAL LISTS HAVE BEEN CAUGHT HOLDING AN ADD-ON'S FACTS: the hosted
 * slot registry, a Czech "pro" carve-out, a set of ar-EG numeral allowances,
 * the inert-origin list and the never-in-a-browser needles. Two of those are
 * fixed by `config.ts` refusing to parameterise the word lists at all; the
 * other three are fixed here.
 *
 * ── SO THE FACTS TRAVEL WITH THE ADD-ON, AND THE HOST DISCOVERS THEM ────────
 *
 * Every add-on exports `INERT_ORIGINS`, `NEVER_IN_A_BROWSER` and
 * `COMPANY_MARKS` from its own `add-on-facts.ts`; the sync vendors that file
 * like any other; and this module globs whatever THIS host has vendored.
 * Vendor an add-on and its declarations arrive. Drop it and they leave. Nothing
 * in the host changes either way, which is the only version of this that
 * survives a twelfth host.
 *
 * ── WHY A GLOB LITERAL, AND WHY IT CAN BE ONE ───────────────────────────────
 *
 * `import.meta.glob` is resolved by the bundler from a STRING LITERAL: it
 * cannot take a variable, so a discovery keyed to `config.vendorDir` is not
 * available at any price. That looks like a problem for a package whose whole
 * premise is that host paths are configurable, and it is not — because
 * `INSTALL_LAYOUT` fixes BOTH ends of this particular path. The guard half
 * lands at `src/testing/kit/`, the vendored add-ons at `src/add-ons/vendor/`,
 * and the relative path between them is therefore a constant that every host
 * shares. That is a second reason the install layout is worth being strict
 * about, and it is recorded here because it is not visible from `config.ts`.
 *
 * IT IS ALSO THE ONE PATH IN THIS PACKAGE NOTHING REWRITES. Every other
 * cross-half import is fixed up by the install script; this one is a literal a
 * bundler reads, so it has to be written for the INSTALLED layout rather than
 * for this repository's, and getting it wrong is invisible here. See
 * `VENDORED_FACTS` below for the level it was wrong by and for how long.
 *
 * By the time this runs, the glob is a static list of modules: no filesystem
 * read, no dynamic import, and nothing that behaves differently under vitest
 * than under vite.
 *
 * IN THIS PACKAGE'S OWN CHECKOUT THE GLOB MATCHES NOTHING, which is correct and
 * is why the pure half is separated out. `factsFrom` takes a module map and
 * `facts.test.ts` drives it over a synthetic one; the glob is one line, and the
 * thing that proves the glob is a host's own run of `factsGuard`, whose first
 * case is that it found something at all.
 */

import { describe, expect, it } from 'vitest';

import type { HostFacts } from '../../add-ons/kit/config.ts';

/** An address an add-on names, and why it cannot cause a request. */
export interface InertOrigin {
  origin: string;
  why: string;
}

/** A string of an add-on's that must never appear in a client bundle. */
export interface ServerOnlyNeedle {
  text: string;
  why: string;
}

/** A company's mark, as an add-on's own copy spells it. */
export interface CompanyMark {
  mark: string;
  owner: string;
}

/** What one vendored `add-on-facts.ts` exports. Every field optional: see below. */
export interface AddOnFactsModule {
  INERT_ORIGINS?: readonly InertOrigin[];
  NEVER_IN_A_BROWSER?: readonly ServerOnlyNeedle[];
  COMPANY_MARKS?: readonly CompanyMark[];
}

/**
 * THE DISCOVERY. One literal, fixed by `INSTALL_LAYOUT`; see this file's header.
 *
 * Written as `../../add-ons/vendor/…` because this module is installed FLAT at
 * `<srcDir>/testing/kit/facts.ts` — `INSTALL_LAYOUT.guards` is `testing/kit`
 * and the install script copies `src/guards/*` into it without keeping the
 * `guards/` segment — and the add-ons land at `<srcDir>/add-ons/vendor/`. Two
 * levels up is `<srcDir>`, which is the same arithmetic the install's own
 * `HOST_PKG_FROM_GUARDS` rewrite does when it points these files at
 * `../../add-ons/vendor/host`.
 *
 * IT SAID `../../../` UNTIL THE FIRST RETROFIT RAN IT. Three levels reaches the
 * host's checkout ROOT, so the glob matched nothing in `factory-ops` and
 * `discoveredFacts()` came back with no marks, no needles and no origins — the
 * blind-gate state this whole module exists to end, arriving through the module
 * that ends it. Nothing else in the kit could have caught it: the path is a
 * string literal a bundler resolves, so `tsc` has no opinion, and the two
 * hosts that already carried the seam by hand never ran this file. What DID
 * catch it is `factsGuard`'s first case, which fails when the discovery is
 * empty — the guard on the guard, earning its keep on its first outing.
 *
 * In this package's own repository it still matches nothing and evaluates to
 * `{}`, which is the state `factsGuard` fails on and `factsFrom` is written to
 * be testable without.
 */
export const VENDORED_FACTS: Record<string, AddOnFactsModule> = import.meta.glob<AddOnFactsModule>(
  '../../add-ons/vendor/*/add-on-facts.ts',
  { eager: true },
);

/** Everything the vendored add-ons declare, flattened, with their sources kept. */
export interface DiscoveredFacts {
  /** The module paths the glob matched. Empty means the discovery is broken. */
  sources: readonly string[];
  origins: readonly InertOrigin[];
  needles: readonly ServerOnlyNeedle[];
  marks: readonly CompanyMark[];
  /** Modules that matched the glob and exported nothing at all under a name. */
  silent: readonly { source: string; missing: readonly string[] }[];
}

/**
 * Flatten a module map into the four lists the other guards read.
 *
 * `silent` is not a convenience — it is the whole reason this returns a record
 * rather than three arrays. A vendored package that exported NOTHING would
 * contribute nothing and read exactly like a package with nothing to declare,
 * so a renamed export or a sync that dropped a line leaves a host quietly
 * allowing no origin, looking for no needle and knowing no mark. That is the
 * silent failure this whole mechanism was built to end, arriving by a new door.
 */
export function factsFrom(modules: Readonly<Record<string, AddOnFactsModule>>): DiscoveredFacts {
  const entries = Object.entries(modules);
  return {
    sources: entries.map(([source]) => source),
    origins: entries.flatMap(([, module]) => [...(module.INERT_ORIGINS ?? [])]),
    needles: entries.flatMap(([, module]) => [...(module.NEVER_IN_A_BROWSER ?? [])]),
    marks: entries.flatMap(([, module]) => [...(module.COMPANY_MARKS ?? [])]),
    silent: entries
      .map(([source, module]) => ({
        source,
        missing: (
          [
            ['INERT_ORIGINS', module.INERT_ORIGINS],
            ['NEVER_IN_A_BROWSER', module.NEVER_IN_A_BROWSER],
            ['COMPANY_MARKS', module.COMPANY_MARKS],
          ] as const
        )
          .filter(([, value]) => value === undefined)
          .map(([name]) => name),
      }))
      .filter((entry) => entry.missing.length > 0),
  };
}

/** What the other guards call to get this host's discovered facts. */
export const discoveredFacts = (): DiscoveredFacts => factsFrom(VENDORED_FACTS);

export interface FactsGuardOptions {
  /**
   * A DIFFERENT GLOB'S RESULT, never a hand-written list.
   *
   * It exists for a host whose vendor directory genuinely sits somewhere
   * `INSTALL_LAYOUT` does not describe, and for this package's own suite. What
   * it must never be handed is an object literal enumerating add-ons: that is
   * the host-local list this entire file exists to abolish, wearing an
   * argument's clothes. The guard cannot tell the difference and does not try —
   * what it can do is fail on a discovery that found nothing, which is the
   * failure mode that actually bites.
   */
  modules?: Readonly<Record<string, AddOnFactsModule>>;
}

/** DECLARE THE DISCOVERY SUITE for one host (24 AC20, D21). */
export function factsGuard(config: HostFacts, options: FactsGuardOptions = {}): void {
  describe(`${config.appKey} · an add-on brings its own facts with it (24 AC20, D21)`, () => {
    const facts = factsFrom(options.modules ?? VENDORED_FACTS);

    it('reads a declaration off every add-on this host vendors', () => {
      /*
       * THE GUARD ON THE GUARD, and the one every other guard in this package
       * leans on. A glob that stopped matching leaves the egress net allowing
       * no origin, the credential grep looking for no needle and the
       * label-pairing walk with no mark to find — three gates green, all three
       * blind, none of them saying so.
       */
      expect(
        facts.sources.length,
        `no vendored add-on-facts module was found for ${config.appKey}. The glob in ` +
          'guards/facts.ts is fixed by INSTALL_LAYOUT; if this host puts its vendored ' +
          'add-ons somewhere else, pass a different GLOB — never a list',
      ).toBeGreaterThan(0);
      expect(
        facts.silent.map((entry) => `${entry.source} — missing ${entry.missing.join(', ')}`),
        'these vendored packages export no add-on facts under one or more names',
      ).toEqual([]);
    });

    it('says why, for every origin it allows', () => {
      /*
       * An origin allowed with no reason a reviewer can read is an origin
       * nobody decided on. Thirty characters is not a quality bar — it is the
       * length below which nobody has written a sentence.
       */
      const unexplained = facts.origins
        .filter((entry) => entry.why.trim().length <= 30)
        .map((entry) => entry.origin);
      expect(unexplained, 'these origins are allowed with no reason a reviewer can read').toEqual(
        [],
      );
    });

    it('says why, for every string it keeps out of the browser', () => {
      const unexplained = facts.needles
        .filter((entry) => entry.why.trim().length <= 30)
        .map((entry) => entry.text);
      expect(unexplained).toEqual([]);
    });

    it('declares a mark and its owner, or declares no mark', () => {
      /*
       * An add-on that names no company declares an EMPTY list, which costs
       * nothing downstream: there is no word to look for. What is not allowed
       * is a mark of one letter or an owner nobody named — the first makes the
       * label-pairing walk report every screen in the app, the second makes its
       * finding unreadable, and both end with the gate switched off.
       */
      const malformed = facts.marks
        .filter((entry) => entry.mark.trim().length <= 1 || entry.owner.trim().length <= 1)
        .map((entry) => `${entry.mark} / ${entry.owner}`);
      expect(malformed).toEqual([]);
    });

    it('prints what it found, so the discovery is read rather than trusted', () => {
      // eslint-disable-next-line no-console
      console.log(
        [
          `add-on facts discovered by ${config.appKey}:`,
          ...facts.sources.map((source) => `  ${source}`),
          `  inert origins: ${facts.origins.length}`,
          `  server-only strings: ${facts.needles.length}`,
          `  company marks: ${facts.marks.map((m) => m.mark).join(', ') || '(none)'}`,
        ].join('\n'),
      );
      expect(facts.sources.length).toBeGreaterThan(0);
    });
  });
}
