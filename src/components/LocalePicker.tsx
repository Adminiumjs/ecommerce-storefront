// The demo's language switcher. This app has no demo dock / control bar, so it
// lives in the header next to the theme toggle — the one control cluster that
// is present on every view, including the collapsed checkout header.
//
// A native <select> on purpose: it is keyboard- and screen-reader-correct for
// free, it needs no popup/focus-trap logic, and the OS renders its own listbox,
// so the options are legible in RTL without any extra styling.

import { LOCALES, LOCALE_TAGS, useI18n, type LocaleTag } from "../i18n";

export function LocalePicker({ size = 40 }: { size?: number }) {
  const { locale, setLocale, t } = useI18n();
  const label = t("chrome.language");

  return (
    <select
      className="sf-gi"
      value={locale}
      onChange={(e) => setLocale(e.target.value as LocaleTag)}
      aria-label={label}
      title={label}
      style={{
        height: size + "px",
        paddingInline: "10px",
        borderRadius: "11px",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--fg-muted)",
        fontSize: "12.5px",
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
        maxWidth: "132px",
      }}
    >
      {/* Languages are listed in their own script — a reader looking for their
          language cannot be expected to recognise its English name. */}
      {LOCALE_TAGS.map((tag) => (
        <option key={tag} value={tag}>
          {LOCALES[tag].native}
        </option>
      ))}
    </select>
  );
}
