/*
 * INSTALLED from add-ons/packages/host-kit/src/styles.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The RUNTIME half: this compiles into the bundle.
 */
/**
 * THE TWO-CONDITION RULE PAIR, GENERATED, so it can never be half-copied.
 *
 * ── WHY A FUNCTION AND NOT FOUR LINES IN A README ───────────────────────────
 *
 * The rule this file emits is one third of a mechanism whose three parts only
 * work together (`AddOnSlot.tsx` names all three). Two of the parts are code and
 * arrive with the kit; this one is CSS, it lives in the host's own stylesheet,
 * and a stylesheet is the one place an install cannot simply write to — every
 * host orders, groups and comments its own, `print-shop` keeps this pair in
 * `styles/components.css` and `maker-shop` in `styles/screens.css`, and a script
 * that appended to whichever file it guessed would be the first thing a
 * retrofitter reverted.
 *
 * So the pair is HANDED OVER as text instead, and the two ways it used to go
 * wrong are both closed by that:
 *
 *   HALF-COPIED. The pair is two rules and the second is useless without the
 *   first — `display: contents` on the spare is what keeps the host's own
 *   content in its parent's layout, and a host that copied only the
 *   `display: none` rule would have a fallback that no longer sits where it sat.
 *   One string carries both or neither.
 *
 *   COPIED WITH THE WRONG PREFIX. The prefix is the five-places problem
 *   (`config.ts` header), and four of those five places are test files that go
 *   green when they match nothing. Here the selectors come from `selectorsFor`,
 *   which is the same function the guards query with — so the rule a host pastes
 *   and the rule its gates look for are computed from one field, and disagreeing
 *   with the stylesheet is a failure rather than a silent pass.
 *
 * ── AND WHY THE GUARD GETS PATTERNS RATHER THAN THE STRING ──────────────────
 *
 * `slotRuleCss` emits ONE canonical spelling. A stylesheet is a file people
 * format: a host with Prettier at 100 columns, a host that puts the two rules
 * either side of a section comment, a host whose formatter prefers single quotes
 * inside the attribute selector — all three are correct and none of them matches
 * the canonical string byte for byte. A guard built on `includes(slotRuleCss(c))`
 * would fail every one of them, and the fix a hurried reader would reach for is
 * to delete the guard.
 *
 * `slotRulePatterns` therefore expresses the two rules as what they MEAN — this
 * selector, these two negations in either order, this declaration — and tolerates
 * whitespace and quote style and nothing else. It does not tolerate a missing
 * negation, which is the whole defect.
 */

import { selectorsFor, type HostKitConfig, type HostKitSelectors } from './config.ts';
import type { SlotId } from '../vendor/host/index.ts';

/**
 * Enough of a config to compute the two selectors, and no more.
 *
 * Structural rather than `HostKitConfig`, so the kit's own suites and a host
 * writing its stylesheet by hand can both pass `{ classPrefix: 'mp' }` without
 * inventing a `rootDir` and an eight-locale list to satisfy a signature. A real
 * config satisfies it by having the two members.
 */
export type PrefixSource = Pick<HostKitConfig<SlotId>, 'classPrefix' | 'selectors'>;

/**
 * THE ONE PLACE THE SEAM RESOLVES A SELECTOR, and both halves go through it.
 *
 * `AddOnSlot` needs these to write a `className`; this module needs them to
 * write the rule that keys off that className; the guards need them to find both.
 * If the component resolved its own and the stylesheet resolved its own, a host
 * that overrode `selectors.slotFill` would get markup and CSS that disagree —
 * and disagreeing markup and CSS produce a page that looks slightly wrong on one
 * screen, never an error. So the component imports this rather than calling
 * `selectorsFor` itself, and the two cannot come apart.
 *
 * The cast is over the members `selectorsFor` does not read. It takes a whole
 * `HostKitConfig` because that is what its callers have, and it touches
 * `classPrefix` and `selectors` and nothing else. Widening its signature was the
 * alternative and it was worse: `config.ts` is the contract file, and loosening
 * a contract so a consumer can avoid a cast is how a contract stops being one.
 */
export const resolveSelectors = (source: PrefixSource): HostKitSelectors =>
  selectorsFor(source as HostKitConfig<SlotId>);

/** Every regular-expression metacharacter a CSS selector may legally contain. */
const escapeForPattern = (selector: string): string =>
  selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * THE PAIR, canonical spelling, no comment. Both existing hosts carry exactly
 * this text under their own prefix, and it is byte-identical to what they had
 * before the kit existed — the generator was written to match the stylesheets
 * rather than the stylesheets rewritten to match a generator, so installing the
 * kit into `print-shop` or `maker-shop` changes no CSS at all.
 *
 * Double quotes inside the attribute selector because that is what both hosts
 * ship and what every CSS formatter in the fleet emits; the kit's TypeScript is
 * single-quoted and the CSS it writes is not, which is a difference between two
 * languages rather than an inconsistency.
 */
export function slotRuleCss(source: PrefixSource): string {
  const { slotFill, slotSpare } = resolveSelectors(source);
  return [
    `${slotSpare} {`,
    '  display: contents;',
    '}',
    `${slotFill}:not(:empty):not([data-drew="none"]) ~ ${slotSpare} {`,
    '  display: none;',
    '}',
  ].join('\n');
}

/**
 * The pair WITH the paragraph that stops somebody tidying it away.
 *
 * This is what step 6 of the README tells a retrofitter to paste, and the prose
 * is the deliverable rather than a decoration. Every clause in it was written
 * after a defect: `ORDER MATTERS` after a refactor moved the spare above the
 * fills and the sibling combinator stopped reaching it; `TWO CONDITIONS, NOT
 * ONE` after `:empty` alone hid a host's picture on behalf of a fill that
 * painted nothing. A rule pasted without them is a rule the next reader will
 * simplify.
 *
 * It says `AddOnSlot` rather than naming a file path, because the path differs
 * per host and a comment that names a file that moved is a comment a reader
 * stops trusting.
 */
export function slotRuleBlock(source: PrefixSource): string {
  return `/*
 * THE HOST'S OWN CONTENT AT A FILLED SLOT, and the rule that decides who wins.
 *
 * A fill may legitimately have nothing to draw for a particular record, so the
 * host cannot know at render time whether to draw its own content instead —
 * asking would mean asking an add-on about a record, which is not a question
 * this seam has. \`AddOnSlot\` therefore renders the fallback after the fills
 * every time, and these two rules decide which one a person sees.
 * \`display: contents\` keeps the fallback in its parent's layout, so an empty
 * slot looks exactly as it did.
 *
 * ORDER MATTERS: the spare is always last, so a plain sibling combinator
 * reaches it and no \`:has()\` is needed. Do not reorder them in the component.
 *
 * TWO CONDITIONS, NOT ONE. \`:empty\` is a question about child nodes and this
 * is a question about paint: a fill returning a bare \`<div/>\`, or a wrapper
 * whose only child is \`display: none\`, is not empty and drew nothing, and
 * this rule used to hide the host's own content on its behalf. \`SlotFill\`
 * asks the DOM afterwards and marks the wrapper \`data-drew="none"\`; the
 * \`:empty\` half stays because it needs no measurement and is right from the
 * first paint.
 *
 * GENERATED by the host kit's \`slotRuleBlock()\`. A host may reformat it; a
 * host may not drop either rule or either negation, and the styles guard says
 * so by name.
 */
${slotRuleCss(source)}`;
}

/**
 * WHAT A GUARD GREPS FOR — the two rules as meaning, not as bytes.
 *
 * `spare` matches the `display: contents` rule. `hide` matches the second, and
 * it is the one worth reading closely: the two `:not(…)` negations are matched
 * in EITHER ORDER, because both are correct CSS and a host that reordered them
 * has changed nothing, while a host that dropped one has re-opened the defect.
 * Writing it as a single fixed sequence would have made a cosmetic edit fail and
 * taught the next reader that the guard is noise.
 *
 * The class name is escaped before it goes into the pattern. Not defensive
 * theatre: `selectors` may be overridden by a host that already shipped class
 * names, `.` is legal in an escaped CSS class and is the metacharacter here, and
 * an unescaped one would match a selector that is not the host's — a guard that
 * passes on the wrong element, which is the failure mode this whole package
 * exists to stop.
 */
export function slotRulePatterns(source: PrefixSource): { spare: RegExp; hide: RegExp } {
  const { slotFill, slotSpare } = resolveSelectors(source);
  const fill = escapeForPattern(slotFill);
  const spare = escapeForPattern(slotSpare);
  const notEmpty = ':not\\(\\s*:empty\\s*\\)';
  const notDrew = ':not\\(\\s*\\[\\s*data-drew\\s*=\\s*[\'"]?none[\'"]?\\s*\\]\\s*\\)';
  return {
    spare: new RegExp(`${spare}\\s*\\{[^}]*display\\s*:\\s*contents\\s*[;}]`, 'i'),
    hide: new RegExp(
      `${fill}(?:${notEmpty}${notDrew}|${notDrew}${notEmpty})\\s*~\\s*${spare}\\s*\\{[^}]*display\\s*:\\s*none\\s*[;}]`,
      'i',
    ),
  };
}
