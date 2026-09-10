/*
 * INSTALLED from add-ons/packages/host-kit/guards/delivery-claims.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * A SCREEN MAY NOT SAY SOMETHING WAS DELIVERED UNLESS SOMETHING WAS
 * (34-invoices-add-on.md D19, §6.4; 34-T28).
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────
 *
 * Copy that names a delivery — emailed, sent, printed, downloading — is a claim
 * about the world. There are exactly three ways a host may make one:
 *
 *   1. it is DECLARED: the host writes down, per key, the answer — the surface
 *      reads a document row's `delivery`; or the words are a stage name rather
 *      than a claim; or it is a known lie whose fix is written down somewhere
 *      a grep will find. See `claimsDeclared`.
 *   2. it is LABELLED: the string carries this host's demo marker, in EVERY
 *      language, so a reader is told the result is simulated.
 *   3. it does not exist.
 *
 * Everything else is a lie with a translation budget. Three shipped ones are
 * the fixtures this guard was written from:
 *
 *     support-desk  an invoice toast reading "Downloading {file}" for a file
 *                   that was never written (Appendix A exhibit 4). 34-T28b
 *                   removed the button rather than labelling it.
 *     storefront    `screens.confirm.receiptLine` — "We've emailed a receipt
 *                   to {email}", from a build that sends no mail
 *     point-of-sale `toast.receiptSentEmail` — "Email receipt simulated ·
 *                   demo only", which is the SAME claim done correctly
 *
 * ── WHY THE PAIRING HALF IS A SEPARATE QUESTION ─────────────────────────────
 *
 * A label that exists in English and nowhere else is worse than no label: the
 * English reader is told it is a demo and seven other readers are told the
 * thing happened. That is not hypothetical — it is what a translator dropping a
 * trailing "· demo only" produces, and nothing else in this kit would see it,
 * because every other check reads one locale or reads them all for BANNED
 * words rather than for a required one.
 *
 * So the guard asks two questions of different shapes: does this claim carry a
 * label at all, and does the label survive translation.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────
 *
 * It does not trace `t('key')` back to the branch that renders it. Reachability
 * under a `DEMO &&` is the thing a host means by "this only appears in the demo
 * build", and deciding it needs a control-flow analysis this package would then
 * have to be right about forever. A wrong reachability answer is a guard that
 * passes a real lie, which is worse than one that asks the host to say so out
 * loud. `claimsDeclared` is the host saying so out loud.
 */

import { describe, expect, it } from 'vitest';

import type { HostFacts } from '../../add-ons/kit/config.ts';

/**
 * English claim shapes, as WORD-BOUNDED patterns.
 *
 * English only, and on purpose: the guard reads meaning from one language and
 * structure from the rest. A seven-language claim list is the thing
 * `lexicon.ts` maintains for BANNED ideas, and it can do that because a false
 * positive there costs a reword. Here a false positive would demand a label on
 * a sentence that promises nothing, and hosts would learn to declare their way
 * out of the guard — which is how a gate becomes a formality.
 *
 * The list is deliberately about DELIVERY and ARTIFACTS, not about intent:
 * "we will email you" is a promise about the future and no lie today; "we have
 * emailed you" and "downloading receipt.pdf" are statements about now.
 */
export const CLAIM_PATTERNS: readonly { readonly id: string; readonly re: RegExp }[] = [
  /*
   * `emailed`, never a bare `email`. The first draft of this pattern read
   * `email(ed)?\s+to` and matched "Enter an email to subscribe" — an
   * INSTRUCTION, in a shipped bundle, which the guard would have demanded a
   * demo label on. Found by running the pattern over five real hosts rather
   * than over the fixtures it was written from.
   */
  { id: 'emailed', re: /\bemailed\b/i },
  { id: 'sent', re: /\b(was|were|has\s+been|have\s+been)\s+sent\b|\bsent\s+to\b/i },
  /*
   * `downloading`, not `downloaded`. The past participle is almost always
   * about what the READER did — "keep the recordings you've downloaded",
   * "anyone who already downloaded a copy keeps it" — and demanding a demo
   * label on those would teach a host to declare its way out of the rule. The
   * present participle is an app announcing an action it is taking now, which
   * is the thing that has to be true.
   */
  { id: 'downloading', re: /\bdownloading\b/i },
  { id: 'printed', re: /\b(was|were|has\s+been)\s+printed\b|\bprinting\s+(your|the)\b/i },
  { id: 'on-the-way', re: /\bis\s+on\s+the\s+way\b|\bon\s+its\s+way\b/i },
];

/** Which claim a string makes, or null. */
export function claimIn(text: string): string | null {
  for (const pattern of CLAIM_PATTERNS) if (pattern.re.test(text)) return pattern.id;
  return null;
}

export interface DeliveryClaimScope {
  /** The message bundle for one locale tag — the same shape `lexiconGuard` takes. */
  bundleFor: (locale: string) => Readonly<Record<string, string>>;
  /**
   * This host's demo marker, per locale tag.
   *
   * The exact substring, as it appears in the bundle: `· demo only`,
   * `· nur Demo`, `· jen ukázka`. A record rather than one string because the
   * marker is COPY — it is translated like everything else, and a guard that
   * looked for the English one in eight languages would pass every locale that
   * translated it and fail every locale that did not, which is backwards.
   *
   * ── LEAVE IT EMPTY UNLESS THE MARKER IS A FIXED SUFFIX ────────────────────
   *
   * A host that labels its simulations IN PROSE — "…in this demo, no email is
   * actually sent" — has no marker to match. Measured on a real one: eight
   * declared substrings matched most strings and missed the handful whose
   * translator wrote the same idea a different way, and the pairing half then
   * reported a dozen correctly-labelled strings as unlabelled. A guard that
   * fires on good copy is one hosts learn to route around.
   *
   * So: a suffix convention (`· demo only`) declares markers and gets both
   * halves; a prose convention declares NONE and answers each claim in
   * `claimsDeclared`, which is a list a reviewer reads once and a ratchet
   * afterwards.
   */
  demoLabels: Readonly<Record<string, string>>;
  /**
   * Claims this host has already answered for, each with its answer.
   *
   * A record rather than a list, so a claim cannot be waved through without
   * writing why — the shape and the argument `affiliationExempt` established.
   * There are exactly three answers worth writing, and a reviewer reading the
   * reason can tell which one is being made:
   *
   *   BACKED     the surface reads a document row's `delivery` and says this
   *              only on `sent`. Name the read.
   *   NOT A CLAIM  the string is a stage name or a heading that happens to
   *              contain the words — "On its way", the third step of a
   *              progress bar. Say which.
   *   DEPOSITED  it IS a lie, it is known, and the fix is written down
   *              somewhere a grep will find. Name the place.
   *
   * The last one is not a loophole so long as it names where the debt lives:
   * the alternative is a guard a host cannot adopt without fixing everything
   * at once, and a guard nobody adopts gates nothing.
   */
  claimsDeclared?: Readonly<Record<string, string>>;
  /**
   * Which keys are the ADD-ON's copy rather than this host's.
   *
   * The same split `lexiconGuard` takes, and the same default (`addon.`): a
   * vendored add-on's words are the add-on's business, and a host cannot fix
   * them without hand-editing a synced tree — which `vendoredGuard` refuses.
   * Measured on a real host: three of eighteen findings were a carrier
   * add-on's own simulated-rate copy, which its OWN conformance suite is
   * responsible for.
   */
  contributed?: (key: string) => boolean;
}

export interface ClaimFinding {
  key: string;
  locale: string;
  claim: string;
  text: string;
}

/** Claims with neither a label nor a declaration, in the host's first locale. */
export function unlabelledClaims(config: HostFacts, scope: DeliveryClaimScope): ClaimFinding[] {
  const [english] = config.localeTags;
  if (english === undefined) return [];
  const declared = scope.claimsDeclared ?? {};
  const theirs = scope.contributed ?? ((key: string) => key.startsWith('addon.'));
  const marker = scope.demoLabels[english];
  const out: ClaimFinding[] = [];
  for (const [key, text] of Object.entries(scope.bundleFor(english))) {
    if (typeof text !== 'string') continue;
    if (theirs(key)) continue;
    const claim = claimIn(text);
    if (claim === null) continue;
    if (Object.prototype.hasOwnProperty.call(declared, key)) continue;
    if (marker !== undefined && marker !== '' && text.includes(marker)) continue;
    out.push({ key, locale: english, claim, text });
  }
  return out;
}

/** Labels that exist in English and went missing in translation. */
export function droppedLabels(config: HostFacts, scope: DeliveryClaimScope): ClaimFinding[] {
  const [english, ...rest] = config.localeTags;
  if (english === undefined) return [];
  const englishMarker = scope.demoLabels[english];
  if (englishMarker === undefined || englishMarker === '') return [];

  const source = scope.bundleFor(english);
  const labelled = Object.keys(source).filter((key) => String(source[key]).includes(englishMarker));

  const out: ClaimFinding[] = [];
  for (const locale of rest) {
    const marker = scope.demoLabels[locale];
    const bundle = scope.bundleFor(locale);
    for (const key of labelled) {
      const text = bundle[key];
      /*
       * An ABSENT key is not this guard's finding — a locale missing a key
       * falls back, and the untranslated sweep owns that. What is a finding is
       * a key that WAS translated and lost its label on the way: the reader
       * gets this locale's sentence, in full, with the qualifier gone.
       */
      if (text === undefined) continue;
      if (marker === undefined || marker === '') {
        out.push({ key, locale, claim: 'no-marker-declared', text });
        continue;
      }
      if (!text.includes(marker)) out.push({ key, locale, claim: 'label-dropped', text });
    }
  }
  return out;
}

/**
 * The suite a host's own test file calls.
 *
 * Tier 1: it reads bundles and a config, and needs no DOM.
 */
export function deliveryClaimsGuard(config: HostFacts, scope: DeliveryClaimScope): void {
  describe(`${config.appKey} · build-mode claims about delivery (34 D19)`, () => {
    it('has bundles to read, in every locale this host ships', () => {
      /*
       * THE GUARD ON THE GUARD. Every case below is an absence over a bundle,
       * and an absence over an empty object is indistinguishable from a pass —
       * the way this kit's built-output gate went blind twice.
       */
      expect(config.localeTags.length, 'this host declares no locales at all').toBeGreaterThan(0);
      const empty = config.localeTags.filter(
        (locale) => Object.keys(scope.bundleFor(locale)).length === 0,
      );
      expect(empty, 'these locales resolved to an empty bundle').toEqual([]);
    });

    it('declares a demo marker for every locale, or none at all', () => {
      /*
       * A PARTIAL declaration is the worst of the three states: the locales
       * with a marker are checked, the ones without are silently exempt from
       * the pairing half, and the gap looks like coverage. Either this host
       * labels its simulations in every language it ships, or it labels none
       * and every claim has to be backed instead.
       */
      const declared = config.localeTags.filter((locale) => {
        const marker = scope.demoLabels[locale];
        return marker !== undefined && marker !== '';
      });
      expect(
        declared.length === 0 || declared.length === config.localeTags.length,
        `${declared.length} of ${config.localeTags.length} locales declare a demo marker — ` +
          'the rest would be exempt from the pairing check without saying so',
      ).toBe(true);
    });

    it('makes no claim about a delivery that is neither backed nor labelled', () => {
      const findings = unlabelledClaims(config, scope);
      expect(
        findings.map((f) => `${f.key} [${f.claim}]\n    ${f.text}`),
        '\nThese strings tell a reader something was delivered. Either the surface reads a ' +
          'document row’s `delivery` — declare the key in `claimsDeclared` with the reason — ' +
          'or the copy carries this host’s demo marker in every language, or it goes:\n',
      ).toEqual([]);
    });

    it('keeps every demo label through translation', () => {
      const findings = droppedLabels(config, scope);
      expect(
        findings.map((f) => `${f.key} · ${f.locale} [${f.claim}]\n    ${f.text}`),
        '\nThese carry the demo marker in English and not in their own language. The English ' +
          'reader is told it is simulated and these readers are told it happened:\n',
      ).toEqual([]);
    });

    it('names a real key for every declaration', () => {
      /*
       * An exemption for a key that no longer exists is an exemption doing
       * nothing but widening the rule — the same argument `affiliationExempt`
       * makes, and the same failure: the key is renamed, the declaration stays,
       * and the new key walks in unchecked.
       */
      const [english] = config.localeTags;
      const bundle = english === undefined ? {} : scope.bundleFor(english);
      const stale = Object.keys(scope.claimsDeclared ?? {}).filter(
        (key) => !Object.prototype.hasOwnProperty.call(bundle, key),
      );
      expect(stale, 'these declarations name keys this host no longer ships').toEqual([]);
    });

    it('does not let a declaration cover a string that stopped making a claim', () => {
      /*
       * The other direction, and the one that quietly accumulates: a string is
       * reworded to promise nothing, the declaration outlives it, and the next
       * person to edit that key has an exemption already in place for whatever
       * they write.
       */
      const [english] = config.localeTags;
      const bundle = english === undefined ? {} : scope.bundleFor(english);
      const idle = Object.keys(scope.claimsDeclared ?? {}).filter((key) => {
        const text = bundle[key];
        return typeof text === 'string' && claimIn(text) === null;
      });
      expect(
        idle,
        'these keys no longer claim a delivery — drop the declaration rather than leaving ' +
          'an exemption in front of whatever is written there next',
      ).toEqual([]);
    });
  });
}
