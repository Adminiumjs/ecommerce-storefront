/**
 * K2 Orders (comp N2 283–316) and K3 the order (318–393).
 *
 * The list filters by status, service and whether it was paid; the top bar's
 * search narrows it by number, name or e-mail. Each row's total carries how
 * its money stands and, once paid, how (N2-F3); an order that never ships by
 * parcel has no ship-by (N2-F4). The packer's reads carry no money, so their
 * list has no total and no pay chip.
 *
 * The order shows its lines and the figures as Adminium stored them, the
 * payment as Adminium's Payment panel answers it to this person (plan 72),
 * the customer and address, the timeline, the e-mails the outbox sent and the
 * staff note. Its moves are the ones Adminium's states allow and the role may
 * make: Refund only where the panel says `mayRefund`; Cancel never while the
 * customer is paying (R3) and never once shipped; "Mark as paid" for a bank
 * transfer, the owner's.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, Ban, Check, CircleAlert, Gift, Info, Mail, PackageCheck, Truck, Undo2, Banknote, Send } from "lucide-react";

import { useData, useEnv, useRun } from "../env.tsx";
import type { PaymentPanel } from "../door.ts";
import { codesOf, customerOf, DHL, filterOrders, giftLinesOf, isGift, isOwner, keptPayments, linesOf, messagesOf, orderMoves, paymentsOf, providerName, refundsOf, shipsByOf, showsMoney, status } from "../facts.ts";
import { useFmt } from "../format.ts";
import { go, NO_FILTER, openSheet, useDesk } from "../store.ts";
import { Card, Chip, Fig, Latin } from "../ui.tsx";
import { orderStatusWord, payWord, serviceWord, wayWord } from "../words.ts";
import { num, same, text, type Row } from "../wire.ts";
import { useT, type MessageKey } from "../../i18n/index.tsx";

const STATUSES = ["paying", "awaiting_transfer", "paid", "packed", "shipped", "sent", "cancelled"] as const;
const STATUS_KEY: Record<(typeof STATUSES)[number], MessageKey> = {
  paying: "desk.status.paying",
  awaiting_transfer: "desk.status.transfer",
  paid: "desk.status.toPack",
  packed: "desk.status.packed",
  shipped: "desk.status.shipped",
  sent: "desk.status.sent",
  cancelled: "desk.status.cancelled",
};

export function OrdersScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const filter = useDesk((s) => s.orderFilter);
  const rows = filterOrders(data, filter);
  const money = data.orders.some(showsMoney);
  const filtered = filter.status !== "all" || filter.service !== "all" || filter.paid !== "all";
  const set = (patch: Partial<typeof filter>) => useDesk.setState({ orderFilter: { ...filter, ...patch } });

  return (
    <div className="dk-screen">
      <div className="dk-head">
        <h1 className="dk-h1">{t("desk.orders.title")}</h1>
        <span className="dk-sub">{filtered ? t("desk.orders.countOf", { shown: rows.length, all: data.orders.length }) : t("desk.orders.count", undefined, data.orders.length)}</span>
      </div>
      <div className="dk-filters">
        <div className="dk-field dk-field--filter">
          <label htmlFor="of-status">{t("desk.orders.fStatus")}</label>
          <select id="of-status" value={filter.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="all">{t("desk.all")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(STATUS_KEY[s])}
              </option>
            ))}
          </select>
        </div>
        <div className="dk-field dk-field--filter">
          <label htmlFor="of-service">{t("desk.orders.fService")}</label>
          <select id="of-service" value={filter.service} onChange={(e) => set({ service: e.target.value })}>
            <option value="all">{t("desk.all")}</option>
            {data.services.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>
                {text(s["label"])}
              </option>
            ))}
          </select>
        </div>
        {money && (
          <div className="dk-field dk-field--filter">
            <label htmlFor="of-paid">{t("desk.orders.fPaid")}</label>
            <select id="of-paid" value={filter.paid} onChange={(e) => set({ paid: e.target.value })}>
              <option value="all">{t("desk.all")}</option>
              <option value="paid">{t("desk.pay.paid")}</option>
              <option value="unpaid">{t("desk.pay.notPaid")}</option>
              <option value="owed">{t("desk.pay.owed")}</option>
            </select>
          </div>
        )}
        {filtered && (
          <button type="button" className="dk-btn" onClick={() => useDesk.setState({ orderFilter: NO_FILTER })}>
            {t("desk.orders.clear")}
          </button>
        )}
      </div>
      <div className="dk-card">
        <div className="dk-scroll">
          <table className="dk-table">
            <thead>
              <tr>
                <th scope="col">{t("desk.col.number")}</th>
                <th scope="col">{t("desk.col.placed")}</th>
                <th scope="col">{t("desk.col.customer")}</th>
                <th scope="col">{t("desk.col.items")}</th>
                {money && <th scope="col">{t("desk.col.total")}</th>}
                <th scope="col">{t("desk.col.service")}</th>
                <th scope="col">{t("desk.col.shipsBy")}</th>
                <th scope="col">{t("desk.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const word = orderStatusWord(t, o);
                const pay = payWord(t, fmt, o);
                const way = pay.state === "paid" || pay.state === "part-refunded" ? wayWord(t, data, o) : null;
                const ships = shipsByOf(o);
                return (
                  <tr key={String(o.id)} className={status(o) === "cancelled" ? "dk-row--dim" : undefined}>
                    <td>
                      <a
                        href="#main"
                        className="dk-num-link"
                        onClick={(e) => {
                          e.preventDefault();
                          go("order", { orderId: o.id });
                        }}
                      >
                        <Fig strong>{text(o["number"])}</Fig>
                      </a>
                    </td>
                    <td className="dk-muted">
                      <Fig>{fmt.dayTime(o["placed_at"])}</Fig>
                    </td>
                    <td className="dk-strong">{text(o["name"]) ?? text(o["ship_name"])}</td>
                    <td>
                      <Fig>{isGift(o) ? "—" : (num(o["pieces"]) ?? 0)}</Fig>
                    </td>
                    {money && (
                      <td className="dk-nowrap">
                        <span className="dk-total">
                          <Fig strong>{fmt.money(o["total"])}</Fig>
                          <Chip tone={pay.tone}>{way === null ? pay.label : `${pay.label} · ${way}`}</Chip>
                        </span>
                      </td>
                    )}
                    <td>{isGift(o) ? t("desk.way.giftCards") : serviceWord(data, o)}</td>
                    <td>
                      <Fig>{ships === null ? "—" : fmt.day(ships)}</Fig>
                    </td>
                    <td>
                      <Chip tone={word.tone}>{word.label}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="dk-empty">{t("desk.orders.none")}</div>}
      </div>
    </div>
  );
}

/** The order's Payment panel as Adminium answers it to this person, read when the order opens and again after a write. */
function usePanel(order: Row | undefined, money: boolean): PaymentPanel | null {
  const { door } = useEnv();
  const data = useDesk((s) => s.data);
  const [panel, setPanel] = useState<PaymentPanel | null>(null);
  useEffect(() => {
    if (order === undefined || !money) return;
    let live = true;
    door.panel(order).then(
      (p) => live && setPanel(p),
      () => live && setPanel(null),
    );
    return () => {
      live = false;
    };
  }, [door, order, money, data]);
  return panel;
}

export function OrderScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const who = door.who();
  const owner = isOwner(who);
  const orderId = useDesk((s) => s.orderId);
  const order = data.orders.find((o) => same(o.id, orderId));
  const money = order !== undefined && showsMoney(order);
  const panel = usePanel(order, money);
  const { busy, run } = useRun();
  const [note, setNote] = useState<string | null>(null);

  if (order === undefined) {
    return (
      <div className="dk-screen">
        <BackLink />
        <div className="dk-empty">{t("desk.order.gone")}</div>
      </div>
    );
  }
  const number = text(order["number"]) ?? "";
  const word = orderStatusWord(t, order);
  const pay = payWord(t, fmt, order);
  const moves = orderMoves(order, who);
  const lines = linesOf(data, order);
  const gifts = giftLinesOf(data, order);
  const s = status(order);
  const dhl = door.facts().addOns.includes(DHL);
  const confirmation = messagesOf(data, order).filter((m) => text(m["kind"]) === "order-paid" && text(m["status"]) !== "queued").at(-1);
  const kept = keptPayments(data, order);
  // Refund reads the panel's `mayRefund` (ACC-15), never the role's name; money a gift card or a transfer holds is the refund row's to give back.
  const onlineKept = kept.some((p) => text(p["method"]) === "online");
  const canRefund = money && kept.length > 0 && who.can("payment_refunds", "create") && (onlineKept ? panel?.mayRefund === true : true) && s !== "paying";
  const draft = note ?? text(order["staff_note"]) ?? "";

  const banner = bannerOf();
  function bannerOf(): { tone: "warn" | "danger" | "info"; text: string } | null {
    if (s === "cancelled") {
      const reason = text(order!["cancel_reason"]);
      if ((num(order!["paid"]) ?? 0) > 0 && owner) return { tone: "danger", text: t("desk.order.bannerOwed", { amount: fmt.money(order!["paid"]) }) };
      if (reason === "unpaid") return text(order!["pay_method"]) === "transfer" ? { tone: "warn", text: t("desk.order.bannerUnpaidTransfer") } : { tone: "warn", text: t("desk.order.bannerUnpaid", { minutes: num(data.settings?.["pay_hold_minutes"]) ?? 30 }) };
      if (reason === "customer") return { tone: "info", text: t("desk.order.bannerByCustomer") };
      return { tone: "info", text: t("desk.order.bannerByShop", { by: text(order!["cancelled_by"]) ?? "" }) };
    }
    if (s === "paying" && panel?.waiting === true) return { tone: "info", text: t("desk.order.bannerPaying") };
    return null;
  }

  const codes = codesOf(data, order).map((c) => text(c["typed"])).filter((c): c is string => c !== null);
  const shipping = num(order["shipping"]);
  const figures: { label: string; value: string; strong?: boolean }[] = money
    ? [
        ...(isGift(order) ? [] : [{ label: t("desk.order.goods"), value: fmt.money(order["goods"]) }]),
        ...((num(order["discount"]) ?? 0) > 0 ? [{ label: codes.length > 0 ? t("desk.order.discountCode", { code: codes.join(", ") }) : t("desk.order.discount"), value: `−${fmt.money(order["discount"])}` }] : []),
        ...(isGift(order) ? [] : [{ label: t("desk.order.shippingVia", { service: serviceWord(data, order) }), value: shipping === 0 ? t("desk.free") : fmt.money(order["shipping"]) }]),
        ...(isGift(order) ? [] : [{ label: t("desk.order.taxIn", { state: text(order["state_code"]) ?? "", rate: fmt.pct(order["tax_rate"]) }), value: fmt.money(order["tax"]) }]),
        ...((num(order["gifts"]) ?? 0) > 0 ? [{ label: t("desk.way.giftCards"), value: fmt.money(order["gifts"]) }] : []),
        { label: t("desk.order.total"), value: fmt.money(order["total"]), strong: true },
      ]
    : [];

  const timeline: { key: string; label: string; when: string }[] = [];
  const add = (key: string, label: string, when: unknown, asDay = false) => {
    if (text(when) !== null) timeline.push({ key, label, when: asDay ? fmt.day(when) : fmt.dayTime(when) });
  };
  add("placed", t("desk.tl.placed"), order["placed_at"]);
  const way = wayWord(t, data, order);
  add("paid", way === null ? t("desk.tl.paid") : t("desk.tl.paidVia", { way }), order["paid_at"]);
  if (s !== "cancelled" && !isGift(order) && shipsByOf(order) !== null && s !== "shipped") add("shipsBy", t("desk.tl.shipsBy", { service: serviceWord(data, order) }), order["ships_by"], true);
  add("packed", text(order["packed_by"]) === null ? t("desk.tl.packed") : t("desk.tl.packedBy", { by: text(order["packed_by"])! }), order["packed_at"]);
  add("shipped", t("desk.tl.shipped", { carrier: text(order["carrier"]) ?? "", tracking: text(order["tracking"]) ?? "" }), order["shipped_at"]);
  if (s === "shipped" && text(order["arrives_to"]) !== null) timeline.push({ key: "arrives", label: t("desk.tl.arrives"), when: `${fmt.day(order["arrives_from"])} – ${fmt.day(order["arrives_to"])}` });
  add("cancelled", t("desk.tl.cancelled"), order["cancelled_at"]);
  for (const refund of owner ? refundsOf(data, order) : []) {
    add(`refund-${String(refund.id)}`, t("desk.tl.refund", { amount: fmt.money(refund["amount"]), state: refundStateWord(t, refund) }), refund["made_at"]);
  }

  return (
    <div className="dk-screen">
      <BackLink />
      <div className="dk-order-head">
        <div>
          <div className="dk-title-row">
            <h1 className="dk-h1">
              <Fig strong>{number}</Fig>
            </h1>
            <Chip tone={word.tone}>{word.label}</Chip>
            {money && <Chip tone={pay.tone}>{pay.label}</Chip>}
          </div>
          <div className="dk-sub">{t("desk.order.placedBy", { when: fmt.dayTime(order["placed_at"]), name: text(order["name"]) ?? "" })}</div>
        </div>
        <div className="dk-moves">
          {moves.packed && (
            <button type="button" className="dk-btn dk-btn--primary" disabled={busy} onClick={() => void run(async (d) => (await d.moveOrder(order, "packed"), t("desk.toast.packed", { number })))}>
              <PackageCheck size={16} aria-hidden="true" />
              {t("desk.move.packed")}
            </button>
          )}
          {moves.shipped && (
            <button type="button" className="dk-btn dk-btn--primary" disabled={busy} onClick={() => openSheet({ kind: "ship", orderId: order.id })}>
              <Truck size={16} aria-hidden="true" />
              {t("desk.move.shipped")}
            </button>
          )}
          {moves.shipped && dhl && (
            <button type="button" className="dk-btn" disabled={busy} onClick={() => openSheet({ kind: "dispatch", orderIds: [order.id], at: 0 })}>
              <Truck size={16} aria-hidden="true" />
              {t("desk.move.dhl")}
            </button>
          )}
          {moves.markPaid && (
            <button type="button" className="dk-btn dk-btn--primary" disabled={busy} onClick={() => openSheet({ kind: "markPaid", orderId: order.id })}>
              <Banknote size={16} aria-hidden="true" />
              {t("desk.move.markPaid")}
            </button>
          )}
          {owner && confirmation !== undefined && (
            <button type="button" className="dk-btn" disabled={busy} onClick={() => void run(async (d) => (await d.resend(confirmation), t("desk.toast.resent", { email: text(order["email"]) ?? "" })))}>
              <Send size={16} aria-hidden="true" />
              {t("desk.move.resend")}
            </button>
          )}
          {moves.cancel && (
            <button type="button" className="dk-btn dk-btn--danger" disabled={busy} onClick={() => openSheet({ kind: "cancel", orderId: order.id })}>
              <Ban size={16} aria-hidden="true" />
              {t("desk.move.cancel")}
            </button>
          )}
        </div>
      </div>
      {banner !== null && (
        <div className={`dk-banner dk-banner--${banner.tone}`} role="note">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{banner.text}</span>
        </div>
      )}
      <div className="dk-two">
        <div className="dk-col">
          <Card id="od-items" title={t("desk.order.items")}>
            {isGift(order) && (
              <>
                {gifts.map((g) => (
                  <div key={String(g.id)} className="dk-line">
                    <span className="dk-line-ico" aria-hidden="true">
                      <Gift size={18} />
                    </span>
                    <div className="dk-line-words">
                      <div className="dk-strong">{money ? t("desk.order.giftLine", { amount: fmt.money(g["amount"]), name: text(g["to_name"]) ?? "" }) : t("desk.order.giftLineNoMoney", { name: text(g["to_name"]) ?? "" })}</div>
                      {text(g["to_email"]) !== null && <div className="dk-muted">{t("desk.order.giftTo", { email: text(g["to_email"])! })}</div>}
                    </div>
                  </div>
                ))}
                <div className="dk-note">
                  <Info size={15} aria-hidden="true" />
                  {t("desk.order.nothingToPack")}
                </div>
              </>
            )}
            {lines.map((l) => (
              <div key={String(l.id)} className="dk-line">
                <div className="dk-line-words">
                  <div className="dk-strong">{text(l["product_name"])}</div>
                  <div className="dk-muted">{text(l["variant_label"])}</div>
                  <div className="dk-muted">
                    <Fig>{text(l["sku"])}</Fig>
                  </div>
                </div>
                <div className="dk-line-figs">
                  <Fig>× {num(l["qty"]) ?? 1}</Fig>
                  {money && <Fig strong>{fmt.money(l["line"])}</Fig>}
                  {money && (num(l["discount"]) ?? 0) > 0 && (
                    <span className="dk-muted">
                      <Fig>−{fmt.money(l["discount"])}</Fig>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {money && (
              <div className="dk-figs">
                {figures.map((f) => (
                  <div key={f.label} className={`dk-fig-row${f.strong === true ? " dk-fig-row--total" : ""}`}>
                    <span>{f.label}</span>
                    <Fig strong={f.strong === true}>{f.value}</Fig>
                  </div>
                ))}
                <div className="dk-foot">{text(order["paid_at"]) === null ? t("desk.order.storedPlaced") : t("desk.order.storedPaid")}</div>
              </div>
            )}
          </Card>
          <Card id="od-tl" title={t("desk.order.timeline")}>
            <ol className="dk-timeline">
              {timeline.map((e) => (
                <li key={e.key}>
                  <span className="dk-dot" aria-hidden="true" />
                  <div>
                    <div className="dk-strong">{e.label}</div>
                    <div className="dk-muted">
                      <Fig>{e.when}</Fig>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          {owner && (
            <Card id="od-mail" title={t("desk.order.emails")}>
              {messagesOf(data, order).length === 0 && <div className="dk-empty dk-empty--small">{t("desk.order.noEmails")}</div>}
              {messagesOf(data, order).map((m) => (
                <div key={String(m.id)} className="dk-mail">
                  <Mail size={15} aria-hidden="true" />
                  <span className="dk-strong">{emailWord(t, text(m["kind"]) ?? "")}</span>
                  {text(m["status"]) !== "sent" && <Chip tone={text(m["status"]) === "failed" ? "danger" : "neutral"}>{mailStatusWord(t, text(m["status"]) ?? "")}</Chip>}
                  <span className="dk-muted dk-push">
                    <Fig>{fmt.dayTime(m["sent_at"] ?? m["created_at"])}</Fig>
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
        <div className="dk-col">
          {money && (
            <Card id="od-pay" title={t("desk.order.payment")}>
              <PaymentState order={order} panel={panel} />
              {canRefund && (
                <button type="button" className="dk-btn" onClick={() => openSheet({ kind: "refund", orderId: order.id, returnId: null })}>
                  <Undo2 size={16} aria-hidden="true" />
                  {t("desk.order.refund")}
                </button>
              )}
            </Card>
          )}
          <Card id="od-cust" title={t("desk.order.customer")}>
            <div className="dk-stack">
              {customerOf(data, order) !== undefined ? (
                <a
                  href="#main"
                  className="dk-strong dk-link"
                  onClick={(e) => {
                    e.preventDefault();
                    go("customer", { customerId: order["customer_id"] as string });
                  }}
                >
                  {text(order["name"])}
                </a>
              ) : (
                <span className="dk-strong">{text(order["name"])}</span>
              )}
              {text(order["email"]) !== null && (
                <span className="dk-muted">
                  <Latin>{text(order["email"])}</Latin>
                </span>
              )}
            </div>
            {text(order["address_line1"]) !== null && (
              <div className="dk-stack dk-address">
                <div className="dk-label">{t("desk.order.shipTo")}</div>
                <Latin>{text(order["ship_name"]) ?? text(order["name"])}</Latin>
                <Latin>{text(order["address_line1"])}</Latin>
                {text(order["address_line2"]) !== null && <Latin>{text(order["address_line2"])}</Latin>}
                <Latin>{[text(order["city"]), [text(order["state_code"]), text(order["zip"])].filter((x) => x !== null).join(" ")].filter((x) => x !== null && x !== "").join(", ")}</Latin>
              </div>
            )}
          </Card>
          <section className="dk-card" aria-labelledby="od-note">
            <div className="dk-card-head">
              <h2 id="od-note" className="dk-card-title">
                <label htmlFor="od-note-in">{t("desk.order.note")}</label>
              </h2>
            </div>
            <textarea id="od-note-in" className="dk-input" rows={3} value={draft} placeholder={t("desk.order.notePh")} onChange={(e) => setNote(e.target.value)} />
            <button
              type="button"
              className="dk-btn"
              disabled={busy || note === null}
              onClick={() =>
                void run(async (d) => {
                  await d.saveOrder(order, { staff_note: draft.trim() === "" ? null : draft.trim() });
                  setNote(null);
                  return t("desk.toast.noteSaved");
                })
              }
            >
              <Check size={16} aria-hidden="true" />
              {t("desk.order.saveNote")}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  const t = useT();
  return (
    <a
      href="#main"
      className="dk-back"
      onClick={(e) => {
        e.preventDefault();
        go("orders");
      }}
    >
      <ArrowLeft size={15} aria-hidden="true" className="dk-flip" />
      {t("desk.order.all")}
    </a>
  );
}

/** How the order's money stands: Adminium's panel for the online part, the shop's payment rows for each way it was paid. */
function PaymentState({ order, panel }: { order: Row; panel: PaymentPanel | null }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const s = status(order);
  const payments = paymentsOf(data, order);
  let title: string;
  let sub: string | null = null;
  if (s === "paying") {
    title = t("desk.pay.notPaidYet");
    sub = t("desk.pay.payBy", { time: fmt.time(order["pay_by"]) });
  } else if (s === "awaiting_transfer") {
    title = t("desk.pay.notPaidYet");
    sub = t("desk.pay.transferBy", { day: fmt.day(order["transfer_by"]), amount: fmt.money(order["due"]) });
  } else if (payments.length === 0) {
    title = t("desk.pay.notPaid");
    sub = t("desk.pay.nothingTaken");
  } else {
    const way = wayWord(t, data, order);
    title = way === null ? payWord(t, fmt, order).label : `${payWord(t, fmt, order).label} · ${way}`;
    sub = `${fmt.dayTime(order["paid_at"])} · ${fmt.money(order["paid"])}`;
  }
  return (
    <div className="dk-stack">
      <div className="dk-strong">{title}</div>
      {sub !== null && (
        <div className="dk-muted">
          <Fig>{sub}</Fig>
        </div>
      )}
      {panel?.waiting === true && <Chip tone="info">{t("desk.pay.onItsWay")}</Chip>}
      {payments.map((p) => (
        <div key={String(p.id)} className="dk-pay-row">
          <span>{paymentWord(t, p)}</span>
          {text(p["card_last4"]) !== null && <Fig>•••• {text(p["card_last4"])}</Fig>}
          <span className="dk-push">
            <Fig strong>{fmt.money(p["amount"])}</Fig>
          </span>
          {(num(p["returned"]) ?? 0) > 0 && (
            <span className="dk-muted">
              {t("desk.pay.givenBack")} <Fig>{fmt.money(p["returned"])}</Fig>
            </span>
          )}
          {(num(p["refunded_elsewhere"]) ?? 0) > 0 && <Chip tone="warn">{t("desk.pay.refundedElsewhere", { provider: providerName(p["provider"]) ?? t("desk.way.online") })}</Chip>}
        </div>
      ))}
      {/* OFF-7: the money came back at the provider, and the gift card it bought is still live: the owner cancels it (its recall). */}
      {isGift(order) && s === "sent" && payments.some((p) => (num(p["refunded_elsewhere"]) ?? 0) > 0) && <div className="dk-banner dk-banner--danger">{t("desk.pay.cardStillActive", { provider: providerName(payments[0]?.["provider"]) ?? "" })}</div>}
    </div>
  );
}

function paymentWord(t: ReturnType<typeof useT>, payment: Row): string {
  switch (text(payment["method"])) {
    case "transfer":
      return t("desk.way.transfer");
    case "gift_card":
      return t("desk.way.giftCard");
    default: {
      const provider = providerName(payment["provider"]);
      return provider === null ? t("desk.way.online") : t("desk.way.onlineVia", { provider });
    }
  }
}

export function refundStateWord(t: ReturnType<typeof useT>, refund: Row): string {
  switch (text(refund["refund_state"])) {
    case "asked":
      return t("desk.refund.state.asked");
    case "pending":
      return t("desk.refund.state.pending");
    case "not-sent":
      return t("desk.refund.state.notSent");
    case "done":
      return t("desk.refund.state.done");
    default:
      return text(refund["method"]) === "transfer" ? t("desk.refund.state.byBank") : t("desk.refund.state.done");
  }
}

const EMAIL_WORDS: Record<string, MessageKey> = {
  "order-placed": "desk.mail.orderPlaced",
  "order-transfer": "desk.mail.orderTransfer",
  "order-paid": "desk.mail.orderPaid",
  "order-shipped": "desk.mail.orderShipped",
  "order-cancelled": "desk.mail.orderCancelled",
  "order-cancelled-unpaid": "desk.mail.orderCancelled",
  "order-refunded": "desk.mail.orderRefunded",
  "transfer-reminder": "desk.mail.transferReminder",
};
const emailWord = (t: ReturnType<typeof useT>, kind: string): string => t(EMAIL_WORDS[kind] ?? "desk.mail.other");
const mailStatusWord = (t: ReturnType<typeof useT>, s: string): string => (s === "failed" ? t("desk.mail.failed") : s === "skipped" ? t("desk.mail.skipped") : t("desk.mail.queued"));

