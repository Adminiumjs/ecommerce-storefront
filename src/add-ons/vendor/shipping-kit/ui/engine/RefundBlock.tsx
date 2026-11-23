/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/engine/RefundBlock.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * A REFUND ON A LABEL (S27 to S33).
 *
 * A refund is a request, so these screens never say the money is back until the
 * carrier has said so. The engine holds the truth: what may be pressed comes
 * from `booking.refund`, and the route asks the same questions again.
 *
 * No date here is a promise. "Expected by" is an estimate, and the credit is
 * described as landing on a later invoice (S2-F18, S2-F19). A test label shows
 * no money at all (S2-F20).
 */

import { useId, useState } from "react";
import { RefreshCw, RotateCcw, TriangleAlert, Undo2 } from "lucide-react";
import type { EngineAccess, EngineBooking, EngineCarrier } from "../../../host/engine-carrier.ts";

import { kitBrand } from "../../brand.ts";
import { useLocale, useT } from "../../i18n/t.ts";
import { moneyText, readFailure, stampOf } from "./flow.ts";
import { Dialog, FlowButton } from "./parts.tsx";

/** A price inside a sentence keeps its own order, whichever way the sentence runs. */
const isolated = (text: string): string => `\u2066${text}\u2069`;

export const dayOf = (at: number, locale: string): string => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(at));

const BOX = { border: "1px solid var(--border-strong)", borderRadius: 11, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)" } as const;
const HEAD = { fontSize: 13, fontWeight: 800, color: "var(--fg)" } as const;

/** What a settled refund is worth, in words that promise only what is known. */
function creditLine(booking: EngineBooking, access: EngineAccess, company: string, locale: string, t: ReturnType<typeof useT>): string {
  const refund = booking.refund;
  if (!booking.test && !access.pricesHidden) {
    if (refund?.amount !== undefined && refund.currency !== undefined) return t("addon.shipping-kit.engine.refund.creditAmount", { company, x: isolated(moneyText(refund.amount, refund.currency, locale)) });
    if (booking.amount !== undefined && booking.currency !== undefined) return t("addon.shipping-kit.engine.refund.creditPrice", { company, x: isolated(moneyText(booking.amount, booking.currency, locale)) });
  }
  return t("addon.shipping-kit.engine.refund.credit", { company });
}

/** S30: the refund landed. Booking again is the ordinary flow below it. */
export function RefundedCard({ booking, access }: { booking: EngineBooking; access: EngineAccess }) {
  const t = useT();
  const locale = useLocale();
  const company = booking.carrierName ?? kitBrand().name;
  return (
    <div role="status" data-testid="engine-refunded" style={{ ...BOX, background: "var(--surface-2)" }}>
      <div style={HEAD}>{t("addon.shipping-kit.engine.refund.refundedTitle")}</div>
      <div>{t("addon.shipping-kit.engine.refund.refundedDoNotUse")}</div>
      <div data-testid="engine-refund-credit">{creditLine(booking, access, company, locale, t)}</div>
    </div>
  );
}

export function RefundBlock({
  booking,
  access,
  client,
  company,
  say,
  onChange,
  onStale,
  onReplace,
}: {
  booking: EngineBooking;
  access: EngineAccess;
  client: EngineCarrier;
  company: string;
  say: (text: string) => void;
  onChange: (fresh: EngineBooking) => void;
  onStale: () => void;
  onReplace?: (() => void) | undefined;
}) {
  const t = useT();
  const locale = useLocale();
  const titleId = useId();
  const [dialog, setDialog] = useState<"confirm" | "both" | null>(null);
  const [busy, setBusy] = useState(false);
  const [fault, setFault] = useState<string | null>(null);
  const refund = booking.refund;
  if (refund === undefined || refund === null) return null;
  const voiding = booking.state === "voiding";

  const failed = (err: unknown) => {
    const { code } = readFailure(err);
    const words = code === "CSRF_FAILED" ? t("addon.shipping-kit.engine.refused.csrf.next") : t("addon.shipping-kit.engine.refund.failed");
    setFault(words);
    say(words);
    // The engine knows something this card does not: a scan, the claim date, another person's press.
    if (code === "LABEL_SCANNED" || code === "REFUND_TOO_LATE" || code === "REFUND_NOT_OPEN") onStale();
  };

  const request = async () => {
    if (busy) return;
    setBusy(true);
    setFault(null);
    try {
      const answer = await client.requestRefund(booking.id);
      setDialog(null);
      onChange({ ...answer.booking, track: answer.booking.track ?? booking.track ?? null });
      say(t(answer.outcome === "refunded" ? "addon.shipping-kit.engine.refund.refundedTitle" : answer.outcome === "refused" ? "addon.shipping-kit.engine.refund.refusedUse" : "addon.shipping-kit.engine.refund.requestedTitle"));
      if (answer.booking.state === "voided") onStale();
    } catch (err) {
      setDialog(null);
      failed(err);
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    if (busy) return;
    setBusy(true);
    setFault(null);
    try {
      const answer = await client.checkRefund(booking.id);
      onChange({ ...answer.booking, track: answer.booking.track ?? booking.track ?? null });
      if (answer.outcome === "refunded") say(t("addon.shipping-kit.engine.refund.refundedTitle"));
      else if (answer.outcome === "refused") say(t("addon.shipping-kit.engine.refund.refusedTitle", { company }));
      else {
        setFault(t("addon.shipping-kit.engine.refund.stillPending"));
        say(t("addon.shipping-kit.engine.refund.stillPending"));
      }
      if (answer.booking.state === "voided") onStale();
    } catch (err) {
      failed(err);
    } finally {
      setBusy(false);
    }
  };

  const claimDay = dayOf(refund.claimBy, locale);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {voiding && (
        <div role="status" data-testid="engine-refund-pending" style={{ ...BOX, background: "var(--warn-soft)" }}>
          <div style={HEAD}>{t(refund.state === "pending" ? "addon.shipping-kit.engine.refund.pendingTitle" : "addon.shipping-kit.engine.refund.nextTitle")}</div>
          <div>{t("addon.shipping-kit.engine.refund.destroyPrinted")}</div>
          {refund.askedAt !== null && <div data-testid="engine-refund-asked">{t("addon.shipping-kit.engine.refund.requestedOn", { d: dayOf(refund.askedAt, locale) })}</div>}
          <div data-testid="engine-refund-expected">
            {refund.expectedBy !== null ? t("addon.shipping-kit.engine.refund.expectedBy", { d: dayOf(refund.expectedBy, locale), company }) : t("addon.shipping-kit.engine.refund.mayTake", { company })}
          </div>
          {refund.unconfirmed && <div data-testid="engine-refund-unconfirmed">{t("addon.shipping-kit.engine.refund.unconfirmed", { company })}</div>}
          {refund.heardAt !== null && <div>{t("addon.shipping-kit.engine.refund.lastChecked", { d: stampOf(refund.heardAt, locale) })}</div>}
        </div>
      )}

      {!voiding && refund.state === "refused" && (
        <div data-testid="engine-refund-refused" style={{ ...BOX, background: "var(--surface-2)" }}>
          <div>{t("addon.shipping-kit.engine.refund.refusedUse")}</div>
          {refund.message !== null && (
            <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <figcaption style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{t("addon.shipping-kit.engine.refund.refusedFrom", { company })}</figcaption>
              <blockquote dir="auto" style={{ margin: 0, fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500, borderInlineStart: "2px solid var(--border-strong)", paddingInlineStart: 9 }}>
                {refund.message}
              </blockquote>
            </figure>
          )}
        </div>
      )}

      {!voiding && refund.tooLate && (
        <div data-testid="engine-refund-too-late" style={{ ...BOX, background: "var(--surface-2)" }}>
          <div style={HEAD}>{t("addon.shipping-kit.engine.refund.tooLateTitle")}</div>
          <div>{t("addon.shipping-kit.engine.refund.tooLateBody", { d: claimDay })}</div>
        </div>
      )}

      {!voiding && !refund.tooLate && refund.scanned && (
        <div data-testid="engine-refund-scanned" style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12.5, color: "var(--fg-muted)" }}>
          <TriangleAlert size={14} aria-hidden="true" style={{ color: "var(--warn)", flex: "0 0 auto", marginBlockStart: 2 }} />
          <span>{t("addon.shipping-kit.engine.refund.scanned")}</span>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {!voiding && refund.canRequest && access.mayCancel && (
          <FlowButton variant="ghost" onClick={() => setDialog("confirm")} testId="engine-refund-open" style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)" }}>
            <Undo2 size={14} aria-hidden="true" />
            {t("addon.shipping-kit.engine.refund.request")}
          </FlowButton>
        )}
        {!voiding && refund.canRequest && !access.mayCancel && <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.engine.refund.askOwner")}</span>}
        {voiding && (
          <FlowButton variant="ghost" busy={busy} onClick={() => void check()} testId="engine-refund-check" style={{ fontSize: 13, fontWeight: 700 }}>
            <RefreshCw size={14} aria-hidden="true" />
            {t("addon.shipping-kit.engine.refund.check")}
          </FlowButton>
        )}
        {voiding && onReplace !== undefined && (
          <FlowButton variant="ghost" onClick={() => setDialog("both")} testId="engine-refund-rebook" style={{ fontSize: 13, fontWeight: 700 }}>
            <RotateCcw size={14} aria-hidden="true" />
            {t("addon.shipping-kit.engine.refund.again")}
          </FlowButton>
        )}
      </div>

      {fault !== null && (
        <div role="alert" data-testid="engine-refund-fault" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--danger)" }}>
          {fault}
        </div>
      )}

      {dialog === "confirm" && (
        <Dialog labelledBy={titleId} onClose={() => setDialog(null)}>
          <h3 id={titleId} style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {t("addon.shipping-kit.engine.refund.confirmTitle")}
          </h3>
          <ul data-testid="engine-refund-facts" style={{ margin: 0, paddingInlineStart: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 13, lineHeight: 1.5 }}>
            <li style={{ fontWeight: 700 }}>{t("addon.shipping-kit.engine.refund.destroy")}</li>
            <li>{t("addon.shipping-kit.engine.refund.days")}</li>
            <li>{t("addon.shipping-kit.engine.refund.scanRisk")}</li>
            <li>{t("addon.shipping-kit.engine.refund.lastDay", { d: claimDay })}</li>
          </ul>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
            <FlowButton variant="ghost" firstFocus onClick={() => setDialog(null)} testId="engine-refund-keep">
              {t("addon.shipping-kit.engine.refund.keep")}
            </FlowButton>
            <FlowButton variant="accent" busy={busy} onClick={() => void request()} testId="engine-refund-confirm" style={{ background: "var(--danger)", borderColor: "var(--danger)", color: "var(--accent-fg)" }}>
              {t("addon.shipping-kit.engine.refund.request")}
            </FlowButton>
          </div>
        </Dialog>
      )}

      {dialog === "both" && (
        <Dialog labelledBy={titleId} onClose={() => setDialog(null)}>
          <h3 id={titleId} style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {t("addon.shipping-kit.engine.refund.bothTitle")}
          </h3>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{t("addon.shipping-kit.engine.refund.bothBody", { company })}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
            <FlowButton variant="ghost" firstFocus onClick={() => setDialog(null)} testId="engine-refund-both-no">
              {t("addon.shipping-kit.engine.refund.notNow")}
            </FlowButton>
            <FlowButton
              variant="accent"
              onClick={() => {
                setDialog(null);
                onReplace?.();
              }}
              testId="engine-refund-both-yes"
            >
              {t("addon.shipping-kit.engine.refund.bothConfirm")}
            </FlowButton>
          </div>
        </Dialog>
      )}
    </div>
  );
}
