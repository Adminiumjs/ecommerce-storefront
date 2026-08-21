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

const AREAS: [Area<(typeof chrome)['en-US']>, Area<(typeof screens)['en-US']>] = [chrome, screens];

export const MESSAGES = Object.fromEntries(
  LOCALE_TAGS.map((t) => [t, Object.assign({}, ...AREAS.map((a) => a[t] ?? {}))]),
) as Record<LocaleTag, Record<string, string>>;

/** Keys are typed off English — the source of truth — so a typo is a compile error. */
export type MessageKey =
  | keyof (typeof chrome)['en-US']
  | keyof (typeof screens)['en-US'];
