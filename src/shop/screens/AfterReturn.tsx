/**
 * S13 Send something back (`/o/return`): the pieces chosen from the order's
 * lines (never more than bought less what is already on its way back, the
 * line's own `returnable`), a reason and a note; then the return's own page,
 * by its own number: Asked → Approved → On its way back → Received →
 * Refunded, or Declined with the shop's reason; where to send it while it is
 * approved; and the refund Adminium worked out, never the page's.
 */
import { ArrowLeft, CircleAlert, CircleCheck, Minus, Plus } from "lucide-react";

import { useI18n, type MessageKey } from "../../i18n/index.tsx";
import { backToOrder, pickLine, returnErrors, returnsUntil, sendReturn, typeReturn, useAfter } from "../after.ts";
import type { OrderRead } from "../after-port.ts";
import { dayShort, money } from "../format.ts";
import type { Row } from "../port.ts";
import { FieldError, Picture, ShopLink } from "../parts.tsx";
import { announce, useShop } from "../store.ts";
import { Mono, rich } from "../words.tsx";
import { Steps, type Step } from "./AfterParts.tsx";

/** The reasons the customer picks from: the manifest's own codes (`RETURN_REASONS`), in the shop's words. */
export const REASONS: [string, MessageKey][] = [
  ["fit", "after.ret.reason.fit"],
  ["expected", "after.ret.reason.expected"],
  ["faulty", "after.ret.reason.faulty"],
  ["mind", "after.ret.reason.mind"],
];

export function OrderReturnScreen() {
  const { t } = useI18n();
  const opened = useAfter((s) => s.opened);
  const shown = useAfter((s) => s.returnShown);
  const read = opened?.state === "ok" ? opened.read : null;
  if (opened?.state === "loading")
    return (
      <main id="main" className="nl-page nl-after nl-after--return">
        <div className="nl-skeleton" aria-busy="true">
          <span className="nl-sr">{t("after.order.loading")}</span>
          <div className="nl-skel nl-skel--bar" />
        </div>
      </main>
    );
  if (read === null)
    return (
      <main id="main" className="nl-page nl-after nl-after--return">
        <section className="nl-empty" aria-labelledby="nl-ret-none">
          <h1 id="nl-ret-none" className="nl-empty-title">
            {t("after.ret.title")}
          </h1>
          <p className="nl-muted">{t("after.ret.missing")}</p>
          <ShopLink to={{ view: "find" }} className="nl-btn nl-btn--accent">
            {t("after.find.title")}
          </ShopLink>
        </section>
      </main>
    );
  const ret = shown === null ? null : (read.returns.find((r) => String(r["id"]) === shown) ?? null);
  return (
    <main id="main" className="nl-page nl-after nl-after--return">
      <button type="button" className="nl-after-back" onClick={backToOrder}>
        <ArrowLeft size={15} aria-hidden="true" className="nl-flip" />
        {t("after.ret.back")}
      </button>
      {ret === null ? <ReturnForm read={read} /> : <ReturnPage read={read} ret={ret} />}
    </main>
  );
}

function ReturnForm({ read }: { read: OrderRead }) {
  const { t, locale } = useI18n();
  const form = useAfter((s) => s.ret);
  const faultyShipping = useShop((s) => s.base?.settings.refundShippingFaulty ?? false);
  const errors = form.tried ? returnErrors(form) : {};
  const until = returnsUntil(read.order);
  const lines = read.lines.filter((l) => Number(l["returnable"] ?? 0) > 0);
  const number = String(read.order["number"] ?? "");
  const n = (v: number) => new Intl.NumberFormat(locale).format(v);
  const send = async () => {
    const done = await sendReturn();
    if (done === "sent") announce(t("after.ret.sent"));
    else if (done === "fix") {
      const e = returnErrors(useAfter.getState().ret);
      document.getElementById(e.lines ? "nl-ret-line-0" : "nl-ret-reason-0")?.focus();
    }
  };
  return (
    <>
      <h1 className="nl-h1 nl-after-title">{t("after.ret.title")}</h1>
      <div className="nl-after-placed">
        {rich(t, "after.ret.from", { number: <Mono>{number}</Mono> })}
        {until !== null && (
          <>
            {" · "}
            {rich(t, "after.returnUntil", { date: <Mono>{dayShort(until, locale)}</Mono> })}
          </>
        )}
      </div>
      {lines.length === 0 ? (
        <p className="nl-muted nl-after-p">{t("after.ret.none")}</p>
      ) : (
        <form
          className="nl-ret-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="nl-ret-main">
            <fieldset className="nl-panel nl-ret-set">
              <legend className="nl-ret-legend">{t("after.ret.what")}</legend>
              {lines.map((l, i) => {
                const id = String(l["id"]);
                const picked = form.pick[id] ?? 0;
                const cap = Number(l["returnable"] ?? 0);
                const bought = Number(l["qty"] ?? 1);
                const back = Number(l["returned_qty"] ?? 0);
                const name = String(l["product_name"] ?? "");
                return (
                  <div key={id} className="nl-ret-line">
                    <label className="nl-ret-pick">
                      <input id={`nl-ret-line-${i}`} type="checkbox" checked={picked > 0} onChange={(e) => pickLine(id, e.target.checked ? 1 : 0)} aria-describedby={errors.lines ? "nl-ret-lines-err" : undefined} />
                      <Picture icon={null} size="thumb" />
                      <span className="nl-min0">
                        <span className="nl-line-name">{name}</span>
                        <span className="nl-line-opt">
                          {typeof l["variant_label"] === "string" && l["variant_label"] !== "" ? `${l["variant_label"]} · ` : ""}
                          {rich(t, "after.ret.bought", { n: <Mono>{n(bought)}</Mono> })}
                          {back > 0 && (
                            <>
                              {" · "}
                              {rich(t, "after.ret.already", { n: <Mono>{n(back)}</Mono> }, back)}
                            </>
                          )}
                        </span>
                      </span>
                    </label>
                    {picked > 0 && (
                      <div className="nl-qty nl-qty--sm" role="group" aria-label={t("after.ret.howMany")}>
                        <button type="button" aria-label={t("after.ret.fewer", { name })} disabled={picked <= 1} onClick={() => pickLine(id, Math.max(1, picked - 1))}>
                          <Minus size={15} aria-hidden="true" />
                        </button>
                        <Mono className="nl-qty-n">{n(picked)}</Mono>
                        <button type="button" aria-label={t("after.ret.more", { name })} disabled={picked >= cap} onClick={() => pickLine(id, Math.min(cap, picked + 1))}>
                          <Plus size={15} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {errors.lines && <FieldError id="nl-ret-lines-err">{t("after.ret.err.lines")}</FieldError>}
            </fieldset>
            <fieldset className="nl-panel nl-ret-set">
              <legend className="nl-ret-legend">{t("after.ret.why")}</legend>
              {REASONS.map(([code, key], i) => (
                <label key={code} className="nl-ret-reason">
                  <input id={`nl-ret-reason-${i}`} type="radio" name="nl-ret-reason" checked={form.reason === code} onChange={() => typeReturn({ reason: code })} aria-describedby={errors.reason ? "nl-ret-reason-err" : undefined} />
                  {t(key)}
                </label>
              ))}
              {errors.reason && <FieldError id="nl-ret-reason-err">{t("after.ret.err.reason")}</FieldError>}
              <div className="nl-field nl-ret-note">
                <label htmlFor="nl-ret-note" className="nl-label">
                  {t("after.ret.note")}
                </label>
                <textarea id="nl-ret-note" className="nl-textarea" rows={3} maxLength={500} value={form.note} onChange={(e) => typeReturn({ note: e.target.value })} />
              </div>
            </fieldset>
          </div>
          <aside className="nl-panel nl-ret-aside">
            <div className="nl-small nl-muted">{t("after.ret.refundTitle")}</div>
            <p className="nl-small nl-subtle nl-after-p">{t(faultyShipping ? "after.ret.refundRule" : "after.ret.refundRuleNoShip")}</p>
            <p className="nl-small nl-subtle nl-after-p">{t("after.ret.refundLater")}</p>
            {form.failed && (
              <div role="alert" className="nl-danger-line">
                <CircleAlert size={14} aria-hidden="true" />
                {t("after.err.unreachable")}
              </div>
            )}
            <button type="submit" className="nl-btn nl-btn--accent nl-btn--lg nl-btn--block" aria-busy={form.busy || undefined}>
              {form.busy ? t("after.sending") : t("after.ret.send")}
            </button>
          </aside>
        </form>
      )}
    </>
  );
}

const ORDER_OF_STEPS = ["asked", "approved", "onway", "received", "refunded"] as const;

function ReturnPage({ read, ret }: { read: OrderRead; ret: Row }) {
  const { t, locale } = useI18n();
  const justSent = useAfter((s) => s.justSent);
  const settings = useShop((s) => s.base?.settings ?? null);
  const currency = useShop((s) => s.config.currency);
  const m = (v: unknown) => money(v, currency, locale);
  const status = String(ret["status"] ?? "");
  const declined = status === "declined";
  const onway = status === "approved" && typeof ret["tracking"] === "string" && ret["tracking"] !== "";
  const at = status === "refunded" ? 4 : status === "received" ? 3 : onway ? 2 : status === "approved" ? 1 : 0;
  const labels: Record<(typeof ORDER_OF_STEPS)[number], MessageKey> = { asked: "after.ret.step.asked", approved: "after.ret.step.approved", onway: "after.ret.step.onway", received: "after.ret.step.received", refunded: "after.ret.step.refunded" };
  const steps: Step[] = ORDER_OF_STEPS.map((key, i) => ({ key, label: t(labels[key]), done: i <= at }));
  const lines = read.returnLines.filter((l) => String(l["return_id"]) === String(ret["id"]));
  const reason = REASONS.find(([code]) => code === ret["reason"]);
  const until = returnsUntil(read.order);
  const address = settings === null ? [] : [settings.name, settings.addressLine1, settings.addressLine2, [settings.city, [settings.stateCode, settings.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")].filter((x): x is string => typeof x === "string" && x !== "");
  return (
    <>
      <h1 className="nl-h1 nl-after-title">{rich(t, "after.ret.status.title", { number: <Mono className="nl-after-number">{String(ret["number"] ?? "")}</Mono> })}</h1>
      <div className="nl-after-placed">
        {rich(t, "after.ret.from", { number: <Mono>{String(read.order["number"] ?? "")}</Mono> })}
        {until !== null && (
          <>
            {" · "}
            {rich(t, "after.returnUntil", { date: <Mono>{dayShort(until, locale)}</Mono> })}
          </>
        )}
      </div>
      {justSent && status === "asked" && (
        <div role="status" className="nl-after-sent">
          <CircleCheck size={18} aria-hidden="true" />
          {t("after.ret.sent")}
        </div>
      )}
      {declined ? (
        <div role="status" className="nl-after-declined">
          <div className="nl-strong">{t("after.ret.step.declined")}</div>
          {typeof ret["staff_reason"] === "string" && ret["staff_reason"] !== "" && <div>{t("after.ret.declinedWhy", { reason: ret["staff_reason"] })}</div>}
        </div>
      ) : (
        <Steps steps={steps} label={t("after.ret.steps")} />
      )}
      <div className="nl-after-cols">
        <section className="nl-panel nl-ret-what" aria-labelledby="nl-ret-what">
          <h2 id="nl-ret-what" className="nl-h4">
            {t("after.ret.sending")}
          </h2>
          {lines.map((l) => (
            <div key={String(l["id"])} className="nl-total-row">
              <span>{[l["product_name"], l["variant_label"]].filter((x) => typeof x === "string" && x !== "").join(" · ")}</span>
              <Mono>{t("after.qty", { n: new Intl.NumberFormat(locale).format(Number(l["qty"] ?? 1)) })}</Mono>
            </div>
          ))}
          {reason !== undefined && <div className="nl-small nl-muted">{t("after.ret.reasonIs", { reason: t(reason[1]) })}</div>}
          <div className="nl-total-row nl-total-row--strong nl-ret-refund">
            <span>{t(status === "refunded" ? "after.ret.refunded" : "after.ret.refundTitle")}</span>
            <Mono>{m(status === "refunded" ? (ret["refunded_total"] ?? ret["refund_amount"]) : ret["refund_amount"])}</Mono>
          </div>
        </section>
        {status === "approved" && address.length > 0 && (
          <section className="nl-panel nl-ret-to" aria-labelledby="nl-ret-to">
            <h2 id="nl-ret-to" className="nl-h4">
              {t("after.ret.sendTo")}
            </h2>
            <address className="nl-after-address">
              {address.map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </address>
            <p className="nl-small nl-muted nl-after-p">{t("after.ret.post")}</p>
            <ShopLink to={{ view: "helpContact" }} className="nl-text-link">
              {t("after.ret.tellUs")}
            </ShopLink>
          </section>
        )}
      </div>
    </>
  );
}
