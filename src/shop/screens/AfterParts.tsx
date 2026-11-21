/**
 * What the pages after an order share: an order's status as a pill, a stored
 * day said on the shop's clock, a row of steps (an order's, a return's), and
 * the confirm sheet (cancel, delete my details).
 */
import { Check, Clock } from "lucide-react";
import type { ReactNode } from "react";

import "../after.css";

import { useI18n, type MessageKey } from "../../i18n/index.tsx";
import { dayShort, shopDay } from "../format.ts";
import type { Row } from "../port.ts";
import { useDialog } from "../parts.tsx";
import { useShop } from "../store.ts";

const STATUS_WORDS: Record<string, MessageKey> = {
  paying: "after.status.paying",
  awaiting_transfer: "after.status.paying",
  paid: "after.status.paid",
  packed: "after.status.packed",
  shipped: "after.status.shipped",
  sent: "after.status.sent",
  cancelled: "after.status.cancelled",
};

const STATUS_TONE: Record<string, "in" | "low" | "out" | "info"> = {
  paying: "low",
  awaiting_transfer: "low",
  paid: "info",
  packed: "info",
  shipped: "in",
  sent: "in",
  cancelled: "out",
};

/** An order's status, as the customer reads it. */
export function StatusPill({ order }: { order: Row }) {
  const { t } = useI18n();
  const status = String(order["status"] ?? "");
  const key = STATUS_WORDS[status];
  if (key === undefined) return null;
  return (
    <span className={`nl-pill nl-pill--${STATUS_TONE[status] ?? "info"}`}>
      <span className="nl-dot" aria-hidden="true" />
      {t(key)}
    </span>
  );
}

/** A stored day, or a stored moment read on the shop's own clock, as "Fri 14 Aug". */
export function useDay(): (value: unknown) => string {
  const { locale } = useI18n();
  const zone = useShop((s) => s.config.timezone);
  return (value) => {
    const day = shopDay(value, zone);
    return day === null ? "" : dayShort(day, locale);
  };
}

export interface Step {
  key: string;
  label: string;
  sub?: ReactNode;
  done: boolean;
}

/** A row of steps: done ones ticked, the last done one the current. */
export function Steps({ steps, label }: { steps: Step[]; label: string }) {
  const { t } = useI18n();
  const last = steps.map((s) => s.done).lastIndexOf(true);
  return (
    <ol className="nl-steps" aria-label={label} style={{ "--nl-steps": steps.length } as React.CSSProperties}>
      {steps.map((step, i) => (
        <li key={step.key} className={`nl-step ${step.done ? "nl-step--done" : ""}`} aria-current={i === last ? "step" : undefined}>
          <span className="nl-step-mark" aria-hidden="true">
            <span className="nl-step-dot">{step.done ? <Check size={13} /> : <Clock size={13} />}</span>
            {i < steps.length - 1 && <span className={`nl-step-bar ${steps[i + 1]?.done ? "nl-step-bar--done" : ""}`} />}
          </span>
          <span className="nl-step-label">
            {step.label}
            {step.done && <span className="nl-sr"> · {t("after.step.done")}</span>}
          </span>
          {step.sub !== undefined && step.sub !== "" && <span className="nl-step-sub">{step.sub}</span>}
        </li>
      ))}
    </ol>
  );
}

/** A yes-or-no sheet over the page: the safe answer first, and focused. */
export function ConfirmSheet({ open, onClose, title, text, keep, confirm, onConfirm, busy = false, children, idBase }: { open: boolean; onClose: () => void; title: string; text: ReactNode; keep: string; confirm: string; onConfirm: () => void; busy?: boolean; children?: ReactNode; idBase: string }) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div className="nl-scrim nl-scrim--center" onClick={onClose}>
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={`${idBase}-title`} aria-describedby={`${idBase}-text`} className="nl-dialog nl-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="nl-sheet-body">
          <h2 id={`${idBase}-title`} className="nl-sheet-q">
            {title}
          </h2>
          <p id={`${idBase}-text`} className="nl-sheet-text">
            {text}
          </p>
          {children}
        </div>
        {children === undefined && (
          <div className="nl-sheet-foot">
            <button type="button" className="nl-btn nl-btn--quiet nl-sheet-btn" data-autofocus onClick={onClose}>
              {keep}
            </button>
            <button type="button" className="nl-btn nl-btn--danger nl-sheet-btn" onClick={onConfirm} aria-busy={busy || undefined} disabled={busy}>
              {confirm}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
