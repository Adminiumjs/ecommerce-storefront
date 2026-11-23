/**
 * The shop's shipping, as the desk shows it: which carrier is in use, the
 * Shipment card on an order, the Shipments list and the Ship from form.
 *
 * ADMINIUM IS THE RECORD. Every line here is read from its shipping routes.
 * Buying a label moves nothing: the order moves, and the customer is told,
 * only when staff press "Handed over". A test label never gets that button
 * and its number is never drawn. A carrier's new number is saved by Adminium
 * and reaches the customer only when staff press to tell them.
 *
 * WHO MAY DO WHAT is what Adminium answers (`access`), never a role's name.
 */
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { MapPin, PackageCheck, Send, Truck } from "lucide-react";

import type { EngineAccess, EngineBooking, EngineCarrier } from "../add-ons/vendor/host/engine-carrier.ts";
import type { NeedsAttentionListProps, OpenParcelsRefreshProps } from "../add-ons/vendor/shipping-kit/index.ts";
import { useT, type MessageKey } from "../i18n/index.tsx";
import type { ShipFromValues, ShippingStatus } from "./door.ts";
import { useData, useEnv, useRun } from "./env.tsx";
import { DHL, orderMoves, status } from "./facts.ts";
import { go } from "./store.ts";
import { Card, Chip, Fig } from "./ui.tsx";
import { text, type Row } from "./wire.ts";

export const SHIPPO = "shipping-shippo";
export const CARRIERS: readonly string[] = [SHIPPO, DHL];
export const hasCarrier = (addOns: readonly string[]): boolean => CARRIERS.some((key) => addOns.includes(key));

/** What Adminium says this person may do with labels; null while unknown, without a right, or in the demo. */
export function useShippingAccess(): EngineAccess | null {
  const { door } = useEnv();
  const client = door.shippingClient?.() ?? null;
  const [access, setAccess] = useState<EngineAccess | null>(null);
  useEffect(() => {
    if (client === null) return;
    let live = true;
    client.access().then(
      (a) => live && setAccess(a),
      () => live && setAccess(null),
    );
    return () => {
      live = false;
    };
  }, [client]);
  return access;
}

/** The carrier whose screens to draw: the shop's choice, or the only one attached. Two with no choice is the owner's question. */
export function activeCarrier(addOns: readonly string[], access: EngineAccess | null): string | null {
  if (access?.carrier != null) return access.carrier;
  const attached = CARRIERS.filter((key) => addOns.includes(key));
  return attached.length === 1 ? attached[0]! : null;
}

const LIVE = new Set(["reserved", "calling", "booked", "unknown"]);
const outbound = (all: readonly EngineBooking[]) => all.filter((b) => b.purpose === "outbound" && LIVE.has(b.state));

const TRACK_WORD: Record<string, MessageKey> = {
  UNKNOWN: "desk.shipment.track.none",
  PRE_TRANSIT: "desk.shipment.track.pre",
  TRANSIT: "desk.shipment.track.moving",
  FAILURE: "desk.shipment.track.problem",
  RETURNED: "desk.shipment.track.returned",
  DELIVERED: "desk.shipment.track.delivered",
};

/** The Shipment card, on every order status. Draws nothing until a label exists. */
export function ShipmentCard({ order }: { order: Row }) {
  const t = useT();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const client = door.shippingClient?.() ?? null;
  const [bookings, setBookings] = useState<EngineBooking[]>([]);
  const [failed, setFailed] = useState(false);
  const id = String(order.id);
  const s = status(order);
  const shown = text(order["tracking"]);
  useEffect(() => {
    if (client === null) return;
    let live = true;
    client.bookings({ table: "orders", id }).then(
      (answer) => {
        if (!live) return;
        setBookings(outbound(answer.bookings));
        setFailed(false);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [client, id, s, shown]);
  if (client === null) return null;
  if (failed) {
    return (
      <Card id="od-shipment" title={t("desk.shipment.title")}>
        <div className="dk-muted">{t("desk.shipment.unreadable")}</div>
      </Card>
    );
  }
  if (bookings.length === 0) return null;
  const number = text(order["number"]) ?? "";
  const real = bookings.find((b) => !b.test && b.state === "booked" && b.tracking !== null);
  const mayHandOver = real !== undefined && orderMoves(order, door.who()).shipped;
  const newNumber = real !== undefined && real.track?.newNumber === true && s === "shipped" && shown !== null && shown !== real.tracking && door.who().can("orders", "update");
  const paidLabelWarning = real !== undefined && (s === "paid" || s === "packed");
  return (
    <Card id="od-shipment" title={t("desk.shipment.title")} icon={<Truck size={18} />}>
      {bookings.map((b) => (
        <div key={b.id} className="dk-stack" data-shipment={b.id}>
          <div className="dk-title-row">
            <span className="dk-strong">
              {b.carrierName ?? b.carrier} · {b.service}
            </span>
            {b.test && <Chip tone="warn">{t("desk.shipment.sample")}</Chip>}
            {b.state === "unknown" && <Chip tone="danger">{t("desk.shipment.unknown")}</Chip>}
            {b.state === "booked" && !b.test && <Chip tone={s === "shipped" ? "pos" : "info"}>{s === "shipped" ? t("desk.shipment.handedOver") : t("desk.shipment.ready")}</Chip>}
          </div>
          {b.test ? (
            <div className="dk-muted">{t("desk.shipment.testNote")}</div>
          ) : (
            b.tracking !== null && (
              <div className="dk-muted">
                {t("desk.ship.tracking")} <Fig>{b.tracking}</Fig>
              </div>
            )
          )}
          {b.state === "unknown" && <div className="dk-muted">{t("desk.shipment.unknownNote")}</div>}
          {!b.test && b.track?.status != null && <div className="dk-muted">{t(TRACK_WORD[b.track.status] ?? "desk.shipment.track.none")}</div>}
        </div>
      ))}
      {paidLabelWarning && <div className="dk-note">{t("desk.shipment.paidLabel")}</div>}
      {mayHandOver && (
        <>
          <div className="dk-muted">{t("desk.shipment.notYet")}</div>
          <button
            type="button"
            className="dk-btn dk-btn--primary"
            disabled={busy}
            onClick={() =>
              void run(async (d) => {
                await d.moveOrder(order, "shipped", { carrier: (real.carrierName ?? real.carrier).slice(0, 40), tracking: real.tracking });
                return t("desk.shipment.handedToast", { number });
              })
            }
          >
            <PackageCheck size={16} aria-hidden="true" />
            {t("desk.shipment.handedOver")}
          </button>
          <div className="dk-foot">{t("desk.shipment.handNote")}</div>
        </>
      )}
      {newNumber && (
        <>
          <div className="dk-banner dk-banner--warn" role="note">
            {t("desk.shipment.newNumberNote", { tracking: real.tracking ?? "", old: shown ?? "" })}
          </div>
          <button
            type="button"
            className="dk-btn"
            disabled={busy}
            onClick={() =>
              void run(async (d) => {
                await d.saveOrder(order, { tracking: real.tracking, new_number_at: new Date(door.now()).toISOString() });
                return t("desk.shipment.newNumberToast");
              })
            }
          >
            <Send size={16} aria-hidden="true" />
            {t("desk.shipment.newNumber")}
          </button>
        </>
      )}
    </Card>
  );
}

type KitParts = { Refresh: ComponentType<OpenParcelsRefreshProps>; Attention: ComponentType<NeedsAttentionListProps> };

/** The kit's list parts, on this desk's own copy of it, given this desk's client and the carrier in use. */
async function loadKit(client: EngineCarrier): Promise<KitParts> {
  const kit = await import("../add-ons/shipments.ts");
  const key = client.addOnKey;
  kit.configureShippingKit({ addOnKey: key, name: key === SHIPPO ? "Shippo" : "DHL", monogram: "SL", idPrefix: "SL" });
  kit.connectEngineCarrier(client);
  return { Refresh: kit.OpenParcelsRefresh, Attention: kit.NeedsAttentionList };
}

/** The Shipments list: what needs a person, labels not handed over, and parcels on their way. */
export function ShipmentsCard() {
  const t = useT();
  const data = useData();
  const { door } = useEnv();
  const client = door.shippingClient?.() ?? null;
  const [reload, setReload] = useState(0);
  const [Parts] = useState(() =>
    client === null
      ? null
      : {
          Refresh: lazy(async () => ({ default: (await loadKit(client)).Refresh })),
          Attention: lazy(async () => ({ default: (await loadKit(client)).Attention })),
        },
  );
  if (client === null || Parts === null) return null;
  const labelled = data.orders.filter((o) => text(o["label_tracking"]) !== null);
  const unused = labelled.filter((o) => status(o) === "paid" || status(o) === "packed");
  const onWay = labelled.filter((o) => status(o) === "shipped");
  const row = (o: Row) => (
    <li key={String(o.id)}>
      <a
        href="#main"
        className="dk-num-link"
        onClick={(e) => {
          e.preventDefault();
          go("order", { orderId: o.id });
        }}
      >
        <Fig strong>{text(o["number"])}</Fig>
      </a>{" "}
      <span className="dk-muted">
        {text(o["label_carrier"])} · <Fig>{text(o["label_tracking"])}</Fig>
      </span>
    </li>
  );
  return (
    <Card id="orders-shipments" title={t("desk.shipments.title")} icon={<Truck size={18} />}>
      <Suspense fallback={<div className="dk-muted">{t("desk.shipments.loading")}</div>}>
        <Parts.Refresh hasOpenParcels={onWay.length > 0} nowMs={door.now()} onRefreshed={() => setReload((n) => n + 1)} />
        <h3 className="dk-label">{t("desk.shipments.attention")}</h3>
        <Parts.Attention reloadKey={reload} onOpen={(source) => go("order", { orderId: source.id })} />
      </Suspense>
      <h3 className="dk-label">{t("desk.shipments.unused")}</h3>
      {unused.length === 0 ? <div className="dk-muted">{t("desk.shipments.none")}</div> : <ul className="dk-stack">{unused.map(row)}</ul>}
      <h3 className="dk-label">{t("desk.shipments.onWay")}</h3>
      {onWay.length === 0 ? <div className="dk-muted">{t("desk.shipments.none")}</div> : <ul className="dk-stack">{onWay.map(row)}</ul>}
      <div className="dk-foot">{t("desk.shipments.note")}</div>
    </Card>
  );
}

const FIELDS: { key: Exclude<keyof ShipFromValues, "lines" | "country"> | "line1" | "line2"; label: MessageKey; mono?: boolean }[] = [
  { key: "name", label: "desk.set.shopName" },
  { key: "line1", label: "desk.set.address1" },
  { key: "line2", label: "desk.set.address2" },
  { key: "city", label: "desk.set.city" },
  { key: "region", label: "desk.set.state", mono: true },
  { key: "postcode", label: "desk.set.zip", mono: true },
  { key: "phone", label: "desk.set.phone", mono: true },
  { key: "email", label: "desk.set.email", mono: true },
];

/** Ship from: the shop's own address until the owner saves one. Always the US here (Q17). */
export function ShipFromCard({ settings }: { settings: Row }) {
  const t = useT();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const [state, setState] = useState<{ kind: "loading" } | { kind: "denied" } | { kind: "ready"; status: ShippingStatus }>({ kind: "loading" });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const hasDoor = door.shippingStatus !== undefined && hasCarrier(door.facts().addOns);
  useEffect(() => {
    if (!hasDoor) return;
    let live = true;
    door.shippingStatus!().then(
      (status) => live && setState({ kind: "ready", status }),
      () => live && setState({ kind: "denied" }),
    );
    return () => {
      live = false;
    };
  }, [door, hasDoor]);
  if (!hasDoor || state.kind === "loading") return null;
  if (state.kind === "denied") {
    return (
      <Card id="set-shipfrom" title={t("desk.shipFrom.title")} icon={<MapPin size={18} />}>
        <div className="dk-muted">{t("desk.shipFrom.noRight")}</div>
      </Card>
    );
  }
  const saved = state.status.shipFrom;
  const start: Record<string, string> = {
    name: saved?.name ?? text(settings["shop_name"]) ?? "",
    line1: saved?.lines?.[0] ?? text(settings["address_line1"]) ?? "",
    line2: saved?.lines?.[1] ?? text(settings["address_line2"]) ?? "",
    city: saved?.city ?? text(settings["city"]) ?? "",
    region: saved?.region ?? text(settings["state_code"]) ?? "",
    postcode: saved?.postcode ?? text(settings["zip"]) ?? "",
    phone: saved?.phone ?? text(settings["phone"]) ?? "",
    email: saved?.email ?? text(settings["email"]) ?? "",
  };
  const value = (key: string) => draft[key] ?? start[key] ?? "";
  const carrier = state.status.carriers.find((c) => c.key === state.status.activeCarrier);
  return (
    <Card id="set-shipfrom" title={t("desk.shipFrom.title")} icon={<MapPin size={18} />}>
      <div className="dk-muted">{t("desk.shipFrom.intro")}</div>
      {saved === null && <div className="dk-note">{t("desk.shipFrom.notSaved")}</div>}
      {FIELDS.map((f) => (
        <div key={f.key} className="dk-field">
          <label htmlFor={`sf-${f.key}`}>{t(f.label)}</label>
          <input
            id={`sf-${f.key}`}
            className={`dk-input${f.mono === true ? " dk-input--mono" : ""}`}
            dir={f.mono === true ? "ltr" : undefined}
            value={value(f.key)}
            aria-describedby={f.key === "phone" && value("phone").trim() === "" ? "sf-phone-need" : undefined}
            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
          />
          {f.key === "phone" && value("phone").trim() === "" && (
            <div id="sf-phone-need" className="dk-foot">
              {t("desk.shipFrom.phoneNeeded")}
            </div>
          )}
        </div>
      ))}
      <div className="dk-muted">{t("desk.shipFrom.usOnly")}</div>
      <div className="dk-muted">
        {t("desk.shipFrom.carrier")}: <span className="dk-strong">{carrier?.name ?? t("desk.shipFrom.noCarrier")}</span>
      </div>
      <button
        type="button"
        className="dk-btn dk-btn--primary"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const lines = [value("line1"), value("line2")].map((l) => l.trim()).filter((l) => l !== "");
            const next = await door.saveShipFrom!({ name: value("name").trim(), lines, city: value("city").trim(), region: value("region").trim(), postcode: value("postcode").trim(), country: "US", phone: value("phone").trim(), email: value("email").trim() });
            setState({ kind: "ready", status: next });
            setDraft({});
            return t("desk.shipFrom.saved");
          })
        }
      >
        {t("desk.shipFrom.save")}
      </button>
    </Card>
  );
}
