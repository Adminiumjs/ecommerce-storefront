/**
 * The message registry.
 *
 * The app's strings are split across area modules under `../strings/` so they
 * can be authored without one enormous file. This module is the only place that
 * knows they are separate: it flattens them into one bundle per locale, which
 * is what the runtime looks keys up in.
 *
 * Keys must be unique across areas — a later area silently wins a collision —
 * so they are namespaced (`shop.*`, `desk.*`, `pay.*`).
 *
 * PARITY IS A COMPILE ERROR, NOT A RUNTIME FALLBACK. The `Area<>` type below
 * takes English as the source of truth and requires all seven other locales to
 * carry a string for every one of its keys. A missing translation therefore
 * fails `tsc -b` rather than rendering an English sentence inside an Arabic
 * page.
 */
import type { Translated } from "../untranslated.ts";
import { LOCALE_TAGS, type LocaleTag } from "../locales.ts";
import { chrome } from "../strings/chrome.ts";
import { desk } from "../strings/desk.ts";

type Area<EN extends Record<string, string>> = { "en-US": EN } & Record<Exclude<LocaleTag, "en-US">, Translated<EN>>;

const AREAS: [Area<(typeof chrome)["en-US"]>, Area<(typeof desk)["en-US"]>] = [chrome, desk];

export const MESSAGES = Object.fromEntries(
  LOCALE_TAGS.map((t) => [t, Object.assign({}, ...AREAS.map((a) => a[t] ?? {}))]),
) as Record<LocaleTag, Record<string, string>>;

/** Keys are typed off English — the source of truth — so a typo is a compile error. */
export type MessageKey = keyof (typeof chrome)["en-US"] | keyof (typeof desk)["en-US"];
