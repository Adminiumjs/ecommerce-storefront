/*
 * INSTALLED from add-ons/packages/host-kit/guards/vendored.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * THE VENDORED HALVES ARE COPIES, THEY SAY SO, AND THE TREE STANDS ALONE.
 *
 * ── WHY A HOST VENDORS AT ALL ───────────────────────────────────────────────
 *
 * Each example app is published standalone and built from a clean clone with no
 * sibling checkout of anything. It has no `node_modules` entry for
 * `@adminium/add-on-host` and never will. So the sync copies the add-on client
 * halves — and the shared contract package with them — into
 * `<srcDir>/add-ons/vendor/`, and rewrites the bare specifiers onto the
 * vendored copy. The tree is then self-contained: it compiles with nothing
 * beside it.
 *
 * ── AND WHY THE SYNC SCRIPT CANNOT GUARD ITSELF ─────────────────────────────
 *
 * The script has a `status` mode that compares each vendored file byte for byte
 * with the monorepo it came from, and it is worth having. It cannot catch the
 * failure that actually happened, and the reason is worth stating precisely
 * because it is not obvious:
 *
 *   STATUS APPLIES THE SAME REWRITE TO BOTH SIDES BEFORE COMPARING. So two
 *   files NEITHER of which was rewritten agree perfectly. On the first run of
 *   the rewired script a `sed -E` backreference matched nothing on BSD — which
 *   is to say on every macOS machine — the vendored tree came out full of
 *   unresolvable imports, `status` reported everything green, and what broke
 *   was the build.
 *
 * A rewrite that silently fires zero times is invisible to any check written in
 * terms of the rewrite. It is not invisible to a check written in terms of the
 * TREE, which is what this file is: no bare specifier survives, whatever the
 * script did or failed to do.
 *
 * ── AND WHAT THIS CANNOT SEE ────────────────────────────────────────────────
 *
 * A hand-edit. A vendored file whose body was changed still carries its header
 * and still resolves; only `status` can see that, and only where the monorepo
 * is checked out beside the host. What is checked HERE is what can always be
 * checked — from a clean clone of the host alone, with no sibling repository
 * and no script run — which is precisely the situation a CI box is in.
 */

import { describe, expect, it } from 'vitest';

import type { HostFacts } from '../../add-ons/kit/config.ts';
import { codeOf, read, relativeTo, vendoredFiles } from './files.ts';

/** The sentence the sync writes onto every copy, and the one nobody may drop. */
export const NEVER_HAND_EDIT = 'Never hand-edit this copy';

/** How many lines of a vendored file the header must live in. */
const HEADER_LINES = 5;

export interface VendoredGuardOptions {
  /**
   * The script that writes the header, as the header names it.
   *
   * An option rather than a constant because the header points a reader at a
   * path INSIDE THE HOST, and a host is entitled to file its scripts where it
   * likes. What is not optional is that the header names one: a copy that does
   * not say how to regenerate itself is a copy somebody edits.
   */
  syncScript?: string;
  /**
   * The bare specifiers a vendored file may still name after the rewrite.
   *
   * `config.ts` has no field for this and deliberately so: it is not a fact
   * about the host's LAYOUT, it is the host's runtime dependency list (24 D7),
   * and a host that adds one has made a decision that belongs in the diff where
   * the dependency was added. The default is the four every example app already
   * carries; a host passing a fifth is saying so where a reviewer sees it.
   */
  allowedBareSpecifiers?: readonly string[];
}

const DEFAULT_ALLOWED = ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react'] as const;

/** What is wrong with one vendored file's header, if anything. */
export function syncHeaderProblems(head: string, syncScript: string): string[] {
  const problems: string[] = [];
  const escaped = syncScript.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const provenance = new RegExp(
    `^ \\* VENDORED from \\S+/packages/[a-z0-9-]+/src/\\S+ \u2014 synced by ${escaped}\\.$`,
    'm',
  );
  if (!head.startsWith('/*')) problems.push('does not open with a block comment');
  if (!provenance.test(head)) {
    problems.push(`names no source package, or does not point at ${syncScript}`);
  }
  if (!head.includes(NEVER_HAND_EDIT)) problems.push(`does not say “${NEVER_HAND_EDIT}”`);
  return problems;
}

/**
 * Every bare module specifier a source names.
 *
 * `(?:from|import)` with an optional `(` so a dynamic `import('…')` is read as
 * well as a static one — the rewrite has to reach both, and a dynamic import
 * that survived it fails at run time rather than at build time, which is the
 * worse of the two.
 */
export function bareSpecifiersIn(code: string): string[] {
  const bare = /(?:from|import)\s*\(?\s*['"](@[^'"]+|[a-z][^'"./]*)['"]/g;
  return [...code.matchAll(bare)].map((match) => match[1]!);
}

/** DECLARE THE VENDORED-COPY SUITE for one host. */
export function vendoredGuard(config: HostFacts, options: VendoredGuardOptions = {}): void {
  const syncScript = options.syncScript ?? 'scripts/sync-add-ons.sh';
  const allowed = new Set(options.allowedBareSpecifiers ?? DEFAULT_ALLOWED);

  describe(`${config.appKey} · the vendored halves are copies, and say so`, () => {
    const files = () => vendoredFiles(config);

    it('has a vendored tree to read', () => {
      /*
       * THE GUARD ON THE GUARD, and here it is not a formality: `walk` returns
       * an empty list for a directory that does not exist, so a mistyped
       * `vendorDir` makes every case below pass by having nothing to check.
       * That is the same shape as a glob that stopped matching, and it is the
       * single commonest way a gate in this repo has gone blind.
       */
      expect(
        files().length,
        `no vendored file found under ${config.vendorDir}. Either the sync has never ` +
          'run, or `vendorDir` points somewhere that is not the vendor tree',
      ).toBeGreaterThan(0);
    });

    it('carries the sync header on every vendored file', () => {
      const offenders = files()
        .map((file) => ({
          rel: relativeTo(config, file),
          problems: syncHeaderProblems(
            read(file).split('\n').slice(0, HEADER_LINES).join('\n'),
            syncScript,
          ),
        }))
        .filter(({ problems }) => problems.length > 0)
        .map(({ rel, problems }) => `${rel} — ${problems.join('; ')}`);
      expect(
        offenders,
        '\nA vendored file with no header is a file the next reader edits. The header ' +
          'names where the copy came from and how to regenerate it:\n' +
          offenders.join('\n') +
          '\n',
      ).toEqual([]);
    });

    it('resolves every vendored import inside the vendored tree', () => {
      /*
       * THE SELF-CONTAINMENT CHECK, stated over the TREE rather than over the
       * rewrite — see this file's header for why the sync's own `status` cannot
       * make this claim. A surviving `@adminium/…` is called out by name
       * because it is the specific shape the BSD `sed` failure produces, and a
       * reader who sees it should go and look at the script rather than at the
       * add-on.
       */
      const offenders = files()
        .filter((file) => /\.tsx?$/.test(file))
        .flatMap((file) =>
          bareSpecifiersIn(codeOf(file))
            .filter((spec) => !allowed.has(spec))
            .map((spec) => {
              const note = spec.startsWith('@adminium/')
                ? ' ← the rewrite did not fire; a `sed -E` backreference matches nothing on BSD'
                : '';
              return `${relativeTo(config, file)} · ${spec}${note}`;
            }),
        );
      expect(
        offenders,
        '\nThese vendored files name a package this host does not have and never will. ' +
          'The vendored tree must compile with nothing beside it:\n' +
          offenders.join('\n') +
          '\n',
      ).toEqual([]);
    });

    it('vendors the shared contract exactly once', () => {
      /*
       * THE REASON THE THREE ADD-ON REPOS BECAME ONE. Each used to carry its
       * own copy of `AddOn`; they disagreed within a day — 19 members in one,
       * 18 in another, 18 in the third, and two members the host declares in
       * none of them — and one host held all three. Nothing failed and nothing
       * could have, because no suite anywhere had two copies in front of it.
       *
       * The PATH is not asserted, only the count. Where a host files its
       * vendored contract is the host's business; that there is one of it is
       * not.
       */
      const declares = files().filter((file) => /\binterface AddOn\b/.test(read(file)));
      expect(
        declares.map((file) => relativeTo(config, file)),
        'the shared contract must be vendored exactly once — two copies is the defect ' +
          'that made this a monorepo',
      ).toHaveLength(1);
    });

    it('would report a header and a specifier the rewrite missed', () => {
      /*
       * BOTH RULES, DRIVEN. Every case above is an absence, and an absence over
       * a clean tree proves nothing about whether the check can bite.
       */
      const good =
        '/*\n' +
        ` * VENDORED from add-ons/packages/shipping-dhl/src/index.ts \u2014 synced by ${syncScript}.\n` +
        ` * ${NEVER_HAND_EDIT}: edit the monorepo and re-run the sync.\n` +
        ' */';
      expect(syncHeaderProblems(good, syncScript)).toEqual([]);
      expect(syncHeaderProblems('// a hand-written file\n', syncScript).length).toBe(3);
      expect(
        syncHeaderProblems(good.replace(NEVER_HAND_EDIT, 'Feel free'), syncScript),
      ).toHaveLength(1);

      /*
       * BUILT FROM PIECES, and it has to be. `install-host-kit.sh` rewrites a
       * literal `'../../add-ons/vendor/host/index.ts'` into the vendored path on the way
       * into a host — including this one, which is a FIXTURE and not an import.
       * Spelled out, the first retrofit that ran this file got a fixture
       * asserting that a relative path is a bare specifier, and the guard's own
       * self-test failed. See `brand.ts` for the two cases where the same
       * rewrite landed and the assertions went on passing anyway.
       */
      const pkg = `@${'adminium'}/add-on-host`;
      const up = `.${'.'}`;
      expect(bareSpecifiersIn(`import { AddOn } from '${pkg}';`)).toEqual([pkg]);
      expect(bareSpecifiersIn(`const m = await import('${pkg}');`)).toEqual([pkg]);
      // …and a rewrite that DID fire leaves a relative path, which is not bare.
      expect(bareSpecifiersIn(`import { AddOn } from '${up}/host/host.ts';`)).toEqual([]);
      expect(bareSpecifiersIn("import { useMemo } from 'react';")).toEqual(['react']);
    });
  });
}
