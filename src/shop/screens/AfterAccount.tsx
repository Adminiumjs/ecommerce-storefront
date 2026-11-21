/**
 * S12 Your account: the customer's orders, newest first, with the ones only
 * ordered with their e-mail (placed while signed out, ACC-7) listed apart;
 * their returns, each by its own number with its step and Adminium's
 * refund; news e-mails on or off; sign out; and "Delete my details", which
 * says what stays.
 */
import { ChevronRight, CircleAlert, LogOut, Mail, Undo2, UserX } from "lucide-react";

import { useI18n } from "../../i18n/index.tsx";
import { forget, openDelete, openFromAccount, setNews, showReturn, signOut, useAfter } from "../after.ts";
import type { Id, Row } from "../port.ts";
import { money } from "../format.ts";
import { ShopLink } from "../parts.tsx";
import { announce, useShop } from "../store.ts";
import { Mono, rich } from "../words.tsx";
import { CodeFlow } from "./AfterCode.tsx";
import { returnStepKey } from "./AfterOrder.tsx";
import { ConfirmSheet, StatusPill, useDay } from "./AfterParts.tsx";

const proved = (o: Row) => o["customer_proved"] === true || o["customer_proved"] === 1 || o["customer_proved"] === "1";

/** Two letters for the account's badge, as the customer's name gives them. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

export function AccountScreen() {
  const { t } = useI18n();
  const customer = useShop((s) => s.customer);
  const account = useAfter((s) => s.account);
  const me = useAfter((s) => s.me);
  if (customer === null && account.state !== "loading")
    return (
      <main id="main" className="nl-page nl-after nl-after--narrow">
        <section className="nl-empty" aria-labelledby="nl-acc-none">
          <h1 id="nl-acc-none" className="nl-empty-title">
            {t("after.account.title")}
          </h1>
          <p className="nl-muted">{t("after.account.signInFirst")}</p>
          <ShopLink to={{ view: "signIn" }} className="nl-btn nl-btn--accent">
            {t("after.signIn.title")}
          </ShopLink>
        </section>
      </main>
    );
  const name = me?.name || customer?.name || "";
  const email = me?.email || customer?.email || "";
  const orders = account.orders.filter(proved);
  const others = account.orders.filter((o) => !proved(o));
  return (
    <main id="main" className="nl-page nl-after nl-after--account">
      <div className="nl-acc-head">
        <span className="nl-acc-badge" aria-hidden="true">
          {initials(name || email)}
        </span>
        <div className="nl-min0">
          <h1 className="nl-h1">{name === "" ? t("after.account.title") : t("after.account.hello", { name: name.split(/\s+/)[0] ?? name })}</h1>
          <div className="nl-muted nl-small nl-acc-email">{email}</div>
        </div>
      </div>
      {account.state === "loading" && (
        <div className="nl-skeleton" aria-busy="true">
          <span className="nl-sr">{t("after.account.loading")}</span>
          <div className="nl-skel nl-skel--bar" />
        </div>
      )}
      {account.state === "failed" && (
        <div role="alert" className="nl-after-alert">
          <CircleAlert size={16} aria-hidden="true" />
          {t("after.err.unreachable")}
        </div>
      )}
      <section className="nl-acc-section" aria-labelledby="nl-acc-orders">
        <h2 id="nl-acc-orders" className="nl-h4">
          {t("after.account.orders")}
        </h2>
        {orders.length === 0 && account.state === "ok" && <p className="nl-muted">{t("after.account.noOrders")}</p>}
        {orders.map((o) => (
          <OrderRow key={String(o["id"])} order={o} />
        ))}
      </section>
      {others.length > 0 && (
        <section className="nl-acc-section" aria-labelledby="nl-acc-others">
          <h2 id="nl-acc-others" className="nl-h4">
            {t("after.account.unproved")}
          </h2>
          <p className="nl-muted nl-small">{t("after.account.unprovedSub")}</p>
          {others.map((o) => (
            <OrderRow key={String(o["id"])} order={o} />
          ))}
        </section>
      )}
      <section className="nl-acc-section" aria-labelledby="nl-acc-returns">
        <h2 id="nl-acc-returns" className="nl-h4">
          {t("after.account.returns")}
        </h2>
        {account.returns.length === 0 ? <p className="nl-muted">{t("after.account.noReturns")}</p> : account.returns.map((r) => <ReturnRow key={String(r["id"])} ret={r} />)}
      </section>
      <News />
      <div className="nl-after-actions">
        <button type="button" className="nl-btn nl-btn--quiet" onClick={() => void signOut()}>
          <LogOut size={16} aria-hidden="true" className="nl-flip" />
          {t("after.account.signOut")}
        </button>
        <button type="button" className="nl-btn nl-btn--quiet nl-acc-delete" aria-haspopup="dialog" onClick={() => openDelete(true)}>
          <UserX size={16} aria-hidden="true" />
          {t("after.account.delete")}
        </button>
      </div>
      <DeleteSheet />
    </main>
  );
}

function OrderRow({ order }: { order: Row }) {
  const { t, locale } = useI18n();
  const currency = useShop((s) => s.config.currency);
  const day = useDay();
  const pieces = Number(order["pieces"] ?? 0);
  return (
    <ShopLink to={{ view: "order" }} className="nl-acc-row" onClick={() => openFromAccount(order["id"] as Id, false)}>
      <span className="nl-grow nl-min0">
        <Mono className="nl-acc-number">{String(order["number"] ?? "")}</Mono>
        <span className="nl-acc-meta">
          <Mono>{day(order["placed_at"])}</Mono>
          {order["kind"] !== "gift" && (
            <>
              {" · "}
              {t("after.account.items", { n: new Intl.NumberFormat(locale).format(pieces) }, pieces)}
            </>
          )}
        </span>
      </span>
      <StatusPill order={order} />
      <Mono className="nl-acc-total">{money(order["total"], currency, locale)}</Mono>
      <ChevronRight size={16} aria-hidden="true" className="nl-subtle nl-flip" />
    </ShopLink>
  );
}

function ReturnRow({ ret }: { ret: Row }) {
  const { t, locale } = useI18n();
  const currency = useShop((s) => s.config.currency);
  return (
    <ShopLink to={{ view: "orderReturn" }} className="nl-acc-row nl-acc-row--return" onClick={() => showReturn(ret, false)}>
      <Undo2 size={16} aria-hidden="true" className="nl-muted nl-flip" />
      <span className="nl-grow nl-min0">
        <Mono className="nl-acc-number">{String(ret["number"] ?? "")}</Mono>
        <span className="nl-acc-meta">{rich(t, "after.account.returnOf", { order: <Mono>{String(ret["order_number"] ?? "")}</Mono> })}</span>
      </span>
      <span className="nl-small nl-muted">{t(returnStepKey(ret))}</span>
      <Mono className="nl-acc-total">{money(ret["refund_amount"], currency, locale)}</Mono>
    </ShopLink>
  );
}

/** News e-mails on or off, with its own polite live region (N1b-F13). */
function News() {
  const { t } = useI18n();
  const me = useAfter((s) => s.me);
  const news = useAfter((s) => s.news);
  const customerNews = useShop((s) => s.customer?.news ?? false);
  const on = me?.news ?? customerNews;
  const toggle = async () => {
    const done = await setNews(!on);
    if (done) announce(t(!on ? "after.news.on" : "after.news.off"));
  };
  return (
    <section className="nl-panel nl-acc-news" aria-labelledby="nl-acc-news">
      <Mail size={18} aria-hidden="true" className="nl-accent" />
      <h2 id="nl-acc-news" className="nl-sr">
        {t("after.news.title")}
      </h2>
      <span className="nl-acc-news-state" role="status">
        {t(on ? "after.news.on" : "after.news.off")}
      </span>
      <button type="button" className="nl-btn nl-btn--quiet nl-btn--sm" onClick={() => void toggle()} aria-busy={news.busy || undefined} disabled={me === null}>
        {t(on ? "after.news.stop" : "after.news.start")}
      </button>
      <div className="nl-acc-news-line" role="status">
        {news.failed === "stop" ? (
          <span className="nl-danger-line">{t("after.news.stopFailed")}</span>
        ) : news.failed === "start" ? (
          <span className="nl-danger-line">{t("after.err.unreachable")}</span>
        ) : news.confirm ? (
          <span className="nl-ok-line">{t("after.news.confirm")}</span>
        ) : !on ? (
          <span className="nl-subtle nl-small">{t("after.news.line")}</span>
        ) : null}
      </div>
    </section>
  );
}

function DeleteSheet() {
  const { t } = useI18n();
  const sheet = useAfter((s) => s.deleteSheet);
  const close = () => openDelete(false);
  return (
    <ConfirmSheet
      idBase="nl-delete"
      open={sheet.open}
      onClose={close}
      title={t("after.delete.q")}
      text={t("after.delete.text")}
      keep={t("after.delete.keep")}
      confirm={t("after.delete.yes")}
      busy={sheet.busy}
      onConfirm={() => void forget()}
    >
      {sheet.step === "code" ? (
        <div className="nl-sheet-code">
          <CodeFlow which="confirm" />
        </div>
      ) : sheet.failed ? (
        <div className="nl-sheet-code">
          <div role="alert" className="nl-danger-line">
            <CircleAlert size={14} aria-hidden="true" />
            {t("after.delete.failed")}
          </div>
          <SheetButtons onClose={close} busy={sheet.busy} />
        </div>
      ) : undefined}
    </ConfirmSheet>
  );
}

function SheetButtons({ onClose, busy }: { onClose: () => void; busy: boolean }) {
  const { t } = useI18n();
  return (
    <div className="nl-sheet-foot nl-sheet-foot--inline">
      <button type="button" className="nl-btn nl-btn--quiet nl-sheet-btn" data-autofocus onClick={onClose}>
        {t("after.delete.keep")}
      </button>
      <button type="button" className="nl-btn nl-btn--danger nl-sheet-btn" onClick={() => void forget()} disabled={busy}>
        {t("after.delete.yes")}
      </button>
    </div>
  );
}
