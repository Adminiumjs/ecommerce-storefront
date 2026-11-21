/**
 * S9 Your order: opened by its own link (`/o#<code>`, the code exchanged for
 * a session and taken off the address) or from the account. Its status and
 * steps (Paid → Packed → Shipped; no Delivered, ADD-6), each dated by the
 * stamp Adminium wrote; the arrival window Adminium worked out; paying it
 * while it is held; its lines at what was paid; its refunds as the refund
 * rows say them; the carrier's page; and what the customer may do with it,
 * as the manifest allows: cancel while paid or waiting for a transfer, send
 * something back once shipped, review a line, the receipt, order it again.
 */
import { Ban, CircleAlert, CircleCheck, Download, ExternalLink, Lock, RotateCcw, Star, Truck, Undo2, X } from "lucide-react";
import type { ReactNode } from "react";

import { useI18n, type MessageKey } from "../../i18n/index.tsx";
import { canCancel, canReturn, cancelOrder, closeReview, isPaid, makeNewLink, openCancel, openReview, orderAgain, payNow, returnsUntil, reviewable, reviewErrors, sendReview, showReturn, startReturn, trackingUrl, typeReview, useAfter } from "../after.ts";
import type { OrderRead } from "../after-port.ts";
import { heldCheckout } from "../checkout.ts";
import { dayRange, dayShort, isZero, money, shopMoment, shopTime } from "../format.ts";
import type { Row } from "../port.ts";
import { FieldError, Picture, ShopLink, Spinner, useDialog } from "../parts.tsx";
import { announce, useShop } from "../store.ts";
import { Mono, rich } from "../words.tsx";
import { PayReturn } from "./Checkout.tsx";
import { ConfirmSheet, StatusPill, Steps, useDay, type Step } from "./AfterParts.tsx";

export function OrderScreen() {
  const { t } = useI18n();
  const opened = useAfter((s) => s.opened);
  const link = useAfter((s) => s.link);
  // Back from the pay page with the order this tab placed: the checkout's own paying states and confirmation.
  const hasCode = typeof window !== "undefined" && /^#[A-Za-z0-9_-]{8,}/.test(window.location.hash);
  if (heldCheckout() && opened === null && link === null && !hasCode) return <PayReturn />;
  return (
    <main id="main" className="nl-page nl-after nl-after--order">
      {(link === "unknown" || link === "closed") && (
        <div role="alert" className="nl-after-alert">
          <CircleAlert size={16} aria-hidden="true" />
          {t(link === "unknown" ? "after.link.unknown" : "after.link.closed")}
        </div>
      )}
      {opened === null ? (
        <NoOrder />
      ) : opened.state === "loading" ? (
        <div className="nl-skeleton" aria-busy="true">
          <span className="nl-sr">{t("after.order.loading")}</span>
          <div className="nl-skel nl-skel--bar" />
          <div className="nl-skel nl-skel--card" />
        </div>
      ) : opened.state !== "ok" || opened.read === null ? (
        <div role="alert" className="nl-after-alert">
          <CircleAlert size={16} aria-hidden="true" />
          {t(opened.state === "gone" ? "after.order.gone" : "after.order.failed")}
        </div>
      ) : (
        <OrderView read={opened.read} />
      )}
      <CancelSheet />
      <ReviewDialog />
    </main>
  );
}

/** No order open: how to open one. */
function NoOrder() {
  const { t } = useI18n();
  const signedIn = useShop((s) => s.customer !== null);
  return (
    <section className="nl-empty" aria-labelledby="nl-no-order">
      <h1 id="nl-no-order" className="nl-empty-title">
        {t("after.order.none.title")}
      </h1>
      <p className="nl-muted">{t("after.order.none.sub")}</p>
      <div className="nl-after-actions nl-after-actions--center">
        <ShopLink to={{ view: "find" }} className="nl-btn nl-btn--accent">
          {t("after.find.title")}
        </ShopLink>
        <ShopLink to={{ view: signedIn ? "account" : "signIn" }} className="nl-btn nl-btn--quiet">
          {t(signedIn ? "after.account.title" : "after.signIn.title")}
        </ShopLink>
      </div>
    </section>
  );
}

/** How the refund of a cancel goes, by how the order was paid (N1b-F5). */
export function refundWords(read: OrderRead): MessageKey {
  if (isZero(read.order["paid"])) return "after.cancel.nothing";
  const paying = read.payments.filter((p) => !isZero(p["amount"]));
  const methods = [...new Set(paying.map((p) => String(p["method"] ?? "")))];
  if (methods.length !== 1) return "after.cancel.online";
  if (methods[0] === "gift_card") return "after.cancel.giftCard";
  if (methods[0] === "transfer") return "after.cancel.transfer";
  const provider = String(paying[0]?.["provider"] ?? "").toLowerCase();
  if (provider.includes("paypal")) return "after.cancel.paypal";
  return provider === "" ? "after.cancel.online" : "after.cancel.card";
}

function OrderView({ read }: { read: OrderRead }) {
  const { t, locale } = useI18n();
  const zone = useShop((s) => s.config.timezone);
  const currency = useShop((s) => s.config.currency);
  const base = useShop((s) => s.base);
  const online = useShop((s) => s.offer.online);
  const reviews = useAfter((s) => s.reviews);
  const receipt = useAfter((s) => s.receipt);
  const pay = useAfter((s) => s.pay);
  const cancel = useAfter((s) => s.cancel);
  const day = useDay();
  const o = read.order;
  const m = (v: unknown) => money(v, currency, locale);
  const status = String(o["status"] ?? "");
  const goods = o["kind"] !== "gift";
  const paid = isPaid(o);
  const cancelled = status === "cancelled";
  const unpaid = status === "paying" || status === "awaiting_transfer";
  const number = String(o["number"] ?? "");

  const steps: Step[] = goods
    ? [
        { key: "paid", label: t("after.step.paid"), sub: <Mono>{day(o["paid_at"])}</Mono>, done: paid },
        { key: "packed", label: t("after.step.packed"), sub: o["packed_at"] ? <Mono>{day(o["packed_at"])}</Mono> : paid ? t("after.step.notPacked") : "", done: o["packed_at"] != null || status === "packed" || status === "shipped" },
        {
          key: "shipped",
          label: t("after.step.shipped"),
          sub: o["shipped_at"] ? <Mono>{day(o["shipped_at"])}</Mono> : paid && o["ships_by"] ? rich(t, "after.step.ships", { date: <Mono>{day(o["ships_by"])}</Mono> }) : "",
          done: status === "shipped",
        },
      ]
    : [
        { key: "paid", label: t("after.step.paid"), sub: <Mono>{day(o["paid_at"])}</Mono>, done: paid },
        { key: "sent", label: t("after.step.sent"), done: status === "sent" },
      ];
  const reviewLines = reviewable(read, reviews);
  const until = returnsUntil(o);
  const track = trackingUrl(o["carrier"], o["tracking"]);
  const service = base?.services.find((s) => String(s.id) === String(o["service_id"]))?.label ?? "";
  const region = base?.regions.find((r) => String(r.id) === String(o["region_id"]));

  const actions: ReactNode[] = [];
  if (status === "shipped" && canReturn(read))
    actions.push(
      <button key="ret" type="button" className="nl-btn nl-btn--quiet" onClick={startReturn}>
        <Undo2 size={16} aria-hidden="true" className="nl-flip" />
        {t("after.act.sendBack")}
      </button>,
    );
  if (reviewLines.length > 0)
    actions.push(
      <button key="rev" type="button" className="nl-btn nl-btn--quiet" aria-haspopup="dialog" onClick={() => openReview(reviewLines.length === 1 ? String(reviewLines[0]!["id"]) : null)}>
        <Star size={16} aria-hidden="true" />
        {t("after.act.review")}
      </button>,
    );
  if (canCancel(o))
    actions.push(
      <button key="cancel" type="button" className="nl-btn nl-btn--quiet" aria-haspopup="dialog" onClick={() => openCancel(true)}>
        <Ban size={16} aria-hidden="true" />
        {t("after.act.cancel")}
      </button>,
    );
  if (goods && read.lines.length > 0 && (paid || cancelled))
    actions.push(
      <button key="again" type="button" className="nl-btn nl-btn--quiet" onClick={() => void orderAgain()}>
        <RotateCcw size={16} aria-hidden="true" className="nl-flip" />
        {t("after.act.again")}
      </button>,
    );
  if (paid && receipt !== null)
    actions.push(
      <a key="receipt" className="nl-btn nl-btn--quiet" href={receipt.url} download>
        <Download size={16} aria-hidden="true" />
        {t("after.act.receipt")}
      </a>,
    );

  return (
    <>
      {read.via === "link" ? (
        <div className="nl-after-bylink">
          <Lock size={14} aria-hidden="true" />
          <span>
            {t("after.order.byLink")} {t("after.order.dontForward")}
          </span>
        </div>
      ) : (
        <ShopLink to={{ view: "account" }} className="nl-after-back">
          {t("after.account.title")}
        </ShopLink>
      )}
      <div className="nl-after-head">
        <div className="nl-min0">
          <h1 className="nl-h1">{rich(t, "after.order.title", { number: <Mono className="nl-after-number">{number}</Mono> })}</h1>
          <div className="nl-after-placed">{rich(t, "after.order.placed", { when: <Mono>{shopMoment(o["placed_at"], zone, locale)}</Mono> })}</div>
        </div>
        <StatusPill order={o} />
      </div>

      {!cancelled && !unpaid && <Steps steps={steps} label={t("after.order.timeline")} />}
      {!cancelled && !unpaid && goods && o["arrives_from"] != null && <p className="nl-after-arrives">{rich(t, "after.order.arrives", { dates: <Mono>{dayRange(o["arrives_from"], o["arrives_to"], locale)}</Mono> })}</p>}

      {unpaid && (
        <section className="nl-panel nl-after-pay" aria-labelledby="nl-after-pay">
          <h2 id="nl-after-pay" className="nl-h4">
            {t("after.pay.title")}
          </h2>
          {status === "paying" ? (
            online ? (
              <>
                {o["pay_by"] != null && <p className="nl-muted nl-after-p">{rich(t, "after.pay.holding", { time: <Mono>{shopTime(o["pay_by"], zone, locale)}</Mono> })}</p>}
                <button type="button" className="nl-btn nl-btn--accent nl-btn--lg nl-after-paybtn" onClick={() => void payNow()} aria-busy={pay === "busy" || undefined}>
                  {pay === "busy" ? <Spinner /> : <Lock size={16} aria-hidden="true" />}
                  {rich(t, "after.pay.now", { amount: <Mono>{m(o["due"] ?? o["total"])}</Mono> })}
                </button>
                <div className="nl-small nl-muted">{t("after.pay.where")}</div>
                {pay === "failed" && (
                  <div role="alert" className="nl-danger-line">
                    <CircleAlert size={14} aria-hidden="true" />
                    {t("after.pay.failed")}
                  </div>
                )}
              </>
            ) : (
              <p className="nl-muted nl-after-p">{t("after.pay.closed")}</p>
            )
          ) : (
            <>
              <p className="nl-muted nl-after-p">{rich(t, "after.pay.toPay", { amount: <Mono>{m(o["due"] ?? o["total"])}</Mono> })}</p>
              {typeof o["transfer_note"] === "string" && o["transfer_note"] !== "" && <div className="nl-after-transfer nl-mono">{o["transfer_note"]}</div>}
              {o["transfer_by"] != null && <div className="nl-after-warn">{rich(t, "after.pay.by", { date: <Mono>{day(o["transfer_by"])}</Mono> })}</div>}
            </>
          )}
        </section>
      )}

      {cancelled && (
        <div role="status" className="nl-after-cancelled">
          <Ban size={18} aria-hidden="true" />
          <span>{cancelText(o, t, day, base?.settings.payHoldMinutes ?? null, locale)}</span>
        </div>
      )}
      {cancel === "refused" && (
        <div role="alert" className="nl-after-alert">
          <CircleAlert size={16} aria-hidden="true" />
          {t("after.cancel.refused")}
        </div>
      )}

      {read.refunds.filter((r) => r["refund_state"] !== "not-sent").length > 0 && (
        <section className="nl-after-refunds" aria-labelledby="nl-after-refunds">
          <h2 id="nl-after-refunds" className="nl-sr">
            {t("after.refunds.title")}
          </h2>
          {read.refunds
            .filter((r) => r["refund_state"] !== "not-sent")
            .map((r) => {
              const done = r["refund_state"] === "done" || r["refund_state"] == null;
              return (
                <div key={String(r["id"])} className={`nl-after-refund ${done ? "nl-after-refund--done" : ""}`}>
                  {done ? <CircleCheck size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" className="nl-flip" />}
                  <span className="nl-grow">{t(done ? "after.refund.done" : "after.refund.onWay")}</span>
                  {done && r["made_at"] != null && <Mono className="nl-muted">{day(r["made_at"])}</Mono>}
                  <Mono className="nl-strong">{m(r["amount"])}</Mono>
                </div>
              );
            })}
        </section>
      )}

      {status === "shipped" && typeof o["tracking"] === "string" && o["tracking"] !== "" && (
        <div className="nl-after-track">
          <Truck size={18} aria-hidden="true" className="nl-accent nl-flip" />
          <div className="nl-grow nl-min0">
            <div className="nl-after-track-label">{t("after.track.number")}</div>
            <Mono className="nl-after-track-no">{o["tracking"]}</Mono>
          </div>
          {track !== null && (
            <a className="nl-btn nl-btn--quiet nl-btn--sm" href={track} target="_blank" rel="noopener noreferrer">
              {t("after.track.it")}
              <ExternalLink size={14} aria-hidden="true" />
              <span className="nl-sr"> {t("after.track.newTab")}</span>
            </a>
          )}
        </div>
      )}

      {actions.length > 0 && <div className="nl-after-actions">{actions}</div>}
      {status === "shipped" && until !== null && <p className="nl-after-until">{rich(t, "after.returnUntil", { date: <Mono>{dayShort(until, locale)}</Mono> })}</p>}

      {read.returns.length > 0 && (
        <section className="nl-after-returns" aria-labelledby="nl-after-returns">
          <h2 id="nl-after-returns" className="nl-h4">
            {t("after.account.returns")}
          </h2>
          {read.returns.map((r) => (
            <button key={String(r["id"])} type="button" className="nl-after-row" onClick={() => showReturn(r)}>
              <Undo2 size={16} aria-hidden="true" className="nl-flip nl-muted" />
              <Mono className="nl-strong">{String(r["number"] ?? "")}</Mono>
              <span className="nl-grow nl-muted nl-small">{t(returnStepKey(r))}</span>
              <Mono>{m(r["refund_amount"])}</Mono>
            </button>
          ))}
        </section>
      )}

      <div className="nl-after-cols">
        <section className="nl-panel nl-after-items" aria-labelledby="nl-after-items">
          <h2 id="nl-after-items" className="nl-h4">
            {t("after.items")}
          </h2>
          {read.lines.map((l) => (
            <div key={String(l["id"])} className="nl-after-line">
              <Picture icon={null} size="line" className="nl-after-line-pic" />
              <div className="nl-grow nl-min0">
                <div className="nl-line-name">{String(l["product_name"] ?? "")}</div>
                <div className="nl-line-opt">
                  {typeof l["variant_label"] === "string" && l["variant_label"] !== "" ? `${l["variant_label"]} ` : ""}
                  <Mono>{t("after.qty", { n: new Intl.NumberFormat(locale).format(Number(l["qty"] ?? 1)) })}</Mono>
                </div>
                {Number(l["qty"] ?? 1) > 1 && <div className="nl-line-each">{rich(t, "after.each", { amount: <Mono>{m(l["each"])}</Mono> })}</div>}
                {!isZero(l["discount"]) && <div className="nl-line-each nl-pos">{rich(t, "after.line.off", { amount: <Mono>{m(l["discount"])}</Mono> })}</div>}
                {l["reviewed_at"] != null && (
                  <span className="nl-after-chip">
                    <Star size={12} aria-hidden="true" />
                    {t("after.reviewSent")}
                  </span>
                )}
              </div>
              <Mono className="nl-after-line-total">{m(l["line"])}</Mono>
            </div>
          ))}
          {read.gifts.map((g) => (
            <div key={`g${String(g["id"])}`} className="nl-after-line">
              <Picture icon={null} size="line" className="nl-after-line-pic" />
              <div className="nl-grow nl-min0">
                <div className="nl-line-name">{rich(t, "after.giftLine", { amount: <Mono>{m(g["amount"])}</Mono>, name: String(g["to_name"] ?? g["to_email"] ?? "") })}</div>
                <div className="nl-line-opt">{String(g["to_email"] ?? "")}</div>
              </div>
              <Mono className="nl-after-line-total">{m(g["amount"])}</Mono>
            </div>
          ))}
          <div className="nl-totals nl-after-totals">
            {goods && <Total label={t("after.totals.goods")} value={m(o["goods"])} />}
            {!isZero(o["gifts"]) && <Total label={t("after.totals.gifts")} value={m(o["gifts"])} />}
            {!isZero(o["discount"]) && <Total label={t("after.totals.discount")} value={`−${m(o["discount"])}`} pos />}
            {goods && <Total label={service === "" ? t("after.totals.shipping") : `${t("after.totals.shipping")} · ${service}`} value={isZero(o["shipping"]) ? t("after.totals.free") : m(o["shipping"])} />}
            {goods && <Total label={t("after.totals.tax")} value={m(o["tax"])} />}
            <Total label={t("after.totals.total")} value={m(o["total"])} strong />
            {!isZero(o["refunded"]) && <Total label={t("after.totals.refunded")} value={`−${m(o["refunded"])}`} pos />}
          </div>
        </section>
        {goods && (
          <section className="nl-panel nl-after-ship" aria-labelledby="nl-after-ship">
            <h2 id="nl-after-ship" className="nl-h4">
              {t("after.shipTo")}
            </h2>
            <address className="nl-after-address">
              {[o["ship_name"], o["address_line1"], o["address_line2"], [o["city"], [o["state_code"] ?? region?.code, o["zip"]].filter(Boolean).join(" ")].filter(Boolean).join(", ")]
                .filter((x) => typeof x === "string" && x !== "")
                .map((x, i) => (
                  <span key={i}>{String(x)}</span>
                ))}
            </address>
            {service !== "" && <div className="nl-small nl-subtle">{service}</div>}
          </section>
        )}
      </div>
      {read.via === "mine" && <NewLink />}
    </>
  );
}

function Total({ label, value, strong = false, pos = false }: { label: string; value: string; strong?: boolean; pos?: boolean }) {
  return (
    <div className={`nl-total-row ${strong ? "nl-total-row--strong" : ""}`}>
      <span>{label}</span>
      <Mono className={pos ? "nl-pos" : ""}>{value}</Mono>
    </div>
  );
}

/** Why the order was cancelled, as its customer reads it. */
function cancelText(o: Row, t: ReturnType<typeof useI18n>["t"], day: (v: unknown) => string, holdMinutes: number | null, locale: string): ReactNode {
  const reason = o["cancel_reason"];
  // Money that was taken and is being given back still counts: a refunded order holds nothing paid, but something was taken.
  if (reason === "customer") return t(isZero(o["paid"]) && isZero(o["refunded"]) ? "after.order.cancelledNothing" : "after.order.cancelledRefund");
  if (reason === "unpaid") {
    if (o["pay_method"] === "transfer" && o["transfer_by"] != null) return rich(t, "after.cancelled.unpaidTransfer", { date: <Mono>{day(o["transfer_by"])}</Mono> });
    return rich(t, "after.cancelled.unpaidOnline", { n: <Mono>{new Intl.NumberFormat(locale).format(holdMinutes ?? 30)}</Mono> }, holdMinutes ?? 30);
  }
  return t("after.cancelled.shop");
}

const RETURN_STEPS: Record<string, MessageKey> = {
  asked: "after.ret.step.asked",
  approved: "after.ret.step.approved",
  received: "after.ret.step.received",
  refunded: "after.ret.step.refunded",
  declined: "after.ret.step.declined",
};

/** A return's step, as the customer reads it: "On its way back" once they told the shop its tracking number. */
export function returnStepKey(r: Row): MessageKey {
  if (r["status"] === "approved" && typeof r["tracking"] === "string" && r["tracking"] !== "") return "after.ret.step.onway";
  return RETURN_STEPS[String(r["status"] ?? "")] ?? "after.ret.step.asked";
}

/** "Make a new link", for an order forwarded to the wrong person. */
function NewLink() {
  const { t } = useI18n();
  const state = useAfter((s) => s.newLink);
  return (
    <section className="nl-after-newlink" aria-labelledby="nl-after-newlink">
      <h2 id="nl-after-newlink" className="nl-h4">
        {t("after.newLink.title")}
      </h2>
      <p className="nl-muted nl-small">{t("after.newLink.sub")}</p>
      <div role="status" className="nl-after-status">
        {state === "sent" && <span className="nl-ok-line">{t("after.newLink.sent")}</span>}
        {state === "limit" && <span className="nl-danger-line">{t("after.newLink.limit")}</span>}
        {state === "failed" && <span className="nl-danger-line">{t("after.err.unreachable")}</span>}
      </div>
      {state !== "sent" && (
        <button type="button" className="nl-btn nl-btn--quiet nl-btn--sm" onClick={() => void makeNewLink()} aria-busy={state === "busy" || undefined}>
          {t("after.newLink.button")}
        </button>
      )}
    </section>
  );
}

function CancelSheet() {
  const { t, locale } = useI18n();
  const open = useAfter((s) => s.cancelSheet);
  const busy = useAfter((s) => s.cancel === "busy");
  const read = useAfter((s) => s.opened?.read ?? null);
  const currency = useShop((s) => s.config.currency);
  if (read === null) return null;
  const amount = <Mono>{money(read.order["paid"], currency, locale)}</Mono>;
  return (
    <ConfirmSheet
      idBase="nl-cancel"
      open={open}
      onClose={() => openCancel(false)}
      title={t("after.cancel.q")}
      text={rich(t, refundWords(read), { amount })}
      keep={t("after.cancel.keep")}
      confirm={t("after.cancel.yes")}
      busy={busy}
      onConfirm={() => {
        void cancelOrder().then((done) => {
          if (done === "done") announce(t(isZero(useAfter.getState().opened?.read?.order["paid"]) && isZero(useAfter.getState().opened?.read?.order["refunded"]) ? "after.order.cancelledNothing" : "after.order.cancelledRefund"));
        });
      }}
    />
  );
}

const STAR_WORDS: MessageKey[] = ["after.review.word.1", "after.review.word.2", "after.review.word.3", "after.review.word.4", "after.review.word.5"];

/** S14 Write a review: a dialog on the order page. No name field, no publish tick. */
function ReviewDialog() {
  const { t, locale } = useI18n();
  const review = useAfter((s) => s.review);
  const read = useAfter((s) => s.opened?.read ?? null);
  const reviews = useAfter((s) => s.reviews);
  const ref = useDialog(review.open, closeReview);
  if (!review.open || read === null) return null;
  const lines = reviewable(read, reviews);
  const errors = review.tried ? reviewErrors(review) : {};
  const line = read.lines.find((l) => String(l["id"]) === review.lineId);
  const name = line === undefined ? "" : [line["product_name"], line["variant_label"]].filter((x) => typeof x === "string" && x !== "").join(" · ");
  const send = async () => {
    const done = await sendReview();
    if (done === "fix") {
      const e = reviewErrors(useAfter.getState().review);
      document.getElementById(e.line ? "nl-rv-line-0" : e.stars ? "nl-rv-star-1" : "nl-rv-body")?.focus();
    }
  };
  return (
    <div className="nl-scrim nl-scrim--center" onClick={closeReview}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="nl-rv-title" className="nl-dialog nl-dialog--wide" onClick={(e) => e.stopPropagation()}>
        <div className="nl-dialog-head">
          <div className="nl-grow nl-min0">
            <h2 id="nl-rv-title" className="nl-dialog-title">
              {t("after.review.title")}
            </h2>
            {name !== "" && <div className="nl-small nl-subtle">{name}</div>}
          </div>
          <button type="button" className="nl-icon-btn" aria-label={t("shop.close")} onClick={closeReview}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <form
          className="nl-dialog-body nl-after-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {lines.length > 1 && (
            <fieldset className="nl-fieldset">
              <legend className="nl-legend">{t("after.review.which")}</legend>
              <div className="nl-chips">
                {lines.map((l, i) => (
                  <button key={String(l["id"])} id={`nl-rv-line-${i}`} type="button" className="nl-chip" aria-pressed={review.lineId === String(l["id"])} aria-describedby={errors.line ? "nl-rv-line-err" : undefined} onClick={() => typeReview({ lineId: String(l["id"]) })}>
                    {[l["product_name"], l["variant_label"]].filter((x) => typeof x === "string" && x !== "").join(" · ")}
                  </button>
                ))}
              </div>
              {errors.line && <FieldError id="nl-rv-line-err">{t("after.review.err.line")}</FieldError>}
            </fieldset>
          )}
          <fieldset className="nl-fieldset">
            <legend className="nl-legend">{t("after.review.rating")}</legend>
            <div className="nl-after-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  id={`nl-rv-star-${n}`}
                  type="button"
                  className={`nl-after-star ${review.stars >= n ? "nl-after-star--on" : ""}`}
                  aria-pressed={review.stars === n}
                  aria-label={t("after.review.star", { n: new Intl.NumberFormat(locale).format(n) }, n)}
                  aria-describedby={errors.stars ? "nl-rv-stars-err" : undefined}
                  onClick={() => typeReview({ stars: n })}
                >
                  <span aria-hidden="true">★</span>
                </button>
              ))}
              <span className="nl-after-star-word">{review.stars > 0 ? t(STAR_WORDS[review.stars - 1]!) : ""}</span>
            </div>
            {errors.stars && <FieldError id="nl-rv-stars-err">{t("after.review.err.stars")}</FieldError>}
          </fieldset>
          <div className="nl-field">
            <label htmlFor="nl-rv-titlein" className="nl-label">
              {t("after.review.titleLabel")}
            </label>
            <input id="nl-rv-titlein" className="nl-input" maxLength={80} value={review.title} onChange={(e) => typeReview({ title: e.target.value })} />
          </div>
          <div className="nl-field">
            <label htmlFor="nl-rv-body" className="nl-label">
              {t("after.review.body")}
            </label>
            <textarea id="nl-rv-body" className="nl-textarea" rows={4} maxLength={2000} value={review.body} onChange={(e) => typeReview({ body: e.target.value })} aria-invalid={errors.body ? true : undefined} aria-describedby={errors.body ? "nl-rv-body-err" : undefined} />
            {errors.body && <FieldError id="nl-rv-body-err">{t("after.review.err.body")}</FieldError>}
          </div>
          {review.failed !== null && (
            <div role="alert" className="nl-danger-line">
              <CircleAlert size={14} aria-hidden="true" />
              {t(review.failed === "address" ? "after.review.address" : "after.err.unreachable")}
            </div>
          )}
          <div className="nl-after-actions">
            <button type="button" className="nl-btn nl-btn--quiet nl-grow" onClick={closeReview}>
              {t("after.review.cancel")}
            </button>
            <button type="submit" className="nl-btn nl-btn--accent nl-grow" aria-busy={review.busy || undefined}>
              {t("after.review.send")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
