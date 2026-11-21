/**
 * The shop's words for pages: written with its screens. English is the source of truth.
 */
const en = {
  "pages.placeholder": "—",
} as const;

export const pages = {
  "en-US": en,
  "de-DE": { ...en },
  "fr-FR": { ...en },
  "da-DK": { ...en },
  "cs-CZ": { ...en },
  "ar-EG": { ...en },
  "zh-CN": { ...en },
  "zh-TW": { ...en },
};
