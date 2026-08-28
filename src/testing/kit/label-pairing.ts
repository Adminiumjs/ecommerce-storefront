/*
 * INSTALLED from add-ons/packages/host-kit/guards/label-pairing.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * WHEREVER A COMPANY IS NAMED, THE LINE IS ON THE SAME SCREEN (24 AC6) — both
 * halves of it, because neither half can see what the other does.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────
 *
 * AC6, as amended 2026-08-09, is about a READER: a surface that names a real
 * company carries the line saying Adminium is not affiliated with it. Not a
 * page further in, not at the foot of a list — on the surface where the reader
 * meets the name.
 *
 * ── AND WHY IT TAKES TWO GUARDS ─────────────────────────────────────────────
 *
 * THE SOURCE SWEEP asks a question about FILES: does anything of this host's
 * that prints an add-on's name or monogram also mount the affiliation line? It
 * is the only half that can cover a surface NOBODY HAS THOUGHT OF, which is
 * exactly how the defect arrived — three dialogs carried the line correctly and
 * the shelf card, the fourth surface, did not. It cannot see an add-on's own
 * copy, because an add-on's components are vendored and its words are its own.
 *
 * THE RENDERED WALK asks a question about PIXELS: on this screen, in this
 * language, is there a company mark with no disclaimer beside it? It is the
 * only half that covers the add-ons' own surfaces — the first customer-facing
 * screen that named a company was an add-on's tile reading *"Bring it from
 * Canva — choose a design from your account…"*, and a DOM scan of that screen
 * for "affiliat" came back EMPTY: the line existed one press further in, inside
 * the flow the tile opens, which is precisely the arrangement the amendment was
 * written against. It cannot cover a surface the tour does not reach.
 *
 * A host at tier 1 gets the first. A host with a DOM gets both, and `tier.ts`
 * is what stops it quietly getting one.
 *
 * ── THE ONE THING THE RENDERED HALF MUST NOT DO, AND DID ────────────────────
 *
 * IT MUST READ TEXT NODES ONE AT A TIME. `textContent` over a container runs
 * adjacent elements together with no separator: a heading ending in a carrier's
 * name, followed by the shop's own name, is the single run "DHLMarlow Press",
 * and the boundary rule below then reads the mark as part of a longer word and
 * says nothing. That is measured, not imagined — a planted "Ships with DHL" in
 * an always-rendered component passed a page-wide version of this gate while
 * sitting on 31 surfaces in one host.
 *
 * A TEXT NODE is a string somebody wrote, so its edges are real edges. The four
 * attributes are read too, because a person reads them: an `aria-label` is what
 * a screen-reader user is TOLD the button is.
 *
 * ── AND WHAT NEITHER HALF CAN DECIDE ────────────────────────────────────────
 *
 * Whether the line is legible, near the naming, or anywhere a person looks. It
 * is on the same surface, in the same rendered text, and that is as far as text
 * goes: `getClientRects` returns zero for everything under jsdom, so proximity
 * is not a question this environment can answer at all. A host with a card to
 * scope to should scope to it, which is finer than either half here.
 */

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { selectorsFor, type HostFacts } from '../../add-ons/kit/config.ts';
import { codeOf, ownShippedFiles, read, relativeTo } from './files.ts';
import { discoveredFacts, type CompanyMark, type DiscoveredFacts } from './facts.ts';

/**
 * IS THIS MARK ACTUALLY NAMED HERE, or is it a run of letters inside a word?
 *
 * A plain `includes` reported a print works' own product list, in English only:
 * **Canva**s prints. That is the shop's product and not anybody's mark, and a
 * gate that reports it on five screens teaches its reader to skim the failure —
 * which is how every list in wave 4b was eventually beaten.
 *
 * So a mark counts when no LATIN letter touches it on either side. That keeps
 * "Canva 带进来" (Chinese copy naming the company) and drops "Canvas prints",
 * without either a carve-out list or a word-boundary rule — `\b` does not mean
 * what anybody wants it to mean in two of the eight languages.
 */
export function namesMark(text: string, mark: string): boolean {
  const escaped = mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`).test(text);
}

const flat = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** The four attributes a person reads, beyond the text nodes themselves. */
const READ_ATTRIBUTES = ['aria-label', 'title', 'alt', 'placeholder'] as const;

/**
 * WHAT A CUSTOMER READS on one surface: every string, separately.
 *
 * `dockSelector` is removed first and it is the ONLY exclusion. The dock is a
 * row of toggle chips floating over every view, each labelled with an add-on's
 * name, and two of those names contain a company mark — a scan including it
 * would report every surface in the app in eight languages and be switched off
 * inside a week. It is the reviewer's control strip rather than the shop's
 * chrome, it is not in the published demo's reading path, and a paragraph
 * inside a toggle chip is not a surface. Every other pixel is in scope.
 *
 * The clone is not tidiness: removing the dock from the live tree would change
 * what the next assertion in the host's own suite sees.
 */
export function surfaceStrings(root: Element, dockSelector: string): string[] {
  const copy = root.cloneNode(true) as Element;
  for (const dock of copy.querySelectorAll(dockSelector)) dock.remove();

  const out: string[] = [];
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(copy, 4 /* NodeFilter.SHOW_TEXT */);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = flat(node.textContent ?? '');
    if (text !== '') out.push(text);
  }
  for (const element of copy.querySelectorAll('*')) {
    for (const name of READ_ATTRIBUTES) {
      const value = flat(element.getAttribute(name) ?? '');
      if (value !== '') out.push(value);
    }
  }
  return out;
}

/** Which marks a surface names, given the strings a reader meets on it. */
export function marksNamedIn(strings: readonly string[], marks: readonly CompanyMark[]): string[] {
  return marks
    .filter((entry) => strings.some((text) => namesMark(text, entry.mark)))
    .map((entry) => entry.mark);
}

/**
 * Does this surface carry a not-affiliated line?
 *
 * Looked for across the WHOLE surface rather than in one string, which is the
 * opposite of how the marks are looked for and is right for the same reason:
 * an add-on that renders the sentence as two keys side by side has still put it
 * in front of the reader, whereas a mark split across two elements was never
 * one word.
 */
export function carriesDisclaimer(
  strings: readonly string[],
  disclaimers: readonly string[],
): boolean {
  const whole = strings.join(' ');
  return disclaimers.some((line) => whole.includes(line));
}

// ── the source sweep ────────────────────────────────────────────────────────

/** The spellings a host component uses when it prints an add-on's identity. */
const PRINTS_IDENTITY = /addOn\.(name|shortName|monogram)\b/;

/** The component whose presence satisfies the rule. */
const RENDERS_LINE = 'Affiliation';

/**
 * Every one of this host's own components that names an add-on and says
 * nothing about who else is involved.
 *
 * A grep and not a render, on purpose: this half's whole value is covering the
 * surface nobody thought of, and a surface nobody thought of is a surface no
 * tour visits. What it costs is precision — a file that mentions `Affiliation`
 * in a branch that never runs satisfies it — and that cost is paid by the
 * rendered half, which is why a host with a DOM runs both.
 */
export function affiliationFindings(
  config: HostFacts,
): { file: string; reason: string }[] {
  return ownShippedFiles(config)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => ({ file, rel: relativeTo(config, file) }))
    .filter(({ rel }) => !(rel in config.affiliationExempt))
    .map(({ file, rel }) => ({ rel, code: codeOf(file) }))
    .filter(({ code }) => PRINTS_IDENTITY.test(code) && !code.includes(RENDERS_LINE))
    .map(({ rel }) => ({
      file: rel,
      reason: 'prints an add-on’s name or monogram and mounts no Affiliation',
    }));
}

/** DECLARE THE SOURCE HALF (tier 1 — no DOM). */
export function labelPairingSourceGuard(config: HostFacts): void {
  describe(`${config.appKey} · no host surface names an add-on without the line (24 AC6)`, () => {
    it('has components to read', () => {
      const components = ownShippedFiles(config).filter((file) => file.endsWith('.tsx'));
      expect(
        components.length,
        `no .tsx found under ${config.srcDir} outside ${config.vendorDir}`,
      ).toBeGreaterThan(0);
    });

    it('renders the line wherever it renders an add-on’s name or monogram', () => {
      const offenders = affiliationFindings(config).map((f) => `${f.file} — ${f.reason}`);
      expect(
        offenders,
        '\nThese surfaces print an add-on’s name or its monogram and carry nothing about ' +
          'who else is involved (24 AC6). Mount `Affiliation`, or add the file to ' +
          '`affiliationExempt` in this host’s config WITH THE REASON it cannot:\n' +
          offenders.join('\n') +
          '\n',
      ).toEqual([]);
    });

    it('keeps every exemption real', () => {
      /*
       * AN EXEMPTION LIST IS WHERE NINE OF WAVE 4B'S HOLES CAME FROM, so this
       * host's is held to two things: the file still exists, and it is still
       * SUBJECT to the rule it is exempt from. An exemption for a file that no
       * longer names an add-on is an exemption doing nothing but widening the
       * rule, and it widens it silently — the file it names could be renamed
       * out from under it and nobody would look.
       */
      const broken: string[] = [];
      for (const [rel, why] of Object.entries(config.affiliationExempt)) {
        let code: string;
        try {
          code = read(join(config.rootDir, rel));
        } catch {
          broken.push(`${rel} — exempt, and no such file`);
          continue;
        }
        if (why.trim().length <= 10) broken.push(`${rel} — exempt with no reason given`);
        if (!PRINTS_IDENTITY.test(code) && !code.includes(RENDERS_LINE)) {
          broken.push(`${rel} — exempt from a rule it is not subject to`);
        }
      }
      expect(broken).toEqual([]);
    });

    it('would report a component that named an add-on and said nothing', () => {
      // The rule, driven, so its absence over `src/` means something. Both
      // directions: a gate that reports nothing is indistinguishable from one
      // that is switched off, and a gate that reports working code gets one.
      const names = 'export const Card = () => <h3>{addOn.name}</h3>;';
      expect(PRINTS_IDENTITY.test(names) && !names.includes(RENDERS_LINE)).toBe(true);
      const paired = 'export const Card = () => (<><h3>{addOn.name}</h3><Affiliation /></>);';
      expect(PRINTS_IDENTITY.test(paired) && !paired.includes(RENDERS_LINE)).toBe(false);
      const silent = 'export const Total = () => <p>{order.ref}</p>;';
      expect(PRINTS_IDENTITY.test(silent)).toBe(false);
    });
  });
}

// ── the rendered walk ───────────────────────────────────────────────────────

/** One surface the host's tour stopped at. */
export interface TouredSurface {
  /** The view's own name, for the failure message. */
  view: string;
  /** An overlay, drawer or dialog open over it, or `''`. */
  surface?: string;
  /** The mounted tree, still on the page. */
  host: Element;
}

/**
 * WHAT THE RENDERED HALF NEEDS FROM A HOST, and why it cannot come from
 * `config.ts`.
 *
 * A config is a value a host can write in a file that imports nothing. The
 * moment it holds a `tour` it drags React, the store and every screen into
 * whatever imports it — and two of the four wave-6 hosts have no React test
 * tree at all, while their configs must still load. So the fixtures are a
 * separate argument, passed only by the hosts that have them.
 */
export interface RenderedLabelFixtures {
  /**
   * Visit every surface this app has, in one locale, and call `read` at each.
   *
   * `read` is called WHILE THE TREE IS ON THE PAGE, because a question about
   * rendered text cannot be asked of a detached string.
   */
  tour(locale: string, read: (surface: TouredSurface) => void): void | Promise<void>;
  /**
   * EVERY WAY THE LINE IS SPELLED IN THIS LOCALE, which is more than one.
   *
   * The host has its own sentence, and an add-on that names a company carries
   * its own — the same sentence, translated independently, because an add-on's
   * copy is written and reviewed in the add-on's repository. In Danish one host
   * says "dette firma" and one add-on says "dette selskab"; both are right and
   * neither is a copy of the other. So the rule is satisfied by ANY
   * not-affiliated line in the merged bundle, rather than by the host's
   * wording — which would quietly require every add-on to say it in the host's
   * words.
   */
  disclaimers(locale: string): readonly string[];
}

export interface RenderedLabelOptions {
  /**
   * FACTS FROM A DIFFERENT GLOB, never a hand-written list of marks.
   *
   * The same escape hatch `factsGuard` carries and with the same warning: it
   * exists for a host whose vendor directory sits somewhere `INSTALL_LAYOUT`
   * does not describe, and for this package's own suite, which has no vendored
   * add-ons for the glob to find. A literal list of marks passed here is the
   * host-local list `facts.ts` exists to abolish — the sixth of its kind — and
   * the guard cannot tell the difference. What it can do is fail on a
   * discovery that found nothing, which is the failure that actually bites.
   */
  facts?: DiscoveredFacts;
}

/** DECLARE THE RENDERED HALF (tier 2 — needs a DOM). */
export function labelPairingRenderedGuard(
  config: HostFacts,
  fixtures: RenderedLabelFixtures,
  options: RenderedLabelOptions = {},
): void {
  const selectors = selectorsFor(config);
  const marks = (options.facts ?? discoveredFacts()).marks;

  describe(`${config.appKey} · no surface names a company without the line (24 AC6)`, () => {
    it('has marks to look for, from the add-ons rather than from here', () => {
      /*
       * THE GUARD ON THE GUARD. A glob that stopped matching, or a package that
       * stopped exporting, would make every case below pass by having nothing
       * to find — which is how a gate goes quietly blind, and is the failure
       * `facts.ts` exists to make loud.
       */
      expect(marks.length, 'no COMPANY_MARKS were vendored at all').toBeGreaterThan(0);
      const lines = fixtures.disclaimers(config.localeTags[0]!);
      expect(lines.length, 'no not-affiliated line is in the bundle at all').toBeGreaterThan(1);
      expect(lines.every((line) => line.length > 10)).toBe(true);
    });

    for (const locale of config.localeTags) {
      it(`${locale} — every surface that names a company carries it`, async () => {
        const lines = fixtures.disclaimers(locale);
        const offenders: string[] = [];

        await fixtures.tour(locale, ({ view, surface, host }) => {
          const strings = surfaceStrings(host, selectors.dock);
          const named = marksNamedIn(strings, marks);
          if (named.length === 0) return;
          if (carriesDisclaimer(strings, lines)) return;
          const where = surface === undefined || surface === '' ? view : `${view} · ${surface}`;
          offenders.push(`${where} — names ${named.join(', ')}`);
        });

        const unique = [...new Set(offenders)];
        expect(
          unique,
          '\nThese surfaces name a company and do not carry the not-affiliated line ' +
            '(24 AC6). The reader meets the company here, so the line belongs here — ' +
            'not one press further in:\n' +
            unique.join('\n') +
            '\n',
        ).toEqual([]);
      });
    }
  });
}
