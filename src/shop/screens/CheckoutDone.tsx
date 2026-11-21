/**
 * S7 the paying states and S8 the confirmation, for an order this tab placed.
 *
 * Paying: on the way to the pay page, checking how the payment stands, the
 * bank confirming it, did not finish ("Pay now" again on the same order),
 * cancelled unpaid, paid after it was cancelled, or a pay link Adminium
 * would not give. The deadline is the order's own `pay_by`, on the shop's
 * clock. Paid, the confirmation: its number, what was paid, the ships-by and
 * arrival window Adminium stamped, the lines and figures the order was saved
 * with; by bank transfer, the order's own transfer note and its pay-by day.
 */
import { Ban, CircleAlert, CircleCheck, Clock, Gift, Landmark, PackageCheck, Truck } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import { useI18n } from "../../i18n/index.tsx";
import { payAgain, stopPay, useCheckout } from "../checkout.ts";
import { count, dayRange, dayShort, isZero, minus, money, shopDay, shopTime } from "../format.ts";
import { firstName, type Held } from "../pay.ts";
import { LockIcon, Picture, ShopLink, Spinner } from "../parts.tsx";
import { hrefOf } from "../route.ts";
import { go, today, useShop } from "../store.ts";
import { Mono, rich } from "../words.tsx";

const PAID = new Set(["paid", "packed", "shipped", "sent"]);

const str = (value: unknown): string | null => (value === null || value === undefined || value === "" ? null : String(value));

/** "See your order": the order's own link, `/o#<token>`; the order's page reads the code from the fragment. */
function OrderLink({ token, className }: { token: string | null; className: string }) {
  const { t } = useI18n();
  if (token === null) {
    return (
      <ShopLink to={{ view: "find" }} className={className}>
        {t("pay.seeOrder")}
      </ShopLink>
    );
  }
  const href = `${hrefOf({ view: "order" })}#${encodeURIComponent(token)}`;
  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    stopPay();
    window.history.pushState(window.history.state, "", href);
    go({ view: "order" });
  };
  return (
    <a href={href} className={className} onClick={open}>
      {t("pay.seeOrder")}
    </a>
  );
}

function BackToShop({ accent = false }: { accent?: boolean }) {
  const { t } = useI18n();
  return (
    <ShopLink to={{ view: "shop" }} className={`nl-btn nl-btn--lg ${accent ? "nl-btn--accent" : "nl-btn--quiet"}`}>
      {t("pay.backToShop")}
    </ShopLink>
  );
}

/** What is still to pay on the order: its own `due`, as Adminium keeps it. */
function dueOf(held: Held): string {
  return str(held.order["due"]) ?? held.payment?.due ?? str(held.order["total"]) ?? "0";
}

export function Paying() {
  const { t, locale } = useI18n();
  const held = useCheckout((s) => s.held);
  const back = useCheckout((s) => s.back);
  const tz = useShop((s) => s.config.timezone);
  const currency = useShop((s) => s.config.currency);
  const minutes = useShop((s) => s.base?.settings.payHoldMinutes ?? null);
  if (held === null || back === null) return null;
  const number = str(held.order["number"]) ?? "";
  const until = shopTime(held.order["pay_by"], tz, locale);
  const holding = until === "" ? null : <p className="nl-co-holding">{rich(t, "pay.holding", { time: <Mono>{until}</Mono> })}</p>;
  const cardHeld =
    held.payment !== null && !isZero(held.payment.amount) ? (
      <p className="nl-co-cardheld">
        <Gift size={15} aria-hidden="true" />
        {t("pay.cardHeld")}
      </p>
    ) : null;
  let body: ReactNode;
  switch (back) {
    case "handoff":
    case "checking":
      body = (
        <>
          <span className="nl-co-paying-spin" aria-hidden="true">
            <Spinner size={28} />
          </span>
          <h1 className="nl-co-paying-title">{t(back === "handoff" ? "pay.handoff" : "pay.checkingPay")}</h1>
          {back === "handoff" && <p className="nl-muted">{t("pay.payWhere")}</p>}
          {holding}
          {cardHeld}
        </>
      );
      break;
    case "confirming":
      body = (
        <>
          <span className="nl-co-paying-icon nl-co-paying-icon--warn" aria-hidden="true">
            <Clock size={26} />
          </span>
          <h1 className="nl-co-paying-title">{t("pay.bank")}</h1>
          <p className="nl-muted">{t("pay.bankSub")}</p>
          <OrderLink token={held.token} className="nl-btn nl-btn--quiet nl-btn--lg" />
        </>
      );
      break;
    case "failed":
    case "notPaid":
      body = (
        <>
          <span className="nl-co-paying-icon nl-co-paying-icon--danger" aria-hidden="true">
            <CircleAlert size={26} />
          </span>
          <h1 className="nl-co-paying-title">{t(back === "failed" ? "pay.failed" : "pay.notPaid")}</h1>
          {holding}
          {cardHeld}
          <button type="button" className="nl-btn nl-btn--accent nl-btn--lg" onClick={() => void payAgain()}>
            <LockIcon size={17} />
            <span>{rich(t, "pay.payNow", { amount: <Mono>{money(dueOf(held), currency, locale)}</Mono> })}</span>
          </button>
          <p className="nl-muted nl-small">{t("pay.payWhere")}</p>
        </>
      );
      break;
    case "expired":
      body = (
        <>
          <span className="nl-co-paying-icon" aria-hidden="true">
            <Ban size={26} />
          </span>
          <h1 className="nl-co-paying-title">{minutes === null ? t("pay.expiredLate") : rich(t, "pay.expired", { n: <Mono>{count(minutes, locale)}</Mono> }, minutes)}</h1>
          <BackToShop accent />
        </>
      );
      break;
    case "paidCancelled":
    case "startRefused":
      body = (
        <>
          <span className="nl-co-paying-icon nl-co-paying-icon--warn" aria-hidden="true">
            <CircleAlert size={26} />
          </span>
          <h1 className="nl-co-paying-title">{t(back === "paidCancelled" ? "pay.paidCancelled" : "pay.startRefused")}</h1>
          <div className="nl-co-actions">
            <OrderLink token={held.token} className="nl-btn nl-btn--accent nl-btn--lg" />
            <BackToShop />
          </div>
        </>
      );
      break;
    case "paid":
      return <Confirmation held={held} />;
  }
  return (
    <main id="main" className="nl-page nl-co-narrow nl-fade">
      <div className="nl-co-paying">
        {number !== "" && <Mono className="nl-co-number">{number}</Mono>}
        {body}
      </div>
    </main>
  );
}

/** A bank-transfer note as Adminium wrote it: its lines kept, its figures in mono. */
function Note({ text }: { text: string }) {
  return (
    <p className="nl-co-note" dir="auto">
      {text.split(/(\d[\d ./-]*\d|\d)/g).map((part, i) => (i % 2 === 1 ? <Mono key={i}>{part}</Mono> : part))}
    </p>
  );
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="nl-co-fact">
      <span className="nl-co-fact-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}

function TotalRow({ label, value, strong = false, pos = false, words = false }: { label: ReactNode; value: string; strong?: boolean; pos?: boolean; words?: boolean }) {
  return (
    <div className={`nl-total-row ${strong ? "nl-total-row--strong" : ""}`}>
      <span>{label}</span>
      {words ? <span className="nl-fg">{value}</span> : <Mono className={pos ? "nl-pos" : ""}>{value}</Mono>}
    </div>
  );
}

/** The order's figures as it was saved: never the basket's, never worked out here. */
function PlacedTotals({ held }: { held: Held }) {
  const { t, locale } = useI18n();
  const currency = useShop((s) => s.config.currency);
  const o = held.order;
  const m = (v: unknown) => money(v, currency, locale);
  const goods = held.lines.length > 0;
  const codes = held.applied.filter((a) => a.typed || a.kind === "offer");
  const card = held.payment !== null && !isZero(held.payment.amount);
  return (
    <div className="nl-totals">
      {goods && <TotalRow label={t("shop.basket.goods")} value={m(o["goods"])} />}
      {!isZero(o["gifts"]) && <TotalRow label={t("shop.basket.giftCards")} value={m(o["gifts"])} />}
      {codes.map((a, i) => (
        <TotalRow key={i} label={`${t("shop.basket.discount")} · ${a.name}`} value={minus(a.amount, currency, locale)} pos />
      ))}
      {codes.length === 0 && !isZero(o["discount"]) && <TotalRow label={t("shop.basket.discount")} value={minus(o["discount"], currency, locale)} pos />}
      {goods && <TotalRow label={held.service === null ? t("shop.basket.shipping") : `${t("shop.basket.shipping")} · ${held.service}`} value={isZero(o["shipping"]) ? t("shop.basket.free") : m(o["shipping"])} words={isZero(o["shipping"])} />}
      <TotalRow label={t("shop.basket.tax")} value={m(o["tax"])} />
      <TotalRow label={t("shop.basket.total")} value={m(o["total"])} strong={!card} />
      {card && held.payment !== null && (
        <>
          <TotalRow label={held.card === null ? t("shop.basket.giftCard") : `${t("shop.basket.giftCard")} · ${held.card}`} value={minus(held.payment.amount, currency, locale)} pos />
          <TotalRow label={t("shop.basket.toPay")} value={m(held.payment.due)} strong />
        </>
      )}
    </div>
  );
}

export function Confirmation({ held }: { held: Held }) {
  const { t, locale } = useI18n();
  const currency = useShop((s) => s.config.currency);
  const tz = useShop((s) => s.config.timezone);
  const o = held.order;
  const number = <Mono>{str(o["number"]) ?? ""}</Mono>;
  const name = firstName(held.name);
  // An order paid online reaches its confirmation only once paid (by the pay page, or a gift card in full).
  const paid = held.online || PAID.has(String(o["status"] ?? ""));
  const transfer = !held.online && !paid;
  const goods = held.lines.length > 0;
  const m = (v: unknown) => <Mono>{money(v, currency, locale)}</Mono>;
  const shipsDay = shopDay(o["ships_by"] ?? o["est_ships_by"], tz);
  const from = o["arrives_from"] ?? o["est_from"];
  const to = o["arrives_to"] ?? o["est_to"];
  const paidAmount = isZero(o["paid"]) ? o["total"] : o["paid"];
  const transferBy = shopDay(o["transfer_by"], tz);
  const note = str(o["transfer_note"]);
  return (
    <main id="main" className="nl-page nl-co-thanks nl-fade">
      <div className="nl-co-thanks-head">
        <span className="nl-co-thanks-icon" aria-hidden="true">
          <CircleCheck size={30} />
        </span>
        <h1 className="nl-co-thanks-title">{name === "" ? rich(t, "pay.thanksNoName", { number }) : rich(t, "pay.thanks", { name, number })}</h1>
        <p className="nl-muted">{t("pay.emailed")}</p>
      </div>
      <div className="nl-co-facts">
        {transfer ? (
          <Fact icon={<Landmark size={18} />}>{rich(t, "pay.toPayTransfer", { amount: m(dueOf(held)) })}</Fact>
        ) : (
          <Fact icon={<CircleCheck size={18} />}>{rich(t, "pay.paid", { amount: m(paidAmount) })}</Fact>
        )}
        {paid && goods && shipsDay !== null && <Fact icon={<PackageCheck size={18} />}>{t(shipsDay === today() ? "pay.shipsToday" : "pay.shipsOn", { day: dayShort(shipsDay, locale) })}</Fact>}
        {paid && goods && (from !== null || to !== null) && <Fact icon={<Truck size={18} />}>{t("pay.arrives", { days: dayRange(from, to, locale) })}</Fact>}
      </div>
      {transfer && (
        <section aria-labelledby="co-tr" className="nl-co-panel">
          <h2 id="co-tr" className="nl-co-panel-title">
            <Landmark size={18} aria-hidden="true" className="nl-accent" />
            {t("pay.transferTitle")}
          </h2>
          {note !== null && <Note text={note} />}
          {transferBy !== null && <div className="nl-co-payby">{t("pay.payBy", { day: dayShort(transferBy, locale) })}</div>}
        </section>
      )}
      <section aria-labelledby="co-items" className="nl-co-panel">
        <h2 id="co-items" className="nl-co-panel-title">
          {t("pay.items")}
        </h2>
        {held.lines.map((l, i) => (
          <div key={`l${i}`} className="nl-co-line">
            <span className="nl-co-line-pic">
              <Picture icon={held.icons?.[i] ?? null} size="thumb" />
            </span>
            <div className="nl-co-line-text">
              <div className="nl-strong">{String(l["product_name"] ?? "")}</div>
              <div className="nl-muted nl-small">
                {str(l["variant_label"]) ?? ""} <Mono>× {count(Number(l["qty"] ?? 0), locale)}</Mono>
              </div>
            </div>
            <Mono className="nl-co-line-total">{money(l["line"], currency, locale)}</Mono>
          </div>
        ))}
        {held.gifts.map((g, i) => (
          <div key={`g${i}`} className="nl-co-line">
            <span className="nl-co-line-pic">
              <span className="nl-pic nl-pic--thumb nl-pic--gift">
                <Gift size={20} aria-hidden="true" />
              </span>
            </span>
            <div className="nl-co-line-text">
              <div className="nl-strong">{rich(t, "shop.basket.giftLine", { amount: m(g["amount"]), to: str(g["to_name"]) ?? str(g["to_email"]) ?? "" })}</div>
            </div>
            <Mono className="nl-co-line-total">{money(g["amount"], currency, locale)}</Mono>
          </div>
        ))}
        <div className="nl-co-rule" />
        <PlacedTotals held={held} />
      </section>
      <div className="nl-co-actions">
        <OrderLink token={held.token} className="nl-btn nl-btn--accent nl-btn--lg" />
        <BackToShop />
      </div>
    </main>
  );
}
