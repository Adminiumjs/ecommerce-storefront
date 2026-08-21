// Two small render-time helpers the screens share. Both exist because of the
// same rule: a sentence belongs to the translator, whole.

import { Fragment, type ReactNode } from "react";

/**
 * Splice JSX into a translated sentence without concatenating fragments.
 *
 * Several lines here carry an inline styled element — the promo-code chip on
 * Home, the order number and email on Confirm, the bolded "This is a demo."
 * lead-in on Checkout. Assembling those as `t('before') + <span/> + t('after')`
 * hands word order to English: any language that wants the emphasis somewhere
 * else — and RTL above all — comes out scrambled. So the whole sentence stays
 * one message with `{named}` placeholders, and this splits on them at render
 * time. The translator decides where the styled bit lands.
 *
 * Call `t(key)` WITHOUT params for these — the runtime substitutes any
 * placeholder it is handed, and we need them to survive to here.
 */
export function rich(
  message: string,
  slots: Record<string, ReactNode>,
): ReactNode {
  return message.split(/(\{\w+\})/g).map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return (
      <Fragment key={i}>
        {name !== undefined && name in slots ? slots[name] : part}
      </Fragment>
    );
  });
}

/**
 * Directional arrows do not flip themselves.
 *
 * `dir="rtl"` on <html> flips the layout via CSS logical properties, but a
 * lucide `arrow-right` is a path — it still points right, which in Arabic means
 * "back". These pick the glyph that points the way the reader is reading.
 */
export function forwardArrow(dir: "ltr" | "rtl"): string {
  return dir === "rtl" ? "arrow-left" : "arrow-right";
}

export function backArrow(dir: "ltr" | "rtl"): string {
  return dir === "rtl" ? "arrow-right" : "arrow-left";
}
