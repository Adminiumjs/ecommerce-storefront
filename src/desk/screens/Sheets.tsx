/**
 * The desk's sheets (comp N2 39–107): ship, cancel, refund in two steps,
 * "Mark as paid", decline a return, receive one, hide a review, and DHL's
 * hand-over. Each restates what it will do in figures Adminium stored; the
 * steps that cannot be undone are `alertdialog`s. Every error is tied to its
 * field.
 */
import { useState } from "react";
import { Truck } from "lucide-react";

import { useData, useEnv, useRun } from "../env.tsx";
import type { DeskData } from "../door.ts";
import { isGift, keptPayments, linesOf, returnLinesOf, splitRefund, status } from "../facts.ts";
import { useFmt } from "../format.ts";
import { closeSheet, openSheet, useDesk, type Overlay } from "../store.ts";
import { dayIn } from "../time.ts";
import { Chip, Fig, FieldError, Sheet } from "../ui.tsx";
import { returnReasonWord, wayWord } from "../words.ts";
import { DispatchFill } from "../dispatch.tsx";
import { HIDE_REASONS } from "./Reviews.tsx";
import { num, same, text, type Id } from "../wire.ts";
import { useT, type MessageKey } from "../../i18n/index.tsx";

/** The reasons the shop cancels for (the customer's own and the clock's are theirs alone). */
const CANCEL_REASONS: Record<string, MessageKey> = { asked: "desk.cancel.reason.asked", stock: "desk.cancel.reason.stock", address: "desk.cancel.reason.address", other: "desk.cancel.reason.other" };

let keySeq = 0;
/** A retry key for a write that moves money: the same press sent twice writes once. */
export function retryKey(kind: string, id: Id, now: number): string {
  keySeq += 1;
  return `desk:${kind}:${String(id)}:${now.toString(36)}:${String(keySeq)}`;
}

/** Cents of a typed amount ("216.25", "$216.25"), or null when it is not one. */
export function centsOf(typed: string): number | null {
  const clean = typed.replace(/[^\d.]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}
const dollars = (cents: number) => (cents / 100).toFixed(2);

export function Sheets() {
  const overlay = useDesk((s) => s.overlay);
  if (overlay === null) return null;
  switch (overlay.kind) {
    case "ship":
      return <ShipSheet orderId={overlay.orderId} />;
    case "cancel":
      return <CancelSheet orderId={overlay.orderId} />;
    case "refund":
      return <RefundSheet orderId={overlay.orderId} returnId={overlay.returnId} />;
    case "markPaid":
      return <MarkPaidSheet orderId={overlay.orderId} />;
    case "decline":
      return <DeclineSheet returnId={overlay.returnId} />;
    case "receive":
      return <ReceiveSheet returnId={overlay.returnId} />;
    case "hide":
      return <HideSheet reviewId={overlay.reviewId} />;
    case "dispatch":
      return <DispatchSheet overlay={overlay} />;
  }
}

const orderIn = (data: DeskData, id: Id) => data.orders.find((o) => same(o.id, id));

function Buttons({ children }: { children: React.ReactNode }) {
  return <div className="dk-sheet-foot">{children}</div>;
}

function ShipSheet({ orderId }: { orderId: Id }) {
  const t = useT();
  const data = useData();
  const { busy, run } = useRun();
  const order = orderIn(data, orderId);
  const [carrier, setCarrier] = useState(text(order?.["carrier"]) ?? "");
  const [tracking, setTracking] = useState(text(order?.["tracking"]) ?? "");
  const [err, setErr] = useState<{ carrier?: boolean; tracking?: boolean }>({});
  if (order === undefined) return null;
  const number = text(order["number"]) ?? "";
  const submit = () => {
    const bad = { carrier: carrier.trim() === "", tracking: tracking.trim() === "" };
    setErr(bad);
    if (bad.carrier || bad.tracking) return;
    void run(async (d) => {
      await d.moveOrder(order, "shipped", { carrier: carrier.trim(), tracking: tracking.trim() });
      closeSheet();
      return t("desk.toast.shipped", { number });
    });
  };
  return (
    <Sheet labelledBy="ship-h">
      <h2 id="ship-h" className="dk-sheet-title">
        {t("desk.ship.title", { number })}
      </h2>
      <div className="dk-field">
        <label htmlFor="ship-carrier">{t("desk.ship.carrier")}</label>
        <input id="ship-carrier" className="dk-input" value={carrier} aria-invalid={err.carrier === true} aria-describedby={err.carrier === true ? "ship-carrier-err" : undefined} onChange={(e) => setCarrier(e.target.value)} />
        {err.carrier === true && <FieldError id="ship-carrier-err">{t("desk.ship.errCarrier")}</FieldError>}
      </div>
      <div className="dk-field">
        <label htmlFor="ship-track">{t("desk.ship.tracking")}</label>
        <input id="ship-track" className="dk-input dk-input--mono" dir="ltr" value={tracking} aria-invalid={err.tracking === true} aria-describedby={err.tracking === true ? "ship-track-err" : undefined} onChange={(e) => setTracking(e.target.value)} />
        {err.tracking === true && <FieldError id="ship-track-err">{t("desk.ship.errTracking")}</FieldError>}
      </div>
      <Buttons>
        <button type="button" className="dk-btn" onClick={closeSheet}>
          {t("desk.cancel")}
        </button>
        <button type="button" className="dk-btn dk-btn--primary" disabled={busy} onClick={submit}>
          {t("desk.ship.markShipped")}
        </button>
      </Buttons>
    </Sheet>
  );
}

function CancelSheet({ orderId }: { orderId: Id }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { busy, run } = useRun();
  const order = orderIn(data, orderId);
  const [reason, setReason] = useState("asked");
  if (order === undefined) return null;
  const number = text(order["number"]) ?? "";
  const paid = num(order["paid"]) ?? 0;
  const pieces = linesOf(data, order).reduce((n, l) => n + (num(l["qty"]) ?? 0), 0);
  const byBank = keptPayments(data, order).some((p) => text(p["method"]) === "transfer");
  let body: string;
  if (isGift(order)) body = t("desk.cancel.bodyGift", { number, amount: fmt.money(order["paid"]) });
  else if (paid <= 0) body = t("desk.cancel.bodyUnpaid", { number }, pieces);
  else if (byBank) body = t("desk.cancel.bodyTransfer", { number, amount: fmt.money(order["paid"]) }, pieces);
  else body = t("desk.cancel.bodyPaid", { number, amount: fmt.money(order["paid"]) }, pieces);
  return (
    <Sheet labelledBy="cancel-h" describedBy="cancel-body" alert>
      <h2 id="cancel-h" className="dk-sheet-title">
        {t("desk.cancel.title", { number })}
      </h2>
      <p id="cancel-body">
        {body} <strong>{t("desk.cantUndo")}</strong>
      </p>
      <div className="dk-field">
        <label htmlFor="cancel-reason">{t("desk.cancel.why")}</label>
        <select id="cancel-reason" className="dk-input" value={reason} onChange={(e) => setReason(e.target.value)}>
          {Object.entries(CANCEL_REASONS).map(([k, key]) => (
            <option key={k} value={k}>
              {t(key)}
            </option>
          ))}
        </select>
      </div>
      <Buttons>
        <button type="button" className="dk-btn" onClick={closeSheet}>
          {t("desk.cancel.keep")}
        </button>
        <button
          type="button"
          className="dk-btn dk-btn--danger-solid"
          disabled={busy}
          onClick={() =>
            void run(async (d) => {
              // The refund is Adminium's: an online payment goes back by itself on the owner's cancel (refundOn), a
              // gift card gets its money back with the cancel (Offers), and a sold card is recalled (refused if spent).
              await d.moveOrder(order, "cancelled", { cancel_reason: reason });
              closeSheet();
              return t("desk.toast.cancelled", { number });
            })
          }
        >
          {t("desk.cancel.confirm")}
        </button>
      </Buttons>
    </Sheet>
  );
}

function RefundSheet({ orderId, returnId }: { orderId: Id; returnId: Id | null }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const order = orderIn(data, orderId);
  const ret = returnId === null ? undefined : data.returns.find((r) => same(r.id, returnId));
  const faulty = text(ret?.["reason"]) === "faulty" && data.settings?.["refund_shipping_faulty"] === true && (num(ret?.["shipping_refund"]) ?? 0) === 0;
  const shipping = num(order?.["shipping"]) ?? 0;
  const [withShipping, setWithShipping] = useState(faulty && shipping > 0);
  const base = ret === undefined ? Math.round((num(order?.["paid"]) ?? 0) * 100) : Math.round((num(ret["refund_short"]) ?? 0) * 100);
  const most = base + (withShipping ? Math.round(shipping * 100) : 0);
  const [amount, setAmount] = useState(dollars(most));
  const [reason, setReason] = useState(ret === undefined ? "" : returnReasonWord(t, ret));
  const [step, setStep] = useState<1 | 2>(1);
  const [err, setErr] = useState<{ amount?: MessageKey; reason?: boolean }>({});
  if (order === undefined) return null;
  const number = text(order["number"]) ?? "";
  const cents = centsOf(amount) ?? 0;
  const way = wayWord(t, data, order) ?? t("desk.way.online");
  const next = () => {
    const c = centsOf(amount);
    const bad = { amount: c === null || c <= 0 ? ("desk.refund.errAmount" as const) : c > most ? ("desk.refund.errTooMuch" as const) : undefined, reason: reason.trim() === "" };
    setErr(bad);
    if (bad.amount === undefined && !bad.reason) setStep(2);
  };
  const confirm = () =>
    void run(async (d) => {
      // A faulty piece: the order's shipping goes back too (N2-D8), kept on the return so its refund covers it.
      if (ret !== undefined && withShipping) await d.saveReturn(ret, { shipping_refund: dollars(Math.round(shipping * 100)) });
      const parts = splitRefund(data, order, cents);
      for (const part of parts) {
        await d.refund({ payment: part.payment, amount: dollars(part.cents), reason: reason.trim(), returnId: ret?.id ?? null, key: retryKey("refund", part.payment.id, door.now()) });
      }
      if (ret !== undefined) {
        // The return moves on only once its refunds cover it; a refund not sent leaves it to retry.
        const fresh = (await d.load()).returns.find((r) => same(r.id, ret.id));
        if (fresh !== undefined && (num(fresh["refund_short"]) ?? 1) <= 0 && text(fresh["status"]) === "received") await d.moveReturn(fresh, "refunded");
      }
      closeSheet();
      return t("desk.toast.refunded", { amount: fmt.money(dollars(cents)), number: text(ret?.["number"]) ?? number });
    });
  const name = text(order["name"]) ?? "";
  if (step === 2) {
    return (
      <Sheet labelledBy="refund2-h" describedBy="refund2-body" alert onClose={() => setStep(1)}>
        <h2 id="refund2-h" className="dk-sheet-title">
          {t("desk.refund.step2")}
        </h2>
        <p id="refund2-body">
          {ret === undefined
            ? t("desk.refund.confirmOrder", { amount: fmt.money(dollars(cents)), name, way, number, reason: reason.trim() })
            : t("desk.refund.confirmReturn", { amount: fmt.money(dollars(cents)), name, way, number: text(ret["number"]) ?? "", order: number, reason: reason.trim() })}{" "}
          <strong>{t("desk.cantUndo")}</strong>
        </p>
        <Buttons>
          <button type="button" className="dk-btn" onClick={() => setStep(1)}>
            {t("desk.goBack")}
          </button>
          <button type="button" className="dk-btn dk-btn--danger-solid" disabled={busy} onClick={confirm}>
            {t("desk.refund.do", { amount: fmt.money(dollars(cents)) })}
          </button>
        </Buttons>
      </Sheet>
    );
  }
  return (
    <Sheet labelledBy="refund1-h">
      <h2 id="refund1-h" className="dk-sheet-title">
        {t("desk.refund.step1")}
      </h2>
      <div className="dk-field">
        <label htmlFor="refund-amount">{t("desk.refund.amount")}</label>
        <input
          id="refund-amount"
          className="dk-input dk-input--mono"
          dir="ltr"
          inputMode="decimal"
          value={amount}
          aria-invalid={err.amount !== undefined}
          aria-describedby={`refund-amount-hint${err.amount === undefined ? "" : " refund-amount-err"}`}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div id="refund-amount-hint" className="dk-hint">
          {ret === undefined ? t("desk.refund.upToOrder", { amount: fmt.money(dollars(most)) }) : t("desk.refund.upTo", { amount: fmt.money(dollars(most)) })}
        </div>
        {err.amount !== undefined && <FieldError id="refund-amount-err">{t(err.amount, { amount: fmt.money(dollars(most)) })}</FieldError>}
      </div>
      {faulty && shipping > 0 && (
        <label className="dk-check">
          <input
            type="checkbox"
            checked={withShipping}
            onChange={(e) => {
              setWithShipping(e.target.checked);
              setAmount(dollars(base + (e.target.checked ? Math.round(shipping * 100) : 0)));
            }}
          />
          <span>
            {t("desk.refund.withShipping")} <span className="dk-hint">{t("desk.refund.withShippingHint", { amount: fmt.money(shipping), number })}</span>
          </span>
        </label>
      )}
      {ret !== undefined && (
        <div className="dk-hint">
          {returnLinesOf(data, ret).some((l) => l["restock"] !== false) ? t("desk.refund.restocked", undefined, returnLinesOf(data, ret).filter((l) => l["restock"] !== false).reduce((n, l) => n + (num(l["qty"]) ?? 0), 0)) : t("desk.refund.notRestocked")}
        </div>
      )}
      <div className="dk-field">
        <label htmlFor="refund-reason">{t("desk.refund.reason")}</label>
        <input id="refund-reason" className="dk-input" value={reason} aria-invalid={err.reason === true} aria-describedby={`refund-reason-hint${err.reason === true ? " refund-reason-err" : ""}`} onChange={(e) => setReason(e.target.value)} />
        <div id="refund-reason-hint" className="dk-hint">
          {t("desk.refund.reasonHint")}
        </div>
        {err.reason === true && <FieldError id="refund-reason-err">{t("desk.refund.errReason")}</FieldError>}
      </div>
      <Buttons>
        <button type="button" className="dk-btn" onClick={closeSheet}>
          {t("desk.cancel")}
        </button>
        <button type="button" className="dk-btn dk-btn--primary" onClick={next}>
          {t("desk.next")}
        </button>
      </Buttons>
    </Sheet>
  );
}

function MarkPaidSheet({ orderId }: { orderId: Id }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const order = orderIn(data, orderId);
  const due = num(order?.["due"]) ?? num(order?.["total"]) ?? 0;
  const [amount, setAmount] = useState(due.toFixed(2));
  const [day, setDay] = useState(dayIn(door.now(), door.facts().zone));
  const [note, setNote] = useState("");
  const [err, setErr] = useState<{ amount?: boolean; day?: boolean }>({});
  if (order === undefined) return null;
  const number = text(order["number"]) ?? "";
  const late = status(order) === "cancelled";
  const submit = () => {
    const c = centsOf(amount);
    const bad = { amount: c === null || c <= 0, day: !/^\d{4}-\d{2}-\d{2}$/.test(day) || day > dayIn(door.now(), door.facts().zone) };
    setErr(bad);
    if (bad.amount || bad.day) return;
    void run(async (d) => {
      await d.recordTransfer({ order, amount: dollars(c!), paidOn: day, note: note.trim() === "" ? null : note.trim(), key: retryKey("transfer", order.id, door.now()) });
      // Paid in full: the order moves on to be packed. A transfer after the cancel stays cancelled, owed back.
      if (!late && c! >= Math.round(due * 100)) await d.moveOrder(order, "paid");
      closeSheet();
      return late ? t("desk.toast.lateTransfer", { number }) : t("desk.toast.markedPaid", { number });
    });
  };
  return (
    <Sheet labelledBy="paid-h">
      <h2 id="paid-h" className="dk-sheet-title">
        {t("desk.paid.title", { number })}
      </h2>
      <p className="dk-hint">{late ? t("desk.paid.lateNote") : t("desk.paid.note", { amount: fmt.money(due) })}</p>
      <div className="dk-field">
        <label htmlFor="paid-amount">{t("desk.refund.amount")}</label>
        <input id="paid-amount" className="dk-input dk-input--mono" dir="ltr" inputMode="decimal" value={amount} aria-invalid={err.amount === true} aria-describedby={err.amount === true ? "paid-amount-err" : undefined} onChange={(e) => setAmount(e.target.value)} />
        {err.amount === true && <FieldError id="paid-amount-err">{t("desk.refund.errAmount")}</FieldError>}
      </div>
      <div className="dk-field">
        <label htmlFor="paid-day">{t("desk.paid.day")}</label>
        <input id="paid-day" className="dk-input dk-input--mono" type="date" value={day} aria-invalid={err.day === true} aria-describedby={err.day === true ? "paid-day-err" : undefined} onChange={(e) => setDay(e.target.value)} />
        {err.day === true && <FieldError id="paid-day-err">{t("desk.paid.errDay")}</FieldError>}
      </div>
      <div className="dk-field">
        <label htmlFor="paid-note">{t("desk.paid.noteLabel")}</label>
        <input id="paid-note" className="dk-input" value={note} aria-describedby="paid-note-hint" onChange={(e) => setNote(e.target.value)} />
        <div id="paid-note-hint" className="dk-hint">
          {t("desk.paid.noteHint")}
        </div>
      </div>
      <Buttons>
        <button type="button" className="dk-btn" onClick={closeSheet}>
          {t("desk.cancel")}
        </button>
        <button type="button" className="dk-btn dk-btn--primary" disabled={busy} onClick={submit}>
          {t("desk.paid.confirm")}
        </button>
      </Buttons>
    </Sheet>
  );
}

function DeclineSheet({ returnId }: { returnId: Id }) {
  const t = useT();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const ret = data.returns.find((r) => same(r.id, returnId));
  const [why, setWhy] = useState("");
  const [err, setErr] = useState(false);
  if (ret === undefined) return null;
  const number = text(ret["number"]) ?? "";
  const submit = () => {
    if (why.trim() === "") {
      setErr(true);
      return;
    }
    void run(async (d) => {
      // Each piece freed first, so the order line's pieces may come back in another return; then the return moves.
      const at = new Date(door.now()).toISOString();
      for (const line of returnLinesOf(data, ret)) await d.saveReturnLine(line, { void_at: at });
      await d.moveReturn(ret, "declined", { staff_reason: why.trim() });
      closeSheet();
      return t("desk.toast.declined", { number });
    });
  };
  return (
    <Sheet labelledBy="decline-h">
      <h2 id="decline-h" className="dk-sheet-title">
        {t("desk.decline.title", { number })}
      </h2>
      <div className="dk-field">
        <label htmlFor="decline-why">{t("desk.decline.label")}</label>
        <textarea id="decline-why" className="dk-input" rows={3} value={why} aria-invalid={err} aria-describedby={`decline-hint${err ? " decline-err" : ""}`} onChange={(e) => setWhy(e.target.value)} />
        <div id="decline-hint" className="dk-hint">
          {t("desk.decline.hint")}
        </div>
        {err && <FieldError id="decline-err">{t("desk.decline.err")}</FieldError>}
      </div>
      <Buttons>
        <button type="button" className="dk-btn" onClick={closeSheet}>
          {t("desk.cancel")}
        </button>
        <button type="button" className="dk-btn dk-btn--danger-solid" disabled={busy} onClick={submit}>
          {t("desk.decline.confirm")}
        </button>
      </Buttons>
    </Sheet>
  );
}

function ReceiveSheet({ returnId }: { returnId: Id }) {
  const t = useT();
  const data = useData();
  const { busy, run } = useRun();
  const ret = data.returns.find((r) => same(r.id, returnId));
  const faulty = text(ret?.["reason"]) === "faulty";
  const lines = ret === undefined ? [] : returnLinesOf(data, ret);
  const [restock, setRestock] = useState<Record<string, boolean>>(() => Object.fromEntries(lines.map((l) => [String(l.id), !faulty])));
  if (ret === undefined) return null;
  const number = text(ret["number"]) ?? "";
  return (
    <Sheet labelledBy="receive-h" describedBy="receive-note">
      <h2 id="receive-h" className="dk-sheet-title">
        {t("desk.receive.title", { number })}
      </h2>
      {lines.map((l) => {
        const id = String(l.id);
        return (
          <label key={id} className="dk-check">
            <input type="checkbox" checked={restock[id] === true} onChange={(e) => setRestock({ ...restock, [id]: e.target.checked })} />
            <span>
              {t("desk.receive.restock")}
              <span className="dk-muted">
                {" "}
                · {text(l["product_name"])} · {text(l["variant_label"])} <Fig>× {num(l["qty"]) ?? 1}</Fig>
              </span>
            </span>
          </label>
        );
      })}
      {faulty && <div className="dk-hint">{t("desk.receive.faulty")}</div>}
      <p id="receive-note" className="dk-hint">
        {t("desk.receive.note")}
      </p>
      <Buttons>
        <button type="button" className="dk-btn" onClick={closeSheet}>
          {t("desk.cancel")}
        </button>
        <button
          type="button"
          className="dk-btn dk-btn--primary"
          disabled={busy}
          onClick={() =>
            void run(async (d) => {
              for (const line of lines) {
                // Each piece is marked received with its "put back in stock": the piece's own posting takes it back then.
                const want = restock[String(line.id)] === true;
                if (line["received"] !== true) await d.saveReturnLine(line, { restock: want, received: true });
              }
              await d.moveReturn(ret, "received");
              closeSheet();
              return t("desk.toast.received", { number });
            })
          }
        >
          {t("desk.receive.confirm")}
        </button>
      </Buttons>
    </Sheet>
  );
}

function HideSheet({ reviewId }: { reviewId: Id }) {
  const t = useT();
  const data = useData();
  const { busy, run } = useRun();
  const review = data.reviews?.reviews.find((r) => same(r.id, reviewId));
  const [reason, setReason] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  if (review === undefined) return null;
  return (
    <Sheet labelledBy="hide-h" describedBy="hide-note">
      <h2 id="hide-h" className="dk-sheet-title">
        {t("desk.hide.title")}
      </h2>
      <fieldset className="dk-fieldset" aria-invalid={err} aria-describedby={err ? "hide-err" : undefined}>
        <legend>{t("desk.hide.why")}</legend>
        {Object.entries(HIDE_REASONS).map(([k, key]) => (
          <label key={k} className="dk-check">
            <input type="radio" name="hide-reason" value={k} checked={reason === k} onChange={() => setReason(k)} />
            {t(key)}
          </label>
        ))}
        {err && <FieldError id="hide-err">{t("desk.hide.err")}</FieldError>}
      </fieldset>
      <p id="hide-note" className="dk-hint">
        {t("desk.hide.note")}
      </p>
      <Buttons>
        <button type="button" className="dk-btn" onClick={closeSheet}>
          {t("desk.cancel")}
        </button>
        <button
          type="button"
          className="dk-btn dk-btn--danger-solid"
          disabled={busy}
          onClick={() => {
            if (reason === null) {
              setErr(true);
              return;
            }
            void run(async (d) => {
              await d.saveReview(review, { state: "hidden", hide_reason: reason });
              closeSheet();
              return t("desk.toast.hidden");
            });
          }}
        >
          {t("desk.hide.confirm")}
        </button>
      </Buttons>
    </Sheet>
  );
}

/** "Hand over to DHL": each order's DHL panel in turn (ADD-4). A real booking ships the order; a demo one only shows its number. */
function DispatchSheet({ overlay }: { overlay: Extract<Overlay, { kind: "dispatch" }> }) {
  const t = useT();
  const data = useData();
  const { busy, run } = useRun();
  const [demo, setDemo] = useState<string | null>(null);
  const id = overlay.orderIds[overlay.at];
  const order = id === undefined ? undefined : orderIn(data, id);
  if (order === undefined) return null;
  const number = text(order["number"]) ?? "";
  const last = overlay.at >= overlay.orderIds.length - 1;
  const onBooked = (booking: { tracking: string; service: string; demo: boolean }) => {
    if (booking.demo) {
      setDemo(booking.tracking);
      return;
    }
    if (status(order) !== "packed") return;
    void run(async (d) => (await d.moveOrder(order, "shipped", { carrier: "DHL", tracking: booking.tracking }), t("desk.toast.shipped", { number })));
  };
  return (
    <Sheet labelledBy="dhl-h" wide>
      <div className="dk-title-row">
        <h2 id="dhl-h" className="dk-sheet-title">
          <Truck size={18} aria-hidden="true" /> {t("desk.dhl.title")}
        </h2>
        <Chip tone="warn">{t("desk.dhl.demoCarrier")}</Chip>
        <span className="dk-push dk-muted">
          <Fig>{t("desk.dhl.step", { at: overlay.at + 1, of: overlay.orderIds.length })}</Fig>
        </span>
      </div>
      <div className="dk-strong">
        <Fig strong>{number}</Fig> · {text(order["ship_name"]) ?? text(order["name"])}
      </div>
      <DispatchFill key={String(order.id)} order={order} onBooked={onBooked} fallback={<div className="dk-empty dk-empty--small">{t("desk.dhl.loading")}</div>} />
      {demo !== null && (
        <div className="dk-banner dk-banner--warn" role="status">
          {t("desk.dhl.demoBooked", { tracking: demo })}
        </div>
      )}
      <Buttons>
        <button type="button" className="dk-btn" onClick={closeSheet}>
          {t("desk.close")}
        </button>
        {!last && (
          <button
            type="button"
            className="dk-btn dk-btn--primary"
            disabled={busy}
            onClick={() => {
              setDemo(null);
              openSheet({ ...overlay, at: overlay.at + 1 });
            }}
          >
            {t("desk.dhl.next")}
          </button>
        )}
      </Buttons>
    </Sheet>
  );
}

