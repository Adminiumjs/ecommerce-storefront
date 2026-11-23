/**
 * K4 Packing (comp N2 395–455, the 820 px frame): today's paid orders as one
 * pick list by SKU, each order ticked packed, the packed parcels shipped.
 *
 * r4: a line is "Count this — Inventory is short" when its stock point's
 * on-hand is below what is held for it (STK-9), with the place it is kept
 * under the SKU (N2-F9); a packed order's lines leave the list (N2-F10). One
 * parcel and one tracking number an order (T7). Packing slips print as one
 * print job, up to 50 a run, drawn by Invoices' `packing-slip` kind (C11b,
 * N2-F23). With DHL on, "Hand over to DHL" opens each packed order's DHL
 * panel in turn; a demo booking fills no tracking number (C4). Staff of a
 * real shop type the carrier and the tracking number either way.
 */
import { useState } from "react";
import { AlertTriangle, ClipboardList, MapPin, Package, PackageCheck, Printer, Truck } from "lucide-react";

import { useData, useEnv, useRun } from "../env.tsx";
import { DHL, INVOICES, linesOf, packed, pickList, toPack } from "../facts.ts";
import { go, openSheet } from "../store.ts";
import { Chip, Fig, FieldError } from "../ui.tsx";
import { serviceWord } from "../words.ts";
import { num, text, type Row } from "../wire.ts";
import { useT } from "../../i18n/index.tsx";
import { dhlCutoff } from "./Today.tsx";
import { hasCarrier } from "../shipping.tsx";

/** At most this many slips in one print job. */
export const SLIPS_A_RUN = 50;

export function PackingScreen() {
  const t = useT();
  const data = useData();
  const { door } = useEnv();
  const facts = door.facts();
  const who = door.who();
  const { busy, run } = useRun();
  const pack = toPack(data);
  const done = packed(data);
  const picks = pickList(data);
  const pieces = picks.reduce((n, p) => n + p.qty, 0);
  const dhlOn = facts.addOns.includes(DHL);
  const carrierOn = hasCarrier(facts.addOns);
  const cutoff = dhlOn ? dhlCutoff(facts.addOnSettings[DHL]) : null;
  const slips = facts.addOns.includes(INVOICES);
  const mayUpdate = who.can("orders", "update");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<{ carrier: boolean; tracking: Record<string, boolean> }>({ carrier: false, tracking: {} });

  const print = (orders: Row[]) =>
    void run(async (d) => {
      const urls: string[] = [];
      for (const order of orders.slice(0, SLIPS_A_RUN)) {
        const drawn = await d.render({ kind: "packing-slip", ref: "orders", pk: order.id });
        urls.push(drawn.printUrl ?? drawn.contentUrl);
      }
      const printed = await d.printAll(urls);
      return printed ? t("desk.toast.slipsPrinted", undefined, urls.length) : t("desk.toast.slipsReady", undefined, urls.length);
    });

  const markShipped = () => {
    const missing: Record<string, boolean> = {};
    for (const o of done) if ((tracking[String(o.id)] ?? "").trim() === "") missing[String(o.id)] = true;
    const noCarrier = carrier.trim() === "";
    setErrors({ carrier: noCarrier, tracking: missing });
    const ready = done.filter((o) => !missing[String(o.id)]);
    if (noCarrier || ready.length === 0) return;
    void run(async (d) => {
      for (const o of ready) await d.moveOrder(o, "shipped", { carrier: carrier.trim(), tracking: (tracking[String(o.id)] ?? "").trim() });
      setTracking({});
      return t("desk.toast.shippedMany", undefined, ready.length);
    });
  };

  return (
    <div className="dk-screen">
      <div className="dk-head">
        <div>
          <h1 className="dk-h1">{t("desk.today.shipToday")}</h1>
          <div className="dk-sub">{t("desk.packing.sub", { orders: pack.length, pieces })}</div>
        </div>
        {slips && pack.length > 0 && (
          <button type="button" className="dk-btn" disabled={busy} onClick={() => print(pack)}>
            <Printer size={16} aria-hidden="true" />
            {t("desk.packing.printSlips", undefined, Math.min(pack.length, SLIPS_A_RUN))}
          </button>
        )}
      </div>
      <div className="dk-pack">
        <section className="dk-card" aria-labelledby="pick-h">
          <div className="dk-card-head">
            <span className="dk-card-ico" aria-hidden="true">
              <ClipboardList size={18} />
            </span>
            <h2 id="pick-h" className="dk-card-title">
              {t("desk.packing.pickList")}
            </h2>
            <span className="dk-muted">{t("desk.pieces", undefined, pieces)}</span>
          </div>
          {picks.length === 0 && <div className="dk-empty dk-empty--small">{t("desk.packing.allPacked")}</div>}
          {picks.map((p) => (
            <div key={p.sku} className="dk-pick">
              <div className="dk-pick-words">
                <div>
                  <Fig strong>{p.sku}</Fig>
                </div>
                <div className="dk-muted">
                  {p.productName}
                  {p.variantLabel !== "" && <span> · {p.variantLabel}</span>}
                </div>
                {p.places.length > 0 && (
                  <div className="dk-muted dk-place">
                    <MapPin size={13} aria-hidden="true" />
                    {p.places.join(", ")}
                  </div>
                )}
                {p.short && (
                  <div className="dk-warnline">
                    <AlertTriangle size={14} aria-hidden="true" />
                    {t("desk.packing.countThis")}
                  </div>
                )}
              </div>
              <span className="dk-pick-qty">
                <Fig strong>{p.qty}</Fig>
              </span>
            </div>
          ))}
        </section>
        <div className="dk-col">
          <section className="dk-card" aria-labelledby="pk-orders-h">
            <div className="dk-card-head">
              <span className="dk-card-ico" aria-hidden="true">
                <PackageCheck size={18} />
              </span>
              <h2 id="pk-orders-h" className="dk-card-title">
                {t("desk.packing.toPack")}
              </h2>
            </div>
            {pack.length === 0 && <div className="dk-empty dk-empty--small">{t("desk.packing.allPacked")}</div>}
            {pack.map((o) => {
              const number = text(o["number"]) ?? "";
              return (
                <div key={String(o.id)} className="dk-pack-order">
                  <label className="dk-tick">
                    <input
                      type="checkbox"
                      checked={false}
                      disabled={!mayUpdate || busy}
                      aria-label={t("desk.packing.tick", { number })}
                      onChange={() => void run(async (d) => (await d.moveOrder(o, "packed"), t("desk.toast.packed", { number })))}
                    />
                  </label>
                  <div className="dk-pack-words">
                    <div className="dk-title-row">
                      <a
                        href="#main"
                        className="dk-num-link"
                        onClick={(e) => {
                          e.preventDefault();
                          go("order", { orderId: o.id });
                        }}
                      >
                        <Fig strong>{number}</Fig>
                      </a>
                      <span className="dk-strong">{text(o["ship_name"]) ?? text(o["name"])}</span>
                      <Chip tone="info">{serviceWord(data, o)}</Chip>
                      {slips && (
                        <button type="button" className="dk-btn dk-btn--sm dk-push" disabled={busy} onClick={() => print([o])} aria-label={t("desk.packing.printOne", { number })}>
                          <Printer size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {linesOf(data, o).map((l) => (
                      <div key={String(l.id)} className="dk-muted">
                        <Fig strong>{num(l["qty"]) ?? 1}</Fig> × {text(l["product_name"])}
                        {text(l["variant_label"]) !== null && ` · ${text(l["variant_label"])!}`}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
          <section className="dk-card" aria-labelledby="pk-packed-h">
            <div className="dk-card-head">
              <span className="dk-card-ico" aria-hidden="true">
                <Package size={18} />
              </span>
              <h2 id="pk-packed-h" className="dk-card-title">
                {cutoff === null ? t("desk.tile.packedReady") : t("desk.tile.packedDhl", { time: cutoff })}
              </h2>
              <Fig>{done.length}</Fig>
            </div>
            {done.length === 0 && <div className="dk-empty dk-empty--small">{t("desk.packing.nonePacked")}</div>}
            {done.length > 0 && mayUpdate && (
              <div className="dk-field">
                <label htmlFor="pk-carrier">{t("desk.ship.carrier")}</label>
                <input id="pk-carrier" className="dk-input" value={carrier} aria-invalid={errors.carrier} aria-describedby={errors.carrier ? "pk-carrier-err" : undefined} onChange={(e) => setCarrier(e.target.value)} />
                {errors.carrier && <FieldError id="pk-carrier-err">{t("desk.ship.errCarrier")}</FieldError>}
              </div>
            )}
            {done.map((o) => {
              const id = String(o.id);
              const number = text(o["number"]) ?? "";
              const bad = errors.tracking[id] === true;
              return (
                <div key={id} className="dk-packed">
                  <div className="dk-title-row">
                    <a
                      href="#main"
                      className="dk-num-link"
                      onClick={(e) => {
                        e.preventDefault();
                        go("order", { orderId: o.id });
                      }}
                    >
                      <Fig strong>{number}</Fig>
                    </a>
                    <span className="dk-strong">{text(o["ship_name"]) ?? text(o["name"])}</span>
                    <Chip tone="accent">{t("desk.status.packed")}</Chip>
                  </div>
                  {mayUpdate && (
                    <div className="dk-field">
                      <label htmlFor={`pk-track-${id}`}>{t("desk.packing.trackingFor", { number })}</label>
                      <input
                        id={`pk-track-${id}`}
                        className="dk-input dk-input--mono"
                        dir="ltr"
                        value={tracking[id] ?? ""}
                        aria-invalid={bad}
                        aria-describedby={bad ? `pk-track-${id}-err` : undefined}
                        onChange={(e) => setTracking({ ...tracking, [id]: e.target.value })}
                      />
                      {bad && <FieldError id={`pk-track-${id}-err`}>{t("desk.ship.errTracking")}</FieldError>}
                    </div>
                  )}
                </div>
              );
            })}
            {done.length > 0 && mayUpdate && (
              <div className="dk-hand">
                <button type="button" className="dk-btn dk-btn--primary" disabled={busy} onClick={markShipped}>
                  <Truck size={16} aria-hidden="true" />
                  {t("desk.packing.markShipped")}
                </button>
                {carrierOn && (
                  <>
                    <span className="dk-muted">{t("desk.packing.handNote", undefined, done.length)}</span>
                    <button type="button" className="dk-btn" disabled={busy} onClick={() => openSheet({ kind: "dispatch", orderIds: done.map((o) => o.id), at: 0 })}>
                      <Truck size={16} aria-hidden="true" />
                      {t("desk.packing.handOver")}
                    </button>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
