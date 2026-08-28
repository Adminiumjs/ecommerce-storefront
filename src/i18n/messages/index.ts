/**
 * The message registry — composed from the per-area string modules so the two
 * areas (chrome, screens) can be authored in parallel without touching the same
 * file, then flattened into one bundle per locale for the runtime to index.
 *
 * `en-US` is the source of truth. `MessageKey` is the union of its keys across
 * every area, so a typo in `t('…')` is a compile error; the `Area` guard on
 * `AREAS` makes a translation that drops an English key a compile error too,
 * rather than a silent per-key fallback at runtime.
 */
import type { Translated } from "../untranslated.ts";
import { LOCALE_TAGS, type LocaleTag } from '../locales';
import { addOns } from '../strings/addOns';
import { chrome } from '../strings/chrome';
import { screens } from '../strings/screens';

/**
 * Parity guard. `en-US` defines the keys; the other seven must each carry a
 * string for every one of them. Extra keys in a translation are allowed through
 * (they are simply never asked for) — the direction that matters is a missing
 * translation, which would otherwise render English inside an Arabic page.
 */
type Area<EN extends Record<string, string>> = { 'en-US': EN } & Record<
  Exclude<LocaleTag, 'en-US'>,
  Translated<EN>
>;

const AREAS: [
  Area<(typeof chrome)['en-US']>,
  Area<(typeof screens)['en-US']>,
  Area<(typeof addOns)['en-US']>,
] = [chrome, screens, addOns];

export const MESSAGES = Object.fromEntries(
  LOCALE_TAGS.map((t) => [t, Object.assign({}, ...AREAS.map((a) => a[t] ?? {}))]),
) as Record<LocaleTag, Record<string, string>>;

/** Keys are typed off English — the source of truth — so a typo is a compile error. */
export type MessageKey =
  | keyof (typeof chrome)['en-US']
  | keyof (typeof screens)['en-US']
  | keyof (typeof addOns)['en-US'];

/** One add-on's bundle, as it travels on the add-on object. */
export type AddOnMessages = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** Which add-ons have registered, for the suite that checks they all did. */
const registered = new Set<string>();

export function registeredAddOnMessageKeys(): readonly string[] {
  return [...registered].sort();
}

/**
 * Merge an add-on's strings into the runtime bundle, refusing a bundle that is
 * not complete in all eight locales.
 *
 * ── WHAT THIS FUNCTION TOOK OVER FROM THE COMPILER ─────────────────────────
 *
 * The three areas above are checked by `Area<>`: `en-US` defines the keys and
 * the other seven must each carry a string for every one of them, so a dropped
 * translation is a COMPILE error. That is the guarantee this whole layer exists
 * for, and an add-on's keys cannot have it — they are not members of
 * `MessageKey`, because the alternative is that this file, the host's own i18n
 * core, imports and names every add-on that happens to be vendored. A host that
 * has to be edited to add a second add-on does not have an add-on system.
 *
 * So the guarantee moved from the type checker to here, and here THROWS. The
 * failure it guards against is a key present in English and missing in Arabic,
 * which renders a raw dotted key on a screen in exactly one of eight languages
 * — the failure mode nobody notices until a reader complains. A boot that dies
 * naming the add-on, the locale and the key is strictly better than a shop
 * running with a hole in its Arabic.
 *
 * IT RUNS AT MODULE LOAD, ON EVERY BOOT INCLUDING THE DEMO, because
 * `add-ons/registry.ts` calls it at module scope and the store imports that.
 * A check that runs in a test can be skipped; this one cannot.
 *
 * ── THE FOUR-LINE VERSION IS THE TRAP ──────────────────────────────────────
 *
 * `Object.assign(MESSAGES[locale], bundle[locale])` in a loop is four lines,
 * works, passes every test in this repo, and silently accepts an add-on missing
 * three locales — which then falls back to English on screen for a reader who
 * cannot read it. Everything below the first line of the loop is the reason
 * this is not that.
 *
 * A COLLISION IS REFUSED for the same reason: a later area silently winning is
 * how an add-on ends up quietly rewriting the host's own copy.
 */
export function registerAddOnMessages(addOnKey: string, bundle: AddOnMessages): void {
  const english = bundle['en-US'];
  if (english === undefined) {
    throw new Error(`add-on "${addOnKey}" registered no en-US strings`);
  }

  const keys = Object.keys(english);
  for (const locale of LOCALE_TAGS) {
    const localeBundle = bundle[locale];
    if (localeBundle === undefined) {
      throw new Error(`add-on "${addOnKey}" is missing the ${locale} locale entirely`);
    }
    for (const key of keys) {
      const value = localeBundle[key];
      if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`add-on "${addOnKey}" is missing ${locale} for "${key}"`);
      }
    }
  }

  for (const key of keys) {
    if (MESSAGES['en-US'][key] !== undefined) {
      throw new Error(`add-on "${addOnKey}" would overwrite the existing message key "${key}"`);
    }
  }

  /*
   * Mutating the same objects rather than rebuilding `MESSAGES` is what lets
   * the i18n provider hold a reference to a locale's bundle across a
   * registration — and registration happens at module load, before any of them
   * is read, so nothing is ever seen half-merged.
   */
  for (const locale of LOCALE_TAGS) Object.assign(MESSAGES[locale], bundle[locale]);
  registered.add(addOnKey);
}
