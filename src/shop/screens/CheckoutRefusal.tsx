/**
 * A refused save, said in a centred alertdialog over the whole page (D2):
 * prices changed (each moved line "Was / Now", the totals of a new dry run),
 * sold while checking out (each line marked, "Order at" held until every one
 * is changed or removed, D3, then Adminium's total for what is left, F3), a
 * code that no longer applies, too many tries, or the shop closed. Nothing is
 * ordered until the shopper presses again; Escape and "Go back" close it and
 * focus returns to the Pay button.
 */
import { CircleAlert, Tag } from "lucide-react";

import { useI18n } from "../../i18n/index.tsx";
import { closeRefusal, changeMarked, orderAtRefusal, refusalBlocked, refusalTotal, removeMarked, useCheckout, serviceName, chosenOffer, type Refusal } from "../checkout.ts";
import { count, money } from "../format.ts";
import { Spinner, useDialog } from "../parts.tsx";
import { useShop } from "../store.ts";
import { Mono, rich } from "../words.tsx";
import { Totals } from "./Basket.tsx";

function Title({ refusal }: { refusal: Refusal }) {
  const { t, locale } = useI18n();
  const currency = useShop((s) => s.config.currency);
  switch (refusal.kind) {
    case "prices":
      return <>{t("pay.ref.prices")}</>;
    case "stock":
      return <>{t("pay.ref.stock")}</>;
    case "code": {
      const total = refusalTotal(refusal);
      return total === null ? <>{t("pay.ref.codeCant")}</> : <>{rich(t, "pay.ref.code", { code: <Mono>{refusal.code}</Mono>, total: <Mono>{money(total, currency, locale)}</Mono> })}</>;
    }
    case "tooMany":
      return <>{t("pay.ref.tooMany")}</>;
    case "closed":
      return <>{t("pay.ref.closed")}</>;
  }
}

function Rows({ refusal }: { refusal: Refusal }) {
  const { t, locale } = useI18n();
  const currency = useShop((s) => s.config.currency);
  const basket = useShop((s) => s.basket);
  if (refusal.kind === "prices") {
    return (
      <>
        {refusal.moved.map((m) => (
          <div key={m.key} className="nl-co-ref-row">
            <div className="nl-co-ref-what">
              <div className="nl-strong">{m.name}</div>
              {m.label !== "" && <div className="nl-muted nl-small">{m.label}</div>}
            </div>
            <div className="nl-co-ref-price">
              <div>
                {t("pay.ref.was")} <Mono className="nl-co-was">{money(m.was, currency, locale)}</Mono>
              </div>
              <div className="nl-co-ref-now">
                {t("pay.ref.now")} <Mono>{money(m.now, currency, locale)}</Mono>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }
  if (refusal.kind === "code") {
    return (
      <div className="nl-co-ref-row">
        <Tag size={16} aria-hidden="true" className="nl-muted" />
        <div className="nl-co-ref-what">
          <Mono className="nl-strong">{refusal.code}</Mono>
          <div className="nl-co-ref-msg">{t("pay.ref.codeCant")}</div>
        </div>
      </div>
    );
  }
  if (refusal.kind !== "stock") return null;
  return (
    <>
      {refusal.marks.map((mark) => {
        const line = basket.find((l) => l.key === mark.key);
        if (line === undefined) return null;
        const msg = mark.kind === "out" ? t("pay.ref.soldOut") : mark.kind === "left" && mark.left !== null ? t("pay.ref.left", { n: count(mark.left, locale) }, mark.left) : t("pay.ref.fewer");
        return (
          <div key={mark.key} className="nl-co-ref-row">
            <div className="nl-co-ref-what">
              <div className="nl-strong">{line.name}</div>
              <div className="nl-muted nl-small">
                {line.label ?? ""}
                {line.label ? " · " : ""}
                <Mono>× {count(line.qty, locale)}</Mono>
              </div>
              <div className="nl-co-ref-msg">{msg}</div>
            </div>
            <div className="nl-co-ref-acts">
              {mark.kind !== "out" && (
                <button type="button" className="nl-btn nl-btn--quiet nl-btn--sm" disabled={refusal.busy} aria-label={`${t("pay.ref.changeIt")} · ${line.name}`} onClick={() => void changeMarked(mark.key)}>
                  {t("pay.ref.changeIt")}
                </button>
              )}
              <button type="button" className="nl-btn nl-btn--quiet nl-btn--sm nl-co-remove" disabled={refusal.busy} aria-label={`${t("pay.ref.removeIt")} · ${line.name}`} onClick={() => void removeMarked(mark.key)}>
                {t("pay.ref.removeIt")}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function RefusalDialog() {
  const { t, locale } = useI18n();
  const refusal = useCheckout((s) => s.refusal);
  const offerName = useCheckout((s) => serviceName(chosenOffer(s)));
  const currency = useShop((s) => s.config.currency);
  const ref = useDialog(refusal !== null, closeRefusal);
  if (refusal === null) return null;
  const canOrder = refusal.kind === "prices" || refusal.kind === "stock" || refusal.kind === "code";
  const quote = refusal.kind === "prices" || refusal.kind === "stock" || refusal.kind === "code" ? refusal.quote : null;
  const total = refusalTotal(refusal);
  const blocked = refusalBlocked(refusal);
  const busy = refusal.kind === "stock" && refusal.busy;
  return (
    <div className="nl-scrim nl-scrim--center" onClick={closeRefusal}>
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="co-ref-title" aria-describedby={canOrder ? "co-ref-note" : undefined} className="nl-dialog nl-co-ref" onClick={(e) => e.stopPropagation()}>
        <div className="nl-co-ref-head">
          <span className="nl-co-ref-icon" aria-hidden="true">
            <CircleAlert size={20} />
          </span>
          <h2 id="co-ref-title" className="nl-co-ref-title">
            <Title refusal={refusal} />
          </h2>
        </div>
        <div className="nl-co-ref-body" aria-busy={busy}>
          <Rows refusal={refusal} />
          {canOrder && quote !== null && <Totals quote={quote} withTax {...(offerName === null ? {} : { serviceLabel: offerName })} />}
          {busy && <Spinner size={18} />}
          {canOrder && (
            <p id="co-ref-note" className="nl-subtle nl-small nl-co-ref-note">
              {t("pay.ref.nothingYet")}
            </p>
          )}
        </div>
        <div className="nl-co-ref-foot">
          <button type="button" className="nl-btn nl-btn--quiet nl-co-ref-back" data-autofocus onClick={closeRefusal}>
            {t("pay.ref.goBack")}
          </button>
          {canOrder && (
            <button type="button" className="nl-btn nl-btn--accent nl-co-ref-order" disabled={blocked} onClick={() => void orderAtRefusal()}>
              {total === null || blocked ? t("pay.placeCovered") : rich(t, "pay.ref.orderAt", { total: <Mono>{money(total, currency, locale)}</Mono> })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
