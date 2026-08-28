/**
 * THIS STOREFRONT'S RECORDS, TURNED INTO SLOT PAYLOADS.
 *
 * ── WHY THE MAPPING LIVES HERE AND NOT IN THE ADD-ON ───────────────────────
 *
 * A slot id names a SURFACE, so its payload has to be a shape every host of
 * that surface can honestly produce. This app has a `CartLineView` — a product,
 * a variant selection, a bundle discount, a personalisation label — and a print
 * works has a job with a grammage and an imposition, and neither vocabulary is
 * the seam's. Something has to convert, and THE HOST IS THE ONLY PARTY THAT
 * CAN: it is the one that knows both its own records and the shape it promised.
 *
 * The alternative is what the delivery add-on used to do in its first host:
 * carry a copy of that shop's size table, its grammages and an address book
 * keyed by its customer keys. Every one of those was a fact about a host held
 * by somebody else's repository, drifting quietly, and missing entirely in any
 * other shop.
 *
 * ── NOTHING HERE NAMES AN ADD-ON, AND NOTHING HERE IS ABOUT ONE ────────────
 *
 * Every function below would be written exactly the same way against a second
 * delivery company, or against none. `src/add-ons/registry.ts` is the only
 * shipped file in this app that names one (24 AC5).
 */

import type {
  CatalogueSample,
  DeliveryChoice,
  Money,
  OutboundOrder,
  PostalAddress as SeamAddress,
  ShopClock,
  SlotItem,
} from "./vendor/host/index.ts";
import type { Order, PostalAddress } from "../data/types.ts";
import type { CartLineView } from "../lib/pricing.ts";
import { normItems } from "../lib/pricing.ts";
import type { Product } from "../data/types.ts";
import { SHIP_FROM } from "../lib/shop.ts";

/**
 * WHAT THE TILL BILLS IN.
 *
 * `lib/format.ts` formats every figure a shopper reads with a hard `"USD"`
 * default, and `computeTotals` adds a delivery fee to a subtotal without ever
 * asking what currency either is in — because for a single-currency shop there
 * is nothing to ask. This constant is that assumption, written down in the one
 * place that hands a foreign number to that arithmetic, so it is a thing a
 * reader can find rather than a thing they have to notice.
 *
 * `add-ons/addOns.test.ts` asserts the quotes this app actually folds are in
 * it. That is the guard, and it is a test rather than a runtime branch on
 * purpose: a mismatch is unreachable with one carrier quoting one currency, and
 * a silent fallback for an unreachable case is a fallback nobody would ever see
 * fire and everybody would trust.
 */
export const SHOP_CURRENCY = "USD";

/**
 * WHEN THIS SHOP THINKS IT IS.
 *
 * ── WHY A PIN AND NOT `new Date()` ─────────────────────────────────────────
 *
 * A delivery estimate is date arithmetic and every one of its answers is
 * relative to today, so a surface that quotes one has to be told what today is.
 * 24 D11: no `Date.now()` and no bare `new Date()` in a demo, because a demo
 * whose dates move is a demo nobody can screenshot or assert — "arrives Friday"
 * is a different sentence every day of the week, and a comparison against a
 * seeded order is a different comparison every morning.
 *
 * THE HOST HAS TO SAY, AND THE ADD-ON MAY NOT ASSUME. The delivery add-on used
 * to hold a pin of its own with a comment saying it was "the same instant the
 * host app is pinned to" — true of the one host it was written against and
 * false the moment it was mounted in a second, where it produced a collection
 * window dated the day BEFORE the shop's today. Nothing threw and nothing was
 * red; it was simply the wrong day. So the clock crosses the seam, and it
 * crosses it from here.
 *
 * TUESDAY, MID-MORNING, and both halves of that are chosen. A WEEKDAY because
 * a carrier does not collect on a Sunday and a Sunday pin would make every
 * screenshot of this demo show a postponed collection, which is the exception
 * rather than the thing worth showing. BEFORE THE CUT-OFF (the add-on's default
 * is 15:00) because the ordinary case is "today's van has not gone yet"; a
 * reader who wants to see the other case moves the cut-off in the settings
 * panel, which is one of the two things that panel is for.
 *
 * It is not on `Shop` and does not come through the `DataSource`. A connected
 * shop's today is a real today and would be read from the scope's timezone —
 * `@adminiumjs/public-client` publishes one for exactly this — which is a
 * change to make when a connected build first mounts a delivery surface, not
 * a fiction to bake into the seed now.
 */
export const SHOP_CLOCK: ShopClock = { iso: "2026-08-18", hour: 11, minute: 40 };

/** Where this shop posts from, in the seam's own shape. */
export function shopOrigin(): SeamAddress {
  return toSeamAddress(SHIP_FROM);
}

/**
 * This app's `PostalAddress` as the seam's.
 *
 * Structurally identical by construction — `data/types.ts` records at length
 * that the shape is borrowed rather than invented so this stays a pass-through
 * — and the only work it does is copy `lines`, because the seam's field is
 * `readonly` and this app's is not. Assigning the app's array directly would
 * compile and would hand an add-on a live reference into the shop's own record.
 */
export function toSeamAddress(address: PostalAddress): SeamAddress {
  return { ...address, lines: [...address.lines] };
}

/**
 * THE COUNTRY THE CHECKOUT ACTUALLY MEANS.
 *
 * ── A DISPLAY STRING WHERE THE SEAM WANTS A CODE ───────────────────────────
 *
 * `Form.country` is not held to `PostalAddress`'s rule. Its picker's OPTION
 * VALUES are ISO codes (`data/…` has none; `screens/Checkout.tsx` lists
 * `US`, `CA`, `GB`, `AU` and renders each through `Intl.DisplayNames`), but the
 * empty form starts it at the literal string `"United States"` — so until a
 * shopper touches the select, the field holds a country's NAME in English.
 *
 * That predates this retrofit and is not repaired by it: changing the default
 * changes what a placed order stores and which option the select shows on a
 * screen nothing here is about. So the conversion is HERE, at the seam, where
 * the code is needed — and it is deliberately conservative. A two-letter value
 * is passed through as a code; anything else falls back to the country the shop
 * posts FROM, which is the overwhelming case for an untouched picker and is a
 * country rather than a guess at an address.
 *
 * WHAT WOULD CHANGE THIS: `Form.country` becoming a code, at which point this
 * function is one line and then none.
 */
export function countryCodeOf(value: string, fallback: string): string {
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : fallback;
}

/**
 * WHERE THE PARCEL IS GOING, or `undefined` because nobody has said yet.
 *
 * ── UNDEFINED IS AN ANSWER, AND IT IS THE ONE THE SEAM ASKS FOR ────────────
 *
 * `CheckoutPayload.destination` is optional precisely for a till, where the
 * address is still being typed. An add-on handed none quotes the shop's own
 * country and says on screen that the estimate is domestic; an add-on handed a
 * half-typed one has no way to know it is half-typed and will quote against it.
 *
 * So the test is the two fields a route cannot be computed without: a town and
 * a postcode. The checkout's own step 1 already refuses to advance without
 * both, which makes this belt-and-braces on the ordinary path and the whole
 * rule on the path where somebody steps BACK to the address and clears one.
 *
 * NOTE WHAT IS NOT CHECKED: whether the postcode is well formed. That is the
 * carrier's question and the carrier answers it — with a refusal, in its own
 * words, quoting the postcode back — and pre-empting it here would replace a
 * real fixable rule with this app's guess at one.
 */
export function checkoutDestination(form: {
  first: string;
  last: string;
  addr: string;
  apt: string;
  city: string;
  zip: string;
  country: string;
}): SeamAddress | undefined {
  if (form.city.trim() === "" || form.zip.trim() === "") return undefined;
  return {
    name: `${form.first} ${form.last}`.trim(),
    lines: [form.addr, form.apt].map((l) => l.trim()).filter((l) => l !== ""),
    city: form.city.trim(),
    postcode: form.zip.trim(),
    country: countryCodeOf(form.country, SHIP_FROM.country),
  };
}

const money = (major: number): Money => ({
  amount: Math.round(major * 100),
  currency: SHOP_CURRENCY,
});

/**
 * ONE BASKET LINE, AS EVERY SLOT READS IT.
 *
 * `label` ARRIVES TRANSLATED, or as translated as this shop's catalogue gets:
 * product titles here are merchant-entered text rather than message keys — a
 * real storefront shows whatever the merchant typed in — so the title IS the
 * label in every language, and an add-on that received `kb-k2` could only print
 * a key at a customer.
 *
 * `unitWeightGrams` and `unitSize` are ABSENT, and the absence is the honest
 * answer rather than a gap. This app's `Product` has a price, a photograph, a
 * spec table of free text and nothing dimensional: `db/schema.sql` has no
 * weight column and no size column, and neither does the seed. A host that
 * invented one — a plausible 250g per thing — would be handing a carrier a
 * number the shop cannot stand behind, and the carrier's own parcel engine
 * already has a documented blanket assumption for exactly this case. Better its
 * stated assumption than our fiction.
 *
 * WHAT WOULD CHANGE THIS: a `weight_grams` column on `products`, at which point
 * two lines here make every quote in the shop sharper.
 */
export function slotItemFor(line: CartLineView): SlotItem {
  return {
    id: line.key,
    key: line.p.id,
    label: line.p.title,
    quantity: line.qty,
    ...(line.customLabel === "" ? {} : { note: line.customLabel }),
    unitPrice: money(line.unit),
  };
}

/** The whole basket, as `checkout.delivery.methods` reads it. */
export function checkoutItems(lines: readonly CartLineView[]): SlotItem[] {
  return lines.map(slotItemFor);
}

/**
 * A PLACED ORDER, as `order.dispatch.panel` reads it.
 *
 * ── WHAT A CONFIRMATION PAGE CAN AND CANNOT SAY ────────────────────────────
 *
 * `ref` is the order number both sides already use, so a shipment booked
 * through an add-on can be found again from this shop's own paperwork. That is
 * the whole point of the field and it is why it is not an internal id.
 *
 * `destination` is present whenever the order carries an address, which after
 * a checkout it always does — this is the one surface in this app where the
 * shop HAS asked. `Order.city` is a single display string holding both the town
 * and the postcode (`"San Francisco, CA 94102"`), which is how this app has
 * always stored it, so it is split on the last space: everything before is the
 * town line, the last token is the postcode. That is a heuristic and it is
 * stated as one — it is right for the two shapes this app produces (the seeded
 * order and `placeOrder`'s `[city, zip].join(", ")`) and it degrades into
 * "postcode empty, town holds the lot", which the carrier refuses out loud
 * rather than posting somewhere wrong.
 */
export function outboundOrderFor(
  order: Order,
  index: Record<string, Product>,
  total: number,
): OutboundOrder {
  const items: SlotItem[] = normItems(order.items, index).map((it, i) => ({
    id: `${order.number}-${String(i)}`,
    key: it.pid,
    label: index[it.pid]?.title ?? it.pid,
    quantity: it.qty,
    ...(it.customLabel === "" ? {} : { note: it.customLabel }),
    unitPrice: money(it.unit),
  }));

  const destination = orderDestination(order);
  return {
    ref: order.number,
    recipient: { name: order.name ?? "" },
    items,
    origin: shopOrigin(),
    ...(destination === undefined ? {} : { destination }),
    value: money(total),
  };
}

/** The address a placed order carries, or nothing when it carries none. */
export function orderDestination(order: Order): SeamAddress | undefined {
  const cityLine = (order.city ?? "").trim();
  if (cityLine === "") return undefined;
  const cut = cityLine.lastIndexOf(" ");
  const city = cut === -1 ? cityLine : cityLine.slice(0, cut).replace(/,\s*$/, "");
  const postcode = cut === -1 ? "" : cityLine.slice(cut + 1);
  return {
    name: order.name ?? "",
    lines: (order.addr ?? "") === "" ? [] : [order.addr as string],
    city,
    postcode,
    country: countryCodeOf(order.country ?? "", SHIP_FROM.country),
  };
}

/**
 * A CARRIER'S QUOTE, IN THE UNITS THIS APP'S ARITHMETIC USES.
 *
 * ── THE TWO SHAPES IN ONE SEAM THAT DISAGREE ABOUT UNITS ───────────────────
 *
 * `DeliveryChoice.amount` IS ALREADY IN MAJOR UNITS, and this function exists
 * as much to say so as to convert anything. It is not the obvious answer, and
 * the first version of this file got it wrong:
 *
 *   `Money.amount` in `vendor/host/payloads.ts` is MINOR units, documented at
 *   length — "the smallest unit of `currency` — cents, pence, yen" — with the
 *   reason every till learns once, that `0.1 + 0.2` is not `0.3`.
 *
 *   `DeliveryChoice.amount` in `vendor/host/delivery.ts` is a bare
 *   `amount: number` with NO unit comment at all, and the delivery add-on
 *   quotes it in major units: its rate engine computes whole cents and divides
 *   by 100 on the way out, and its own formatter takes a major figure.
 *
 * So the two money-shaped fields of one seam mean different things, and only
 * one of them says which. Reading across from the documented sibling — which
 * is what a careful person does — produces a delivery line reading $0.10
 * against a rate row reading $9.98, on the same screen, in the same render.
 * That was measured in a browser, not imagined, and it is the reason this
 * function returns the field untouched and this comment is the length it is.
 *
 * `null` for a currency this shop does not bill in, because folding it into a
 * total would be adding two different kinds of number together and the result
 * would look completely ordinary. It is unreachable with one carrier quoting
 * one currency — `addOns.test.ts` asserts that — and it is written down anyway,
 * because the day a second one arrives is the day nobody re-reads this file.
 */
export function carrierFeeMajor(choice: DeliveryChoice | null): number | null {
  if (choice === null || choice.currency !== SHOP_CURRENCY) return null;
  return choice.amount;
}

/**
 * ONE REPRESENTATIVE RECORD PER CATEGORY, for `settings.add-on.panel`.
 *
 * ── WHAT THIS IS FOR, AND WHY IT IS REQUIRED ───────────────────────────────
 *
 * It is the shop's own catalogue, narrowed and labelled — knowledge the host
 * has and no add-on does. An add-on with an opinion about what the shop sells
 * forms it with its own engine from these rows; an add-on with none ignores the
 * field. THE HOST DOES NOT COMPUTE A PARCEL: it says what one of a thing is,
 * which it knows, and the add-on says what a box of them weighs, which it
 * knows.
 *
 * `SettingsPanelPayload.samples` is REQUIRED and its own comment records why an
 * optional field would have been the easier and worse choice: every host has a
 * catalogue, so "I have nothing to sample" is not an honest state — and the
 * second host to mount that slot passed `{ patch }` alone, `tsc` was happy, and
 * the carrier's settings form threw on `.map`.
 *
 * ONE ROW PER CATEGORY rather than per product, because a settings panel
 * listing every product would be a catalogue, and the point of the row is the
 * shape of the thing rather than its name. The quantity is 1 because this shop
 * sells single items to individuals — a works that sells 500 business cards at
 * a time passes 500 here, and the difference is the difference between the two
 * shops rather than a default.
 */
export function sampleCatalogue(products: readonly Product[]): CatalogueSample[] {
  const seen = new Set<string>();
  const rows: CatalogueSample[] = [];
  for (const product of products) {
    if (seen.has(product.cat)) continue;
    seen.add(product.cat);
    rows.push({
      key: product.cat === "" ? product.id : product.cat,
      label: product.title,
      quantity: 1,
      unitPrice: money(product.price),
    });
  }
  return rows;
}
