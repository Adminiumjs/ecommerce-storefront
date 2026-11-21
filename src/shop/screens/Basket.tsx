/**
 * S4 the basket drawer and S5 the basket page: the lines (a sold-out one
 * marked and left out of the order), the gift cards, and the figures of a dry
 * run of the whole order: goods, gift cards, what a code takes off, shipping
 * with the shop's first service to its own state, the total before tax, and
 * what a gift card pays. The code box and the gift-card box are on the page
 * and the checkout's summary (`CodeBox`, `CardBox`, `Totals`), not the drawer.
 */
import { ArrowRight, Ban, CircleAlert, Gift, Minus, Plus, RotateCcw, ShoppingBasket, Tag, Trash2, Truck, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { useI18n, type MessageKey } from "../../i18n/index.tsx";
import { count, isZero, last4, minus, money } from "../format.ts";
import { Picture, ShopLink, useDialog } from "../parts.tsx";
import type { Quote } from "../port.ts";
import { basketPieces, dropCard, dropCode, go, homeOffer, MAX_QTY, openDrawer, orderableLines, removeGift, removeLine, setLineQty, useCard, useCode, useShop, type BasketLine, type CodeNote } from "../store.ts";
import { Mono, rich } from "../words.tsx";

/** The quote's line for a basket line: Adminium answers the order's lines in the order they were sent. */
function quotedLine(quote: Quote | null, line: BasketLine): Record<string, unknown> | null {
  if (quote === null) return null;
  const at = orderableLines().findIndex((l) => l.key === line.key);
  const row = at < 0 ? undefined : quote.lines[at];
  return row !== undefined && String(row["variant_id"]) === String(line.variantId) ? row : null;
}

function Empty({ page }: { page: boolean }) {
  const { t } = useI18n();
  return (
    <div className={page ? "nl-empty" : "nl-drawer-empty"}>
      <div className="nl-empty-icon nl-empty-icon--big">
        <ShoppingBasket size={28} aria-hidden="true" />
      </div>
      {page ? <h2 className="nl-empty-title">{t("shop.basket.emptyTitle")}</h2> : <div className="nl-empty-title">{t("shop.basket.emptyTitle")}</div>}
      <p className="nl-muted nl-small">{t("shop.basket.emptySub")}</p>
      <ShopLink to={{ view: "shop" }} className="nl-btn nl-btn--accent">
        {t("shop.basket.start")}
      </ShopLink>
    </div>
  );
}

/** "Everything from NL-1053 is back in your basket", or what was left out of it. */
function AgainNote({ page }: { page: boolean }) {
  const { t } = useI18n();
  const note = useShop((s) => s.basketNote);
  if (note === null) return null;
  return (
    <div className={page ? "nl-again nl-again--page" : "nl-again"} role="status">
      <RotateCcw size={16} aria-hidden="true" className="nl-accent" />
      <div>
        <div className="nl-strong nl-fg">{note.left.length === 0 ? rich(t, "shop.basket.againAll", { number: <Mono>{note.number}</Mono> }) : rich(t, "shop.basket.againSome", { number: <Mono>{note.number}</Mono> })}</div>
        {note.left.map((l, i) => (
          <div key={i}>{t(l.why === "sold" ? "shop.basket.leftSold" : "shop.basket.leftGone", { name: l.name })}</div>
        ))}
      </div>
    </div>
  );
}

function Lines({ page }: { page: boolean }) {
  const { t, locale } = useI18n();
  const basket = useShop((s) => s.basket);
  const gifts = useShop((s) => s.gifts);
  const words = useShop((s) => s.basketStock);
  const quote = useShop((s) => s.basketQuote?.quote ?? null);
  const currency = useShop((s) => s.config.currency);
  return (
    <>
      {basket.map((line) => {
        const row = quotedLine(quote, line);
        const word = words[String(line.variantId)];
        const out = word?.state === "out";
        const cap = word?.state === "low" && word.left !== null ? Math.min(MAX_QTY, word.left) : MAX_QTY;
        const name = String(row?.["product_name"] ?? line.name);
        const label = String(row?.["variant_label"] ?? line.label ?? "");
        return (
          <div key={line.key} className={page ? "nl-line nl-line--page" : "nl-line"}>
            <ShopLink to={{ view: "product", slug: line.slug }} className="nl-line-pic" aria-label={name} tabIndex={-1}>
              <Picture icon={line.categoryIcon} size="line" />
            </ShopLink>
            <div className="nl-line-body">
              <div className="nl-line-top">
                <div className="nl-min0 nl-grow">
                  <div className="nl-line-name">{name}</div>
                  {label !== "" && <div className="nl-line-opt">{label}</div>}
                  {row !== null && (
                    <div className="nl-line-each">
                      <Mono>{page ? `${line.sku} · ${money(row["each"], currency, locale)}` : money(row["each"], currency, locale)}</Mono>
                    </div>
                  )}
                </div>
                <button type="button" className={page ? "nl-text-btn nl-remove" : "nl-icon-btn nl-icon-btn--plain"} aria-label={t("shop.basket.removeOf", { name })} onClick={() => removeLine(line.key)}>
                  <Trash2 size={16} aria-hidden="true" />
                  {page && <span aria-hidden="true">{t("shop.basket.remove")}</span>}
                </button>
              </div>
              {out ? (
                <div className="nl-danger-line">
                  <Ban size={15} aria-hidden="true" />
                  {t("shop.basket.soldSince")}
                </div>
              ) : (
                <>
                  <div className="nl-line-foot">
                    <div role="group" aria-label={t("shop.product.quantity")} className="nl-qty nl-qty--sm">
                      <button type="button" aria-label={t("shop.basket.fewerOf", { name })} disabled={line.qty <= 1} onClick={() => setLineQty(line.key, line.qty - 1)}>
                        <Minus size={15} aria-hidden="true" />
                      </button>
                      <Mono className="nl-qty-n">{count(line.qty, locale)}</Mono>
                      <button type="button" aria-label={t("shop.basket.moreOf", { name })} disabled={line.qty >= cap} onClick={() => setLineQty(line.key, line.qty + 1)}>
                        <Plus size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <Mono className="nl-line-total">{row === null ? "" : money(row["line"], currency, locale)}</Mono>
                  </div>
                  {word?.state === "low" && word.left !== null && <div className="nl-warn-line nl-small">{t("shop.stock.left", { n: count(word.left, locale) }, word.left)}</div>}
                </>
              )}
            </div>
          </div>
        );
      })}
      {gifts.map((g, i) => {
        const row = quote?.gifts[i];
        const amount = row?.["amount"] ?? g.amount;
        const to = g.toName.trim() === "" ? g.toEmail : g.toName;
        return (
          <div key={g.key} className={page ? "nl-line nl-line--page" : "nl-line"}>
            <span className="nl-line-pic">
              <span className="nl-pic nl-pic--line nl-pic--gift">
                <Gift size={24} aria-hidden="true" />
              </span>
            </span>
            <div className="nl-line-body">
              <div className="nl-line-top">
                <div className="nl-min0 nl-grow">
                  <div className="nl-line-name">{rich(t, "shop.basket.giftLine", { amount: <Mono>{money(amount, currency, locale)}</Mono>, to })}</div>
                  <div className="nl-line-opt nl-ltr">{g.toEmail}</div>
                </div>
                <button type="button" className={page ? "nl-text-btn nl-remove" : "nl-icon-btn nl-icon-btn--plain"} aria-label={t("shop.basket.removeOf", { name: t("shop.basket.giftCard") })} onClick={() => removeGift(g.key)}>
                  <Trash2 size={16} aria-hidden="true" />
                  {page && <span aria-hidden="true">{t("shop.basket.remove")}</span>}
                </button>
              </div>
              <div className="nl-line-foot">
                <span className="nl-muted nl-small">{t("shop.basket.giftNoShip")}</span>
                <Mono className="nl-line-total">{money(amount, currency, locale)}</Mono>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** "Add $11.00 more for free Standard shipping", with its bar; never "$0.00 more". */
export function FreeBar() {
  const { t, locale } = useI18n();
  const quote = useShop((s) => s.basketQuote?.quote ?? null);
  const currency = useShop((s) => s.config.currency);
  const hasGoods = useShop((s) => s.basket.length > 0);
  const home = homeOffer();
  if (quote === null || home === null || !hasGoods || home.offer.freeFrom === null || isZero(home.offer.freeFrom)) return null;
  // The two figures are Adminium's (the offer's "free from", the dry run's goods after discount); the gap is their difference, to the cent.
  const net = Math.round(Number(quote.order["net"] ?? 0) * 100);
  const from = Math.round(Number(home.offer.freeFrom) * 100);
  if (net >= from || from <= 0) return null;
  const gap = ((from - net) / 100).toFixed(2);
  return (
    <div className="nl-free">
      <div className="nl-free-label">
        <Truck size={16} aria-hidden="true" className="nl-accent" />
        <span>{rich(t, "shop.basket.addMore", { amount: <Mono>{money(gap, currency, locale)}</Mono>, service: home.offer.serviceLabel.split(" · ")[0] ?? "" })}</span>
      </div>
      <div className="nl-free-track" role="presentation">
        <div className="nl-free-fill" style={{ inlineSize: `${Math.round((net / from) * 100)}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value, strong = false, pos = false }: { label: ReactNode; value: string; strong?: boolean; pos?: boolean }) {
  return (
    <div className={`nl-total-row ${strong ? "nl-total-row--strong" : ""}`}>
      <span>{label}</span>
      <Mono className={pos ? "nl-pos" : ""}>{value}</Mono>
    </div>
  );
}

/**
 * The order's figures as a dry run answered them. Before a state is known the
 * order is priced to the shop's own state and the tax is said later; once
 * `withTax`, the tax and the total are the quote's own.
 */
export function Totals({ quote, withTax = false, serviceLabel }: { quote: Quote | null; withTax?: boolean; serviceLabel?: string }) {
  const { t, locale } = useI18n();
  const currency = useShop((s) => s.config.currency);
  const home = homeOffer();
  const busy = useShop((s) => s.basketQuote?.state === "busy");
  if (quote === null) return null;
  const o = quote.order;
  const m = (v: unknown) => money(v, currency, locale);
  const service = serviceLabel ?? home?.offer.serviceLabel.split(" · ")[0] ?? "";
  const goods = !isZero(o["goods"]) || quote.lines.length > 0;
  const codes = quote.applied.filter((a) => a.typed || a.kind === "offer");
  const beforeTax = ((Math.round(Number(o["total"] ?? 0) * 100) - Math.round(Number(o["tax"] ?? 0) * 100)) / 100).toFixed(2);
  return (
    <div className="nl-totals" aria-busy={busy}>
      {goods && <Row label={t("shop.basket.goods")} value={m(o["goods"])} />}
      {!isZero(o["gifts"]) && <Row label={t("shop.basket.giftCards")} value={m(o["gifts"])} />}
      {codes.map((a, i) => (
        <Row key={i} label={`${t("shop.basket.discount")} · ${a.name}`} value={minus(a.amount, currency, locale)} pos />
      ))}
      {codes.length === 0 && !isZero(o["discount"]) && <Row label={t("shop.basket.discount")} value={minus(o["discount"], currency, locale)} pos />}
      {goods && <Row label={`${t("shop.basket.shipping")} · ${service}`} value={isZero(o["shipping"]) ? t("shop.basket.free") : m(o["shipping"])} />}
      {withTax ? (
        <>
          <Row label={t("shop.basket.tax")} value={m(o["tax"])} />
          <Row label={t("shop.basket.total")} value={m(o["total"])} strong />
        </>
      ) : (
        <Row label={t("shop.basket.beforeTax")} value={m(beforeTax)} strong />
      )}
      {quote.payment !== null && !isZero(quote.payment.amount) && (
        <>
          <Row label={`${t("shop.basket.giftCard")} · ${last4(useShop.getState().card ?? "")}`} value={minus(quote.payment.amount, currency, locale)} pos />
          <Row label={t("shop.basket.toPay")} value={m(quote.payment.due)} strong />
        </>
      )}
      {!withTax && goods && <div className="nl-subtle nl-small">{t("shop.basket.taxLater")}</div>}
    </div>
  );
}

const CODE_NOTES: Record<Exclude<CodeNote, null>, MessageKey> = {
  unknown: "shop.code.unknown",
  "needs-sign-in": "shop.code.signIn",
  "nothing-to-take-off": "shop.code.nothing",
  "not-first-order": "shop.code.first",
  ended: "shop.code.ended",
  "not-valid": "shop.code.unknown",
  "too-many": "shop.code.tooMany",
};

/** "Have a code?": typed, tried by a dry run, and Adminium's answer said beside it. */
export function CodeBox({ id = "code-in" }: { id?: string }) {
  const { t, locale } = useI18n();
  const codes = useShop((s) => s.codes);
  const note = useShop((s) => s.codeNote);
  const quote = useShop((s) => s.basketQuote?.quote ?? null);
  const currency = useShop((s) => s.config.currency);
  const [draft, setDraft] = useState("");
  const typed = quote?.applied.filter((a) => a.typed) ?? [];
  return (
    <div className="nl-box-stack">
      {codes.map((code, i) => {
        const applied = typed[i];
        return (
          <div key={code} className="nl-applied" role="status">
            <Tag size={16} aria-hidden="true" />
            <span className="nl-grow">{applied === undefined ? <Mono>{code}</Mono> : <>{rich(t, "shop.code.applied", { code: <Mono>{code}</Mono>, name: applied.name })}</>}</span>
            {applied !== undefined && <Mono>{minus(applied.amount, currency, locale)}</Mono>}
            <button type="button" className="nl-icon-btn nl-icon-btn--plain nl-icon-btn--sm" aria-label={t("shop.basket.removeOf", { name: code })} onClick={() => dropCode(code)}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        );
      })}
      <form
        className="nl-box-form"
        onSubmit={(e) => {
          e.preventDefault();
          useCode(draft);
          setDraft("");
        }}
      >
        <label htmlFor={id} className="nl-label">
          {t("shop.code.have")}
        </label>
        <div className="nl-inline-form">
          <input id={id} className="nl-input nl-mono-input" value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" autoCapitalize="characters" aria-invalid={note !== null ? true : undefined} aria-describedby={note !== null ? `${id}-msg` : undefined} />
          <button type="submit" className="nl-btn nl-btn--ink">
            {t("shop.code.use")}
          </button>
        </div>
        {note !== null && note.note !== null && (
          <div id={`${id}-msg`} className="nl-error nl-error--wrap">
            <CircleAlert size={14} aria-hidden="true" />
            <span>
              {note.code !== "" && note.note !== "too-many" && <Mono>{note.code}</Mono>}
              {note.code !== "" && note.note !== "too-many" ? " · " : ""}
              {t(CODE_NOTES[note.note], { code: note.code })}
            </span>
            {note.note === "needs-sign-in" && (
              <ShopLink to={{ view: "signIn" }} className="nl-link-btn">
                {t("shop.nav.signIn")}
              </ShopLink>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

/** "Pay with a gift card": the 12-character code; what it pays is Adminium's to say. */
export function CardBox({ id = "gift-in" }: { id?: string }) {
  const { t, locale } = useI18n();
  const card = useShop((s) => s.card);
  const note = useShop((s) => s.cardNote);
  const payment = useShop((s) => s.basketQuote?.quote?.payment ?? null);
  const currency = useShop((s) => s.config.currency);
  const [draft, setDraft] = useState("");
  if (card !== null) {
    return (
      <div className="nl-applied" role="status">
        <Gift size={16} aria-hidden="true" />
        <span className="nl-grow">{payment === null ? <Mono>{last4(card)}</Mono> : rich(t, "shop.card.used", { last4: <Mono>{last4(card)}</Mono>, amount: <Mono>{money(payment.amount, currency, locale)}</Mono> })}</span>
        <button type="button" className="nl-icon-btn nl-icon-btn--plain nl-icon-btn--sm" aria-label={t("shop.basket.removeOf", { name: t("shop.basket.giftCard") })} onClick={dropCard}>
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    );
  }
  return (
    <form
      className="nl-box-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (useCard(draft)) setDraft("");
      }}
    >
      <label htmlFor={id} className="nl-label">
        {t("shop.card.pay")}
      </label>
      <div className="nl-inline-form">
        <input id={id} className="nl-input nl-mono-input" value={draft} placeholder={t("shop.card.placeholder")} onChange={(e) => setDraft(e.target.value)} autoComplete="off" autoCapitalize="characters" aria-invalid={note !== null ? true : undefined} aria-describedby={note !== null ? `${id}-msg` : undefined} />
        <button type="submit" className="nl-btn nl-btn--ink">
          {t("shop.code.use")}
        </button>
      </div>
      {note !== null && (
        <div id={`${id}-msg`} className="nl-error">
          <CircleAlert size={14} aria-hidden="true" />
          <span>{t(note === "short" ? "shop.card.short" : "shop.card.unknown")}</span>
        </div>
      )}
    </form>
  );
}

/** What the basket's figures say when there are none to show: the shop closed, or a sign-in needed to price it. */
function QuoteState() {
  const { t } = useI18n();
  const state = useShop((s) => s.basketQuote?.state ?? null);
  if (state === "closed") return <div className="nl-notice">{t("shop.basket.closed")}</div>;
  if (state === "signIn")
    return (
      <div className="nl-notice">
        {t("shop.basket.transferSignIn")}{" "}
        <ShopLink to={{ view: "signIn" }} className="nl-link-btn">
          {t("shop.nav.signIn")}
        </ShopLink>
      </div>
    );
  if (state === "failed") return <div className="nl-notice">{t("shop.failed.short")}</div>;
  return null;
}

function checkoutOpen(): boolean {
  const s = useShop.getState();
  return s.basketQuote?.state === "ok" && (orderableLines().length > 0 || s.gifts.length > 0);
}

export function BasketDrawer() {
  const { t, locale } = useI18n();
  const open = useShop((s) => s.drawer);
  const pieces = useShop((s) => basketPieces(s));
  const empty = useShop((s) => s.basket.length + s.gifts.length === 0);
  const quote = useShop((s) => s.basketQuote?.quote ?? null);
  useShop((s) => s.basketQuote?.state);
  const close = () => openDrawer(false);
  const ref = useDialog(open, close);
  if (!open) return null;
  return (
    <div className="nl-scrim nl-scrim--end" onClick={close}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="drawer-title" className="nl-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="nl-drawer-head">
          <ShoppingBasket size={18} aria-hidden="true" className="nl-accent" />
          <h2 id="drawer-title" className="nl-drawer-title">
            {t("shop.basket.title")}
          </h2>
          <Mono className="nl-subtle nl-small">{count(pieces, locale)}</Mono>
          <button type="button" className="nl-icon-btn nl-push" aria-label={t("shop.close")} onClick={close}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {empty ? (
          <Empty page={false} />
        ) : (
          <>
            <div className="nl-drawer-lines">
              <AgainNote page={false} />
              <Lines page={false} />
            </div>
            <div className="nl-drawer-foot">
              <FreeBar />
              <QuoteState />
              <Totals quote={quote} />
              <button type="button" className="nl-btn nl-btn--accent nl-btn--block nl-btn--lg" disabled={!checkoutOpen()} onClick={() => go({ view: "checkout" })}>
                {t("shop.basket.checkout")}
                <ArrowRight size={17} aria-hidden="true" className="nl-flip" />
              </button>
              <ShopLink to={{ view: "basket" }} className="nl-drawer-view">
                {t("shop.basket.view")}
              </ShopLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function BasketScreen() {
  const { t } = useI18n();
  const empty = useShop((s) => s.basket.length + s.gifts.length === 0);
  const quote = useShop((s) => s.basketQuote?.quote ?? null);
  useShop((s) => s.basketQuote?.state);
  return (
    <main id="main" className="nl-page nl-page--narrow nl-fade">
      <h1 className="nl-h1 nl-h1--spaced">{t("shop.basket.title")}</h1>
      {empty ? (
        <Empty page />
      ) : (
        <div className="nl-basket">
          <div className="nl-basket-lines">
            <AgainNote page />
            <Lines page />
          </div>
          <aside aria-labelledby="bsum" className="nl-summary">
            <h2 id="bsum" className="nl-h4">
              {t("shop.basket.summary")}
            </h2>
            <FreeBar />
            <QuoteState />
            <Totals quote={quote} />
            <div className="nl-summary-boxes">
              <CodeBox />
              <CardBox />
            </div>
            <button type="button" className="nl-btn nl-btn--accent nl-btn--block nl-btn--lg" disabled={!checkoutOpen()} onClick={() => go({ view: "checkout" })}>
              {t("shop.basket.checkout")}
              <ArrowRight size={17} aria-hidden="true" className="nl-flip" />
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}

export { Lines as BasketLines };
