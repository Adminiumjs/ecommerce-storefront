/*
 * INSTALLED from add-ons/packages/host-kit/guards/mounts.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * EVERY SLOT THIS HOST SAYS IT MOUNTS IS REALLY MOUNTED — proved by rendering.
 *
 * ── WHY IT IS NOT A GREP, WITH THE DEFECT THAT SETTLED IT ───────────────────
 *
 * The rule started life as a SEARCH OVER THE SOURCES for `slot="…"`. It was
 * written for a real defect: `nav.add-on.routes` sat in one host's
 * `HOSTED_SLOTS` for a release, an add-on shipped a fill for it, and no screen
 * ever drew it — the host switched views off one store field and had no router
 * at all. The add-on's whole page existed, was registered, was enabled, and was
 * on nobody's screen.
 *
 * AND THE GREP COULD NOT HAVE CAUGHT IT, because a mount inside a comment is
 * text that matches. So is a mount behind a condition that is never true, and
 * so is a mount in a file nothing renders. A verifier proved that with a mutant
 * in one of the two hosts; the same hole was open in the other.
 *
 * A slot is recorded here only when REACT CALLS THE COMPONENT. That is the
 * whole difference, and it is not a refinement of the grep — it is a different
 * question. The grep asks "does this string appear in the repository"; this
 * asks "did a person looking at this app see a place for a fill to go".
 *
 * ── AND THE ASSERTION THAT USED TO SIT BESIDE IT AND WAS ACTIVELY WRONG ─────
 *
 * The same suite also asserted the OPPOSITE direction — that `HOSTED_SLOTS`
 * contains every fill of every registered add-on — which forbids the thing
 * 24 D21 claims. One add-on declares six fills; one host mounts five slots,
 * five of which that add-on does not fill. Registering a perfectly good
 * portable add-on there would have turned a LIVE app's suite red while the app
 * itself ran faultlessly, and the only way to keep it green would have been to
 * stop the add-on being portable.
 *
 * A fill for a slot the host does not mount simply does not render, AND THAT IS
 * PORTABILITY. Nothing in this file asserts anything about which slots an
 * add-on fills, and nothing ever should.
 *
 * ── THE THIRD THING, WHICH IS THE MIS-IMPORT ────────────────────────────────
 *
 * `vendor/host/slots.ts` exports the CLOSED REGISTRY under the name
 * `HOSTED_SLOTS`, which is the same identifier a host uses for the five or nine
 * it actually mounts. Importing the wrong one silently WIDENS every slot check
 * in this package — the mounts guard would demand mounts for twelve ids, the
 * empty-behaviour table would need twelve rows, and the payload generic would
 * accept ids the host never draws. `config.ts` promises this guard names that
 * mistake, and it does, below.
 */

import { HOSTED_SLOTS, type SlotId } from '../../add-ons/vendor/host/index.ts';
import { describe, expect, it } from 'vitest';

import type { HostKitConfig } from '../../add-ons/kit/config.ts';

/**
 * ONE MOUNT, AS THE RECORDING SPY SAW IT.
 *
 * `fallback` is `unknown` rather than `ReactNode` on purpose: this module is
 * imported by tier-1 hosts through the barrel, and a `ReactNode` in its
 * signature would drag React's types into a package two of the wave-6 hosts
 * compile without. What the empty-state RULES need is elsewhere; what this
 * needs is to know whether the host handed one over at all.
 */
export interface SlotMountRecord {
  slot: string;
  fallback?: unknown;
}

/**
 * WHAT THE MOUNTS GUARD NEEDS FROM A HOST.
 *
 * The recording has to be set up in the HOST's own test file, not here, and the
 * reason is mechanical rather than stylistic: `vi.mock` is hoisted above every
 * import in the file that calls it, so a mock installed from inside a function
 * this package exports would be installed too late to replace anything. What
 * this package can own is the QUESTIONS; the host owns the wiring, which is
 * about six lines and is in the README.
 */
export interface MountFixtures {
  /** Empty the recorder. Called before each pass so a leak cannot pass for a mount. */
  reset(): void;
  /**
   * Render every surface this app has, in both states a reviewer can be in —
   * nothing connected, then everything.
   *
   * BOTH STATES, because a slot can legitimately live somewhere only reachable
   * once something is switched on: a manage drawer has no add-on in it until an
   * add-on is connected, and a host that never draws it is right not to. A
   * single-pass fixture would demand a mount the app is correct to withhold.
   */
  renderEverySurface(): void | Promise<void>;
  /** What the spy recorded, in call order. */
  recorded(): readonly SlotMountRecord[];
}

/**
 * EVERY WAY A HOST'S SLOT DECLARATION AND ITS SCREENS CAN DISAGREE.
 *
 * A pure function over the config and what the spy recorded, so this package's
 * own suite can drive it over planted disagreements — a guard nothing has ever
 * seen fail is a guard nobody knows works, and the factory below is all
 * assertions and cannot be caught failing from inside vitest.
 */
export interface MountProblems {
  /** Ids in `hostedSlots` that the closed registry does not have. */
  unknownIds: string[];
  /** `hostedSlots` is set-equal to the registry — almost certainly a mis-import. */
  isWholeRegistry: boolean;
  /** A slot with an empty-behaviour row and no place in `hostedSlots`. */
  orphanBehaviours: string[];
  /** A slot in `hostedSlots` with no empty-behaviour row. */
  undecidedBehaviours: string[];
  /** Declared hosted, and no screen drew one. */
  neverMounted: string[];
  /** Drawn, and never declared — so nothing decided what it shows when empty. */
  undeclared: string[];
}

export function mountProblems<S extends SlotId>(
  config: HostKitConfig<S>,
  recorded: readonly SlotMountRecord[],
): MountProblems {
  const declared = [...config.hostedSlots] as string[];
  const registry = HOSTED_SLOTS as readonly string[];
  const mounted = [...new Set(recorded.map((m) => m.slot))];
  const decided = Object.keys(config.slotEmptyBehaviour);
  return {
    unknownIds: declared.filter((slot) => !registry.includes(slot)),
    isWholeRegistry:
      declared.length === registry.length && declared.every((slot) => registry.includes(slot)),
    orphanBehaviours: decided.filter((slot) => !declared.includes(slot)),
    undecidedBehaviours: declared.filter((slot) => !decided.includes(slot)),
    neverMounted: declared.filter((slot) => !mounted.includes(slot)),
    undeclared: mounted.filter((slot) => !declared.includes(slot)),
  };
}

/** DECLARE THE MOUNT SUITE for one host (24 §5.4, D6, D21). */
export function mountsGuard<S extends SlotId>(
  config: HostKitConfig<S>,
  fixtures: MountFixtures,
): void {
  describe(`${config.appKey} · every slot it hosts is really mounted (24 §5.4)`, () => {
    it('names only slots the closed registry has', () => {
      expect(
        mountProblems(config, []).unknownIds,
        'these ids are in this host’s `hostedSlots` and not in the closed registry. ' +
          'A slot id names a SURFACE and the registry is closed: an id nobody bought ' +
          'is an id no add-on can fill',
      ).toEqual([]);
    });

    it('holds its OWN list and not the registry it was imported from', () => {
      /*
       * THE MIS-IMPORT, NAMED. `vendor/host/slots.ts` exports the registry
       * under the same identifier a host uses for its own list, and importing
       * the wrong one is a silent widening of everything downstream rather than
       * an error anywhere.
       *
       * The check is set EQUALITY with the registry, not a count. It is safe
       * today because the registry deliberately carries ids NO example app
       * mounts — `record.editor.panel`, whose host is Adminium's generated
       * dashboard, and `record.actions`, which ships unfilled — so a host
       * claiming all twelve has imported the wrong constant rather than built
       * an extraordinary app.
       *
       * WHAT WOULD CHANGE THIS: a host that genuinely mounts every id in the
       * registry. It does not exist and cannot until those two ids have an
       * example-app home, and when one does, this case is the thing to delete
       * rather than to widen — the mis-import would then need catching by
       * identity at the import site instead.
       */
      expect(
        mountProblems(config, []).isWholeRegistry,
        'this host’s `hostedSlots` is the whole closed registry. That is almost certainly ' +
          '`import { HOSTED_SLOTS } from …/vendor/host/slots.ts` where the host’s own list ' +
          'was meant — see config.ts on `hostedSlots`',
      ).toBe(false);
    });

    it('decides an empty behaviour for every slot it mounts, and for no other', () => {
      /*
       * TOTAL BY TYPE ALREADY, and this is the half a type cannot see: the
       * table is `Record<S, …>` so a MISSING row is a compile error, and an
       * EXTRA row — a slot the host stopped mounting, whose behaviour nobody
       * deleted — is not. An orphan row is a decision about a screen that no
       * longer exists, and it reads as coverage.
       */
      const problems = mountProblems(config, []);
      expect({
        rows: problems.orphanBehaviours,
        slots: problems.undecidedBehaviours,
      }).toEqual({ rows: [], slots: [] });
    });

    it('reaches every one of them by rendering, in both states', async () => {
      fixtures.reset();
      await fixtures.renderEverySurface();
      const recorded = fixtures.recorded();

      /*
       * THE GUARD ON THE GUARD. A fixture whose spy stopped recording — a mock
       * pointed at a moved file, a render that threw and was swallowed — would
       * produce an empty list, and "nothing was mounted" and "nothing was
       * looked at" are the same value.
       */
      expect(
        recorded.length,
        'the recorder saw no mount at all. Either nothing rendered, or the spy is not ' +
          'replacing the component the screens actually import',
      ).toBeGreaterThan(0);

      const missing = mountProblems(config, recorded).neverMounted;
      expect(
        missing,
        '\nThese slots are in this host’s `hostedSlots` and no screen drew one. A mount ' +
          'inside a JSX comment, behind a condition that is never true, or in a file ' +
          'nothing renders satisfies a grep and records nothing here — which is exactly ' +
          'how one host shipped a hosted `nav.add-on.routes` with a real fill and no ' +
          'screen:\n' +
          missing.join('\n') +
          '\n',
      ).toEqual([]);
    });

    it('draws no slot it did not declare it hosts', async () => {
      /*
       * The other direction, and it is not symmetry for its own sake: a screen
       * mounting an id absent from `hostedSlots` has no empty-behaviour
       * decision, no payload type narrowed to it, and no guard watching it. It
       * is a surface outside the seam that looks like part of it.
       */
      fixtures.reset();
      await fixtures.renderEverySurface();
      expect(
        mountProblems(config, fixtures.recorded()).undeclared,
        'these slots were drawn and are not in `hostedSlots`, so nothing decided what ' +
          'they show when empty',
      ).toEqual([]);
    });
  });
}
