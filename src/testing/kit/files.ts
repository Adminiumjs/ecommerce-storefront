/*
 * INSTALLED from add-ons/packages/host-kit/guards/files.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * READING A HOST'S SOURCES — the four questions every text guard asks, in one
 * place, because the alternative is four answers that agree until one is fixed.
 *
 * ── WHY THIS IS A FILE AND NOT FOUR COPIES OF A SIX-LINE `walk` ─────────────
 *
 * `brand.ts`, `label-pairing.ts`, `payload-casts.ts` and `vendored.ts` all need
 * "every source this host authors", and three of them need it with comments
 * removed. In the two repos this package was extracted from, each of those four
 * suites carried its OWN `walk`, its OWN "is this a test file" predicate and —
 * in two cases — its OWN comment stripper. They agreed. That is the problem:
 * agreement between hand-copies is a property that holds until somebody repairs
 * one of them, and the whole reason this package exists is that this exact
 * arrangement drifted in eight measured ways within a fortnight.
 *
 * So the walk is one function, the shipped/test split is one predicate, and the
 * comment stripper is one lexer. A repair lands in twelve hosts or in none.
 *
 * ── AND WHAT "SHIPPED" HAS TO MEAN, WHICH IS NOT OBVIOUS ────────────────────
 *
 * `INSTALL_LAYOUT` splits the kit in two on install: the runtime half compiles
 * into the bundle, the guard half must never reach one — `guards/lexicon.ts`
 * SPELLS EVERY BANNED WORD and would fail the very release grep it defines if
 * it shipped. So `shippedFiles` excludes the guard-half directory as well as
 * the `.test.` files, and `brand.ts` separately asserts that nothing shipped
 * IMPORTS it. Two different questions: this one is "would the bundler reach
 * this file by walking the tree", that one is "does anything reach it by
 * import", and only the second is what actually gets a word list into a bundle.
 *
 * ── AND THE EXCLUSION IS THE TEST-ONLY DIRECTORY, NOT THE KIT'S CORNER OF IT ─
 *
 * [Repaired 2026-08-28, first retrofit.] It used to be `srcDir/testing/kit`
 * exactly — the full `INSTALL_LAYOUT.guards` path — while `brand.ts`'s import
 * ban takes the FIRST SEGMENT of the same constant and so bans all of
 * `src/testing/`, and says so in its own comment: "bans the whole test-only
 * directory rather than the kit's corner of it". The two disagreed, and the
 * disagreement is not academic: every host in this fleet keeps a vendored
 * manifest validator at `src/testing/manifest/`, four files of it, each
 * importing `zod`. Those files are not tests (`.test.` does not appear in their
 * names) and were not under the kit's directory, so they counted as SHIPPED —
 * and the brand suite's own "never lets shipped code reach zod" case reported
 * all four, in a host where nothing outside a `.test.ts` imports them.
 *
 * Measured on the first host to install this package: four findings, all false,
 * on the first run. A gate that is red on arrival for a reason its own prose
 * says is not a violation is a gate somebody adds an exemption to — and an
 * exemption list is where nine of wave 4b's holes came from.
 *
 * So both halves take the first segment. The cost is that a host which put a
 * SHIPPED module under `src/testing/` would stop being scanned, and that cost
 * is already paid by the import ban, which would refuse to let anything reach
 * it anyway: a directory nothing shipped may import is a directory nothing
 * shipped is in.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { INSTALL_LAYOUT, type HostFacts } from '../../add-ons/kit/config.ts';

/** Every file under `dir`, recursively. A missing directory is an empty walk. */
export function walk(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    /*
     * DELIBERATELY QUIET, and the guards make it safe. A host may genuinely
     * have no `vendor/` yet — the install script creates it — and a throw here
     * would turn "not installed" into an unreadable stack in whichever guard
     * happened to look first. Every caller that could be fooled by an empty
     * result asserts it found something; see the "guard on the guard" case in
     * each suite. The two halves together are what make this line honest.
     */
    return [];
  }
  return entries.flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const SOURCE = /\.tsx?$/;

/** Every TypeScript source under the host's `srcDir`, tests included. */
export function allSources(config: HostFacts): string[] {
  return walk(config.srcDir).filter((file) => SOURCE.test(file));
}

/**
 * The half that reaches a bundle: no suite, no guard-half module.
 *
 * The vendored add-ons ARE shipped and are deliberately included — they compile
 * into this host's bundle, so a `fetch` or a company name in one of them
 * reaches a customer's browser from here whatever the add-on's own repo says
 * about its own package. Guards that want the host's OWN files filter
 * `vendorDir` out themselves, and say why where they do it.
 */
export function shippedFiles(config: HostFacts): string[] {
  // The first segment — `testing` — for the reason this file's header gives:
  // `brand.ts` bans imports of the same segment, and two halves of one rule
  // reading two different depths of one constant is how the first retrofit got
  // four false findings before it had written a line of its own.
  const testOnly = join(config.srcDir, INSTALL_LAYOUT.guards.split('/')[0] ?? INSTALL_LAYOUT.guards);
  return allSources(config).filter(
    (file) => !file.includes('.test.') && !file.startsWith(testOnly),
  );
}

/** The host's own shipped sources — everything above, minus the vendored copies. */
export function ownShippedFiles(config: HostFacts): string[] {
  return shippedFiles(config).filter((file) => !file.startsWith(config.vendorDir));
}

/** Every vendored file the sync writes, source and stylesheet alike. */
export function vendoredFiles(config: HostFacts): string[] {
  return walk(config.vendorDir).filter((file) => /\.(ts|tsx|css)$/.test(file));
}

/** Every suite this host runs. What `tier.ts` reads to see which guards are wired. */
export function suiteFiles(config: HostFacts): string[] {
  return allSources(config).filter((file) => /\.test\.tsx?$/.test(file));
}

/** A path as a reviewer would write it: relative to the host's checkout root. */
export function relativeTo(config: HostFacts, file: string): string {
  return file.startsWith(config.rootDir) ? file.slice(config.rootDir.length + 1) : file;
}

export const read = (file: string): string => readFileSync(file, 'utf8');

/**
 * THE SOURCE WITH ITS COMMENTS REMOVED, BY A LEXER AND NOT TWO REGEXES.
 *
 * ── WHY IT CANNOT BE TWO REGEXES ────────────────────────────────────────────
 *
 * Every rule downstream is about what the CODE does, and the comments that
 * explain those rules necessarily quote the very things they forbid — this
 * package's own `guards/brand.ts` names nine companies in its prose and would
 * fail its own grep otherwise. Stripping first is what lets the prose stay
 * specific.
 *
 * The obvious implementation deletes everything between a block-comment opener
 * and the next closer, wherever they appear. An adversarial pass against
 * exactly that put the two tokens inside two ORDINARY STRING LITERALS — one
 * assigning the opener to a variable, one assigning the closer — with a real
 * third-party import on the line between them. (`files.test.ts` builds that
 * fixture out of concatenated characters, which is the only way to write it in
 * a file that is itself TypeScript.)
 *
 * The opener inside the first string began a comment that ran to the closer
 * inside the third, and the import between them was deleted before any scanner
 * ran. Measured end to end in the host it was tried in: the suite stayed green,
 * the module was bundled, and the bytes reached `dist/`. It was not one gate's
 * hole — it was the stripper's, and every static gate that depended on it went
 * blind at once.
 *
 * Half of that was already known in the repo it was found in: the line-comment
 * regex carried an explicit guard so an `https:` prefix inside a string was not
 * read as a comment. There was no counterpart for block comments, and a rule
 * that handles one case of a category and not the other is the shape this whole
 * package argues against.
 *
 * ── THREE APPROXIMATIONS, DELIBERATE AND NAMED ──────────────────────────────
 *
 * It is a lexer and not a parser. A regex literal is told from division by the
 * standard previous-token heuristic, which is what every fast tokenizer does
 * and is not provably exact. An unterminated single- or double-quoted literal
 * ends at its line rather than running to the end of the file, so a typo cannot
 * blank a whole source. And a template's `${…}` IS lexed as the code it is,
 * with a brace counter, because a template holding an object literal is
 * ordinary and treating the whole thing as one string loses the code inside it.
 *
 * LINE NUMBERS SURVIVE. Every newline inside a removed comment is emitted, so a
 * finding reported with a line number sends a reader to the right line.
 */
export function withoutComments(source: string): string {
  let out = '';
  /** Brace depth at each open `${`, innermost last. */
  const templates: number[] = [];
  let state: 'code' | 'line' | 'block' | 'regex' | "'" | '"' | '`' = 'code';
  /** The last non-space character of code — decides `/` division vs regex. */
  let prev = '';
  let braces = 0;
  let inClass = false;

  for (let i = 0; i < source.length; i += 1) {
    const c = source[i]!;
    const next = source[i + 1] ?? '';

    if (state === 'line') {
      if (c === '\n') {
        state = 'code';
        out += '\n';
      }
      continue;
    }
    if (state === 'block') {
      if (c === '*' && next === '/') {
        state = 'code';
        out += ' ';
        prev = ' ';
        i += 1;
      } else if (c === '\n') {
        out += '\n';
      }
      continue;
    }
    if (state === 'regex') {
      out += c;
      if (c === '\\') {
        out += next;
        i += 1;
      } else if (c === '\n') {
        // Unterminated: a regex cannot span a line, so this was division.
        state = 'code';
        inClass = false;
      } else if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) {
        state = 'code';
        prev = 'x';
      }
      continue;
    }
    if (state === "'" || state === '"') {
      out += c;
      if (c === '\\') {
        out += next;
        i += 1;
        continue;
      }
      if (c === state) {
        state = 'code';
        prev = 'x';
        continue;
      }
      if (c === '\n') {
        state = 'code';
        prev = 'x';
      }
      continue;
    }
    if (state === '`') {
      out += c;
      if (c === '\\') {
        out += next;
        i += 1;
        continue;
      }
      if (c === '$' && next === '{') {
        out += next;
        i += 1;
        templates.push(braces);
        braces += 1;
        state = 'code';
        prev = '';
        continue;
      }
      if (c === '`') {
        state = 'code';
        prev = 'x';
      }
      continue;
    }

    // ── code ────────────────────────────────────────────────────────────────
    if (c === '/' && next === '/') {
      state = 'line';
      i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      state = 'block';
      i += 1;
      continue;
    }
    out += c;
    if (c === '/') {
      if (!/[\p{L}\p{N}_$)\]]/u.test(prev)) {
        state = 'regex';
        inClass = false;
        continue;
      }
    } else if (c === "'" || c === '"' || c === '`') {
      state = c;
      continue;
    } else if (c === '{') braces += 1;
    else if (c === '}') {
      braces -= 1;
      if (templates.length > 0 && braces === templates[templates.length - 1]) {
        templates.pop();
        state = '`';
        continue;
      }
    }
    if (!/\s/.test(c)) prev = c;
  }

  return out;
}

/** A host source, read and stripped — what every text guard actually greps. */
export const codeOf = (file: string): string => withoutComments(read(file));
