/**
 * DHL's own dispatch flow on the desk: its `order.dispatch.actions` fill (the
 * parcel, its rates, booking the collection, the label), handed the order as
 * the shop keeps it and the service the customer chose, so it opens with
 * that service picked (the service's `dhl_product`).
 *
 * WHERE IT COMES FROM is the door's (`DeskDoor.addOnRegistry`): the add-on's
 * client half as Adminium serves it for this app (`add-ons/connected.ts`).
 * Nothing of it loads without DHL attached: the registry is asked for the
 * first time a screen needs it.
 *
 * THE BOOKING COMES BACK (CR-DHL-2, `onBooked`). A real number is kept with
 * the order's Shipped move, in one write. A demo booking (this round's only
 * kind, C4) belongs to no parcel: it is shown, marked as the demo, and never
 * stored or mailed; the order stays Packed until someone types the real one.
 */
import { useEffect, useState } from "react";

import type { AddOnRegistry } from "../add-ons/host.ts";
import type { DispatchPayload, OutboundOrder, ShopClock } from "../add-ons/payloads.ts";
import type { DispatchBooking } from "../add-ons/vendor/host/payloads.ts";
import type { DeskData, DeskDoor } from "./door.ts";
import { useData, useEnv } from "./env.tsx";
import { DHL, linesOf, serviceOf } from "./facts.ts";
import { dayIn } from "./time.ts";
import { num, text, type Row } from "./wire.ts";

/** The shop's own address, as its settings keep it: where a parcel goes from. */
export function shopAddress(settings: Row | null): OutboundOrder["origin"] {
  return {
    name: text(settings?.["shop_name"]) ?? "",
    lines: [text(settings?.["address_line1"]), text(settings?.["address_line2"])].filter((l): l is string => l !== null),
    city: text(settings?.["city"]) ?? "",
    postcode: text(settings?.["zip"]) ?? "",
    country: "US",
    ...(text(settings?.["state_code"]) === null ? {} : { region: text(settings?.["state_code"])! }),
  } as OutboundOrder["origin"];
}

/** An order as a delivery company's dispatch flow reads it: every figure a stored column, only reshaped. */
export function outboundOrder(data: DeskData, order: Row, currency: string): OutboundOrder {
  const total = num(order["total"]);
  const weight = num(order["weight_g"]);
  const line1 = text(order["address_line1"]);
  const promised = text(order["ships_by"]);
  return {
    ref: text(order["number"]) ?? String(order.id),
    recipient: { name: text(order["ship_name"]) ?? text(order["name"]) ?? "", key: String(order["customer_id"] ?? order.id) },
    items: linesOf(data, order).map((line) => {
      const grams = num(line["weight_g"]);
      return {
        id: String(line.id),
        key: String(line["variant_id"] ?? line.id),
        label: [text(line["product_name"]), text(line["variant_label"])].filter((x) => x !== null).join(" · "),
        quantity: num(line["qty"]) ?? 1,
        ...(grams === null ? {} : { unitWeightGrams: grams }),
      };
    }),
    origin: shopAddress(data.settings),
    ...(line1 === null
      ? {}
      : {
          destination: {
            name: text(order["ship_name"]) ?? text(order["name"]) ?? "",
            lines: [line1, text(order["address_line2"])].filter((l): l is string => l !== null),
            city: text(order["city"]) ?? "",
            postcode: text(order["zip"]) ?? "",
            country: "US",
            ...(text(order["state_code"]) === null ? {} : { region: text(order["state_code"])! }),
          } as OutboundOrder["origin"],
        }),
    ...(promised === null ? {} : { promisedFor: promised.slice(0, 10) }),
    // What it is worth only where this person reads the money (never the packer).
    ...(total === null ? {} : { value: { amount: Math.round(total * 100), currency } }),
    ...(weight === null ? {} : { parcelWeightGrams: weight }),
  };
}

export function shopClock(now: number, zone: string): ShopClock {
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone }).formatToParts(new Date(now));
  const part = (type: string) => Number(time.find((p) => p.type === type)?.value ?? "0");
  return { iso: dayIn(now, zone), hour: part("hour") % 24, minute: part("minute") };
}

export function dispatchPayload(data: DeskData, order: Row, input: { currency: string; zone: string; now: number; onBooked: (b: DispatchBooking) => void }): Omit<DispatchPayload, "settings"> {
  const code = text(serviceOf(data, order)?.["dhl_product"]);
  return { order: outboundOrder(data, order, input.currency), now: shopClock(input.now, input.zone), chosen: code === null ? null : { addOn: DHL, code }, onBooked: input.onBooked };
}

const loaded = new WeakMap<DeskDoor, AddOnRegistry>();

/** The door's add-on registry once it is loaded; null until then, and never asked when `wanted` is false. */
export function useRegistry(wanted: boolean): AddOnRegistry | null {
  const { door } = useEnv();
  const [registry, setRegistry] = useState<AddOnRegistry | null>(loaded.get(door) ?? null);
  useEffect(() => {
    if (!wanted || registry !== null) return;
    let live = true;
    void door.addOnRegistry().then((r) => {
      loaded.set(door, r);
      if (live) setRegistry(r);
    });
    return () => {
      live = false;
    };
  }, [wanted, registry, door]);
  return wanted ? registry : null;
}

/** DHL's dispatch flow for one order; `fallback` while it loads, or when nothing fills the slot. */
export function DispatchFill({ order, onBooked, fallback }: { order: Row; onBooked: (b: DispatchBooking) => void; fallback: React.ReactNode }) {
  const data = useData();
  const { door } = useEnv();
  const facts = door.facts();
  const on = facts.addOns.includes(DHL);
  const registry = useRegistry(on);
  if (!on || registry === null) return <>{fallback}</>;
  const fills = registry.fillsFor("order.dispatch.actions", new Set(facts.addOns));
  if (fills.length === 0) return <>{fallback}</>;
  const payload = dispatchPayload(data, order, { currency: facts.currency, zone: facts.zone, now: door.now(), onBooked });
  return (
    <div className="dk-fill" data-add-on-slot="order.dispatch.actions">
      {fills.map((entry) => {
        const settings = facts.addOnSettings[entry.addOn] ?? {};
        registry.byKey(entry.addOn)?.applySettings?.(settings);
        return <div key={entry.addOn}>{entry.fill.render({ ...payload, settings })}</div>;
      })}
    </div>
  );
}
