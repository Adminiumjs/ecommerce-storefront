/**
 * K9 Customers (comp N2 641–692), the owner's: the list, and one customer
 * with their orders, their returns, their address and their news consent,
 * read-only with the day they agreed (BN-04): only the customer changes it.
 */
import { ArrowLeft, Mail } from "lucide-react";

import { useData, useEnv, useRun } from "../env.tsx";
import { ordersOfCustomer, returnLinesOf, returnsOfCustomer, showsMoney, townOf } from "../facts.ts";
import { useFmt } from "../format.ts";
import { go, useDesk } from "../store.ts";
import { Chip, Fig, Latin } from "../ui.tsx";
import { orderStatusWord, payWord, returnStatusWord } from "../words.ts";
import { num, same, text, type Row } from "../wire.ts";
import type { DeskData } from "../door.ts";
import { useT } from "../../i18n/index.tsx";

/** A customer who signed in once (an order they proved is theirs) has an account; anyone else ordered as a guest. */
const hasAccount = (data: DeskData, customer: Row): boolean => ordersOfCustomer(data, customer).some((o) => o["customer_proved"] === true);

export function CustomersScreen() {
  const t = useT();
  const data = useData();
  return (
    <div className="dk-screen">
      <div className="dk-head">
        <h1 className="dk-h1">{t("desk.cust.title")}</h1>
      </div>
      <div className="dk-card">
        <div className="dk-scroll">
          <table className="dk-table">
            <thead>
              <tr>
                <th scope="col">{t("desk.cust.colName")}</th>
                <th scope="col">{t("desk.cust.colEmail")}</th>
                <th scope="col">{t("desk.cust.colTown")}</th>
                <th scope="col">{t("desk.cust.colAccount")}</th>
                <th scope="col">{t("desk.cust.colOrders")}</th>
                <th scope="col">{t("desk.cust.colNews")}</th>
              </tr>
            </thead>
            <tbody>
              {data.customers
                .filter((c) => text(c["forgotten_at"]) === null)
                .map((c) => {
                  const town = townOf(data, c);
                  return (
                    <tr key={String(c.id)}>
                      <td>
                        <a
                          href="#main"
                          className="dk-link dk-strong"
                          onClick={(e) => {
                            e.preventDefault();
                            go("customer", { customerId: c.id });
                          }}
                        >
                          {text(c["name"]) ?? text(c["email"])}
                        </a>
                      </td>
                      <td className="dk-muted">
                        <Latin>{text(c["email"])}</Latin>
                      </td>
                      <td>{town === undefined ? "—" : `${text(town["city"]) ?? ""}, ${text(town["state_code"]) ?? ""}`}</td>
                      <td>{hasAccount(data, c) ? <Chip tone="accent">{t("desk.cust.account")}</Chip> : <Chip>{t("desk.cust.guest")}</Chip>}</td>
                      <td>
                        <Fig>{num(c["orders_count"]) ?? ordersOfCustomer(data, c).length}</Fig>
                      </td>
                      <td>{c["news"] === true ? t("desk.cust.newsOn") : t("desk.cust.newsOff")}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CustomerScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const id = useDesk((s) => s.customerId);
  const customer = data.customers.find((c) => same(c.id, id));
  if (customer === undefined) {
    return (
      <div className="dk-screen">
        <BackLink />
        <div className="dk-empty">{t("desk.cust.gone")}</div>
      </div>
    );
  }
  const orders = ordersOfCustomer(data, customer);
  const returns = returnsOfCustomer(data, customer);
  const where = townOf(data, customer);
  const name = text(customer["name"]) ?? text(customer["email"]) ?? "";
  const initials = name.split(/\s+/).map((p) => p.charAt(0).toUpperCase()).slice(0, 2).join("");
  return (
    <div className="dk-screen">
      <BackLink />
      <div className="dk-title-row dk-head">
        <span className="dk-avatar dk-avatar--big" aria-hidden="true">
          {initials}
        </span>
        <div>
          <h1 className="dk-h1">{name}</h1>
          <div className="dk-sub">
            <Latin>{text(customer["email"])}</Latin>
            {where !== undefined && ` · ${text(where["city"]) ?? ""}, ${text(where["state_code"]) ?? ""}`}
          </div>
        </div>
        {door.sendSignInLink !== undefined && (
          <button type="button" className="dk-btn dk-push" disabled={busy} onClick={() => void run(async (d) => (await d.sendSignInLink?.(customer), t("desk.toast.linkSent", { email: text(customer["email"]) ?? "" })))}>
            <Mail size={16} aria-hidden="true" />
            {t("desk.cust.sendLink")}
          </button>
        )}
      </div>
      <div className="dk-two">
        <div className="dk-col">
          <section className="dk-card" aria-labelledby="cu-o">
            <h2 id="cu-o" className="dk-card-title dk-card-head">
              {t("desk.orders.title")}
            </h2>
            {orders.length === 0 && <div className="dk-empty dk-empty--small">{t("desk.nothingHere")}</div>}
            {orders.map((o) => {
              const word = orderStatusWord(t, o);
              const pay = payWord(t, fmt, o);
              return (
                <div key={String(o.id)} className="dk-list-row">
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
                  <span className="dk-muted">
                    <Fig>{fmt.day(o["placed_at"])}</Fig>
                  </span>
                  {showsMoney(o) && <Fig strong>{fmt.money(o["total"])}</Fig>}
                  {showsMoney(o) && <Chip tone={pay.tone}>{pay.label}</Chip>}
                  <Chip tone={word.tone}>{word.label}</Chip>
                </div>
              );
            })}
          </section>
          <section className="dk-card" aria-labelledby="cu-r">
            <h2 id="cu-r" className="dk-card-title dk-card-head">
              {t("desk.ret.title")}
            </h2>
            {returns.length === 0 && <div className="dk-empty dk-empty--small">{t("desk.cust.noReturns")}</div>}
            {returns.map((r) => {
              const word = returnStatusWord(t, r);
              return (
                <div key={String(r.id)} className="dk-list-row">
                  <Fig strong>{text(r["number"])}</Fig>
                  <span>{returnLinesOf(data, r).map((l) => text(l["product_name"])).join(", ")}</span>
                  <Chip tone={word.tone}>{word.label}</Chip>
                </div>
              );
            })}
          </section>
        </div>
        <div className="dk-col">
          <section className="dk-card" aria-labelledby="cu-d">
            <h2 id="cu-d" className="dk-card-title dk-card-head">
              {t("desk.prod.details")}
            </h2>
            {where !== undefined && (
              <div className="dk-stack dk-address">
                <div className="dk-label">{t("desk.cust.address")}</div>
                <Latin>{text(where["address_line1"])}</Latin>
                {text(where["address_line2"]) !== null && <Latin>{text(where["address_line2"])}</Latin>}
                <Latin>{`${text(where["city"]) ?? ""}, ${text(where["state_code"]) ?? ""} ${text(where["zip"]) ?? ""}`}</Latin>
              </div>
            )}
            <div className="dk-chips">
              {hasAccount(data, customer) ? <Chip tone="accent">{t("desk.cust.account")}</Chip> : <Chip>{t("desk.cust.guest")}</Chip>}
              <Chip tone={customer["news"] === true ? "pos" : "neutral"}>{customer["news"] === true ? t("desk.cust.newsIsOn") : t("desk.cust.newsIsOff")}</Chip>
            </div>
            {customer["news"] === true && text(customer["news_since"]) !== null && (
              <div className="dk-muted">
                {t("desk.cust.newsSince")} <Fig>{fmt.day(customer["news_since"])}</Fig>
              </div>
            )}
            <p className="dk-hint">{t("desk.cust.newsReadOnly")}</p>
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
        go("customers");
      }}
    >
      <ArrowLeft size={15} aria-hidden="true" className="dk-flip" />
      {t("desk.cust.all")}
    </a>
  );
}
