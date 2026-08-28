/*
 * INSTALLED from add-ons/packages/host-kit/src/AddOnSlot.tsx — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The RUNTIME half: this compiles into the bundle.
 */
/**
 * THE ONE PLACE A HOST SURFACE ASKS "IS ANYTHING FILLING THIS?".
 *
 * Screens never reach into the registry themselves. They render `<AddOnSlot>`
 * and hand it what to show when nothing is there — which is how the same
 * component serves both empty-state behaviours (24 D6):
 *
 *   `fallback` given  → the slot SPEAKS: a real, honest empty state in words,
 *                       used where a person has something to be told.
 *   `fallback` absent → the slot is SILENT: it renders nothing at all, used
 *                       where there is nothing to act on.
 *
 * The rule in one line: where an empty slot has something to explain it says it
 * in words; where it has nothing to explain it renders nothing. Which of the two
 * a given slot does is the host's decision, recorded once in its config's
 * `slotEmptyBehaviour` and passed here as the presence or absence of a prop.
 *
 * ── WHY THIS IS A FACTORY AND NOT A COMPONENT ───────────────────────────────
 *
 * [31-T04.] Both hosts declare this as a plain exported component, and both
 * copies reach out of the seam twice on the way: `className="mp-slot-fill"` is a
 * literal, and `useStore` is imported from `../state/store.ts`. Those two lines
 * are the reason the file could only ever be installed by hand-editing it, and a
 * copy that must be edited to be installed is a fork from the first keystroke —
 * the whole diagnosis in `config.ts`'s header, in one 200-line file.
 *
 * So both are arguments now:
 *
 *   THE PREFIX comes from the config, through `selectorsFor`, which is the same
 *   function the guards query with. One field, five places, no silent
 *   disagreement (see `config.ts`).
 *
 *   THE STORE comes in as a hook. It has to: `print-shop` keeps its store at
 *   `src/state/store.ts` and reads three fields off it, and a retrofit target
 *   need not have a `src/state/` at all — two of wave 6's four have no React
 *   test tree, let alone the same module layout. A fixed relative import would
 *   have been the SIXTH host token sprinkled through the copy, and the most
 *   load-bearing one. `UseSlotFills` below is the whole of what this component
 *   needs from a host's state, written down as four lines of type.
 *
 * The alternative was a React context, and it was rejected: a provider adds a
 * mount-site requirement to every host and a second failure mode ("no provider
 * above this slot") that fails at RENDER, on one screen, in one branch. The
 * factory fails at module load or not at all, and a host calls it once.
 *
 * ── "NOTHING FILLS IT" AND "THE FILL HAD NOTHING TO DRAW" ARE TWO THINGS ────
 *
 * [Wave 4b rounds 2, 5 and 6, carried here intact. Round 2 fixed it in one host;
 * round 5 found the other host had never been fixed at all — the drift this kit
 * exists to end.]
 *
 * `fills.length === 0` is only the first of them, and treating it as the whole
 * rule puts an empty box on a real screen.
 *
 * An add-on can register a fill and correctly draw NOTHING for a particular
 * record — an artwork add-on has no preview for a job whose artwork came from
 * somewhere else, and an import tile declines a job it cannot serve. When that
 * happens a fill EXISTS, so the fallback is suppressed, and the fill renders
 * null: the panel goes from showing the host's own words to showing a
 * nought-by-nought div. CONNECTING AN ADD-ON TAKES A PICTURE AWAY.
 *
 * The host cannot know in advance — asking would mean asking an add-on about a
 * record, which is the add-on's business and not a question this seam has. So
 * the fallback is rendered ANYWAY, after the fills, and hidden by one sibling
 * rule pair in the host's own stylesheet, which `styles.ts` generates.
 *
 * ── AND `:empty` WAS NOT THE QUESTION EITHER (round 6) ──────────────────────
 *
 * What stood in this header said "no JavaScript can ask this question and CSS
 * can". Half of that was right — JavaScript cannot ask it at RENDER time, before
 * the fill has run — and the other half was the next defect: `:empty` asks about
 * CHILD NODES, not about paint. A fill returning `<div/>`, or a wrapper whose
 * only child is `display: none`, is not empty and drew nothing, so the fallback
 * went away and the reader got a blank box.
 *
 * THE THREE PARTS ONLY WORK TOGETHER, and this is the sentence a retrofit is
 * most likely to disprove by accident:
 *
 *   1. `slot-content.ts` — the rule that reads the DOM and answers "did it
 *      paint?", with everything it deliberately cannot see written down.
 *   2. `SlotFill` below — the MutationObserver that asks that question after
 *      every mutation and writes the answer onto the wrapper as `data-drew`.
 *   3. `styles.ts` — the TWO-CONDITION rule pair that keys off both `:empty`
 *      and `data-drew`.
 *
 * SHIPPING THE CSS ALONE RE-INTRODUCES THE DEFECT. A host that pastes the rule
 * pair and mounts a component without the observer has a `[data-drew]` that
 * nothing ever writes, so the second negation is always true, so the rule
 * degrades silently to the round-2 version that blanked a real screen. It does
 * not fail; it just stops protecting anything. The styles guard exists because
 * that is invisible from the stylesheet's side.
 *
 * ── AND IT IS TYPED BY THE SLOT, WHICH IS THE POINT ─────────────────────────
 *
 * `AddOnSlot` used to be generic over the PAYLOAD, which meant it accepted
 * whatever a screen felt like passing: `payload={{ job }}` for a slot whose
 * fills read `{ order }` compiled perfectly and threw at runtime, in the second
 * host, on three separate screens. The parameter is the SLOT ID, and `payload`
 * is that id's declared shape minus `settings`.
 *
 * THE ORIGINAL SIN WAS `AddOnFill<never>` and it is worth naming precisely,
 * because the shape of it recurs. `AddOn.fills` was typed
 * `readonly AddOnFill<never>[]`, and `never` erases: every payload is assignable
 * to it, so a fill declaring `render: (p: anything) => …` type-checked, and
 * nothing anywhere compared what a HOST passes with what a FILL reads. `tsc`
 * was green in all three repos. The components threw in the SECOND host — which
 * is the only place the mismatch could show up, and the last place anybody was
 * looking. A retrofit that widens a payload type to make an error go away is
 * re-committing that exact sin: the error was the guarantee.
 *
 * IT ALSO INJECTS EACH FILL'S OWN SETTINGS, which is why `settings` is the one
 * member a caller does not pass. A screen used to look a settings document up by
 * add-on key to pass it along — a customer-facing screen naming an add-on, and
 * one that would have had to name the second one too.
 *
 * ── THE GENERIC: `SlotId` OR THE HOST'S OWN UNION? ──────────────────────────
 *
 * The two hosts disagree, and this is the kit's ruling. `print-shop` writes
 * `AddOnSlot<S extends SlotId>` — the CLOSED REGISTRY, every id that exists.
 * `maker-shop` writes `AddOnSlot<S extends HostedSlotId>` — the ids that host
 * actually mounts.
 *
 * THE KIT TAKES THE HOST'S OWN UNION, and the reason is not symmetry:
 *
 *   `HostKitConfig<S>` is already generic over it. `hostedSlots` is `readonly
 *   S[]` and `slotEmptyBehaviour` is `Record<S, …>`, TOTAL BY TYPE. Typing the
 *   component over the wider union would put the component and the config on two
 *   different unions, and the config is the contract.
 *
 *   The wider union makes a real mistake compile. Mounting an id the host does
 *   not host is accepted by `SlotId`, and then `slotEmptyBehaviour` has no row
 *   for it — so the one decision the seam insists a host make, speaks or silent,
 *   is simply undecided at the site where it is decided. That is the difference
 *   between a compile error and an undecided empty state, and it is why
 *   `config.ts`'s `hostedSlots` comment sends a reader here.
 *
 *   Nothing is lost. `S` is still BOUNDED by `SlotId`, so an id outside the
 *   closed registry is still a compile error, and the mounts guard asserts
 *   `hostedSlots` is a strict subset of `HOSTED_SLOTS` so a mis-import of the
 *   wrong `HOSTED_SLOTS` — the one trap `config.ts` calls out — is a named
 *   failure rather than a silent widening.
 *
 * The cost is real and small: a host that adds a slot must add it to
 * `hostedSlots` and give it an empty behaviour before it can mount it. That is
 * two lines in one file, and it is the same two lines the mounts guard would
 * have demanded anyway.
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { AddOnSettings, PayloadFor, ResolvedFill, SlotId } from '../vendor/host/index.ts';

import type { HostKitConfig } from './config.ts';
import { drewSomething } from './slot-content.ts';
import { resolveSelectors } from './styles.ts';

/**
 * EVERYTHING THIS COMPONENT NEEDS FROM A HOST'S STATE, and no more.
 *
 * One hook rather than two, because a host answers both halves from the same
 * store read and splitting them would make two subscriptions where the host has
 * one. `fills` is exactly what `AddOnRegistry.fillsFor(slot, enabled, forAddOn)`
 * returns and `settings` is exactly the host's own settings document, so the
 * adapter in a host is four lines with no mapping step — and a mapping step is
 * where a host would get the chance to reorder, filter or re-key, all three of
 * which are decisions the registry already made on purpose.
 *
 * Generic in `T` so a mount site gets `render` typed for the ONE slot it named
 * rather than a union it would have to cast out of. A host may still write the
 * plain non-generic adapter — `(slot: HostedSlotId, forAddOn) => …` is
 * assignable to this, because `render` is contravariant in its payload — so the
 * generic here costs a host nothing.
 */
export type UseSlotFills<S extends SlotId> = <T extends S>(
  slot: T,
  forAddOn: string | undefined,
) => { fills: readonly ResolvedFill<T>[]; settings: AddOnSettings };

/** The five props, and there are deliberately only five. */
export interface AddOnSlotProps<S extends SlotId> {
  slot: S;
  /**
   * Exactly what this slot declares, minus `settings` — which this component
   * adds on the way through, per fill, from the add-on that supplied it.
   */
  payload: Omit<PayloadFor<S>, 'settings'>;
  /**
   * Scope to one add-on — what a `per-add-on` slot means. The manage drawer
   * asks for the panel of the add-on it is managing and gets that one, or the
   * fallback if that add-on renders no settings form.
   */
  forAddOn?: string;
  /** What to render when nothing fills this slot. OMIT for a silent slot. */
  fallback?: ReactNode;
  /** Wraps the fills when there is at least one — a panel, a row, a grid. */
  wrap?: (children: ReactNode) => ReactNode;
}

/** What a host gets back. `SlotFill` is exported for the tier-2 guards. */
export interface AddOnSlotBinding<S extends SlotId> {
  AddOnSlot: <T extends S>(props: AddOnSlotProps<T>) => ReactNode;
  SlotFill: (props: { slot: string; children: ReactNode }) => ReactNode;
}

/**
 * A resolved selector, as a class name.
 *
 * `selectorsFor` answers in CSS — `.mp-slot-fill` — because three of its four
 * consumers are queries. This one is a `className`, so the leading dot comes
 * off, and an override that is not a single class selector is REFUSED rather
 * than rendered as something that would never match its own stylesheet.
 *
 * Refused at factory time, which is to say at the host's module load, and that
 * placement is the point: the host's `registerAddOnMessages` throws at
 * registration for the same reason — it runs on every boot including the demo,
 * so it cannot be skipped the way a test can. A misconfigured prefix that only
 * showed up as a missing style on one screen is exactly the silent failure this
 * package was written to stop.
 */
function classNameFrom(selector: string, field: string): string {
  const match = /^\.([A-Za-z_-][\w-]*)$/.exec(selector.trim());
  if (match === null) {
    throw new Error(
      `host-kit: selectors.${field} must be one plain class selector (got ${JSON.stringify(selector)}). ` +
        'AddOnSlot renders it as a className and the stylesheet keys off it; anything else would ' +
        'make the markup and the rule disagree silently.',
    );
  }
  return match[1] as string;
}

/**
 * Bind the seam to one host: its class prefix, and its store.
 *
 * Call it ONCE, at module scope, in a host file that owns both facts — and
 * export the component from there rather than calling this again per screen. A
 * second call is not an error and not free: it makes a second component
 * identity, so React unmounts and remounts every fill under it whenever a screen
 * happens to render the other one.
 */
export function createAddOnSlot<S extends SlotId>(
  config: HostKitConfig<S>,
  useSlotFills: UseSlotFills<S>,
): AddOnSlotBinding<S> {
  /*
   * Through `styles.ts`, not through `selectorsFor` directly, and that is not a
   * detour: the className this component writes and the selector the stylesheet
   * keys off must be the same string, and one function resolving both is the
   * only arrangement in which they cannot come apart.
   */
  const selectors = resolveSelectors(config);
  const fillClass = classNameFrom(selectors.slotFill, 'slotFill');
  const spareClass = classNameFrom(selectors.slotSpare, 'slotSpare');

  /**
   * One fill's wrapper, and the element that answers "did it draw anything?".
   *
   * [Round 6.] The stylesheet asked `:not(:empty)`, which is a question about
   * CHILD NODES. A fill that returns a bare `<div/>`, or a wrapper whose only
   * child is `display: none`, has child nodes and drew nothing — so the host's
   * own content was suppressed by a fill that painted nothing and the reader got
   * a blank box. That is the round-2 defect at its third depth: connecting an
   * add-on still took the picture away.
   *
   * `slot-content.ts` holds the rule and its limits; this reports the answer as
   * `data-drew="none"` for the stylesheet to key off. A MutationObserver rather
   * than a dependency list, because a fill may change its mind from its OWN
   * state — data arriving, a preview clearing — without this component
   * re-rendering, and the answer has to follow the DOM rather than follow React.
   */
  function SlotFill({ slot, children }: { slot: string; children: ReactNode }) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [drew, setDrew] = useState(true);

    /*
     * NO DEPENDENCY ARRAY, ON PURPOSE. DO NOT CLEAN THIS UP.
     *
     * The effect re-runs after every render and re-attaches the observer, and
     * that is the behaviour being asked for: what it is watching is the fill's
     * output, which this component does not own and cannot list as a
     * dependency. `[]` would attach once and answer for the first tree only —
     * correct on mount and wrong the moment a fill re-renders with different
     * content, which is the ordinary case, not the exotic one. A lint rule that
     * wants an array here is right about the general case and wrong about this
     * one; the cost is a `disconnect()` and an `observe()` per render, on a
     * handful of wrappers.
     *
     * AND IT MUST SKIP ITS OWN WRITES. Setting `data-drew` is itself an
     * attribute mutation on the observed element, so an observer that did not
     * filter them would see its own answer, re-measure, set the attribute again
     * and go round for the rest of the session — a loop that costs a DOM walk
     * per turn and shows up as a warm laptop, not as a failure.
     */
    useLayoutEffect(() => {
      const el = ref.current;
      if (el === null) return;
      const look = () => setDrew(drewSomething(el));
      look();
      if (typeof MutationObserver === 'undefined') return;
      const watch = new MutationObserver((records) => {
        const mine = records.every(
          (r) => r.type === 'attributes' && r.target === el && r.attributeName === 'data-drew',
        );
        if (!mine) look();
      });
      watch.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });
      return () => watch.disconnect();
    });

    return (
      <div
        ref={ref}
        className={fillClass}
        data-add-on-slot={slot}
        /* Absent when it drew, so the stylesheet's rule reads in the positive
           direction and an element that has never been measured behaves exactly
           as it did before this existed. */
        data-drew={drew ? undefined : 'none'}
      >
        {children}
      </div>
    );
  }

  function AddOnSlot<T extends S>({ slot, payload, forAddOn, fallback, wrap }: AddOnSlotProps<T>) {
    const { fills, settings } = useSlotFills(slot, forAddOn);
    if (fills.length === 0) return <>{fallback ?? null}</>;

    const rendered = fills.map((entry, i) => (
      // The registry has already ordered these by `order` then add-on key, so
      // the index is a stable identity here rather than a positional guess.
      /*
       * `data-add-on-slot` NAMES THE SEAM IN THE MARKUP, and it is here for the
       * TEST TOUR rather than for the stylesheet — nothing in `styles.ts` reads
       * it and nothing should.
       *
       * A host's `testing/tour.tsx` reaches an add-on's own surfaces — an
       * editor, a wizard, a settings form — by pressing what a fill drew and
       * looking at what appears, because no store field names any of them. To do
       * that it has to be able to say "this part of the page belongs to an
       * add-on" WITHOUT NAMING AN ADD-ON, which is the same constraint the brand
       * gate puts on every other file. A class a stylesheet happens to use is
       * not that: it can be renamed, shared, or dropped for a grid, and the
       * crawl would silently stop crawling — finding nothing and reporting
       * green, which is the failure mode this whole package is about.
       *
       * The attribute's value is the slot id, so a failure reads as the slot it
       * came from.
       */
      <SlotFill key={`${slot}-${i}`} slot={slot}>
        {/*
          * The cast is over the SETTINGS SPREAD alone: `payload` is already this
          * slot's declared shape (the prop above says so), and what a generic
          * `T` cannot verify is that adding one known member back to `Omit<…>`
          * gives the whole again. Everything a screen actually gets wrong — the
          * wrong record, a missing field, a stale shape — is caught at the prop.
          */}
        {entry.fill.render({ ...payload, settings: settings[entry.addOn] ?? {} } as PayloadFor<T>)}
      </SlotFill>
    ));

    /*
     * THE HOST'S OWN CONTENT, KEPT IN THE TREE. See the header: a fill may
     * legitimately have nothing to draw for THIS record, and until the
     * stylesheet gets to see whether it did, both have to be present.
     *
     * The spare is LAST and stays last. `styles.ts` reaches it with a plain
     * sibling combinator and needs no `:has()`; putting it first would leave the
     * rule matching nothing, silently.
     */
    const spare =
      fallback === undefined ? null : (
        <div key={`${slot}-spare`} className={spareClass}>
          {fallback}
        </div>
      );
    const all = spare === null ? rendered : [...rendered, spare];

    return <>{wrap ? wrap(all) : all}</>;
  }

  return { AddOnSlot, SlotFill };
}
