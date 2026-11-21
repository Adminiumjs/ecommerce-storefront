/**
 * S6 the checkout: one page in three steps (Contact → Delivery → Pay) beside
 * a sticky summary; then S7 the paying states and S8 the confirmation
 * (`CheckoutDone.tsx`), and the refusals in their dialog
 * (`CheckoutRefusal.tsx`).
 *
 * The state and its rules are `../checkout.ts`. Each delivery service offered
 * to the state is priced by its own dry run; the summary's figures, the Pay
 * button's amount and the total the order is sent at are the chosen one's.
 * A gift-cards-only order ships nothing: its steps are Contact → Pay.
 */
import { ArrowRight, Gift, User } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import "../checkout.css";

import { useI18n, type MessageKey } from "../../i18n/index.tsx";
import {
  chosenOffer,
  chosenQuote,
  closed,
  goStep,
  needsSignIn,
  nextStep,
  offersFor,
  pickOffer,
  placeOrder,
  prefillAddress,
  requoteOffers,
  resumePay,
  serviceName,
  setAddress,
  setContact,
  stepsOf,
  stopPay,
  useCheckout,
  type FieldId,
  type StepId,
} from "../checkout.ts";
import { count, dayRange, isZero, money } from "../format.ts";
import { Field, FieldError, LockIcon, Picture, ShopLink, Spinner } from "../parts.tsx";
import type { Quote } from "../port.ts";
import { announce, NONE, openSignIn, orderableLines, orderKind, payMethod, useShop } from "../store.ts";
import { Mono, rich } from "../words.tsx";
import { CardBox, CodeBox, Totals } from "./Basket.tsx";
import { Confirmation, Paying } from "./CheckoutDone.tsx";
import { RefusalDialog } from "./CheckoutRefusal.tsx";

const STEP_WORDS: Record<StepId, MessageKey> = { contact: "pay.step.contact", delivery: "pay.step.delivery", pay: "pay.step.pay" };

/** Each field's element id and its message when it is wrong. */
const FIELDS: Record<FieldId, { id: string; error: MessageKey }> = {
  email: { id: "co-email", error: "pay.email.bad" },
  name: { id: "co-name", error: "pay.name.bad" },
  shipName: { id: "co-ship-name", error: "pay.name.bad" },
  line1: { id: "co-line1", error: "pay.err.street" },
  city: { id: "co-city", error: "pay.err.city" },
  region: { id: "co-region", error: "pay.err.state" },
  zip: { id: "co-zip", error: "pay.err.zip" },
};

/** Two letters for the contact card: the customer's initials. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

function useError(field: FieldId): string | null {
  const { t } = useI18n();
  const wrong = useCheckout((s) => s.errors[field] === true);
  return wrong ? t(FIELDS[field].error) : null;
}

function Stepper({ steps, step }: { steps: StepId[]; step: StepId }) {
  const { t, locale } = useI18n();
  const at = steps.indexOf(step);
  return (
    <ol className="nl-co-stepper" aria-label={t("pay.steps")}>
      {steps.map((id, i) => {
        const done = i < at;
        return (
          <li key={id} className="nl-co-stepper-item">
            <button type="button" className="nl-co-step" aria-current={i === at ? "step" : undefined} disabled={i > at} onClick={() => goStep(id)}>
              <span className="nl-co-dot" aria-hidden="true">
                {done ? "✓" : count(i + 1, locale)}
              </span>
              {t(STEP_WORDS[id])}
              {done && <span className="nl-sr">, {t("pay.step.done")}</span>}
            </button>
            {i < steps.length - 1 && <span className="nl-co-sep" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function StepCard({ id, children }: { id: StepId; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="nl-co-card" aria-labelledby={`co-h-${id}`}>
      <h2 id={`co-h-${id}`} className="nl-co-h2" tabIndex={-1}>
        {t(STEP_WORDS[id])}
      </h2>
      {children}
    </section>
  );
}

function NextButton({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" className="nl-btn nl-btn--accent nl-btn--lg nl-co-next" onClick={onNext}>
      {t("pay.continue")}
      <ArrowRight size={17} aria-hidden="true" className="nl-flip" />
    </button>
  );
}

function TransferSignIn() {
  const { t } = useI18n();
  return (
    <div className="nl-co-signin-card">
      <LockIcon size={16} />
      <div className="nl-grow">
        <div className="nl-strong">{t("pay.transferSignIn")}</div>
        <div className="nl-muted nl-small">{t("pay.transferSignInSub")}</div>
      </div>
      <button type="button" className="nl-btn nl-btn--accent" aria-haspopup="dialog" onClick={() => openSignIn()}>
        {t("pay.signIn")}
      </button>
    </div>
  );
}

function ContactStep({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  const customer = useShop((s) => s.customer);
  const shopName = useShop((s) => s.base?.settings.name ?? "");
  const email = useCheckout((s) => s.email);
  const name = useCheckout((s) => s.name);
  const news = useCheckout((s) => s.news);
  const emailError = useError("email");
  const nameError = useError("name");
  const gift = orderKind() === "gift";
  const transferGuest = needsSignIn();
  // A signed-in customer already on the news list is not asked again (D4).
  // Only a signed-in customer is asked: a guest's typed address proves nothing, and nobody is signed up by another.
  const showTick = !transferGuest && customer !== null && !customer.news;
  return (
    <StepCard id="contact">
      {customer !== null ? (
        <div className="nl-co-identity">
          <span className="nl-co-initials" aria-hidden="true">
            {initials(customer.name || customer.email)}
          </span>
          <span className="nl-co-identity-text">{customer.name === "" ? customer.email : `${customer.name} · ${customer.email}`}</span>
        </div>
      ) : transferGuest ? (
        <TransferSignIn />
      ) : (
        <>
          {gift && <Field id="co-name" label={t("pay.name")} autoComplete="name" value={name} error={nameError} onChange={(e) => setContact({ name: e.target.value })} />}
          <Field id="co-email" type="email" label={t("pay.email")} autoComplete="email" value={email} error={emailError} onChange={(e) => setContact({ email: e.target.value })} />
          <button type="button" className="nl-co-signin" aria-haspopup="dialog" onClick={() => openSignIn()}>
            <User size={16} aria-hidden="true" />
            {t("pay.signInFaster")}
          </button>
        </>
      )}
      {showTick && (
        <div className="nl-co-news">
          <label className="nl-check nl-co-news-tick">
            <input type="checkbox" checked={news} aria-describedby="co-news-line" onChange={(e) => setContact({ news: e.target.checked })} />
            {t("pay.news.tick", { shop: shopName })}
          </label>
          <div id="co-news-line" className="nl-co-news-line">
            {t("pay.news.line")}
          </div>
        </div>
      )}
      {!transferGuest && <NextButton onNext={onNext} />}
    </StepCard>
  );
}

function Speeds() {
  const { t, locale } = useI18n();
  const regionId = useCheckout((s) => s.address.regionId);
  const quotes = useCheckout((s) => s.quotes);
  const chosen = useCheckout((s) => chosenOffer(s)?.id ?? null);
  const currency = useShop((s) => s.config.currency);
  useShop((s) => s.base);
  const offers = offersFor(regionId);
  return (
    <fieldset className="nl-fieldset nl-co-speeds">
      <legend className="nl-co-legend">{t("pay.speed")}</legend>
      {regionId === "" ? (
        <p className="nl-muted nl-small">{t("pay.speed.pickState")}</p>
      ) : offers.length === 0 ? (
        <p className="nl-notice">{t("pay.speed.none")}</p>
      ) : (
        offers.map((offer) => {
          const said = quotes[String(offer.id)];
          const order = said?.quote?.order ?? null;
          const on = String(offer.id) === String(chosen);
          const days = order === null ? "" : dayRange(order["est_from"], order["est_to"], locale);
          return (
            <label key={String(offer.id)} className={`nl-co-speed ${on ? "nl-co-speed--on" : ""}`}>
              <input type="radio" name="co-speed" checked={on} onChange={() => pickOffer(offer.id)} />
              <span className="nl-co-speed-text">
                <span className="nl-co-speed-name">{serviceName(offer)}</span>
                {days !== "" && <span className="nl-co-speed-when">{t("pay.speed.arrives", { days })}</span>}
              </span>
              <span className="nl-co-speed-price">
                {order === null ? (
                  said?.state === "failed" ? (
                    "—"
                  ) : (
                    <>
                      <Spinner size={15} />
                      <span className="nl-sr">{t("pay.speed.pricing")}</span>
                    </>
                  )
                ) : isZero(order["shipping"]) ? (
                  t("shop.basket.free")
                ) : (
                  <Mono>{money(order["shipping"], currency, locale)}</Mono>
                )}
              </span>
            </label>
          );
        })
      )}
    </fieldset>
  );
}

function DeliveryStep({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  const a = useCheckout((s) => s.address);
  const regions = useShop((s) => s.base?.regions ?? NONE);
  const errors = { shipName: useError("shipName"), line1: useError("line1"), city: useError("city"), region: useError("region"), zip: useError("zip") };
  return (
    <StepCard id="delivery">
      <p className="nl-muted nl-small nl-co-flush">{t("pay.usOnly")}</p>
      <div className="nl-co-address">
        <Field id="co-ship-name" className="nl-co-wide" label={t("pay.shipName")} autoComplete="shipping name" value={a.shipName} error={errors.shipName} onChange={(e) => setAddress({ shipName: e.target.value })} />
        <Field id="co-line1" className="nl-co-wide" label={t("pay.line1")} autoComplete="shipping address-line1" value={a.line1} error={errors.line1} onChange={(e) => setAddress({ line1: e.target.value })} />
        <Field id="co-line2" label={t("pay.line2")} autoComplete="shipping address-line2" value={a.line2} onChange={(e) => setAddress({ line2: e.target.value })} />
        <Field id="co-city" label={t("pay.city")} autoComplete="shipping address-level2" value={a.city} error={errors.city} onChange={(e) => setAddress({ city: e.target.value })} />
        <div className="nl-field">
          <label htmlFor="co-region" className="nl-label">
            {t("pay.state")}
          </label>
          <select id="co-region" className="nl-input nl-co-select" autoComplete="shipping address-level1" value={a.regionId} aria-invalid={errors.region ? true : undefined} aria-describedby={errors.region ? "co-region-err" : undefined} onChange={(e) => setAddress({ regionId: e.target.value })}>
            <option value="">{t("pay.chooseState")}</option>
            {regions.map((r) => (
              <option key={String(r.id)} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </select>
          {errors.region !== null && <FieldError id="co-region-err">{errors.region}</FieldError>}
        </div>
        <Field id="co-zip" label={t("pay.zip")} inputMode="numeric" autoComplete="shipping postal-code" maxLength={10} value={a.zip} error={errors.zip} onChange={(e) => setAddress({ zip: e.target.value })} />
      </div>
      <Speeds />
      <NextButton onNext={onNext} />
    </StepCard>
  );
}

function payLabel(quote: Quote | null, t: ReturnType<typeof useI18n>["t"], currency: string | null, locale: string): ReactNode {
  if (payMethod() === "transfer") return t("pay.placeTransfer");
  if (quote === null) return t("pay.step.pay");
  const due = quote.payment?.due ?? quote.order["total"];
  if (isZero(due)) return t("pay.placeCovered");
  return rich(t, "pay.payNow", { amount: <Mono>{money(due, currency, locale)}</Mono> });
}

function PayStep() {
  const { t, locale } = useI18n();
  const s = useCheckout();
  const customer = useShop((x) => x.customer);
  const currency = useShop((x) => x.config.currency);
  const regions = useShop((x) => x.base?.regions ?? NONE);
  useShop((x) => x.basketQuote);
  const quote = chosenQuote(s);
  const offer = chosenOffer(s);
  const goods = orderKind() === "goods";
  const transferGuest = needsSignIn();
  const busy = goods && offer !== null && s.quotes[String(offer.id)]?.state === "busy";
  const a = s.address;
  const region = regions.find((r) => String(r.id) === a.regionId);
  const rows: { key: StepId; label: MessageKey; value: string; to: StepId }[] = [{ key: "contact", label: "pay.review.contact", value: customer?.email ?? s.email.trim(), to: "contact" }];
  if (goods) {
    rows.push({ key: "delivery", label: "pay.review.deliverTo", value: [a.shipName, a.line1, a.line2, `${a.city}, ${region?.code ?? ""} ${a.zip}`].map((x) => x.trim()).filter(Boolean).join(", "), to: "delivery" });
    const days = quote === null ? "" : dayRange(quote.order["est_from"], quote.order["est_to"], locale);
    rows.push({ key: "pay", label: "pay.review.speed", value: [serviceName(offer), days === "" ? "" : t("pay.speed.arrives", { days })].filter(Boolean).join(" · "), to: "delivery" });
  }
  const note = payMethod() === "transfer" ? t("pay.transferWhere") : quote !== null && isZero(quote.payment?.due ?? quote.order["total"]) ? t("pay.coveredWhere") : t("pay.payWhere");
  return (
    <StepCard id="pay">
      <dl className="nl-co-review">
        {rows.map((r) => (
          <div key={r.key} className="nl-co-review-row">
            <dt>{t(r.label)}</dt>
            <dd>
              <span className="nl-co-review-value">{r.value}</span>
              <button type="button" className="nl-co-change" aria-label={t("pay.changeOf", { what: t(r.label) })} onClick={() => goStep(r.to)}>
                {t("pay.change")}
              </button>
            </dd>
          </div>
        ))}
      </dl>
      {transferGuest ? (
        <TransferSignIn />
      ) : (
        <>
          <button type="button" className="nl-btn nl-btn--accent nl-btn--add nl-co-pay" aria-busy={s.checking} disabled={quote === null || busy} onClick={() => void placeOrder()}>
            {s.checking ? (
              <>
                <Spinner size={18} />
                {t("pay.checking")}
              </>
            ) : (
              <>
                <LockIcon size={17} />
                <span>{payLabel(quote, t, currency, locale)}</span>
              </>
            )}
          </button>
          <p className="nl-co-paynote">{note}</p>
          {s.failed && (
            <div role="alert">
              <FieldError id="co-pay-err">{t("shop.failed.short")}</FieldError>
            </div>
          )}
        </>
      )}
    </StepCard>
  );
}

function Summary() {
  const { t, locale } = useI18n();
  const s = useCheckout();
  const basketQuote = useShop((x) => x.basketQuote);
  const gifts = useShop((x) => x.gifts);
  const currency = useShop((x) => x.config.currency);
  useShop((x) => x.basket);
  useShop((x) => x.basketStock);
  const goods = orderKind() === "goods";
  const chosen = chosenQuote(s);
  const quote = goods ? (chosen ?? basketQuote?.quote ?? null) : (basketQuote?.quote ?? null);
  const withTax = !goods || chosen !== null;
  const offer = chosenOffer(s);
  const lines = orderableLines();
  return (
    <aside className="nl-summary nl-co-summary" aria-labelledby="co-sum">
      <h2 id="co-sum" className="nl-h4">
        {t("shop.basket.summary")}
      </h2>
      {lines.map((line, i) => {
        const row = quote?.lines[i];
        const same = row !== undefined && String(row["variant_id"]) === String(line.variantId);
        return (
          <div key={line.key} className="nl-co-line">
            <span className="nl-co-line-pic">
              <Picture icon={line.categoryIcon} size="thumb" />
            </span>
            <div className="nl-co-line-text">
              <div className="nl-strong">{same ? String(row["product_name"] ?? line.name) : line.name}</div>
              <div className="nl-muted nl-small">
                {line.label ?? ""} <Mono>× {count(line.qty, locale)}</Mono>
              </div>
            </div>
            <Mono className="nl-co-line-total">{same ? money(row["line"], currency, locale) : ""}</Mono>
          </div>
        );
      })}
      {gifts.map((g, i) => {
        const amount = quote?.gifts[i]?.["amount"] ?? g.amount;
        return (
          <div key={g.key} className="nl-co-line">
            <span className="nl-co-line-pic">
              <span className="nl-pic nl-pic--thumb nl-pic--gift">
                <Gift size={20} aria-hidden="true" />
              </span>
            </span>
            <div className="nl-co-line-text">
              <div className="nl-strong">{rich(t, "shop.basket.giftLine", { amount: <Mono>{money(amount, currency, locale)}</Mono>, to: g.toName.trim() === "" ? g.toEmail : g.toName })}</div>
            </div>
            <Mono className="nl-co-line-total">{money(amount, currency, locale)}</Mono>
          </div>
        );
      })}
      <div className="nl-summary-boxes">
        <CodeBox id="code-in2" />
        <CardBox id="gift-in2" />
      </div>
      <div className="nl-co-totals">
        <Totals quote={quote} withTax={withTax} {...(goods && offer !== null ? { serviceLabel: serviceName(offer) ?? "" } : {})} />
      </div>
    </aside>
  );
}

function Closed() {
  const { t } = useI18n();
  return (
    <section className="nl-co-card" aria-labelledby="co-closed">
      <h2 id="co-closed" className="nl-co-h2">
        {t("pay.closed")}
      </h2>
      <p className="nl-muted">{t("pay.closedSub")}</p>
      <ShopLink to={{ view: "basket" }} className="nl-btn nl-btn--quiet nl-co-next">
        {t("shop.checkout.backToBasket")}
      </ShopLink>
    </section>
  );
}

function EmptyCheckout() {
  const { t } = useI18n();
  return (
    <main id="main" className="nl-page nl-page--narrow nl-fade">
      <h1 className="nl-h1 nl-h1--spaced">{t("pay.title")}</h1>
      <div className="nl-empty">
        <h2 className="nl-empty-title">{t("shop.basket.emptyTitle")}</h2>
        <p>{t("shop.basket.emptySub")}</p>
        <ShopLink to={{ view: "shop" }} className="nl-btn nl-btn--accent">
          {t("shop.basket.start")}
        </ShopLink>
      </div>
    </main>
  );
}

/** Says what the page is doing in the one polite live region: checking, and each paying state. */
function useSaying(): void {
  const { t } = useI18n();
  const checking = useCheckout((s) => s.checking);
  const back = useCheckout((s) => s.back);
  useEffect(() => {
    if (checking) announce(t("pay.checking"));
  }, [checking, t]);
  useEffect(() => {
    const words: Partial<Record<NonNullable<typeof back>, MessageKey>> = {
      handoff: "pay.handoff",
      checking: "pay.checkingPay",
      confirming: "pay.bank",
      failed: "pay.failed",
      notPaid: "pay.notPaid",
      paidCancelled: "pay.paidCancelled",
      startRefused: "pay.startRefused",
      paid: "pay.emailed",
    };
    const key = back === null ? undefined : words[back];
    if (key !== undefined) announce(t(key));
  }, [back, t]);
}

export function CheckoutScreen() {
  const { t } = useI18n();
  const stage = useCheckout((s) => s.stage);
  const held = useCheckout((s) => s.held);
  const step = useCheckout((s) => s.step);
  const empty = useShop((s) => s.basket.length + s.gifts.length === 0);
  const clientKey = useShop((s) => s.clientKey);
  const signedIn = useShop((s) => s.customer?.email ?? null);
  const online = useShop((s) => s.offer.online);
  const loading = useShop((s) => s.loading);
  // A code or a gift card the basket's own dry run took off changes the order without a new basket key.
  const codes = useShop((s) => s.codes);
  const card = useShop((s) => s.card);
  useShop((s) => s.basketQuote);
  useShop((s) => s.basketStock);
  const moved = useRef(false);
  useSaying();

  // Every change to the order (its lines, codes, gift card), the sign-in or the way to pay prices each service again.
  useEffect(() => {
    if (stage === "form") void requoteOffers();
  }, [clientKey, codes, card, signedIn, online, loading, stage]);

  // Signed in (before or on this page), the last order's address fills what is still empty.
  useEffect(() => {
    if (signedIn !== null) prefillAddress();
  }, [signedIn]);

  // A new step starts at its heading, so a screen reader hears where it is.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    document.getElementById(`co-h-${step}`)?.focus();
    window.scrollTo?.(0, 0);
  }, [step]);

  if (stage === "done" && held !== null) return <Confirmation held={held} />;
  if (stage === "paying") return <Paying />;
  if (empty) return <EmptyCheckout />;

  const steps = stepsOf(orderKind());
  const current = steps.includes(step) ? step : steps[0]!;
  const onNext = () => {
    const wrong = nextStep();
    if (wrong === null) {
      moved.current = true;
      return;
    }
    announce(t(FIELDS[wrong].error));
    document.getElementById(FIELDS[wrong].id)?.focus();
  };
  const shut = closed();
  return (
    <main id="main" className="nl-page nl-page--narrow nl-fade">
      <h1 className="nl-h1 nl-co-title">{t("pay.title")}</h1>
      <Stepper steps={steps} step={current} />
      <div className="nl-co-grid">
        <div className="nl-co-main">{shut ? <Closed /> : current === "contact" ? <ContactStep onNext={onNext} /> : current === "delivery" ? <DeliveryStep onNext={onNext} /> : <PayStep />}</div>
        <Summary />
      </div>
      <RefusalDialog />
    </main>
  );
}

/** Back from the pay page on the order's address: the paying states, then the confirmation. Shown when `heldCheckout()`. */
export function PayReturn() {
  const stage = useCheckout((s) => s.stage);
  const held = useCheckout((s) => s.held);
  useSaying();
  useEffect(() => {
    void resumePay();
    return () => stopPay();
  }, []);
  if (held === null) return null;
  if (stage === "done") return <Confirmation held={held} />;
  return <Paying />;
}
