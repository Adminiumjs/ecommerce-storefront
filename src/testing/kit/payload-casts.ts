/*
 * INSTALLED from add-ons/packages/host-kit/guards/payload-casts.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * NO CAST AT A MOUNT SITE — THE PAYLOAD CONTRACT IS THE ONLY THING HOLDING IT.
 *
 * ── THIS IS NOT OPTIONAL DECORATION ─────────────────────────────────────────
 *
 * A slot payload is the whole of the seam. The host builds it, the type says
 * what a slot carries, and every add-on written against that slot reads it — so
 * the payload's TYPE is the only thing that makes an add-on portable rather
 * than written for one shop. `packages/host/src/payloads.ts` records at length
 * what happened before that type existed: three add-ons each wrote down "what
 * arrived", meaning what the ONE host that existed happened to send, and the
 * seam quietly became that host's record layout under a general-sounding name.
 * Wired into a second host, the delivery add-on compiled and then threw three
 * times in three different components.
 *
 * A SINGLE CAST AT A MOUNT SITE PUTS ALL OF THAT BACK, and leaves every gate
 * green while it does. Replacing one host's `cart.line.preview` payload with
 *
 *     payload={{ line: { id: "x", name: "x" } as never }}
 *
 * leaves `tsc -b` completely clean and every test green — in that host AND in
 * the other one, where the personalizer's fill then resolves nothing and the
 * picture on the proof surface disappears behind the fallback tile. `as never`
 * assigns to anything. Nothing anywhere could have noticed: the type system was
 * asked not to look, and every suite that renders the surface sees a legitimate
 * empty state.
 *
 * SO THIS GUARD INSTALLS AT THE SAME MOMENT AS `AddOnSlot`, and never later. A
 * host that has the component and not this has a payload contract with a hatch
 * in it, which is the same as having no contract: the contract's entire value
 * is that a wrong shape is a compile error, and a cast is how a compile error
 * is turned off one line at a time. `tier.ts` makes that mechanical — it fails
 * a host that mounts the component and wires no payload-cast guard — because a
 * rule stated only in a header is a rule the twelfth host will not read.
 *
 * ── WHAT IS BANNED, AND WHY IT IS NOT "NO CASTS IN THIS FILE" ───────────────
 *
 * A blanket ban on `as` in the screens would fire on working code on its first
 * run — these apps write `t(\`data.product.${key}.name\` as never)` about ninety
 * times, because a message key built at run time cannot be a member of a union
 * derived from the English bundle. A rule that fires on working code acquires
 * an exemption list, and an exemption list is where nine of wave 4b's holes
 * came from.
 *
 * So the rule is scoped to the thing that matters, BY PARSING RATHER THAN BY
 * GREPPING: inside the `payload` of an `<AddOnSlot>`, a type assertion is a
 * defect. One shape is allowed, and it is a shape rather than a place — a cast
 * on a STRING LITERAL or template handed to a function, which is the
 * message-key idiom above and carries no payload data at all.
 *
 * A payload passed as a bare identifier is followed ONE HOP to its `const` in
 * the same file, because moving the object up two lines is the obvious way to
 * put a cast back out of reach.
 *
 * ── AND WHAT IT CANNOT SEE ──────────────────────────────────────────────────
 *
 * A payload assembled in a helper module and imported. This reads one file at a
 * time — a syntax rule, with no type-checker and no cross-module resolution —
 * so `payload={buildIt(order)}` is inside the rule and whatever `buildIt` does
 * in another file is not. That cost is stated rather than hidden: the mount
 * site is where the mutant went, and a helper that returns a typed value with
 * no cast in it is a helper the compiler is still checking.
 */

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import type { HostFacts } from '../../add-ons/kit/config.ts';
import { ownShippedFiles, read, relativeTo, withoutComments } from './files.ts';

/** The component every fill reaches the page through. */
const COMPONENT = 'AddOnSlot';

/** One type assertion found inside a slot payload. */
export interface CastFinding {
  file: string;
  line: number;
  text: string;
}

/** A cast that is really about a message key, which carries no payload data. */
function isMessageKeyCast(node: ts.AsExpression): boolean {
  const parent = node.parent;
  if (!ts.isCallExpression(parent)) return false;
  if (!parent.arguments.includes(node)) return false;
  return ts.isStringLiteralLike(node.expression) || ts.isTemplateExpression(node.expression);
}

function openingOf(node: ts.Node): ts.JsxOpeningLikeElement | null {
  if (ts.isJsxSelfClosingElement(node)) return node;
  if (ts.isJsxElement(node)) return node.openingElement;
  return null;
}

/**
 * Every type assertion inside an `<AddOnSlot>`'s payload, in one source.
 *
 * Exported so the kit's own suite can drive it over a synthetic mutant — the
 * rule is checked against a source that DOES have the defect, rather than only
 * against sources that do not.
 */
export function payloadCasts(file: string, source: string): CastFinding[] {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: CastFinding[] = [];

  const report = (node: ts.Node): void => {
    const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree));
    findings.push({
      file,
      line: line + 1,
      text: node.getText(tree).replace(/\s+/g, ' ').slice(0, 90),
    });
  };

  /** A payload expression, and anything it is built out of. */
  const inspect = (node: ts.Node): void => {
    if (ts.isAsExpression(node) && !isMessageKeyCast(node)) report(node);
    // `value!` — the same promise to the compiler with fewer letters. The
    // `<T>value` spelling beside it CANNOT occur in a `.tsx` source, because
    // TypeScript gives the angle brackets to JSX; it is kept because this
    // walker is exported and `payload-casts.test.ts` records the fact rather
    // than leaving a branch nobody can explain.
    else if (ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node)) report(node);
    node.forEachChild(inspect);
  };

  /** The `const x = …` a bare `payload={x}` refers to, in this file. */
  const declarationOf = (name: string): ts.Node | null => {
    let found: ts.Node | null = null;
    const look = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === name &&
        node.initializer !== undefined
      ) {
        found = node.initializer;
      }
      node.forEachChild(look);
    };
    look(tree);
    return found;
  };

  const walk = (node: ts.Node): void => {
    const opening = openingOf(node);
    if (opening !== null && opening.tagName.getText(tree) === COMPONENT) {
      for (const attribute of opening.attributes.properties) {
        if (!ts.isJsxAttribute(attribute)) continue;
        if (attribute.name.getText(tree) !== 'payload') continue;
        const value = attribute.initializer;
        if (value === undefined || !ts.isJsxExpression(value) || value.expression === undefined) {
          continue;
        }
        inspect(value.expression);
        if (ts.isIdentifier(value.expression)) {
          const declared = declarationOf(value.expression.text);
          if (declared !== null) inspect(declared);
        }
      }
    }
    node.forEachChild(walk);
  };
  walk(tree);
  return findings;
}

/** How many `<AddOnSlot>`s a source mounts, for the guard on the guard. */
export function mountCount(file: string, source: string): number {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let mounts = 0;
  const walk = (node: ts.Node): void => {
    const opening = openingOf(node);
    if (opening !== null && opening.tagName.getText(tree) === COMPONENT) mounts += 1;
    node.forEachChild(walk);
  };
  walk(tree);
  return mounts;
}

/** DECLARE THE PAYLOAD-CAST SUITE for one host. */
export function payloadCastsGuard(config: HostFacts): void {
  describe(`${config.appKey} · no mount site casts past the payload contract`, () => {
    const files = ownShippedFiles(config)
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => ({ rel: relativeTo(config, file), source: read(file) }));

    it('found every mount site, by two different means', () => {
      /*
       * THE GUARD ON THE GUARD, AND NOT A COUNT.
       *
       * A threshold ("more than five") is a number fitted to whichever app its
       * author had open — one host mounts five slots and another mounts nine,
       * so the same threshold is a pass in one repo and a red suite on faultless
       * code in the next. That is the `expect(ALL).toHaveLength(7)` shape, and
       * it is exactly what this package exists to stop shipping twelve times.
       *
       * So the parser is checked against a GREP instead. Every file that
       * mentions the component in CODE has to produce at least one mount here.
       * A renamed component, a moved directory or a parser that stopped
       * recognising TSX shows up as a named disagreement rather than a quiet
       * zero — and the disagreement is scale-free, so it means the same thing
       * in a host with three mounts and a host with thirty.
       */
      const mentions = new RegExp(`<${COMPONENT}[\\s/>]`);
      const missed = files
        .filter(({ source }) => mentions.test(withoutComments(source)))
        .filter(({ rel, source }) => mountCount(rel, source) === 0)
        .map(({ rel }) => rel);
      expect(missed, 'these files mount the component and the parser did not see it').toEqual([]);

      const mounts = files.reduce((sum, f) => sum + mountCount(f.rel, f.source), 0);
      expect(
        mounts,
        `no <${COMPONENT}> was found in ${config.appKey}'s own sources at all — either the ` +
          'seam is not installed, or srcDir/vendorDir point somewhere unexpected',
      ).toBeGreaterThan(0);
    });

    it('mounts every slot with a payload the compiler has actually checked', () => {
      const findings = files.flatMap(({ rel, source }) => payloadCasts(rel, source));
      expect(
        findings.map((f) => `${f.file}:${f.line}  ${f.text}`),
        '\nA type assertion inside a slot payload switches off the one contract that ' +
          'makes an add-on portable. `as never` assigns to anything, tsc stays clean, ' +
          'and the add-on’s fill silently resolves nothing. Give the payload the shape ' +
          'the slot declares instead:\n' +
          findings.map((f) => `${f.file}:${f.line}  ${f.text}`).join('\n') +
          '\n',
      ).toEqual([]);
    });

    it('reports the mutant, and forgives the message-key idiom', () => {
      /*
       * THE RULE, DRIVEN. Both halves matter: a rule that reports nothing is
       * indistinguishable from a rule that is switched off, and a rule that
       * reports the app's own working code gets switched off.
       */
      const mutant = `
        const x = (
          <AddOnSlot
            slot="cart.line.preview"
            payload={{ line: { id: "x", name: "x" } as never }}
          />
        );
      `;
      expect(payloadCasts('mutant.tsx', mutant).length, 'the mutant was not reported').toBe(1);

      const throughAVariable = `
        const payload = { line: undefined as never };
        const x = <AddOnSlot slot="cart.line.preview" payload={payload} />;
      `;
      expect(
        payloadCasts('hop.tsx', throughAVariable).length,
        'a payload built one line above the mount was not followed',
      ).toBe(1);

      const banged = `
        const x = <AddOnSlot slot="cart.line.preview" payload={{ line: maybe! }} />;
      `;
      expect(payloadCasts('bang.tsx', banged).length, '`!` is the same promise').toBe(1);

      const honest = `
        const x = (
          <AddOnSlot
            slot="cart.line.preview"
            payload={{ line: orderItem(waiting, t(\`data.product.\${k}.name\` as never)) }}
          />
        );
      `;
      expect(
        payloadCasts('honest.tsx', honest),
        'the message-key idiom these apps use ninety times must not be a finding',
      ).toEqual([]);
    });
  });
}
