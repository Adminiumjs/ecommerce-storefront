/**
 * The desk's small parts: a chip, a figure in mono, a Latin line kept whole
 * inside a right-to-left page, a switch, and the sheet's frame (focus kept
 * inside it, Escape and the scrim close it, focus back where it was).
 */
import { useEffect, useRef, type ReactNode } from "react";

import { closeSheet } from "./store.ts";

export type Tone = "neutral" | "info" | "accent" | "pos" | "warn" | "danger";

export function Chip({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`dk-chip dk-chip--${tone}`}>{children}</span>;
}

/** A figure, a number or a code: mono 500/600, kept whole and left to right inside any page (BN-05, N2-F19). */
export function Fig({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <bdi className={`dk-fig${strong ? " dk-fig--strong" : ""}`} dir="ltr">
      {children}
    </bdi>
  );
}

/** A line the shop or customer typed in Latin letters (an address, a name), isolated inside a mirrored page. */
export function Latin({ children }: { children: ReactNode }) {
  return <bdi dir="auto">{children}</bdi>;
}

export function Switch({ on, label, onChange, disabled = false, labelledBy }: { on: boolean; label?: string; onChange: (on: boolean) => void; disabled?: boolean; labelledBy?: string }) {
  return (
    <button type="button" role="switch" className="dk-switch" aria-checked={on} aria-label={label} aria-labelledby={labelledBy} disabled={disabled} onClick={() => onChange(!on)}>
      <span aria-hidden="true" />
    </button>
  );
}

/** A section card with its heading. */
export function Card({ id, title, icon, aside, children, className }: { id: string; title: ReactNode; icon?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`dk-card${className === undefined ? "" : ` ${className}`}`} aria-labelledby={id}>
      <div className="dk-card-head">
        {icon !== undefined && (
          <span className="dk-card-ico" aria-hidden="true">
            {icon}
          </span>
        )}
        <h2 id={id} className="dk-card-title">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * A sheet's frame: `alertdialog` for a step that cannot be undone. Focus
 * starts on its first field (or button) and stays inside; Escape and the
 * scrim close it; focus goes back to what opened it.
 */
export function Sheet({ labelledBy, describedBy, alert = false, wide = false, onClose = closeSheet, children }: { labelledBy: string; describedBy?: string; alert?: boolean; wide?: boolean; onClose?: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select, button.dk-btn--primary, button");
    first?.focus();
    return () => before?.focus?.();
  }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || box.current === null) return;
    const all = Array.from(box.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (all.length === 0) return;
    const first = all[0]!;
    const last = all[all.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  return (
    <div className="dk-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} onKeyDown={onKey}>
      <div ref={box} role={alert ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} className={`dk-sheet${wide ? " dk-sheet--wide" : ""}`}>
        {children}
      </div>
    </div>
  );
}

/** A field's error, tied to it by id. */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="dk-err" role="alert">
      {children}
    </div>
  );
}
