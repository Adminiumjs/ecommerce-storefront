// Global toast — a single-slot dark pill, bottom-center, auto-dismissed by the
// store's 2200ms timer.
//
// The store raises a message KEY plus params (see `ToastMsg`); the lookup
// happens here, where there is a hook. That keeps the copy out of the store and
// makes a visible toast follow a language switch instead of freezing in the
// language it was raised in.

import { useT, type MessageKey } from "../i18n";
import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";

export function Toast() {
  const toast = useStore((s) => s.toast);
  const t = useT();
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        // `left: 50%` + `translateX(-50%)` is the centring idiom, not a
        // direction: transforms do not flip in RTL, so a logical inset here
        // would push the pill off-centre in Arabic.
        left: "50%",
        bottom: "26px",
        transform: "translateX(-50%)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 18px",
        borderRadius: "12px",
        background: "var(--fg)",
        color: "var(--bg)",
        fontSize: "13px",
        fontWeight: 700,
        boxShadow: "0 12px 34px rgba(10,10,20,.32)",
        animation: "sf-pop .22s cubic-bezier(.2,.8,.2,1)",
      }}
    >
      <Icon name="check-circle-2" size={16} />
      {/* An unknown key renders verbatim, so a screen still passing literal
          prose shows that prose rather than a dotted key. */}
      {t(toast.msg as MessageKey, toast.params)}
    </div>
  );
}
