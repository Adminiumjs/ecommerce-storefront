/**
 * The shop's words for pay: written with its screens. English is the source of truth.
 */
const en = {
  "pay.placeholder": "—",
} as const;

export const pay = {
  "en-US": en,
  "de-DE": { ...en },
  "fr-FR": { ...en },
  "da-DK": { ...en },
  "cs-CZ": { ...en },
  "ar-EG": { ...en },
  "zh-CN": { ...en },
  "zh-TW": { ...en },
};
