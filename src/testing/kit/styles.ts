/*
 * INSTALLED from add-ons/packages/host-kit/guards/styles.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * THE HALF OF THE SEAM THAT LIVES IN CSS, ASSERTED WHERE THE OTHER HALF IS.
 *
 * ── WHY A STYLESHEET NEEDS A GUARD AT ALL ───────────────────────────────────
 *
 * `AddOnSlot` renders the host's own content AFTER every fill, unconditionally,
 * and lets the cascade decide which one a person sees. That is not laziness: the
 * host cannot ask an add-on whether it has anything to draw for a particular
 * record, so "nothing fills this slot" and "the fill had nothing to draw" are
 * two different states the component cannot tell apart at render time. It draws
 * both and the stylesheet resolves it.
 *
 * WHICH MEANS THE RULE PAIR IS LOAD-BEARING CODE THAT NO TEST CAN SEE. jsdom
 * applies no stylesheet: every DOM assertion in every suite passes identically
 * whether the pair is present, half present or absent. Delete one rule and the
 * component is drawing two things on top of each other, or none, and the only
 * thing that goes red is a screenshot nobody is taking.
 *
 * ── AND THE TWO WAYS IT WENT WRONG, WHICH ARE THE TWO THINGS CHECKED ────────
 *
 * HALF-COPIED. The pair is two rules and the second is useless without the
 * first. A host that took only the `display: none` rule has a fallback that no
 * longer sits where it sat, because `display: contents` on the spare is what
 * keeps it in its parent's layout.
 *
 * ONE CONDITION INSTEAD OF TWO. `:empty` alone is the shipped defect: a fill
 * that returns a bare `<div/>`, or a wrapper whose only child is
 * `display: none`, HAS child nodes, so `:not(:empty)` matched and the host's own
 * content was hidden on its behalf. Connecting an add-on took a picture away.
 * The `data-drew="none"` half is what closes that, and the `:empty` half stays
 * because it needs no measurement and is right from the first paint.
 *
 * ── THE RULE TEXT IS IMPORTED, NEVER RESTATED ───────────────────────────────
 *
 * `slotRulePatterns` comes from the runtime half's `styles.ts`, which is the
 * same module `AddOnSlot` resolves its class names through. That is the whole
 * point: a guard with its own copy of the selectors is a fifth place the prefix
 * has to agree, and four of the five places the prefix used to live were test
 * files — which go GREEN when they match nothing. A guard that restated the
 * rule would pass on a host whose stylesheet says something else entirely.
 *
 * ── AND CSS COMMENTS ARE STRIPPED, FOR THE SAME REASON JSX ONES ARE ─────────
 *
 * The block a host is told to paste is the pair WITH a long comment above it,
 * and that comment quotes both declarations by name. A grep over the raw file
 * would therefore be satisfied by the comment alone — a host that pasted the
 * prose and deleted the rules would pass. It is the mount-inside-a-comment
 * defect in another language, and the answer is the same: read the code, not
 * the prose about the code.
 */

import { describe, expect, it } from 'vitest';

import type { HostFacts } from '../../add-ons/kit/config.ts';
import { slotRuleCss, slotRulePatterns } from '../../add-ons/kit/styles.ts';
import { read, relativeTo } from './files.ts';

/**
 * A stylesheet with its comments removed, line count intact.
 *
 * CSS has one comment form and no string escaping worth the name, so this is
 * genuinely two states rather than the seven `files.ts` has to track. Newlines
 * inside a removed comment are kept so a reader given a line number is sent to
 * the right line.
 */
export function withoutCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    '\n'.repeat(comment.split('\n').length - 1),
  );
}

/** What one stylesheet carries. */
export interface SlotRuleReading {
  file: string;
  /** The `display: contents` rule on the spare. */
  spare: boolean;
  /** The two-condition rule that hides it. */
  hide: boolean;
  /** The file could not be read at all. */
  missing: boolean;
}

/** Read every stylesheet this host says may carry the pair. */
export function readSlotRules(config: HostFacts): SlotRuleReading[] {
  const patterns = slotRulePatterns(config);
  return config.stylesheets.map((file) => {
    let css: string;
    try {
      css = withoutCssComments(read(file));
    } catch {
      return { file: relativeTo(config, file), spare: false, hide: false, missing: true };
    }
    return {
      file: relativeTo(config, file),
      spare: patterns.spare.test(css),
      hide: patterns.hide.test(css),
      missing: false,
    };
  });
}

/** DECLARE THE STYLESHEET SUITE for one host. */
export function stylesGuard(config: HostFacts): void {
  describe(`${config.appKey} · the stylesheet carries the rule pair the seam needs`, () => {
    it('names at least one stylesheet, and every one of them exists', () => {
      /*
       * THE GUARD ON THE GUARD. `config.stylesheets` is a list because the two
       * existing hosts disagree about which file the pair belongs in, and a
       * list that is empty — or that names a file somebody moved — makes every
       * case below decide nothing at all.
       */
      expect(
        config.stylesheets.length,
        'this host declares no stylesheet, so nothing can be checked',
      ).toBeGreaterThan(0);
      const missing = readSlotRules(config)
        .filter((reading) => reading.missing)
        .map((reading) => reading.file);
      expect(missing, 'these declared stylesheets do not exist').toEqual([]);
    });

    it('carries both rules, in exactly one file', () => {
      /*
       * EXACTLY ONE, which is stricter than "somewhere" and deliberately so.
       * Two copies of a cascade rule is how one gets edited and the other does
       * not, and the survivor is whichever the browser reads last — a
       * difference nobody can see in a diff.
       */
      const readings = readSlotRules(config);
      const carriers = readings.filter((reading) => reading.spare || reading.hide);

      expect(
        carriers.map((reading) => reading.file),
        `\nExactly one of this host’s declared stylesheets must carry the slot rule pair. ` +
          'Paste `slotRuleBlock(config)` into one of them:\n' +
          config.stylesheets.join('\n') +
          '\n',
      ).toHaveLength(1);

      const [only] = carriers;
      const halves = [
        only?.spare === true ? null : 'the `display: contents` rule on the spare',
        only?.hide === true ? null : 'the two-condition rule that hides it',
      ].filter((half): half is string => half !== null);
      expect(
        halves,
        `\n${only?.file ?? '(none)'} carries half the pair. The second rule is useless ` +
          'without the first, and the first alone draws the host’s content on top of ' +
          'whatever the add-on drew. Missing:\n' +
          halves.join('\n') +
          '\n\nWhat it should carry, for this host’s prefix:\n' +
          slotRuleCss(config) +
          '\n',
      ).toEqual([]);
    });

    it('would refuse a half-copy and a one-condition rule', () => {
      /*
       * THE PATTERNS, DRIVEN. This is the case that fails if somebody
       * "simplifies" the selector back to `:empty` alone — which is exactly
       * what shipped, and exactly what a stylesheet edit would look like to a
       * reviewer who did not know the story.
       */
      const patterns = slotRulePatterns(config);
      const canonical = slotRuleCss(config);
      expect(patterns.spare.test(canonical), 'the generator and the guard disagree').toBe(true);
      expect(patterns.hide.test(canonical), 'the generator and the guard disagree').toBe(true);

      // The shipped defect: one condition, not two.
      const oneCondition = canonical.replace(':not([data-drew="none"])', '');
      expect(patterns.hide.test(oneCondition)).toBe(false);
      // …and dropping the other negation is no better.
      expect(patterns.hide.test(canonical.replace(':not(:empty)', ''))).toBe(false);
      // A half-copy keeps one rule and loses the other.
      expect(patterns.spare.test(canonical.split('\n').slice(3).join('\n'))).toBe(false);

      // And prose ABOUT the rule is not the rule.
      expect(patterns.hide.test(withoutCssComments(`/* ${canonical} */`))).toBe(false);
    });
  });
}
