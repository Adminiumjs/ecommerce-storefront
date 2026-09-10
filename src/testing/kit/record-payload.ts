/*
 * INSTALLED from add-ons/packages/host-kit/guards/record-payload.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * A `record.actions` MOUNT HANDS OVER A RECORD, NOT A GUESS
 * (34-invoices-add-on.md §5.3, §6.4; 34-T28).
 *
 * ── THE INVERSION THIS PROTECTS ─────────────────────────────────────────────
 *
 * §5.3 settles the mapping the holiday-calendars way: THE HOST PROJECTS, THE
 * ADD-ON VALIDATES. The add-on ships no per-host mapping — one for a till's
 * `sale` shape would name the host inside a portable package — so the host
 * projects its own record into the outline's slot ids at the mount site, and
 * `subjectFromHost` refuses a typed `MISSING_SLOT` for any `required` slot that
 * did not arrive.
 *
 * That refusal is the real check, and it is the ADD-ON's. What a host-side
 * guard can add is the half the refusal never sees: a mount that never hands
 * over a record at all, or hands over one assembled at the mount site.
 *
 * ── WHY THE `required`-SLOT COMPARISON IS NOT HERE ──────────────────────────
 *
 * Because the required slots are the ADD-ON's, per kind, and a guard that
 * restated them would be a host-local copy of an add-on's outline — which is
 * the exact defect `factsGuard` exists to catch, five times over. A host that
 * projects the wrong keys learns so from `MISSING_SLOT`, by name, at the moment
 * it asks for a document.
 *
 * So this guard asks the three questions that are the HOST's own business:
 *
 *   · does every `record.actions` mount name an entity and a record?
 *   · is the record a PROJECTION — a call — rather than an object literal
 *     typed out at the mount site, which is a host hardcoding one add-on's
 *     slot ids into a screen and the thing §5.3's inversion exists to prevent?
 *   · does every entity it mounts for appear in the host's own served list, so
 *     a screen cannot quietly offer documents for a record type nobody decided
 *     to serve?
 */

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import type { HostFacts } from '../../add-ons/kit/config.ts';
import { ownShippedFiles, read, relativeTo } from './files.ts';

/** The mount component, spelled once. */
const COMPONENT = 'AddOnSlot';

/** The slot this guard is about. */
export const RECORD_ACTIONS = 'record.actions';

/** What the payload contract requires of every `record.actions` mount. */
export const REQUIRED_PAYLOAD_MEMBERS = ['entity', 'record'] as const;

export interface PayloadFinding {
  file: string;
  line: number;
  /** `missing:<member>`, `inline-record`, or `entity-not-served:<id>`. */
  code: string;
  text: string;
}

function openingOf(node: ts.Node): ts.JsxOpeningLikeElement | null {
  if (ts.isJsxSelfClosingElement(node)) return node;
  if (ts.isJsxOpeningElement(node)) return node;
  return null;
}

/** The string value of a JSX attribute, when it is a plain literal. */
function literalAttribute(
  opening: ts.JsxOpeningLikeElement,
  name: string,
  tree: ts.SourceFile,
): string | null {
  for (const attribute of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || attribute.name.getText(tree) !== name) continue;
    const value = attribute.initializer;
    if (value === undefined) return null;
    if (ts.isStringLiteral(value)) return value.text;
    if (ts.isJsxExpression(value) && value.expression !== undefined) {
      const inner = value.expression;
      if (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) return inner.text;
    }
  }
  return null;
}

/** The payload attribute's object literal, when it is written as one. */
function payloadLiteral(
  opening: ts.JsxOpeningLikeElement,
  tree: ts.SourceFile,
): ts.ObjectLiteralExpression | null {
  for (const attribute of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || attribute.name.getText(tree) !== 'payload') continue;
    const value = attribute.initializer;
    if (value === undefined || !ts.isJsxExpression(value) || value.expression === undefined) {
      return null;
    }
    return ts.isObjectLiteralExpression(value.expression) ? value.expression : null;
  }
  return null;
}

/**
 * Every `record.actions` mount in one file, judged.
 *
 * `servedEntities` empty means the host has not declared a list, and the third
 * question is not asked — a host with one entity and no list is not wrong, it
 * has nothing to disagree with.
 */
export function recordPayloadFindings(
  file: string,
  source: string,
  servedEntities: readonly string[],
): PayloadFinding[] {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: PayloadFinding[] = [];

  const at = (node: ts.Node): { line: number; text: string } => {
    const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree));
    return { line: line + 1, text: node.getText(tree).replace(/\s+/g, ' ').slice(0, 110) };
  };

  const walk = (node: ts.Node): void => {
    const opening = openingOf(node);
    if (opening !== null && opening.tagName.getText(tree) === COMPONENT) {
      if (literalAttribute(opening, 'slot', tree) === RECORD_ACTIONS) {
        const where = at(opening);
        const literal = payloadLiteral(opening, tree);
        if (literal === null) {
          /*
           * A payload built elsewhere and passed by name. Not a finding: a host
           * may legitimately compute the whole thing, and this guard cannot
           * follow an identifier without becoming a type checker. The members
           * are the payload TYPE's business, which tsc already enforces.
           */
          node.forEachChild(walk);
          return;
        }

        const members = new Map<string, ts.Expression | undefined>();
        for (const property of literal.properties) {
          if (ts.isPropertyAssignment(property)) {
            members.set(property.name.getText(tree).replace(/['"]/g, ''), property.initializer);
          } else if (ts.isShorthandPropertyAssignment(property)) {
            members.set(property.name.getText(tree), undefined);
          }
        }

        for (const member of REQUIRED_PAYLOAD_MEMBERS) {
          if (!members.has(member)) {
            findings.push({ file, code: `missing:${member}`, ...where });
          }
        }

        /*
         * A `record` written out at the mount site is a host typing an add-on's
         * slot ids into its own screen. It compiles, it renders, and it is the
         * thing §5.3's inversion exists to prevent — the day a second kind
         * arrives, or a slot is renamed, that literal is the copy nobody
         * remembers. A projection is a call, and a call has one definition.
         */
        const record = members.get('record');
        if (record !== undefined && ts.isObjectLiteralExpression(record)) {
          findings.push({ file, code: 'inline-record', ...where });
        }

        const entity = members.get('entity');
        if (
          servedEntities.length > 0 &&
          entity !== undefined &&
          ts.isStringLiteral(entity) &&
          !servedEntities.includes(entity.text)
        ) {
          findings.push({ file, code: `entity-not-served:${entity.text}`, ...where });
        }
      }
    }
    node.forEachChild(walk);
  };

  walk(tree);
  return findings;
}

export interface RecordPayloadScope {
  /**
   * The entity ids this host offers documents for.
   *
   * Empty (or absent) means "not declared", and the served-entity question is
   * skipped rather than failed — a host with one record type and no list has
   * nothing to disagree with. A host that HAS a list gets it checked.
   */
  servedEntities?: readonly string[];
}

/** DECLARE THE RECORD-PAYLOAD SUITE for one host. Tier 1: source only, no DOM. */
export function recordPayloadGuard(config: HostFacts, scope: RecordPayloadScope = {}): void {
  describe(`${config.appKey} · what a record.actions mount hands over (34 §5.3)`, () => {
    const served = scope.servedEntities ?? [];
    const files = ownShippedFiles(config)
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => ({ rel: relativeTo(config, file), source: read(file) }));

    it('has sources to read', () => {
      // An absence over an empty file list is indistinguishable from a pass —
      // the way `guards/facts.ts` globbed one level too high and found nothing.
      expect(files.length, 'this host ships no .tsx at all').toBeGreaterThan(0);
    });

    it('hands over an entity and a record at every record.actions mount', () => {
      const findings = files.flatMap((file) =>
        recordPayloadFindings(file.rel, file.source, served).filter((f) =>
          f.code.startsWith('missing:'),
        ),
      );
      expect(
        findings.map((f) => `${f.file}:${f.line} ${f.code}\n    ${f.text}`),
        '\nA record.actions fill is handed a record to draw from. Without one it can only ' +
          'refuse, and the refusal arrives on a customer’s screen:\n',
      ).toEqual([]);
    });

    it('projects the record rather than typing it out at the mount site', () => {
      const findings = files.flatMap((file) =>
        recordPayloadFindings(file.rel, file.source, served).filter(
          (f) => f.code === 'inline-record',
        ),
      );
      expect(
        findings.map((f) => `${f.file}:${f.line}\n    ${f.text}`),
        '\nThese write the projection out at the mount site, which puts one add-on’s slot ids ' +
          'in a screen. Move it to a named projection — §5.3’s `subjectFieldsOf` — so there is ' +
          'one definition to change when a slot is renamed:\n',
      ).toEqual([]);
    });

    it('mounts only for entities this host says it serves', () => {
      const findings = files.flatMap((file) =>
        recordPayloadFindings(file.rel, file.source, served).filter((f) =>
          f.code.startsWith('entity-not-served:'),
        ),
      );
      expect(
        findings.map((f) => `${f.file}:${f.line} ${f.code}\n    ${f.text}`),
        '\nThese offer documents for a record type the host’s own served list does not name:\n',
      ).toEqual([]);
    });
  });
}
