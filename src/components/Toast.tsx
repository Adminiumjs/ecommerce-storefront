// Global toast — a single-slot dark pill, bottom-center, auto-dismissed by the
// store's 2200ms timer.

import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";

export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
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
      {toast.msg}
    </div>
  );
}
