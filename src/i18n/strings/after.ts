/**
 * The shop's words for after: written with its screens. English is the source of truth.
 */
const en = {
  "after.placeholder": "—",
} as const;

export const after = {
  "en-US": en,
  "de-DE": { ...en },
  "fr-FR": { ...en },
  "da-DK": { ...en },
  "cs-CZ": { ...en },
  "ar-EG": { ...en },
  "zh-CN": { ...en },
  "zh-TW": { ...en },
};
