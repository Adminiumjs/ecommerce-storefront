/**
 * S15 gift cards: buying one, and checking what is left on one.
 *
 * The amounts are the shop's own `gift_amounts` rows, shown to the cent
 * (N1b-D6). A gift card goes in the basket like an item and is priced by the
 * basket's dry run like everything else; this page only asks who it is for
 * and what it says. The sender is the order's own name, so there is no field
 * for it. One order takes five gift cards at most (the manifest's `max`), and
 * the page says so before the shopper fills the form in.
 *
 * The balance is Offers' to tell, through its gift-card door, by the code the
 * e-mail gave. Without Offers the shop sells no gift cards, and both pages
 * say that instead.
 */
import { ArrowRight, Gift, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "../../i18n/index.tsx";
import { dayShort, last4, money } from "../format.ts";
import { Field, FieldError, looksLikeEmail, ShopLink, Spinner } from "../parts.tsx";
import { addGift, announce, NONE, useShop } from "../store.ts";
import { Mono, rich } from "../words.tsx";
import { refusalWords } from "./PagesParts.tsx";

/** The most gift cards one order takes: the manifest's `gift_lines` `max`. */
export const MAX_GIFTS = 5;
/** The most a gift card's message holds: the `message` column's 200 characters. */
export const GIFT_MESSAGE_MAX = 200;
/** A gift card's code, as the e-mail gives it. */
const CODE_LENGTH = 12;

/** A link in a message: the column takes plain text only, so the page says so before Adminium refuses it. */
const hasLink = (text: string): boolean => /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|us|info|biz)\b)/i.test(text);

function useSellsGiftCards(): boolean {
  const port = useShop((s) => s.port);
  const amounts = useShop((s) => s.base?.giftAmounts ?? NONE);
  return port !== null && port.features().offers && amounts.length > 0;
}

function NoGiftCards() {
  const { t } = useI18n();
  return (
    <div className="nl-empty">
      <span className="nl-empty-icon" aria-hidden="true">
        <Gift size={24} />
      </span>
      <p className="nl-muted">{t("pages.gift.none")}</p>
      <ShopLink to={{ view: "shop" }} className="nl-btn nl-btn--accent">
        {t("shop.nav.all")}
        <ArrowRight size={15} aria-hidden="true" className="nl-flip" />
      </ShopLink>
    </div>
  );
}

interface GiftErrors {
  name?: string;
  email?: string;
  message?: string;
}

export function GiftCardsScreen() {
  const { t, locale } = useI18n();
  const sells = useSellsGiftCards();
  const currency = useShop((s) => s.config.currency);
  const amounts = useShop((s) => s.base?.giftAmounts ?? NONE);
  const inBasket = useShop((s) => s.gifts.length);
  const sorted = [...amounts].sort((a, b) => a.position - b.position);
  // The middle amount is chosen to start with, as the comp draws it ($50.00 of three).
  const [amountId, setAmountId] = useState<string | null>(null);
  const chosen = sorted.find((a) => String(a.id) === amountId) ?? sorted[Math.floor((sorted.length - 1) / 2)] ?? null;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<GiftErrors>({});
  const focusNext = useRef<string | null>(null);
  const full = inBasket >= MAX_GIFTS;

  useEffect(() => {
    if (focusNext.current === null) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });

  const submit = () => {
    if (chosen === null || full) return;
    const found: GiftErrors = {};
    if (name.trim() === "") found.name = t("pages.gift.needName");
    if (!looksLikeEmail(email)) found.email = t("pages.emailBad");
    if (hasLink(message)) found.message = t("pages.gift.noLinks");
    setErrors(found);
    const first = found.name !== undefined ? "gb-name" : found.email !== undefined ? "gb-email" : found.message !== undefined ? "gb-msg" : null;
    if (first !== null) {
      focusNext.current = first;
      return;
    }
    addGift({ amountId: chosen.id, amount: chosen.amount, toName: name.trim(), toEmail: email.trim(), message: message.trim() });
    announce(t("shop.basket.giftLine", { amount: money(chosen.amount, currency, locale), to: name.trim() }));
    setName("");
    setEmail("");
    setMessage("");
    setAmountId(null);
  };

  return (
    <main id="main" className="nl-page nl-gift nl-fade">
      <h1 className="nl-h1">{t("pages.gift.title")}</h1>
      {!sells ? (
        <NoGiftCards />
      ) : (
        <>
          <p className="nl-gift-sub">{t("pages.gift.sub")}</p>
          <form
            noValidate
            className="nl-panel nl-pages-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <fieldset className="nl-fieldset">
              <legend className="nl-legend">{t("pages.gift.amount")}</legend>
              <div className="nl-amounts">
                {sorted.map((a) => (
                  <button key={String(a.id)} type="button" className="nl-amount" aria-pressed={chosen !== null && String(chosen.id) === String(a.id)} onClick={() => setAmountId(String(a.id))}>
                    {money(a.amount, currency, locale)}
                  </button>
                ))}
              </div>
            </fieldset>
            <Field
              id="gb-name"
              label={t("pages.gift.toName")}
              autoComplete="off"
              maxLength={80}
              value={name}
              error={errors.name ?? null}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name !== undefined) setErrors({ ...errors, name: undefined });
              }}
            />
            <Field
              id="gb-email"
              type="email"
              autoComplete="off"
              label={t("pages.gift.toEmail")}
              maxLength={254}
              value={email}
              error={errors.email ?? null}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email !== undefined) setErrors({ ...errors, email: undefined });
              }}
            />
            <div className="nl-field">
              <div className="nl-label-row">
                <label htmlFor="gb-msg" className="nl-label">
                  {t("pages.gift.message")}
                </label>
                <Mono className="nl-counter">
                  <span id="gb-msg-count">{t("pages.gift.count", { n: message.length, max: GIFT_MESSAGE_MAX })}</span>
                </Mono>
              </div>
              <textarea
                id="gb-msg"
                rows={3}
                maxLength={GIFT_MESSAGE_MAX}
                className="nl-textarea"
                value={message}
                aria-invalid={errors.message === undefined ? undefined : true}
                aria-describedby={["gb-msg-count", errors.message === undefined ? null : "gb-msg-err"].filter(Boolean).join(" ")}
                onChange={(e) => {
                  setMessage(e.target.value.slice(0, GIFT_MESSAGE_MAX));
                  if (errors.message !== undefined) setErrors({ ...errors, message: undefined });
                }}
              />
              {errors.message !== undefined && <FieldError id="gb-msg-err">{errors.message}</FieldError>}
            </div>
            <p className="nl-gift-when">
              <Mail size={15} aria-hidden="true" />
              {t("pages.gift.when")}
            </p>
            {full && (
              <p id="gb-full" className="nl-notice">
                {rich(t, "pages.gift.full", { n: <Mono>{new Intl.NumberFormat(locale).format(MAX_GIFTS)}</Mono> }, MAX_GIFTS)}
              </p>
            )}
            <button type="submit" className="nl-btn nl-btn--accent nl-btn--lg nl-btn--block" disabled={full} aria-describedby={full ? "gb-full" : undefined}>
              <Gift size={17} aria-hidden="true" />
              {t("pages.gift.add")}
            </button>
          </form>
          <ShopLink to={{ view: "giftBalance" }} className="nl-pages-link">
            {t("shop.footer.balance")}
            <ArrowRight size={15} aria-hidden="true" className="nl-flip" />
          </ShopLink>
        </>
      )}
    </main>
  );
}

/** A card found: its last four, and either what is left on it or why it cannot be used. */
type Balance = { step: "idle" | "busy" } | { step: "done"; code: string; balance: string | null; why: "pages.balance.expired" | "pages.balance.void"; until: string | null };

export function GiftBalanceScreen() {
  const { t, locale } = useI18n();
  const sells = useSellsGiftCards();
  const currency = useShop((s) => s.config.currency);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<Balance>({ step: "idle" });
  const input = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const raw = code.replace(/[\s-]/g, "").toUpperCase();
    if (raw.length !== CODE_LENGTH) {
      setError(t("pages.balance.short"));
      setState({ step: "idle" });
      input.current?.focus();
      return;
    }
    const port = useShop.getState().port;
    if (port === null) return;
    setError(null);
    setState({ step: "busy" });
    try {
      const card = await port.giftCard(raw);
      if (card === null) {
        setError(t("pages.balance.unknown"));
        setState({ step: "idle" });
        announce(t("pages.balance.unknown"));
        input.current?.focus();
        return;
      }
      const end = last4(raw);
      const active = card.status === "" || card.status === "active";
      // The live region reads the sentence as text; the page draws the same sentence with its figures in mono.
      const why = card.status === "expired" ? "pages.balance.expired" : "pages.balance.void";
      const words = active ? t("pages.balance.result", { code: end, amount: money(card.balance, currency, locale) }) : t(why, { code: end });
      setState({ step: "done", code: end, balance: active ? card.balance : null, why, until: active ? card.expiresOn : null });
      announce(words);
    } catch (failure) {
      const words = refusalWords(t, failure);
      setError(words);
      setState({ step: "idle" });
      announce(words);
    }
  };

  const done = state.step === "done" ? state : null;
  return (
    <main id="main" className="nl-page nl-balance nl-fade">
      {!sells ? (
        <>
          <h1 className="nl-h1 nl-h1--spaced">{t("shop.footer.balance")}</h1>
          <NoGiftCards />
        </>
      ) : (
        <form
          noValidate
          className="nl-panel nl-pages-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <h1 className="nl-h1 nl-h1--form">{t("shop.footer.balance")}</h1>
          <div className="nl-field">
            <label htmlFor="gc-code" className="nl-label">
              {t("pages.balance.code")}
            </label>
            <input
              ref={input}
              id="gc-code"
              className="nl-input nl-mono-input"
              autoComplete="off"
              spellCheck={false}
              maxLength={20}
              value={code}
              aria-invalid={error === null ? undefined : true}
              aria-describedby={error === null ? undefined : "gc-code-err"}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
                if (state.step === "done") setState({ step: "idle" });
              }}
            />
            {error !== null && <FieldError id="gc-code-err">{error}</FieldError>}
          </div>
          <button type="submit" className="nl-btn nl-btn--accent nl-btn--lg nl-btn--block" disabled={state.step === "busy"}>
            {state.step === "busy" && <Spinner />}
            {t("pages.balance.check")}
          </button>
          {done !== null && (
            <div className={`nl-done ${done.balance === null ? "nl-done--off" : ""}`}>
              <Gift size={18} aria-hidden="true" />
              <span>
                {done.balance !== null ? rich(t, "pages.balance.result", { code: <Mono>{done.code}</Mono>, amount: <Mono>{money(done.balance, currency, locale)}</Mono> }) : rich(t, done.why, { code: <Mono>{done.code}</Mono> })}
                {done.until !== null && (
                  <span className="nl-done-sub">{rich(t, "pages.balance.until", { day: <Mono>{dayShort(done.until, locale)}</Mono> })}</span>
                )}
              </span>
            </div>
          )}
        </form>
      )}
    </main>
  );
}
