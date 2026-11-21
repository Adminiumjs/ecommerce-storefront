/**
 * The manifest's words in the seven languages beside English, keyed by the
 * English label `labels.ts` looks them up by. A label with no entry here is
 * written in English alone and listed in `untranslated-labels.json`.
 */
import type { Translation } from "./labels.ts";

export const WORDS: Record<string, Translation> = {};
