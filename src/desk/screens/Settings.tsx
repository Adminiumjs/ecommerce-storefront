/**
 * K10 Settings (comp N2 694–726), the owner's: the shop's own row of
 * settings, and what lives elsewhere shown with the way to it.
 *
 * r4: the shop e-mail is required, since the staff e-mails go there (R5,
 * ACC-16). The order number's prefix, and its first number only until the
 * first order (N2-D2). Shipping, tax and closures are read here and changed
 * on the console's Manage pages (N2-F13); the ship days and cut-off are the
 * app's settings, on its settings page (MDL-3). Taking payments online is
 * Adminium's per-app switch, which whoever manages payments turns on: shown,
 * never switched here (N2-F12, ACC-15); the shop's own choice is bank
 * transfer for when it is off (Q5, LIFE-2). Inventory's "show how many are
 * left" is Inventory's own setting, linked. A "Review us on Google" link,
 * https only.
 */
import { useState } from "react";
import { Check, ExternalLink, FileText, Hash, Info, Landmark, Percent, Store, Truck, Undo2, CalendarDays, Boxes } from "lucide-react";

import { useData, useEnv, useRun } from "../env.tsx";
import { INVENTORY } from "../facts.ts";
import { useFmt } from "../format.ts";
import { ShipFromCard } from "../shipping.tsx";
import { Card, Fig, FieldError, Switch } from "../ui.tsx";
import { num, same, text, type Row } from "../wire.ts";
import { useT, type MessageKey } from "../../i18n/index.tsx";

type Field = { key: string; label: MessageKey; area?: boolean; mono?: boolean; hint?: MessageKey; readOnly?: boolean };

const SHOP: Field[] = [
  { key: "shop_name", label: "desk.set.shopName" },
  { key: "email", label: "desk.set.email", mono: true, hint: "desk.set.emailHint" },
  { key: "phone", label: "desk.set.phone", mono: true },
  { key: "address_line1", label: "desk.set.address1" },
  { key: "address_line2", label: "desk.set.address2" },
  { key: "city", label: "desk.set.city" },
  { key: "state_code", label: "desk.set.state", mono: true },
  { key: "zip", label: "desk.set.zip", mono: true },
];
const TRANSFER: Field[] = [
  { key: "transfer_name", label: "desk.set.transferName" },
  { key: "transfer_bank", label: "desk.set.transferBank" },
  { key: "transfer_routing", label: "desk.set.transferRouting", mono: true },
  { key: "transfer_account", label: "desk.set.transferAccount", mono: true },
  { key: "transfer_days", label: "desk.set.transferDays", mono: true },
];
const WORDS: Field[] = [
  { key: "promise_1", label: "desk.set.promise1" },
  { key: "promise_2", label: "desk.set.promise2" },
  { key: "promise_3", label: "desk.set.promise3" },
  { key: "about", label: "desk.set.about", area: true },
  { key: "privacy", label: "desk.set.privacy", area: true },
  { key: "terms", label: "desk.set.terms", area: true },
  { key: "review_link", label: "desk.set.reviewLink", mono: true, hint: "desk.set.reviewLinkHint" },
];
const NUMBERS = new Set(["first_number", "pay_hold_minutes", "transfer_days", "return_days"]);

const asText = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

/** The console's own page of a manifest page (`/p/<ref>`), the app's settings page, and an add-on's. */
export const CONSOLE = {
  page: (ref: string) => `/p/${ref}`,
  appSettings: "/studio/apps/ecommerce-shop",
  payments: "/studio/payments",
  addOn: (key: string) => `/add-on-settings/${key}`,
};

export function SettingsScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const settings = data.settings;
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, MessageKey>>({});
  if (settings === null) return <div className="dk-empty">{t("desk.set.none")}</div>;
  const value = (key: string): unknown => (key in draft ? draft[key] : settings[key]);
  const set = (key: string, v: unknown) => setDraft({ ...draft, [key]: v });
  const facts = door.facts();
  const payments = door.payments();
  const online = payments?.online === true;
  const hasOrders = data.orders.length > 0;

  const save = () => {
    const bad: Record<string, MessageKey> = {};
    const email = asText(value("email")).trim();
    if (email === "" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad["email"] = "desk.set.errEmail";
    const link = asText(value("review_link")).trim();
    if (link !== "" && !/^https:\/\/[^\s]+$/.test(link)) bad["review_link"] = "desk.set.errReviewLink";
    for (const key of NUMBERS) if (key in draft && !/^\d+$/.test(asText(draft[key]).trim())) bad[key] = "desk.set.errNumber";
    setErrors(bad);
    if (Object.keys(bad).length > 0) return;
    const values = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => {
        if (typeof v === "boolean") return [k, v];
        const s = asText(v).trim();
        return [k, NUMBERS.has(k) ? Number(s) : s === "" ? null : s];
      }),
    );
    void run(async (d) => {
      await d.saveSettings(settings, values);
      setDraft({});
      return t("desk.toast.saved");
    });
  };

  const input = (f: Field) => {
    const id = `set-${f.key}`;
    const err = errors[f.key];
    const describedBy = [f.hint === undefined ? null : `${id}-hint`, err === undefined ? null : `${id}-err`].filter((x) => x !== null).join(" ") || undefined;
    return (
      <div key={f.key} className={`dk-field${f.area === true ? " dk-field--wide" : ""}`}>
        <label htmlFor={id}>{t(f.label)}</label>
        {f.area === true ? (
          <textarea id={id} className="dk-input" rows={4} value={asText(value(f.key))} onChange={(e) => set(f.key, e.target.value)} aria-describedby={describedBy} />
        ) : (
          <input
            id={id}
            className={`dk-input${f.mono === true ? " dk-input--mono" : ""}`}
            dir={f.mono === true ? "ltr" : undefined}
            value={asText(value(f.key))}
            readOnly={f.readOnly === true}
            aria-invalid={err !== undefined}
            aria-describedby={describedBy}
            onChange={(e) => set(f.key, e.target.value)}
          />
        )}
        {f.hint !== undefined && (
          <div id={`${id}-hint`} className="dk-hint">
            {t(f.hint)}
          </div>
        )}
        {err !== undefined && <FieldError id={`${id}-err`}>{t(err)}</FieldError>}
      </div>
    );
  };
  const toggle = (key: string, label: MessageKey, sub: MessageKey) => (
    <div className="dk-toggle">
      <Switch on={value(key) === true} labelledBy={`set-${key}-l`} onChange={(on) => set(key, on)} />
      <div>
        <div id={`set-${key}-l`} className="dk-strong">
          {t(label)}
        </div>
        <div className="dk-hint">{t(sub)}</div>
      </div>
    </div>
  );
  const consoleLink = (href: string, label: MessageKey) => (
    <a className="dk-link" href={href} target="_top">
      {t(label)}
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  );
  const zones = [...data.zones].sort((a, b) => Number(a.id) - Number(b.id));
  const offerFor = (service: Row, zone: Row) => data.offers.find((o) => same(o["service_id"], service.id) && same(o["zone_id"], zone.id) && o["active"] !== false);
  const taxed = data.regions.filter((r) => (num(r["tax_rate"]) ?? 0) > 0 || same(r["code"], settings["state_code"]));
  const cutoff = text(facts.appSettings["cutoff"]) ?? "14:00";
  const closures = data.closures.filter((c) => c["active"] !== false);

  return (
    <div className="dk-screen">
      <div className="dk-head">
        <h1 className="dk-h1">{t("desk.set.title")}</h1>
        <button type="button" className="dk-btn dk-btn--primary" disabled={busy || Object.keys(draft).length === 0} onClick={save}>
          <Check size={16} aria-hidden="true" />
          {t("desk.save")}
        </button>
      </div>

      <Card id="set-shop" title={t("desk.set.shop")} icon={<Store size={18} />}>
        <div className="dk-grid2">{SHOP.map(input)}</div>
      </Card>

      <Card id="set-numbers" title={t("desk.set.numbers")} icon={<Hash size={18} />}>
        <div className="dk-grid2">
          {input({ key: "ref_prefix", label: "desk.set.prefix", mono: true })}
          {input({ key: "first_number", label: "desk.set.firstNumber", mono: true, readOnly: hasOrders, hint: hasOrders ? "desk.set.firstNumberLocked" : "desk.set.firstNumberHint" })}
        </div>
      </Card>

      <Card id="set-ship" title={t("desk.set.shipping")} icon={<Truck size={18} />}>
        <div className="dk-scroll">
          <table className="dk-table">
            <thead>
              <tr>
                <th scope="col">{t("desk.set.colService")}</th>
                {zones.map((z) => (
                  <th key={String(z.id)} scope="col">
                    {text(z["label"])}
                  </th>
                ))}
                <th scope="col">{t("desk.set.colDays")}</th>
              </tr>
            </thead>
            <tbody>
              {data.services.map((s) => (
                <tr key={String(s.id)}>
                  <td className="dk-strong">{text(s["label"])}</td>
                  {zones.map((z) => {
                    const offer = offerFor(s, z);
                    return (
                      <td key={String(z.id)}>
                        {offer === undefined ? (
                          <span className="dk-muted">{t("desk.set.notOffered")}</span>
                        ) : (
                          <Fig>{(num(offer["free_from"]) ?? 0) > 0 ? t("desk.set.priceFreeFrom", { price: fmt.money(offer["price"]), from: fmt.money(offer["free_from"]) }) : fmt.money(offer["price"])}</Fig>
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <Fig>{num(s["transit_min"]) === num(s["transit_max"]) ? t("desk.set.days", undefined, num(s["transit_max"]) ?? 0) : t("desk.set.daysRange", { min: num(s["transit_min"]) ?? 0, max: num(s["transit_max"]) ?? 0 })}</Fig>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dk-note">
          <Info size={15} aria-hidden="true" />
          {t("desk.set.shipNote")}
        </div>
        <div className="dk-links">
          {consoleLink(CONSOLE.page("ecommerce-shipping-services"), "desk.set.manageServices")}
          {consoleLink(CONSOLE.page("ecommerce-shipping-prices"), "desk.set.managePrices")}
        </div>
      </Card>

      <ShipFromCard settings={settings} />

      <Card id="set-tax" title={t("desk.set.tax")} icon={<Percent size={18} />}>
        <div className="dk-rows">
          {taxed.map((r) => (
            <div key={String(r.id)} className="dk-fig-row">
              <span>
                {text(r["name"])} <Fig>{text(r["code"])}</Fig>
              </span>
              <Fig strong>{fmt.pct(r["tax_rate"])}</Fig>
            </div>
          ))}
        </div>
        <div className="dk-note">
          <Info size={15} aria-hidden="true" />
          {t("desk.set.taxNote")}
        </div>
        <div className="dk-links">{consoleLink(CONSOLE.page("ecommerce-regions"), "desk.set.manageRegions")}</div>
      </Card>

      <Card id="set-days" title={t("desk.set.days.title")} icon={<CalendarDays size={18} />}>
        <div className="dk-fig-row">
          <span>{t("desk.set.cutoff")}</span>
          <Fig strong>{cutoff}</Fig>
        </div>
        <div className="dk-hint">{t("desk.set.cutoffNote", { time: cutoff })}</div>
        {closures.map((c) => (
          <div key={String(c.id)} className="dk-fig-row">
            <span>{text(c["reason"]) ?? t("desk.set.closed")}</span>
            <Fig>{same(c["from_date"], c["to_date"]) ? fmt.day(c["from_date"]) : `${fmt.day(c["from_date"])} – ${fmt.day(c["to_date"])}`}</Fig>
          </div>
        ))}
        <div className="dk-links">
          {consoleLink(CONSOLE.appSettings, "desk.set.manageDays")}
          {consoleLink(CONSOLE.page("ecommerce-closures"), "desk.set.manageClosures")}
        </div>
      </Card>

      <Card id="set-returns" title={t("desk.set.returns")} icon={<Undo2 size={18} />}>
        <div className="dk-grid2">{input({ key: "return_days", label: "desk.set.returnDays", mono: true })}</div>
        {toggle("refund_shipping_faulty", "desk.set.refundShippingFaulty", "desk.set.refundShippingFaultyHint")}
      </Card>

      <Card id="set-pay" title={t("desk.set.payments")} icon={<Landmark size={18} />}>
        <div className="dk-fig-row">
          <span className="dk-strong">{t("desk.set.online")}</span>
          <span>{payments === null ? t("desk.set.onlineUnknown") : online ? t("desk.set.onlineOn") : t("desk.set.onlineOff")}</span>
        </div>
        <div className="dk-hint">{t("desk.set.onlineHint")}</div>
        <div className="dk-grid2">{input({ key: "pay_hold_minutes", label: "desk.set.holdMinutes", mono: true, hint: "desk.set.holdMinutesHint" })}</div>
        {toggle("transfer_on", "desk.set.transfer", "desk.set.transferHint")}
        {online && value("transfer_on") === true && (
          <div className="dk-banner dk-banner--warn" role="note">
            <Info size={15} aria-hidden="true" />
            {t("desk.set.transferOffOnline")}
          </div>
        )}
        {value("transfer_on") === true && <div className="dk-grid2">{TRANSFER.map(input)}</div>}
      </Card>

      <Card id="set-words" title={t("desk.set.words")} icon={<FileText size={18} />}>
        <div className="dk-grid2">{WORDS.map(input)}</div>
      </Card>

      {facts.addOns.includes(INVENTORY) && (
        <Card id="set-stock" title={t("desk.set.stock")} icon={<Boxes size={18} />}>
          <div className="dk-hint">{t("desk.set.stockHint")}</div>
          <div className="dk-links">{consoleLink(CONSOLE.addOn(INVENTORY), "desk.set.manageStock")}</div>
        </Card>
      )}
    </div>
  );
}
