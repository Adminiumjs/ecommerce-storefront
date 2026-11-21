/**
 * The shop's tables, as the manifest asks Adminium to make them.
 *
 * Every figure a shopper or the desk reads is decided here, by Adminium,
 * never by a page:
 *
 *   - a variant is one size and colour of a product that is made, with its
 *     own SKU; its price is the product's price plus its own difference, which
 *     only ever adds; its colour and size are rows of that product's own,
 *     held to it (`linkable.same`);
 *   - an order line names a variant still on sale and copies its price, SKU,
 *     names and weight when the order is written; the order adds its lines,
 *     takes off what Offers & gift cards decides, and adds the delivery price
 *     of the service and zone the shopper picked (nothing from its "free
 *     from" figure up) and the tax of the state it ships to, worked out once,
 *     on the goods after reductions, never on delivery;
 *   - an order's number runs without gaps, `NL-1001` and on, from the
 *     settings' first number and prefix;
 *   - an order paid online waits for its payment for a few minutes and is
 *     cancelled when it never comes; an order to be paid by bank transfer
 *     waits so many shipping days; a paid order ships by a date worked out
 *     from when it was paid, the cut-off and the shop's closures, and its
 *     stock stays held for 45 days from placing;
 *   - a return takes back no more than was bought less what other returns
 *     still hold, and its refund is what the customer paid for those pieces.
 *
 * Stock, codes and gift cards are the add-ons' (Inventory, Offers & gift
 * cards): the tables say what they hand each one, and when.
 */
import { l, type Labels } from "./labels.ts";
import { KIND_NAMES } from "./outbox.ts";
import { CUTOFF, SHIP_DAYS } from "./settings.ts";

type Tone = "pos" | "warn" | "danger" | "info" | "neutral" | "accent";

export interface Column {
  ref: string;
  type: "int" | "text" | "decimal" | "money" | "bool" | "enum" | "date" | "timestamptz" | "fk" | "json";
  role?: "pk" | "created_at";
  semantic?: "name" | "email" | "image" | "money";
  nullable?: true;
  enum?: string[];
  references?: string;
  default?: string | number | boolean;
  maxLength?: number;
  unique?: true;
  index?: true;
  scale?: number | "currency";
  rules?: Record<string, unknown>;
  label?: Labels | Record<string, string>;
}

export interface Table {
  ref: string;
  label: Labels | Record<string, string>;
  labelPlural: Labels | Record<string, string>;
  keyField?: string;
  unique?: string[][];
  states?: Record<string, unknown>;
  adjust?: Record<string, unknown>;
  postings?: Record<string, unknown>[];
  review?: Record<string, unknown>;
  keep?: { law: "tax" | "health" | "contract" | "safety" };
  columns: Column[];
}

/** The record of a sale and its money, kept for the tax years whoever asks to be forgotten. */
const KEPT_FOR_TAX = { law: "tax" } as const;

// ── column makers ───────────────────────────────────────────────────────────

const id: Column = { ref: "id", type: "int", role: "pk" };
const opt = { nullable: true } as const;

function text(ref: string, maxLength: number, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "text", maxLength, label: l(label), ...more };
}
function int(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "int", label: l(label), ...more };
}
function bool(ref: string, label: string, value: boolean): Column {
  return { ref, type: "bool", default: value, label: l(label) };
}
function fk(ref: string, references: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "fk", references, label: l(label), ...more };
}
function date(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "date", label: l(label), ...more };
}
function at(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "timestamptz", label: l(label), ...more };
}
/** A price somebody types: the shop's, in the connection's currency. */
function price(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "decimal", scale: "currency", label: l(label), ...more };
}
/** Money Adminium works out: empty until it has what it needs. */
function money(ref: string, label: string, rules: Record<string, unknown>): Column {
  return { ref, type: "decimal", scale: "currency", nullable: true, label: l(label), rules };
}
/** Money somebody else decides (an add-on's answer, a payment), or nobody has yet. */
function amount(ref: string, label: string): Column {
  return { ref, type: "decimal", scale: "currency", nullable: true, label: l(label) };
}
/** A whole number Adminium works out. */
function figure(ref: string, label: string, rules: Record<string, unknown>): Column {
  return { ref, type: "int", nullable: true, label: l(label), rules };
}
/** A text Adminium copies or works out. */
function copied(ref: string, maxLength: number, label: string, rules: Record<string, unknown>): Column {
  return { ref, type: "text", maxLength, nullable: true, label: l(label), rules };
}
/** A json column the shop types: a list a page draws. */
function json(ref: string, label: string): Column {
  return { ref, type: "json", nullable: true, label: l(label) };
}
/** An enum, each value labelled, with tones where a list shows it as a chip. */
function choice(
  ref: string,
  label: string,
  values: Record<string, string>,
  more: Partial<Column> & { tones?: Record<string, Tone> } = {},
): Column {
  const { tones, rules, ...rest } = more;
  return {
    ref,
    type: "enum",
    enum: Object.keys(values),
    label: l(label),
    ...rest,
    rules: {
      ...rules,
      enumLabels: {
        labels: Object.fromEntries(Object.entries(values).map(([value, word]) => [value, l(word)])),
        ...(tones === undefined ? {} : { tones }),
      },
    },
  };
}
/** A row of an add-on's table, by its key. No database link: the add-on may be away, and its table with it. */
function link(ref: string, addOn: string, table: string, label: string, rules: Record<string, unknown> = {}): Column {
  return { ref, type: "int", nullable: true, label: l(label), rules: { addOnLink: { addOn, table }, ...rules } };
}
/** A picture somebody uploads for the row, shown on the shop where an entry says so. */
function picture(ref: string, label: string): Column {
  return { ref, type: "text", maxLength: 64, nullable: true, semantic: "image", label: l(label), rules: { file: { accept: ["png", "jpeg", "webp"], maxBytes: 5242880 }, personal: false } };
}
/** A copy kept with the row it is made from: written when the link is set, and again when the linked row changes. */
const follow = (via: string, from: string) => ({ copy: { via, from, mode: "always", follow: true } });
/** A copy taken once, when the link is set, and kept as it was: what an order was sold at. */
const frozen = (via: string, from: string) => ({ copy: { via, from, mode: "always" } });
const stamp = (set: unknown, on: unknown) => ({ stamp: { set, on } });
const onCreate = "create";
const onState = (column: string, ...values: string[]) => ({ column, values });
export const setting = (column: string) => ({ table: "settings", column });
const CLOSURES = { table: "closures", from: "from_date", to: "to_date", active: "active" };
const shipDays = (from: string, days: string | number) => ({ addWorkingDays: { from, days, weekdays: SHIP_DAYS, cutoff: CUTOFF, closures: CLOSURES } });
const c0 = (column: string) => ({ coalesce: [column, 0] });

// ── the words the tables share ──────────────────────────────────────────────

/** The eight languages an order or a request may be written in, by their own names. */
export const LANGUAGES: Record<string, string> = {
  "en-US": "English",
  "de-DE": "Deutsch",
  "fr-FR": "Français",
  "da-DK": "Dansk",
  "cs-CZ": "Čeština",
  "ar-EG": "العربية",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
};

/** A language column: the e-mails read their language from it. */
function language(ref: string, more: Record<string, unknown> = {}): Column {
  return {
    ref,
    type: "text",
    maxLength: 16,
    nullable: true,
    label: l("Language"),
    rules: { options: { values: Object.entries(LANGUAGES).map(([value, label]) => ({ value, label })) }, ...more },
  };
}

/** Where an order is. A gift-cards-only order is `sent` once paid: there is nothing to pack. */
export const ORDER_STATES: Record<string, string> = {
  paying: "Being paid",
  awaiting_transfer: "Waiting for a bank transfer",
  paid: "Paid",
  packed: "Packed",
  shipped: "Shipped",
  sent: "Sent",
  cancelled: "Cancelled",
};

/** The orders a code's "first order" and the customer's own counts read: every one that was paid. */
export const COUNTED = ["paid", "packed", "shipped", "sent"];

/** Every way an order ends cancelled: the customer, the shop, or the clock when it was never paid. */
export const CANCEL_REASONS: Record<string, string> = {
  customer: "The customer cancelled",
  unpaid: "Not paid in time",
  address: "The address can't be delivered to",
  stock: "We can't send it",
  asked: "The customer asked us",
  other: "Another reason",
};
/** The reasons the desk picks from: the customer's own and the clock's are written by them alone. */
export const SHOP_CANCEL_REASONS = ["address", "stock", "asked", "other"];

/** Why something comes back: the customer picks one. */
export const RETURN_REASONS: Record<string, string> = {
  fit: "Doesn't fit",
  expected: "Not what I expected",
  faulty: "Faulty",
  mind: "Changed my mind",
  other: "Something else",
};

export const RETURN_STATES: Record<string, string> = {
  asked: "Asked",
  approved: "Approved",
  declined: "Declined",
  received: "Received",
  refunded: "Refunded",
};

/** What the desk says when it declines a return: the customer reads it. */
export const CATEGORY_ICONS = ["backpack", "shirt", "footprints", "tent", "mountain", "compass", "flame", "sun"];

/** The outbox's kinds, as the E-mails page names them: `outbox.ts` says what sends each. */
export const EMAIL_KINDS: Record<string, string> = KIND_NAMES;

// ── the tables ──────────────────────────────────────────────────────────────

export const TABLES: Table[] = [
  {
    ref: "settings",
    label: l("Shop settings"),
    labelPlural: l("Shop settings"),
    keyField: "shop_name",
    columns: [
      id,
      text("shop_name", 80, "Shop name"),
      // Where the desk's own e-mails go: a new order, a return asked, a message. Without one, none is sent.
      text("email", 254, "Shop e-mail", { semantic: "email", rules: { personal: false, normalize: "email", validation: { format: "email" } } }),
      text("phone", 32, "Phone", { ...opt, rules: { personal: false, validation: { format: "phone" } } }),
      // The shop's own address: where returns come back to, and what a packing slip and DHL print as the sender.
      text("address_line1", 120, "Address", { rules: { personal: false } }),
      text("address_line2", 120, "Address, second line", { ...opt, rules: { personal: false } }),
      text("city", 80, "City", { rules: { personal: false } }),
      text("state_code", 2, "State", { rules: { personal: false } }),
      text("zip", 10, "ZIP code", { rules: { personal: false } }),
      // The order number: the prefix and the first number. A change applies to the next order.
      text("ref_prefix", 8, "Order number prefix", { default: "NL-" }),
      int("first_number", "First order number", { default: 1001, rules: { validation: { min: 1 } } }),
      // A return's number runs on its own series, RT-1001 and on: from this number, the next return after a change.
      int("first_return_number", "First return number", { default: 1001, rules: { validation: { min: 1 } } }),
      // Taking orders at all: off, the shop shows its pages and takes no order.
      bool("taking_orders", "Taking orders", true),
      // Paying online: how long an order waits for its payment, its stock held.
      int("pay_hold_minutes", "Minutes an order waits for its payment", { default: 30, rules: { validation: { min: 5, max: 120 } } }),
      // Paying by bank transfer, only while the shop takes no payments online.
      bool("transfer_on", "Take bank transfers", true),
      text("transfer_name", 80, "Account name", { ...opt, rules: { personal: false } }),
      text("transfer_bank", 80, "Bank", { ...opt, rules: { personal: false } }),
      text("transfer_routing", 16, "Routing number", { ...opt, rules: { personal: false } }),
      text("transfer_account", 24, "Account number", { ...opt, rules: { personal: false } }),
      // The bank details as one text, what a transfer order is given to pay into: worked out, never typed twice.
      copied("transfer_details", 400, "Bank details", { formula: { join: ["transfer_name", "\n", "transfer_bank", "\n", "transfer_routing", "\n", "transfer_account"] } }),
      int("transfer_days", "Shipping days to pay a bank transfer", { default: 5, rules: { validation: { min: 1, max: 20 } } }),
      // Returns: how long after shipping, and whether a faulty item's shipping comes back too.
      int("return_days", "Days to send something back", { default: 30, rules: { validation: { min: 0, max: 365 } } }),
      bool("refund_shipping_faulty", "Refund the shipping on a faulty item", true),
      // How many pieces one order may hold, every line together.
      int("max_pieces", "Pieces an order may hold", { default: 20, rules: { validation: { min: 1, max: 200 } } }),
      // The shop's own words: the three promises under the home page's hero, and its pages.
      text("promise_1", 80, "Promise 1", opt),
      text("promise_2", 80, "Promise 2", opt),
      text("promise_3", 80, "Promise 3", opt),
      text("about", 1000, "About us", opt),
      { ref: "privacy", type: "text", nullable: true, label: l("Privacy") },
      { ref: "terms", type: "text", nullable: true, label: l("Terms") },
      // The shop's own page on a review site, offered to every customer who wrote a review.
      text("review_link", 400, "Review us elsewhere (link)", { ...opt, rules: { personal: false, validation: { format: "url" } } }),
    ],
  },
  {
    ref: "categories",
    label: l("Category"),
    labelPlural: l("Categories"),
    keyField: "name",
    columns: [
      id,
      text("name", 60, "Name"),
      text("slug", 60, "Web address", { unique: true, rules: { normalize: "trim" } }),
      choice("icon", "Icon", Object.fromEntries(CATEGORY_ICONS.map((icon) => [icon, icon[0]!.toUpperCase() + icon.slice(1)])), { default: "mountain" }),
      int("position", "Position", { default: 0 }),
      figure("products_count", "Products on sale", { rollup: { from: "products", via: "category_id", count: true, where: { column: "status", eq: "active" } } }),
    ],
  },
  {
    ref: "size_guides",
    label: l("Size guide"),
    labelPlural: l("Size guides"),
    keyField: "name",
    columns: [
      id,
      text("name", 60, "Name"),
      // The guide's table: its column heads and its rows, as the product page draws it.
      json("columns_json", "Columns"),
      json("rows_json", "Rows"),
      text("note", 280, "Note", opt),
    ],
  },
  {
    ref: "products",
    label: l("Product"),
    labelPlural: l("Products"),
    keyField: "name",
    states: {
      column: "status",
      initial: "draft",
      moves: { draft: ["active", "archived"], active: ["archived", "draft"], archived: ["active", "draft"] },
    },
    columns: [
      id,
      text("name", 80, "Name"),
      text("slug", 80, "Web address", { unique: true, rules: { normalize: "trim" } }),
      fk("category_id", "categories", "Category", { index: true }),
      // The category's name with the product, so a search for "packs" finds them.
      copied("category_name", 60, "Category name", follow("category_id", "name")),
      price("price", "Price", { rules: { validation: { min: 0 } } }),
      text("blurb", 160, "In a line"),
      text("description", 1000, "Description", opt),
      // Specs, as the product page lists them: [{label, value}].
      json("specs", "Specs"),
      fk("size_guide_id", "size_guides", "Size guide", opt),
      // What the size picker calls its sizes ("Size", "US size", "Waist", "Length").
      text("size_name", 24, "Sizes are called", { default: "Size" }),
      bool("featured", "Featured", false),
      // Shown as new until this day.
      date("new_until", "New until", opt),
      choice("status", "Status", { draft: "Draft", active: "On sale", archived: "Archived" }, {
        default: "draft",
        tones: { draft: "neutral", active: "pos", archived: "warn" },
      }),
      int("position", "Position", { default: 0 }),
      // Never empty: the shop sorts by it ("Newest").
      at("created_at", "Added", { rules: stamp("now", onCreate) }),
      figure("variants_count", "Variants", { rollup: { from: "variants", via: "product_id", count: true } }),
    ],
  },
  {
    ref: "option_values",
    label: l("Colour or size"),
    labelPlural: l("Colours and sizes"),
    keyField: "label",
    unique: [["product_id", "kind", "code"]],
    columns: [
      id,
      fk("product_id", "products", "Product"),
      choice("kind", "Kind", { colour: "Colour", size: "Size" }),
      // Lower case, as a filter sends it: "slate", "m", "us-9".
      text("code", 24, "Code", { rules: { normalize: "trim" } }),
      text("label", 40, "Name"),
      // A colour's swatch, "#4b5563".
      text("hex", 7, "Swatch", opt),
      int("position", "Position", { default: 0 }),
      copied("product_status", 16, "Product status", follow("product_id", "status")),
    ],
  },
  {
    ref: "product_pictures",
    label: l("Product picture"),
    labelPlural: l("Product pictures"),
    keyField: "alt",
    columns: [
      id,
      fk("product_id", "products", "Product"),
      // A colour's own pictures; none, the product's.
      fk("colour_id", "option_values", "Colour", {
        ...opt,
        rules: { linkable: { where: [{ column: "kind", eq: "colour" }], same: [{ column: "product_id", as: "product_id" }] } },
      }),
      picture("picture", "Picture"),
      text("alt", 140, "What it shows"),
      int("position", "Position", { default: 0 }),
      copied("product_status", 16, "Product status", follow("product_id", "status")),
    ],
  },
  {
    ref: "variants",
    label: l("Variant"),
    labelPlural: l("Variants"),
    keyField: "sku",
    columns: [
      id,
      fk("product_id", "products", "Product", { index: true }),
      fk("colour_id", "option_values", "Colour", {
        ...opt,
        rules: { linkable: { where: [{ column: "kind", eq: "colour" }], same: [{ column: "product_id", as: "product_id" }] } },
      }),
      fk("size_id", "option_values", "Size", {
        ...opt,
        rules: { linkable: { where: [{ column: "kind", eq: "size" }], same: [{ column: "product_id", as: "product_id" }] } },
      }),
      // The codes, kept on the variant so the shop filters products by a colour and a size in one step.
      copied("colour_code", 24, "Colour code", follow("colour_id", "code")),
      copied("size_code", 24, "Size code", follow("size_id", "code")),
      copied("colour_label", 40, "Colour", follow("colour_id", "label")),
      copied("size_label", 40, "Size", follow("size_id", "label")),
      // One row per product, colour and size: a second one is refused, a one-size or colourless one included.
      copied("product_slug", 80, "Product web address", follow("product_id", "slug")),
      { ...copied("combo", 140, "Combination", {}), unique: true, rules: { formula: { join: ["product_slug", "/", "colour_code", "/", "size_code"] } } },
      // The truth for a SKU everywhere: labels, packing slips, Inventory's item.
      text("sku", 40, "SKU", { unique: true, rules: { normalize: "trim" } }),
      price("price_delta", "Price difference", { ...opt, rules: { validation: { min: 0 } } }),
      money("base_price", "Product price", follow("product_id", "price")),
      money("price", "Price", { formula: { add: ["base_price", c0("price_delta")] } }),
      int("weight_g", "Weight (g)", { ...opt, rules: { validation: { min: 0 } } }),
      bool("active", "On sale", true),
      // Stops it selling whatever the stock says: the shop's own switch, with Inventory or without.
      bool("sold_out", "Sold out", false),
      fk("category_id", "categories", "Category", { ...opt, rules: follow("product_id", "category_id") }),
      copied("product_name", 80, "Product name", follow("product_id", "name")),
      copied("product_status", 16, "Product status", follow("product_id", "status")),
      // What Inventory calls the item it makes for the variant.
      // (In steps: a join keeps the words between two parts only while both are there, so an empty size would take
      // both its " · " with it and run the colour into the SKU.)
      copied("stock_label", 90, "Colour and size", { formula: { join: ["colour_label", " · ", "size_label"] } }),
      copied("stock_head", 180, "Product, colour and size", { formula: { join: ["product_name", " · ", "stock_label"] } }),
      copied("stock_name", 200, "Stock item name", { formula: { join: ["stock_head", " · ", "sku"] } }),
    ],
    postings: [
      // With Inventory on, a new variant gets a stock item of its own, linked to it: its stock is counted from then.
      { id: "item", into: { addOn: "inventory", ledger: "stock", action: "adopt" }, needs: "stock", post: { on: { create: true } }, map: { what: { row: true }, name: "stock_name" } },
    ],
  },
  {
    ref: "zones",
    label: l("Shipping zone"),
    labelPlural: l("Shipping zones"),
    keyField: "label",
    columns: [id, text("code", 24, "Code", { unique: true }), text("label", 60, "Name")],
  },
  {
    ref: "regions",
    label: l("State"),
    labelPlural: l("States"),
    keyField: "name",
    columns: [
      id,
      text("code", 2, "Code", { unique: true }),
      text("name", 40, "Name"),
      fk("zone_id", "zones", "Shipping zone"),
      // Sales tax the shop collects for an order shipped there, in percent: 6.5 for 6.5 %.
      { ref: "tax_rate", type: "decimal", scale: 3, default: 0, label: l("Sales tax (%)"), rules: { validation: { min: 0, max: 20 } } },
      bool("active", "Shipped to", true),
    ],
  },
  {
    ref: "shipping_services",
    label: l("Shipping service"),
    labelPlural: l("Shipping services"),
    keyField: "label",
    columns: [
      id,
      text("code", 24, "Code", { unique: true }),
      text("label", 40, "Name"),
      // Shipping days on the road, the fewest and the most.
      int("transit_min", "Days on the way, at least", { default: 3, rules: { validation: { min: 0, max: 30 } } }),
      int("transit_max", "Days on the way, at most", { default: 5, rules: { validation: { min: 0, max: 30 } } }),
      // DHL's own product for the service, when DHL books the parcel.
      text("dhl_product", 16, "DHL product", opt),
      bool("active", "Offered", true),
      int("position", "Position", { default: 0 }),
    ],
  },
  {
    ref: "shipping_offers",
    label: l("Shipping price"),
    labelPlural: l("Shipping prices"),
    keyField: "label",
    unique: [["service_id", "zone_id"]],
    columns: [
      id,
      fk("service_id", "shipping_services", "Service"),
      fk("zone_id", "zones", "Zone"),
      price("price", "Price", { rules: { validation: { min: 0 } } }),
      // Free from this much in goods after reductions. Empty: never free.
      price("free_from", "Free from", { ...opt, rules: { validation: { min: 0 } } }),
      bool("active", "Offered", true),
      copied("service_label", 40, "Service name", follow("service_id", "label")),
      copied("zone_label", 60, "Zone name", follow("zone_id", "label")),
      copied("label", 110, "Name", { formula: { join: ["service_label", " · ", "zone_label"] } }),
      figure("transit_min", "Days on the way, at least", follow("service_id", "transit_min")),
      figure("transit_max", "Days on the way, at most", follow("service_id", "transit_max")),
    ],
  },
  {
    ref: "closures",
    label: l("Closure"),
    labelPlural: l("Closures"),
    keyField: "reason",
    columns: [
      id,
      date("from_date", "From"),
      date("to_date", "To"),
      text("reason", 120, "Reason", opt),
      bool("active", "In effect", true),
    ],
  },
  {
    ref: "gift_amounts",
    label: l("Gift card amount"),
    labelPlural: l("Gift card amounts"),
    keyField: "amount",
    columns: [
      id,
      price("amount", "Amount", { rules: { validation: { min: 1, max: 1000 } } }),
      bool("active", "Offered", true),
      int("position", "Position", { default: 0 }),
    ],
  },
  {
    ref: "customers",
    label: l("Customer"),
    labelPlural: l("Customers"),
    keyField: "email",
    columns: [
      id,
      text("email", 254, "E-mail", { ...opt, unique: true, semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      text("name", 80, "Name", { ...opt, semantic: "name" }),
      language("language"),
      // News e-mails: yes only by a tick, kept in step with Adminium's consent log.
      bool("news", "News e-mails", false),
      at("news_since", "News since", { ...opt, rules: stamp("now", { column: "news", values: [true] }) }),
      at("forgotten_at", "Details deleted", opt),
      at("created_at", "First seen", { ...opt, rules: stamp("now", onCreate) }),
      figure("orders_count", "Orders", { rollup: { from: "orders", via: "customer_id", count: true } }),
    ],
  },
  {
    ref: "orders",
    keep: KEPT_FOR_TAX,
    label: l("Order"),
    labelPlural: l("Orders"),
    keyField: "number",
    // Offers & gift cards works out what a code or an offer takes off, inside the save.
    adjust: {
      by: { addOn: "offers" },
      needs: "codes",
      lines: [
        {
          table: "order_lines",
          via: "order_id",
          price: "each",
          quantity: "qty",
          discount: "discount",
          what: [
            { column: "product_id", as: "item" },
            { column: "category_id", as: "category" },
          ],
        },
      ],
      order: {
        discount: "discount",
        // Who is buying: a signed-in customer only. Every paid order counts, a gift-cards-only one too.
        customer: { link: "customer_id", address: "email", proved: "customer_proved", counts: { column: "status", in: COUNTED } },
      },
      codes: { table: "order_codes", via: "order_id", typed: "typed", code: "code_id", voucher: "voucher_id", removed: "removed_at" },
      uses: "uses",
      frozen: { to: ["packed", "shipped", "sent", "cancelled"] },
      expect: "total",
    },
    postings: [
      // A code's use is taken when the order is written and given back on every way to cancelled, the clock's included.
      { id: "uses", into: { addOn: "offers", ledger: "value", action: "redeem" }, needs: "codes", post: { on: { create: true } }, reverse: { on: { to: ["cancelled"] } }, map: {} },
    ],
    states: {
      column: "status",
      initial: "paying",
      starts: ["awaiting_transfer"],
      strict: true,
      moves: {
        // The payment makes it paid; a gift card that covered it all does, through the order's own link.
        // Before its deadline nobody cancels an order being paid: the clock does, at the deadline.
        paying: [
          { to: "paid", requires: { where: [{ column: "due", lte: 0 }] } },
          { to: "cancelled", requires: { time: { after: { column: "pay_by" } } } },
        ],
        // A transfer recorded by the owner makes it paid; the customer or the shop may cancel it while it waits.
        awaiting_transfer: [{ to: "paid", requires: { where: [{ column: "due", lte: 0 }] } }, cancel()],
        paid: [
          { to: "packed", requires: { where: [{ column: "kind", eq: "goods" }] } },
          // A gift-cards-only order has nothing to pack: Adminium sends it once it is paid.
          { to: "sent", requires: { where: [{ column: "kind", eq: "gift" }] } },
          cancel(),
        ],
        packed: [
          { to: "shipped", requires: { where: [{ column: "carrier", isNull: false }] } },
          { to: "paid", roles: ["owner", "packer"], undo: true },
          // Packed but not yet gone: the owner may still cancel it, its stock put back. A shipped order cannot be.
          { ...cancel(), roles: ["owner"] },
        ],
        // A gift card sold: cancelled only by the owner, and only while it is unspent (Offers' recall refuses otherwise).
        sent: [{ to: "cancelled", roles: ["owner"], requires: { where: [{ column: "cancel_reason", isNull: false }] } }],
      },
      // The owner's cancel of a sent gift order names its reason in the same save as the move.
      lock: { when: ["shipped", "sent", "cancelled"], except: ["link_stopped", "staff_note", "tracking", "carrier", "cancel_reason"] },
      children: {
        order_lines: { via: "order_id", lock: true },
        gift_lines: { via: "order_id", lock: true },
        order_codes: { via: "order_id", lock: true },
        // A gift card pays while the order waits for its money; a payment online lands then; a transfer is
        // recorded while it waits, or after the cancel when it came late (it is then given back by hand).
        payments: { via: "order_id", createIn: ["paying", "awaiting_transfer", "cancelled"] },
      },
      timed: [
        // Not paid in time: cancelled, its stock let go, its code given back. Never while a payment is landing.
        { from: "paying", to: "cancelled", at: { column: "pay_by" }, set: { cancel_reason: "unpaid" }, waitsForPayment: true },
        { from: "awaiting_transfer", to: "cancelled", at: { column: "transfer_by", time: "23:59" }, set: { cancel_reason: "unpaid" } },
      ],
    },
    columns: [
      id,
      int("number_seq", "Number (running)", { ...opt, rules: { sequence: { gapless: true, startSetting: setting("first_number") } } }),
      text("number", 16, "Number", { ...opt, unique: true, rules: { format: { from: "number_seq", prefixSetting: setting("ref_prefix") } } }),
      choice("status", "Status", ORDER_STATES, {
        default: "paying",
        tones: { paying: "neutral", awaiting_transfer: "warn", paid: "info", packed: "accent", shipped: "pos", sent: "pos", cancelled: "danger" },
      }),
      // Goods to ship, or gift cards alone: the entry that wrote it says which.
      choice("kind", "Kind", { goods: "Goods", gift: "Gift cards only" }, { default: "goods" }),
      choice("pay_method", "Paid by", { online: "Online", transfer: "Bank transfer" }, { default: "online" }),
      fk("customer_id", "customers", "Customer", { ...opt, index: true }),
      // Whether the customer was signed in when the order was written: a guest's typed address proves nothing.
      { ref: "customer_proved", type: "bool", nullable: true, label: l("Signed in when ordering") },
      text("name", 80, "Name", { semantic: "name" }),
      text("email", 254, "E-mail", { semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      // Where it ships: a US address in the 50 states and DC. A gift-cards-only order has none.
      text("ship_name", 80, "Ship to", { ...opt, semantic: "name" }),
      text("address_line1", 120, "Address", opt),
      text("address_line2", 120, "Address, second line", opt),
      text("city", 80, "City", opt),
      text("zip", 10, "ZIP code", opt),
      fk("region_id", "regions", "State", { ...opt, rules: { linkable: { where: [{ column: "active", eq: true }] } } }),
      copied("state_code", 2, "State code", frozen("region_id", "code")),
      fk("zone_id", "zones", "Shipping zone", { ...opt, rules: frozen("region_id", "zone_id") }),
      { ref: "tax_rate", type: "decimal", scale: 3, nullable: true, label: l("Sales tax (%)"), rules: frozen("region_id", "tax_rate") },
      language("language"),
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
      // ── delivery ──
      fk("offer_id", "shipping_offers", "Shipping", {
        ...opt,
        rules: { linkable: { where: [{ column: "active", eq: true }], same: [{ column: "zone_id", as: "zone_id" }] } },
      }),
      fk("service_id", "shipping_services", "Service", { ...opt, rules: frozen("offer_id", "service_id") }),
      // How it goes, by name, as the packing slip prints it.
      copied("service_label", 40, "Shipping service", frozen("offer_id", "service_label")),
      money("ship_price", "Shipping price", frozen("offer_id", "price")),
      money("free_from", "Free shipping from", frozen("offer_id", "free_from")),
      figure("transit_min", "Days on the way, at least", frozen("offer_id", "transit_min")),
      figure("transit_max", "Days on the way, at most", frozen("offer_id", "transit_max")),
      // ── money ──
      money("goods", "Goods", { rollup: { from: "order_lines", via: "order_id", sum: "line" } }),
      // What codes and offers took off, decided by Offers & gift cards; empty when it is not in use.
      amount("discount", "Reductions"),
      money("net", "Goods after reductions", { formula: { max: [0, { sub: [c0("goods"), c0("discount")] }] } }),
      money("shipping", "Shipping", {
        formula: {
          if: [
            { isNull: "offer_id" },
            0,
            { if: [{ and: [{ gt: [c0("free_from"), 0] }, { gte: [c0("net"), c0("free_from")] }] }, 0, c0("ship_price")] },
          ],
        },
      }),
      // Sales tax on the goods after reductions, once for the order, never on shipping.
      money("tax", "Sales tax", { formula: { round: [{ div: [{ mul: [c0("net"), c0("tax_rate")] }, 100] }, 2] } }),
      money("gifts", "Gift cards", { rollup: { from: "gift_lines", via: "order_id", sum: "amount" } }),
      // What the tax line stands under: everything but the tax.
      money("before_tax", "Before tax", { formula: { add: [c0("net"), c0("shipping"), c0("gifts")] } }),
      money("total", "Total", { formula: { add: [c0("net"), c0("shipping"), c0("tax"), c0("gifts")] } }),
      // What payments hold, and what is left to pay.
      money("paid", "Paid", { rollup: { from: "payments", via: "order_id", sum: "kept", balance: { column: "due", of: "total" }, cap: true } }),
      amount("due", "Left to pay"),
      // What a gift card may pay: the order less the gift cards it sells, less what is paid. A card never pays for a card.
      money("due_goods", "Left to pay for goods", { formula: { max: [0, { sub: [{ sub: [c0("total"), c0("gifts")] }, c0("paid")] }] } }),
      money("refunded", "Refunded", { rollup: { from: "payment_refunds", via: "order_id", sum: "counted" } }),
      figure("pieces", "Pieces", { rollup: { from: "order_lines", via: "order_id", sum: "qty" } }),
      figure("weight_g", "Weight (g)", { rollup: { from: "order_lines", via: "order_id", sum: "line_weight_g" } }),
      // ── clocks ──
      at("placed_at", "Placed", { ...opt, rules: stamp("now", onCreate) }),
      // Paying online: the order waits this long for its payment.
      // (Counted from now, on the create that stamps `placed_at` now: a `moment` stamp cannot read a stamp of the same write.)
      at("pay_by", "Pay by", { ...opt, rules: stamp({ addMinutes: { minutes: setting("pay_hold_minutes") } }, onCreate) }),
      // A bank transfer: so many shipping days, the order cancelled at the day's end.
      figure("transfer_days", "Shipping days to pay", { default: { from: setting("transfer_days") } }),
      date("transfer_by", "Pay by transfer by", { ...opt, rules: stamp(shipDays("placed_at", "transfer_days"), { columns: ["placed_at", "transfer_days"] }) }),
      // The bank details as they were when the order was placed: what the customer was told to pay into.
      // The shop's bank details as they stood when the order was placed, kept apart and read by nobody outside.
      text("shop_bank_details", 400, "Shop's bank details then", { ...opt, rules: { default: { from: setting("transfer_details") } } }),
      // What the customer is told to pay into: written only on an order made to wait for a bank transfer, so an
      // order paid online never carries the shop's bank details to whoever holds its link.
      text("transfer_note", 400, "Bank details given", { ...opt, rules: stamp({ copy: "shop_bank_details" }, onState("status", "awaiting_transfer")) }),
      // Its stock stays held 45 days from placing: a paid order keeps its stock until it is packed.
      at("stock_until", "Stock held until", { ...opt, rules: stamp({ addMinutes: { hours: 45 * 24 } }, onCreate) }),
      at("paid_at", "Paid at", { ...opt, rules: { rollup: { from: "payments", via: "order_id", latest: { of: "paid_at", by: "paid_at" } } } }),
      // When it ships and arrives, worked out from the payment: the same day before the cut-off, else the next shipping day.
      // (And on the move to paid: an order a gift card pays in full has its payment in the create, before the move.)
      date("ships_by", "Ships by", { ...opt, rules: stamp(shipDays("paid_at", 0), [{ columns: ["paid_at"] }, onState("status", "paid")]) }),
      // (They watch the payment too: the payment's total moves `paid_at` alone, and works out only the stamps that watch it.)
      date("arrives_from", "Arrives from", { ...opt, rules: stamp(shipDays("ships_by", "transit_min"), [{ columns: ["paid_at", "ships_by", "transit_min"] }, onState("status", "paid")]) }),
      date("arrives_to", "Arrives by", { ...opt, rules: stamp(shipDays("ships_by", "transit_max"), [{ columns: ["paid_at", "ships_by", "transit_max"] }, onState("status", "paid")]) }),
      // The same, as told before paying: "if you pay now".
      date("est_ships_by", "Ships by, if paid now", { ...opt, rules: stamp(shipDays("placed_at", 0), { columns: ["placed_at"] }) }),
      date("est_from", "Arrives from, if paid now", { ...opt, rules: stamp(shipDays("est_ships_by", "transit_min"), { columns: ["est_ships_by", "transit_min"] }) }),
      date("est_to", "Arrives by, if paid now", { ...opt, rules: stamp(shipDays("est_ships_by", "transit_max"), { columns: ["est_ships_by", "transit_max"] }) }),
      at("packed_at", "Packed", { ...opt, rules: { stamp: { set: "now", on: onState("status", "packed"), clearOnBack: true } } }),
      text("packed_by", 80, "Packed by", { ...opt, rules: { stamp: { set: "user-name", on: onState("status", "packed"), clearOnBack: true } } }),
      at("shipped_at", "Shipped", { ...opt, rules: stamp("now", onState("status", "shipped", "sent")) }),
      text("shipped_by", 80, "Shipped by", { ...opt, rules: stamp("user-name", onState("status", "shipped")) }),
      // One parcel and one tracking number an order. A DHL booking made in the demo fills nothing here.
      text("carrier", 40, "Carrier", opt),
      text("tracking", 64, "Tracking number", opt),
      at("cancelled_at", "Cancelled", { ...opt, rules: stamp("now", onState("status", "cancelled")) }),
      text("cancelled_by", 80, "Cancelled by", { ...opt, rules: stamp({ byOrigin: { public: "customer", staff: "user-name" } }, onState("status", "cancelled")) }),
      choice("cancel_reason", "Why it was cancelled", CANCEL_REASONS, opt),
      // The desk's own note: never in a customer's read, e-mail or document.
      text("staff_note", 500, "Note for the shop", opt),
      // ── the order's own link ──
      text("link_token", 16, "Link code", { ...opt, rules: { code: { length: 16, hiddenFromStaff: true } } }),
      // The link works until well after the last day to send something back.
      at("link_expires", "Link works until", { ...opt, rules: stamp({ addMinutes: { hours: 120 * 24 } }, onCreate) }),
      bool("link_stopped", "Link stopped", false),
      // The tick at checkout ("Send me news"): theirs, written by nobody else.
      bool("news", "News e-mails", false),
    ],
  },
  {
    ref: "order_lines",
    keep: KEPT_FOR_TAX,
    label: l("Order line"),
    labelPlural: l("Order lines"),
    keyField: "sku",
    // One line per variant on an order: two of the same are one line of two.
    unique: [["order_id", "variant_id"]],
    postings: [
      // Its stock is held when the order is written, taken when it is packed, and let go on every cancel before that.
      {
        id: "stock",
        into: { addOn: "inventory", ledger: "stock", action: "hold" },
        needs: "stock",
        via: "order_id",
        reserve: { on: { create: true } },
        post: { on: { to: ["packed"] } },
        // (From packed too: the owner's cancel of a packed order puts what was taken back.)
        reverse: { on: { to: ["cancelled"], from: ["paying", "awaiting_transfer", "paid", "packed"] } },
        heldUntil: { parent: "stock_until" },
        map: { what: "variant_id", quantity: "qty" },
      },
    ],
    // A shipped line may be reviewed once, by its customer: kept by Forms & surveys.
    review: {
      by: { addOn: "forms" },
      needs: "reviews",
      about: { link: "product_id", name: "product_name", detail: "variant_label" },
      when: { path: ["order_id", "status"], in: ["shipped"] },
      person: ["order_id", "customer_id"],
      // A guest's order typed in somebody's address proves nothing: its own link reviews only an order placed signed in.
      proved: ["order_id", "customer_proved"],
      shownName: { full: "name" },
      stamp: "reviewed_at",
    },
    columns: [
      id,
      fk("order_id", "orders", "Order", { index: true }),
      fk("variant_id", "variants", "Variant", {
        rules: {
          linkable: {
            where: [
              { column: "active", eq: true },
              { column: "sold_out", eq: false },
              { column: "product_status", eq: "active" },
            ],
          },
        },
      }),
      int("qty", "Quantity", { default: 1, rules: { validation: { min: 1, max: 10 } } }),
      // What it was sold as, kept as it was.
      copied("sku", 40, "SKU", frozen("variant_id", "sku")),
      fk("product_id", "products", "Product", { ...opt, rules: frozen("variant_id", "product_id") }),
      fk("category_id", "categories", "Category", { ...opt, rules: frozen("variant_id", "category_id") }),
      copied("product_name", 80, "Product", frozen("variant_id", "product_name")),
      copied("colour", 40, "Colour", frozen("variant_id", "colour_label")),
      copied("size", 40, "Size", frozen("variant_id", "size_label")),
      copied("variant_label", 90, "Colour and size", { formula: { join: ["colour", " · ", "size"] } }),
      figure("weight_g", "Weight a piece (g)", frozen("variant_id", "weight_g")),
      figure("line_weight_g", "Weight (g)", { formula: { mul: [c0("weight_g"), "qty"] } }),
      money("each", "Price", frozen("variant_id", "price")),
      money("line", "Line total", { formula: { mul: ["qty", c0("each")] } }),
      // This line's share of the order's reductions, decided by Offers & gift cards.
      amount("discount", "Reduction"),
      // The order's sales tax rate, kept with the line: what a return of it gives back.
      { ref: "tax_rate", type: "decimal", scale: 3, nullable: true, label: l("Sales tax (%)"), rules: frozen("order_id", "tax_rate") },
      // Pieces in returns that still hold them; a declined return frees its pieces.
      figure("returned_qty", "Pieces in returns", { rollup: { from: "return_lines", via: "line_id", sum: "qty", unlessSet: "void_at", balance: { column: "returnable", of: "qty" }, cap: true } }),
      { ref: "returnable", type: "int", nullable: true, label: l("Pieces that may come back") },
      at("reviewed_at", "Reviewed", opt),
    ],
  },
  {
    // An e-gift card on an order: Offers & gift cards makes the card when the order is written, and loads,
    // activates and mails it once the order is paid.
    ref: "gift_lines",
    keep: KEPT_FOR_TAX,
    label: l("Gift card line"),
    labelPlural: l("Gift card lines"),
    keyField: "to_email",
    postings: [
      {
        id: "card-make",
        into: { addOn: "offers", ledger: "value", action: "issue" },
        needs: "gift-cards",
        via: "order_id",
        reserve: { on: { create: true } },
        // On the order's own moves: its `paid_at` is a total of its payments, which moves no posting of a line.
        post: { on: { to: ["paid"] } },
        reverse: { on: { to: ["cancelled"], from: ["paying", "awaiting_transfer"] } },
        map: { amount: "load_amount", to_name: "to_name", to_email: "to_email", message: "message", sender: "sender", language: "language" },
      },
      {
        id: "card-recall",
        into: { addOn: "offers", ledger: "value", action: "recall" },
        needs: "gift-cards",
        via: "order_id",
        // Every cancel of a card already live: a packed order is refunded in full too.
        post: { on: { to: ["cancelled"], from: ["paid", "packed", "sent"] } },
        map: { sale: { row: true } },
      },
    ],
    columns: [
      id,
      fk("order_id", "orders", "Order", { index: true }),
      // The amount is the shop's own row: a shopper picks one, and never types a figure.
      fk("amount_id", "gift_amounts", "Amount", { rules: { linkable: { where: [{ column: "active", eq: true }] } } }),
      money("amount", "Amount", frozen("amount_id", "amount")),
      money("load_amount", "Loaded", frozen("amount_id", "amount")),
      text("to_name", 80, "To", { ...opt, rules: { plainText: true } }),
      text("to_email", 254, "To e-mail", { semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      text("message", 200, "Message", { ...opt, rules: { plainText: { digits: 20, max: 200 } } }),
      // Who it is from: the order's own name.
      copied("sender", 80, "From", frozen("order_id", "name")),
      language("language", frozen("order_id", "language")),
    ],
  },
  {
    ref: "order_codes",
    label: l("Code on an order"),
    labelPlural: l("Codes on orders"),
    keyField: "typed",
    columns: [
      id,
      fk("order_id", "orders", "Order"),
      text("typed", 64, "Code as typed", opt),
      link("code_id", "offers", "codes", "Discount code"),
      link("voucher_id", "offers", "vouchers", "Voucher"),
      at("removed_at", "Removed", opt),
    ],
  },
  {
    // What was paid of an order: online through the pay page, by a gift card, or by a bank transfer the owner records.
    ref: "payments",
    keep: KEPT_FOR_TAX,
    label: l("Payment"),
    labelPlural: l("Payments"),
    keyField: "method",
    postings: [
      // A card pays what is left for goods when the row is made, and gets it back when the order is cancelled.
      {
        id: "card",
        into: { addOn: "offers", ledger: "value", action: "spend" },
        needs: "gift-cards",
        via: "order_id",
        post: { on: { create: true } },
        reverse: { on: { to: ["cancelled"] } },
        map: { card: "card_id", amount: "amount", due: { parent: "due_goods" }, balance_after: "card_balance_after" },
        only: { column: "card_code", set: true },
      },
    ],
    columns: [
      id,
      fk("order_id", "orders", "Order", { index: true }),
      choice("method", "Paid by", { online: "Online", gift_card: "Gift card", transfer: "Bank transfer" }, { default: "gift_card" }),
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
      // The whole code, as typed: read by no page and no role.
      text("card_code", 64, "Card code", { ...opt, rules: { requiredWhen: { column: "method", in: ["gift_card"] } } }),
      link("card_id", "offers", "gift_cards", "Gift card", {
        lookup: { from: "card_code", table: { addOn: "offers", table: "gift_cards" }, column: "code", where: [{ column: "status", eq: "active" }] },
      }),
      text("card_last4", 4, "Card ending", { ...opt, rules: { codeLast4: { of: "card_code" } } }),
      // What it paid: the card's answer, the money taken online, or the transfer the owner recorded.
      amount("amount", "Paid"),
      amount("card_balance_after", "Left on the card"),
      money("returned", "Given back", { rollup: { from: "payment_refunds", via: "payment_id", sum: "counted" } }),
      amount("refunded_elsewhere", "Given back at the service"),
      money("kept", "Kept", { formula: { sub: [c0("amount"), { add: [c0("returned"), c0("refunded_elsewhere")] }] } }),
      // When it landed: the payment page's moment, the day the owner says a transfer came, or, for a gift card, the
      // moment the card paid (stamped: nobody types it). An order a card pays in full counts its ships-by from it.
      // When it landed: the payment page's moment, the day the owner says a transfer came, or, for a gift card, the
      // moment the card paid. A card's is stamped (`now`, as no minutes from now: a stamp of that kind keeps what the
      // payment page and the owner write, and fires only when a card's code is given), so an order a card pays in
      // full counts its ships-by from it.
      at("paid_at", "Paid at", { ...opt, rules: stamp({ addMinutes: { minutes: 0 } }, { column: "card_code", filled: true }) }),
      text("note", 160, "Note", opt),
      text("made_by", 80, "Recorded by", { ...opt, rules: stamp({ byOrigin: { public: "customer", staff: "user-name" } }, onCreate) }),
      text("payment_ref", 64, "Online payment reference", { ...opt, unique: true }),
      text("provider", 40, "Paid through", opt),
    ],
  },
  {
    // Money given back: online through the service it came by (Adminium sends it), to a gift card, or by hand
    // for a bank transfer (a row that records it was sent).
    ref: "payment_refunds",
    keep: KEPT_FOR_TAX,
    label: l("Refund"),
    labelPlural: l("Refunds"),
    keyField: "reason",
    postings: [
      {
        id: "card-refund",
        into: { addOn: "offers", ledger: "value", action: "refund" },
        needs: "gift-cards",
        post: { on: { create: true } },
        map: { amount: "amount", against_table: { value: "ecommerce-shop:payments" }, against_row: "payment_id" },
        only: { column: "method", eq: "gift_card" },
      },
    ],
    columns: [
      id,
      fk("payment_id", "payments", "Payment", { index: true }),
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
      fk("order_id", "orders", "Order", { ...opt, rules: frozen("payment_id", "order_id") }),
      fk("return_id", "returns", "Return", opt),
      choice("method", "Given back", { online: "Online", gift_card: "To the gift card", transfer: "By bank transfer" }, { rules: frozen("payment_id", "method") }),
      { ref: "amount", type: "decimal", scale: "currency", label: l("Amount"), rules: { validation: { min: 0.01 } } },
      text("reason", 120, "Reason", opt),
      at("made_at", "Made", { ...opt, rules: stamp("now", onCreate) }),
      text("made_by", 80, "Made by", { ...opt, rules: stamp({ byOrigin: { public: "customer", staff: "user-name" } }, onCreate) }),
      bool("automatic", "Refunded automatically", false),
      choice("refund_state", "Refund", { asked: "Asked", pending: "On its way", done: "Refunded", "not-sent": "Not sent" }, opt),
      text("provider_ref", 255, "Refund reference", opt),
      money("counted", "Counted", { formula: { if: [{ eq: ["refund_state", "not-sent"] }, 0, "amount"] } }),
    ],
  },
  {
    ref: "returns",
    keep: KEPT_FOR_TAX,
    label: l("Return"),
    labelPlural: l("Returns"),
    keyField: "number",
    states: {
      column: "status",
      initial: "asked",
      strict: true,
      moves: {
        asked: [{ to: "approved", roles: ["owner"] }, { to: "declined", roles: ["owner"], requires: { where: [{ column: "staff_reason", isNull: false }] } }],
        approved: [{ to: "received", roles: ["owner", "packer"] }, { to: "declined", roles: ["owner"], requires: { where: [{ column: "staff_reason", isNull: false }] } }],
        // Refunded once its refunds cover what it gives back.
        received: [{ to: "refunded", roles: ["owner"], requires: { where: [{ column: "refund_short", lte: 0 }] } }],
      },
      lock: { when: ["declined", "refunded"], except: ["staff_note"] },
      children: {
        return_lines: { via: "return_id", changeIn: ["asked", "approved", "received"], createIn: ["asked"] },
      },
    },
    columns: [
      id,
      int("number_seq", "Number (running)", { ...opt, rules: { sequence: { gapless: true, startSetting: setting("first_return_number") } } }),
      text("number", 16, "Number", { ...opt, unique: true, rules: { format: { from: "number_seq", prefix: "RT-" } } }),
      fk("order_id", "orders", "Order", { rules: { linkable: { where: [{ column: "status", eq: "shipped" }] } } }),
      // The signed-in customer who asked it; a return asked through the order's own link has none.
      fk("customer_id", "customers", "Customer", opt),
      copied("order_number", 16, "Order number", frozen("order_id", "number")),
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
      choice("status", "Status", RETURN_STATES, {
        default: "asked",
        tones: { asked: "info", approved: "accent", declined: "neutral", received: "warn", refunded: "pos" },
      }),
      choice("reason", "Why", RETURN_REASONS),
      text("note", 500, "The customer's note", { ...opt, rules: { plainText: { digits: 12, max: 500 } } }),
      // The customer's own carrier number for the parcel coming back.
      text("tracking", 64, "Tracking number", opt),
      // What the customer reads when the shop declines it.
      text("staff_reason", 280, "Why we declined", opt),
      text("staff_note", 500, "Note for the shop", opt),
      // What it gives back: what the customer paid for those pieces, worked out by Adminium from the lines.
      money("refund_goods", "Refund for the pieces", { rollup: { from: "return_lines", via: "return_id", sum: "refund" } }),
      // A faulty item's shipping, given back too when the shop says so: never more than the order's shipping.
      price("shipping_refund", "Shipping given back", { ...opt, rules: { validation: { min: 0 } } }),
      money("refund_amount", "Refund", { formula: { add: [c0("refund_goods"), c0("shipping_refund")] } }),
      money("refunded_total", "Refunded", { rollup: { from: "payment_refunds", via: "return_id", sum: "counted" } }),
      money("refund_short", "Still to refund", { formula: { sub: [c0("refund_amount"), c0("refunded_total")] } }),
      at("asked_at", "Asked", { ...opt, rules: stamp("now", onCreate) }),
      at("approved_at", "Approved", { ...opt, rules: stamp("now", onState("status", "approved")) }),
      at("declined_at", "Declined", { ...opt, rules: stamp("now", onState("status", "declined")) }),
      at("received_at", "Received", { ...opt, rules: stamp("now", onState("status", "received")) }),
      text("received_by", 80, "Received by", { ...opt, rules: stamp("user-name", onState("status", "received")) }),
      at("refunded_at", "Refunded at", { ...opt, rules: stamp("now", onState("status", "refunded")) }),
      // Send it back by this day: five shipping days from the approval, told in the "Return approved" e-mail.
      date("send_by", "Send it back by", { ...opt, rules: stamp({ addWorkingDays: { from: "now", days: 5, weekdays: SHIP_DAYS, closures: CLOSURES } }, onState("status", "approved")) }),
      language("language", frozen("order_id", "language")),
    ],
  },
  {
    ref: "return_lines",
    keep: KEPT_FOR_TAX,
    label: l("Returned piece"),
    labelPlural: l("Returned pieces"),
    keyField: "sku",
    postings: [
      // Back in stock when the piece is received, unless the shop says it is not fit to sell. Said on the piece itself
      // (the desk's Received marks each piece, then moves the return): a piece hanging its posting off its return could
      // not be made through the order's own link, where each piece is its own write.
      {
        id: "restock",
        into: { addOn: "inventory", ledger: "stock", action: "return" },
        needs: "stock",
        post: { on: { column: "received_at", set: true } },
        only: { column: "restock", eq: true },
        map: { what: "variant_id", quantity: "qty" },
      },
    ],
    columns: [
      id,
      fk("return_id", "returns", "Return", { index: true }),
      fk("line_id", "order_lines", "Order line", { index: true, rules: { linkable: { same: [{ column: "order_id", as: "return_id.order_id" }] } } }),
      int("qty", "Pieces", { default: 1, rules: { validation: { min: 1, max: 10 } } }),
      fk("variant_id", "variants", "Variant", { ...opt, rules: frozen("line_id", "variant_id") }),
      copied("sku", 40, "SKU", frozen("line_id", "sku")),
      copied("product_name", 80, "Product", frozen("line_id", "product_name")),
      copied("variant_label", 90, "Colour and size", frozen("line_id", "variant_label")),
      // What the customer paid a piece: the price, less its share of the reductions, plus its tax.
      figure("line_qty", "Pieces bought", frozen("line_id", "qty")),
      money("line_paid", "Paid for the line", frozen("line_id", "line")),
      money("line_discount", "Its reduction", frozen("line_id", "discount")),
      { ref: "tax_rate", type: "decimal", scale: 3, nullable: true, label: l("Sales tax (%)"), rules: frozen("line_id", "tax_rate") },
      money("refund", "Refund", {
        formula: {
          round: [
            {
              mul: [
                { div: [{ mul: [{ sub: [c0("line_paid"), c0("line_discount")] }, "qty"] }, { max: [1, c0("line_qty")] }] },
                { add: [1, { div: [c0("tax_rate"), 100] }] },
              ],
            },
            2,
          ],
        },
      }),
      // Put back in stock when it comes in: said at Received, off for a faulty piece.
      bool("restock", "Put back in stock", true),
      // Marked by the desk's Received, one piece at a time; the moment it was is Adminium's.
      bool("received", "Received", false),
      at("received_at", "Received at", { ...opt, rules: stamp("now", { column: "received", values: [true] }) }),
      // Set by the desk's Decline, on each piece before the return moves: its pieces are free to come back in another.
      // (A copy that follows the return cannot feed the order line's total; the desk writes it in the same sheet.)
      at("void_at", "Freed", opt),
    ],
  },
  {
    ref: "restock_requests",
    label: l("Back-in-stock request"),
    labelPlural: l("Back-in-stock requests"),
    keyField: "variant_id",
    unique: [["variant_id", "customer_id"]],
    columns: [
      id,
      fk("variant_id", "variants", "Variant", { rules: { linkable: { where: [{ column: "active", eq: true }] } } }),
      fk("customer_id", "customers", "Customer"),
      copied("sku", 40, "SKU", frozen("variant_id", "sku")),
      language("language"),
      at("asked_at", "Asked", { ...opt, rules: stamp("now", onCreate) }),
      at("notified_at", "Told", opt),
    ],
  },
  {
    ref: "enquiries",
    label: l("Message"),
    labelPlural: l("Messages"),
    keyField: "topic",
    states: { column: "status", initial: "new", moves: { new: ["answered", "closed"], answered: ["closed", "new"], closed: ["new"] } },
    columns: [
      id,
      text("name", 80, "Name", { semantic: "name" }),
      text("email", 254, "E-mail", { semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      choice("topic", "Topic", { order: "An order", product: "A product", returns: "A return", other: "Something else" }),
      text("message", 1000, "Message", { rules: { plainText: { digits: 20, max: 1000 } } }),
      // An order number as typed: free text, never looked up.
      text("order_number", 16, "Order number", opt),
      language("language"),
      choice("status", "Status", { new: "New", answered: "Answered", closed: "Closed" }, { default: "new", tones: { new: "info", answered: "pos", closed: "neutral" } }),
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
      at("created_at", "Sent", { ...opt, rules: stamp("now", onCreate) }),
    ],
  },
  {
    // The footer's newsletter box, without Forms & surveys: an address and its yes, found or made as a customer.
    ref: "news_signups",
    label: l("Newsletter sign-up"),
    labelPlural: l("Newsletter sign-ups"),
    keyField: "email",
    columns: [
      id,
      text("email", 254, "E-mail", { semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      language("language"),
      bool("news", "News e-mails", false),
      fk("customer_id", "customers", "Customer", opt),
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
      at("created_at", "Signed up", { ...opt, rules: stamp("now", onCreate) }),
    ],
  },
  {
    ref: "messages",
    label: l("E-mail"),
    labelPlural: l("E-mails"),
    keyField: "kind",
    columns: [
      id,
      choice("kind", "Kind", EMAIL_KINDS),
      choice("status", "Status", { queued: "Going out", sent: "Sent", failed: "Not sent", skipped: "Skipped" }, {
        default: "queued",
        tones: { queued: "info", sent: "pos", failed: "danger", skipped: "neutral" },
      }),
      text("to_address", 254, "Sent to", { ...opt, semantic: "email" }),
      text("language", 16, "Language", opt),
      fk("order_id", "orders", "Order", opt),
      fk("return_id", "returns", "Return", opt),
      fk("enquiry_id", "enquiries", "Message", opt),
      fk("customer_id", "customers", "Customer", opt),
      fk("request_id", "restock_requests", "Back-in-stock request", opt),
      fk("signup_id", "news_signups", "Newsletter sign-up", opt),
      at("due", "Due", opt),
      at("created_at", "Created", { ...opt, rules: stamp("now", onCreate) }),
      at("sent_at", "Sent", opt),
      text("error", 500, "What went wrong", opt),
      text("repeat_key", 64, "Resend key", opt),
      choice("skip_reason", "Why it was skipped", {
        overtaken: "A later e-mail took its place",
        paid: "Paid",
        void: "Void",
        "no-longer-needed": "No longer needed",
        "by-hand": "Skipped by hand",
      }, opt),
    ],
  },
];

/** A move to cancelled: always with its reason. */
function cancel() {
  return { to: "cancelled", requires: { where: [{ column: "cancel_reason", isNull: false }] } };
}

export const TABLE_REFS = TABLES.map((t) => t.ref);
