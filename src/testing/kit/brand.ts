/*
 * INSTALLED from add-ons/packages/host-kit/guards/brand.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * THE HOST NAMES NO COMPANY — and the one line shape that is allowed to.
 *
 * ── WHY THE CRITERION'S OWN GREP PROVED NOTHING ─────────────────────────────
 *
 * 24 AC5 says nothing in the host app names a carrier, and the grep the
 * criterion prescribes is "dhl". That is exactly the name the print works did
 * NOT contain, so the criterion passed and proved nothing. What the works DID
 * contain, until a suite of this shape existed, was
 *
 *     name: 'Royal Mail Shipping',
 *     name: 'Stripe Payments',
 *     name: 'Mailchimp Lists',
 *
 * in its add-on registry: three real firms named in host source, for
 * integrations that do not exist. They are descriptions now.
 *
 * So the grep is widened to the firms a shop would plausibly reach for, and
 * pointed at PRODUCTION SOURCE OUTSIDE THE VENDOR DIRECTORY. The vendored
 * halves are the add-ons themselves; they name their own companies
 * nominatively, with a `TRADEMARKS.md` beside the claim in their own repos, and
 * a host that lint-banned them would be banning the add-on rather than the
 * defect.
 *
 * ── ONE ALLOWED LINE, AND IT IS A SHAPE RATHER THAN A PLACE ─────────────────
 *
 * A host has to import the add-on bundles it vendors, and the import path
 * necessarily carries the add-on key, which necessarily carries the company
 * name — `./vendor/shipping-dhl/index.ts`. That is a PATH, not a display
 * string, and it is the only thing forgiven.
 *
 * It is forgiven as a line SHAPE and not as a file: exempting `registry.ts`
 * would forgive `const carrier = 'DHL';` two lines below the import, in the one
 * file most likely to hold it. The shape is anchored on both ends, the
 * specifier must be RELATIVE (a bare package specifier is a different thing and
 * a different rule), and it must end in `index.ts` — a company name reaching
 * any deeper into an add-on is a host reading into an add-on's internals, which
 * is its own defect.
 *
 * ── AND THE SECOND RULE THIS FILE IS PROMISED TO CARRY ──────────────────────
 *
 * `config.ts`'s `INSTALL_LAYOUT` says the guard half "must never ship", and
 * names this guard as the thing that enforces it. It is here rather than in
 * `vendored.ts` because it is the same shape of question — a grep over shipped
 * sources for a spelling that must not appear — and because the consequence is
 * the same kind of thing: `guards/lexicon.ts` SPELLS EVERY BANNED WORD, so a
 * screen that imported it would put the whole word list one ordinary import
 * away from a bundle and turn a red test into a red RELEASE.
 *
 * `zod` rides along for the reason the repo it came from gives: the vendored
 * manifest validator imports it, it is a devDependency, and it is a runtime
 * dependency the host does not carry (24 D7). Both are reachable only by an
 * import from a screen, which is what this looks for.
 */

import { basename } from 'node:path';

import { describe, expect, it } from 'vitest';

import { INSTALL_LAYOUT, type HostFacts } from '../../add-ons/kit/config.ts';
import { codeOf, ownShippedFiles, relativeTo, shippedFiles } from './files.ts';

/**
 * THE FIRMS A SHOP WOULD PLAUSIBLY REACH FOR.
 *
 * Word-anchored, and here the anchor is right — unlike the vocabulary ban,
 * where 17 §2's own grep is a substring run and an anchored copy would be
 * strictly weaker than the gate it stands for. This rule has no gate behind it
 * to be weaker than; what it has is a shop that says "ups" inside "groups" and
 * "dpd" inside nothing at all. `\b` is what keeps the report readable, and a
 * report nobody skims is the only kind that gets acted on.
 *
 * IT IS NOT A COMPLETE LIST OF COMPANIES AND CANNOT BE. Naming every firm on
 * earth is the `ONE_SHOP_WORDS` problem again: the honest statement is that
 * this catches the ones a shop actually reaches for, that a reviewer still has
 * to read a diff, and that the twelve here are the twelve that have actually
 * turned up in a host's source or in a design comp.
 *
 * A HOST MAY NOT ADD TO IT, for `config.ts`'s reason: an add-on that named a
 * thirteenth firm would then pass in the host that had heard of it and fail in
 * the one that had not, which is 24 D21 broken by a route nobody looks down.
 * A thirteenth firm belongs here, where all twelve hosts get it.
 */
export const COMPANY_NAMES =
  /\b(dhl|canva|royal ?mail|stripe|mailchimp|fedex|ups|dpd|hermes|paypal|klarna|sendgrid|shopify)\b/i;

/**
 * The one line a host source may hold a company name on: the vendored import.
 *
 * Derived from `config.vendorDir` rather than written out, because the leaf
 * name is a host's own business and a hard-coded `vendor/` would silently stop
 * forgiving anything in a host that called it something else — the failure
 * being a red suite on correct code, which is how a gate earns an exemption.
 *
 * ── BOTH QUOTE STYLES, AND THE FIRST RETROFIT IS WHY ───────────────────────
 *
 * This pattern reads a HOST's source, and a host's quote style is the host's.
 * The kit's own sources are single-quoted and never hand-edited, which settles
 * the question for everything in `src/add-ons/kit/` and settles nothing here:
 * `factory-ops` is double-quoted throughout, wrote the one allowed line in its
 * own style, and this gate reported its registry as naming a company — a red
 * suite on the exact line the rule exists to permit. A gate that is red on
 * correct code is a gate somebody exempts a file for, and an exemption in
 * `registry.ts` would forgive every other line in the file that names one.
 *
 * The two spellings are alternated rather than written as a character class,
 * so an opening `'` closed by a `"` is still refused. That is not fussiness
 * about a case nobody writes — it is the difference between a pattern that
 * describes a line and one that merely accepts it.
 */
export function vendorImportLine(config: HostFacts): RegExp {
  const leaf = basename(config.vendorDir).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const path = `(?:\\.\\.?/)+${leaf}/[a-z0-9-]+/index\\.ts`;
  return new RegExp(
    `^import \\{ register as \\w+ \\} from (?:'${path}'|"${path}");$`,
  );
}

/**
 * TWO PIECES OF A SPECIFIER, KEPT APART SO THE INSTALL CANNOT EDIT A FIXTURE.
 *
 * `install-host-kit.sh` rewrites import specifiers on the way into a host: a
 * literal `'../../add-ons/vendor/host/index.ts'` becomes the vendored path, and a literal
 * `'../../add-ons/kit/x` becomes `'../../add-ons/kit/x`. That is correct for the imports at
 * the top of these files and WRONG for the strings a guard feeds itself, which
 * are fixtures rather than imports — and `sed` cannot tell the two apart.
 *
 * It had already happened, in two of these files, before anybody looked. In
 * `vendored.ts` the rewrite turned a bare-specifier fixture into a relative
 * path and the self-test failed on the FIRST retrofit that ran it — which was
 * the lucky half. In this file it rewrote two paths that still happened to
 * satisfy their assertions, so both cases went on passing while no longer
 * asking what they were written to ask. A guard whose own fixture has been
 * quietly edited is the exact shape of blindness this package exists to end.
 *
 * Splitting the literal defeats the rewrite because the rewrite matches a
 * QUOTED WHOLE — `'../../add-ons/vendor/host/index.ts'` including both quotes, and `'..`
 * immediately after an opening quote. Neither half below is either of those.
 * `files.test.ts` already builds its comment-token fixtures the same way, for
 * the same reason.
 *
 * DO NOT INLINE THESE.
 */
const SCOPE = `@${'adminium'}`;
const UP = `.${'.'}`;

/** One line of host source that names a company outside the allowed shape. */
export interface BrandFinding {
  file: string;
  line: number;
  text: string;
}

/**
 * Every company naming in one source, LINE BY LINE.
 *
 * Line by line rather than file by file for two reasons that pull the same way:
 * a finding a reader can act on has to say WHICH line, and the allowed import
 * shape is a property of a line — a file-level `test()` would either forgive
 * the whole of `registry.ts` or report it forever.
 */
export function brandFindings(
  file: string,
  source: string,
  allowedLine: RegExp,
): BrandFinding[] {
  return source
    .split('\n')
    .map((text, index) => ({ text: text.trim(), line: index + 1 }))
    .filter(({ text }) => COMPANY_NAMES.test(text) && !allowedLine.test(text))
    .map(({ text, line }) => ({ file, line, text }));
}

/**
 * Every shipped file that reaches into the guard half, or into `zod`.
 *
 * A path test rather than a resolved import, deliberately: the thing being
 * banned is the SPELLING of a reach into `testing/`, and a host that renamed
 * the directory would have moved `INSTALL_LAYOUT` too. What this cannot see is
 * an import laundered through a re-export in a shipped file — and that shipped
 * file would itself be reported, which is the property that makes the shallow
 * check sufficient rather than merely cheap.
 *
 * IT TAKES THE FIRST SEGMENT of `INSTALL_LAYOUT.guards`, which is `testing`,
 * and so bans the whole test-only directory rather than the kit's corner of it.
 * That is deliberate and is what both existing hosts already do: `src/testing/`
 * holds the vendored manifest validator as well as the word list, and neither
 * belongs in a bundle. The one thing that would break it is an install layout
 * whose guard half had NO leading directory — `guards: 'kit'` beside
 * `runtime: 'add-ons/kit'` — because the segment would then match the runtime
 * half too and report every screen that mounts a slot. The fix in that case is
 * to give the guard half its own directory again, not to widen this.
 */
export function guardHalfImportsIn(source: string, guardDir: string): string[] {
  const leaf = guardDir.split('/')[0] ?? guardDir;
  const escaped = leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `from\\s*['"][^'"]*\\/${escaped}\\/|from\\s*['"]zod['"]`,
    'g',
  );
  return [...source.matchAll(pattern)].map((match) => match[0]);
}

/** DECLARE THE BRAND SUITE for one host. */
export function brandGuard(config: HostFacts): void {
  describe(`${config.appKey} · the host names no company (24 AC5)`, () => {
    const allowedLine = vendorImportLine(config);

    it('has host sources to read', () => {
      // The guard on the guard. Every case here is an absence, and an absence
      // over an empty file list is a pass that means nothing — which is what a
      // moved `srcDir` or a mistyped `vendorDir` would produce.
      expect(
        ownShippedFiles(config).length,
        `no shipped host source found under ${config.srcDir} outside ${config.vendorDir}`,
      ).toBeGreaterThan(0);
    });

    it('mentions one only where an add-on bundle is imported', () => {
      const offenders = ownShippedFiles(config).flatMap((file) =>
        brandFindings(relativeTo(config, file), codeOf(file), allowedLine).map(
          (finding) => `${finding.file}:${finding.line}  ${finding.text}`,
        ),
      );
      expect(
        offenders,
        '\nThese lines of this host’s own source name a real company (24 AC5). The only ' +
          'line allowed to is the vendored add-on’s import, because a path is not a ' +
          'display string. Describe what the add-on DOES instead:\n' +
          offenders.join('\n') +
          '\n',
      ).toEqual([]);
    });

    it('would notice a company name put back on the shelf', () => {
      /*
       * THE GUARD IS AN ABSENCE; THIS IS IT BITING. Driven over the rule rather
       * than over `src/`, so it stays true on the day every source is clean —
       * which is every day until somebody types one.
       */
      const bites = (line: string): number =>
        brandFindings('x.ts', line, allowedLine).length;
      expect(bites("    name: 'Royal Mail Shipping',")).toBe(1);
      expect(bites("const carrier = 'DHL';")).toBe(1);
      expect(bites("    name: 'A second delivery company',")).toBe(0);

      const leaf = basename(config.vendorDir);
      expect(
        bites(`import { register as shippingDhl } from './${leaf}/shipping-dhl/index.ts';`),
        'the one allowed line shape was not recognised for this host’s vendor directory',
      ).toBe(0);
      // The same line in the other quote style, because a host's quote style is
      // the host's. Half the fleet is double-quoted and the single-quoted-only
      // pattern reported the first such host's registry as naming a company.
      expect(
        bites(`import { register as shippingDhl } from "./${leaf}/shipping-dhl/index.ts";`),
        'the allowed line was not recognised in this host’s own quote style',
      ).toBe(0);
      // …and MISMATCHED quotes are not a line anybody wrote, so they stay
      // refused: the two spellings are alternated rather than a character class.
      expect(
        bites(`import { register as shippingDhl } from './${leaf}/shipping-dhl/index.ts";`),
      ).toBe(1);
      // …and the allowance is narrow. A deeper reach into the add-on is a host
      // reading its internals, and a bare specifier is a different rule.
      expect(
        bites(`import { rates } from './${leaf}/shipping-dhl/rates.ts';`),
      ).toBe(1);
      expect(bites(`import { register } from '${SCOPE}/add-on-shipping-dhl';`)).toBe(1);
    });

    it('never lets shipped code reach the guard half, or zod', () => {
      /*
       * `INSTALL_LAYOUT` promises this guard by name. `guards/lexicon.ts`
       * spells every banned word, so a screen importing it would fail the very
       * release grep that file defines — a red RELEASE rather than a red test.
       */
      const offenders = shippedFiles(config)
        .filter((file) => guardHalfImportsIn(codeOf(file), INSTALL_LAYOUT.guards).length > 0)
        .map((file) => relativeTo(config, file));
      expect(
        offenders,
        `\nThese shipped files import ${INSTALL_LAYOUT.guards}/ or zod. The guard half spells ` +
          'every banned word and must never reach a bundle; zod is a devDependency this ' +
          'host does not ship (24 D7):\n' +
          offenders.join('\n') +
          '\n',
      ).toEqual([]);
    });

    it('would report such an import, in both spellings', () => {
      const found = (code: string): number =>
        guardHalfImportsIn(code, INSTALL_LAYOUT.guards).length;
      expect(found(`import { SUBSTRING_BANNED } from '${UP}/testing/kit/guards/lexicon.ts';`)).toBe(1);
      expect(found("import { z } from 'zod';")).toBe(1);
      // A file whose PROSE mentions the directory is not an import of it, and
      // the caller has already stripped comments — this is the belt.
      expect(found("const note = 'see testing/kit for the guards';")).toBe(0);
      expect(found(`import { AddOnSlot } from '${UP}/add-ons/kit/AddOnSlot.tsx';`)).toBe(0);
    });
  });
}
