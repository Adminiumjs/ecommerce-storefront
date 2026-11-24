/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/engine/parts.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * The pieces the real booking flow draws with: one button that keeps focus
 * while busy, a dialog that holds focus, one polite live region, a figure
 * inside a sentence, and the status card every outcome uses.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { CornerDownRight, FlaskConical, Lock } from "lucide-react";

import type { StringKey } from "../../i18n/strings.ts";
import { useFormat, useT } from "../../i18n/t.ts";
import { buttonStyle, Mono, type ButtonVariant } from "../atoms.tsx";

export const TOUCH = 44;

/** The form grid the comps draw: two columns, one when the space is narrow. */
export const FORM_COLUMNS = "repeat(auto-fit, minmax(min(100%, max(190px, calc(50% - 7px))), 1fr))";

/**
 * A button for a flow that must not lose its place.
 *
 * `busy` says `aria-disabled` and swallows the press, because the `disabled`
 * attribute would drop keyboard focus to the page at the worst moment: while a
 * purchase is on its way (S2-F35).
 */
export const FlowButton = forwardRef<
  HTMLButtonElement,
  {
    children: ReactNode;
    onClick: () => void;
    variant?: ButtonVariant;
    busy?: boolean;
    disabled?: boolean;
    style?: CSSProperties;
    describedBy?: string;
    firstFocus?: boolean;
    testId?: string;
  }
>(function FlowButton({ children, onClick, variant = "ghost", busy = false, disabled = false, style, describedBy, firstFocus, testId }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-disabled={busy || undefined}
      aria-describedby={describedBy}
      data-first-focus={firstFocus ? "" : undefined}
      data-testid={testId}
      onClick={() => {
        if (!busy && !disabled) onClick();
      }}
      style={{ ...buttonStyle(variant, disabled || busy), minBlockSize: TOUCH, ...style }}
    >
      {children}
    </button>
  );
});

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * A modal that holds focus (S2-F35). First focus goes to whatever is marked
 * `firstFocus`, which is always the SAFE choice: a held Enter on the button
 * that opened it must not confirm anything (S2-F7). Escape closes, and focus
 * goes back to the button that opened it.
 */
export function Dialog({ labelledBy, onClose, children }: { labelledBy: string; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = box.current?.querySelector<HTMLElement>("[data-first-focus]") ?? box.current;
    first?.focus();
    return () => opener?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || box.current === null) return;
    const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === box.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 62,
        background: "var(--scrim, rgba(10, 10, 15, 0.55))",
        display: "grid",
        justifyItems: "center",
        alignItems: "start",
        paddingBlock: "72px 20px",
        paddingInline: 16,
        overflowY: "auto",
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={{
          inlineSize: "min(460px, 100%)",
          background: "var(--surface)",
          color: "var(--fg)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
          boxShadow: "var(--shadow-md)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** The one polite region of the flow (S2-F34). The same words twice are still said twice. */
export function useSay(): { said: string; say: (text: string) => void } {
  const [said, setSaid] = useState("");
  const say = useCallback((text: string) => setSaid((before) => (before === text ? `${text} ` : text)), []);
  return { said, say };
}

export function LiveRegion({ said }: { said: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="engine-live"
      style={{ position: "absolute", inlineSize: 1, blockSize: 1, overflow: "hidden", clipPath: "inset(50%)" }}
    >
      {said}
    </div>
  );
}

/**
 * A sentence with its figures in mono 500 (S2-F32). A figure is held out of the
 * translated string by a private mark, so a language can put it anywhere.
 */
export function Worded({
  k,
  figures = {},
  words = {},
}: {
  k: StringKey;
  figures?: Record<string, string | number>;
  words?: Record<string, string | number>;
}) {
  const t = useT();
  const { number } = useFormat();
  const marks = Object.fromEntries(Object.keys(figures).map((name) => [name, `${name}`]));
  const pieces = t(k, { ...words, ...marks }).split(/(\w+)/);
  return (
    <>
      {pieces.map((piece, index) => {
        if (index % 2 === 0) return piece;
        const value = figures[piece]!;
        return (
          <Mono key={`${piece}-${index}`} style={{ fontWeight: 500 }}>
            {typeof value === "number" ? number(value) : value}
          </Mono>
        );
      })}
    </>
  );
}

export function TestBanner() {
  const t = useT();
  return (
    <div
      role="note"
      data-testid="engine-test-banner"
      style={{
        display: "flex",
        gap: 11,
        alignItems: "flex-start",
        border: "1.5px solid var(--warn)",
        background: "var(--warn-soft)",
        borderRadius: 12,
        padding: "11px 14px",
      }}
    >
      <FlaskConical size={18} aria-hidden="true" style={{ color: "var(--warn)", flex: "0 0 auto", marginBlockStart: 1 }} />
      <div style={{ minInlineSize: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--fg)" }}>{t("addon.shipping-kit.engine.test.title")}</div>
        <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginBlockStart: 2 }}>{t("addon.shipping-kit.engine.test.body")}</div>
      </div>
    </div>
  );
}

export function SampleStamp() {
  const t = useT();
  return (
    <Mono
      style={{
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.12em",
        color: "var(--warn)",
        border: "1.5px solid var(--warn)",
        borderRadius: 6,
        paddingBlock: 2,
        paddingInline: 7,
      }}
    >
      {t("addon.shipping-kit.engine.test.sample")}
    </Mono>
  );
}

export type CardTone = "danger" | "warn" | "info" | "pos" | "neutral";

const EDGE: Record<CardTone, string> = {
  danger: "var(--danger)",
  warn: "var(--warn)",
  info: "var(--info)",
  pos: "var(--pos)",
  neutral: "var(--border-strong)",
};

/**
 * Every outcome's card (S17–S21): what happened, what to do next, the carrier's
 * words when this person may read them, and the actions. `note` is for someone
 * with no action to take, so a working button and "Ask the owner" never sit
 * together (S2-F15).
 */
export function StatusCard({
  tone,
  icon,
  eyebrow,
  title,
  body,
  next,
  quote,
  details,
  actions,
  note,
  takeFocus = false,
  testId,
}: {
  tone: CardTone;
  icon: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  next?: ReactNode;
  quote?: { by: string; words: string } | null;
  details?: ReactNode;
  actions?: ReactNode;
  note?: ReactNode;
  takeFocus?: boolean;
  testId?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (takeFocus) heading.current?.focus();
  }, [takeFocus]);
  return (
    <section
      data-testid={testId}
      style={{
        border: `1.5px solid ${EDGE[tone]}`,
        background: "var(--surface)",
        borderRadius: 14,
        padding: 17,
        display: "flex",
        flexDirection: "column",
        gap: 11,
        minInlineSize: 0,
      }}
    >
      {eyebrow !== undefined && (
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", color: "var(--fg-subtle)" }}>{eyebrow}</span>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span aria-hidden="true" style={{ display: "inline-flex", color: EDGE[tone] === "var(--border-strong)" ? "var(--fg-muted)" : EDGE[tone], flex: "0 0 auto", marginBlockStart: 1 }}>
          {icon}
        </span>
        <h3 ref={heading} tabIndex={-1} style={{ margin: 0, fontSize: 15, fontWeight: 800, lineHeight: 1.35, outline: "none" }}>
          {title}
        </h3>
      </div>
      {body !== undefined && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--fg-muted)" }}>{body}</p>}
      {details}
      {quote !== undefined && quote !== null && (
        <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <figcaption style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{quote.by}</figcaption>
          <blockquote
            dir="auto"
            style={{
              margin: 0,
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: 11.5,
              fontWeight: 500,
              color: "var(--fg-muted)",
              borderInlineStart: "2px solid var(--border-strong)",
              paddingInlineStart: 9,
              overflowWrap: "anywhere",
            }}
          >
            “{quote.words}”
          </blockquote>
        </figure>
      )}
      {next !== undefined && (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
          <CornerDownRight size={15} aria-hidden="true" style={{ color: "var(--fg-subtle)", flex: "0 0 auto", marginBlockStart: 2 }} />
          <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg)" }}>{next}</span>
        </div>
      )}
      {actions !== undefined && actions !== null && <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>{actions}</div>}
      {note !== undefined && (
        <div style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 12.5, fontWeight: 600, color: "var(--fg-muted)" }}>
          <Lock size={13} aria-hidden="true" style={{ flex: "0 0 auto" }} />
          <span>{note}</span>
        </div>
      )}
    </section>
  );
}

/** One label and value in a card's details. A figure or code reads in mono 600, never 700 (S2-F31). */
export function Detail({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div style={{ minInlineSize: 0 }}>
      <dt style={{ fontSize: 11.5, color: "var(--fg-subtle)", marginBlockEnd: 2 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 13, fontWeight: mono ? 600 : 700, overflowWrap: "anywhere" }}>
        {mono ? <Mono style={{ fontWeight: 600, whiteSpace: "normal" }}>{value}</Mono> : value}
      </dd>
    </div>
  );
}
