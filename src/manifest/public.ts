/**
 * What the shop's pages may read and write, through two browser keys.
 *
 * The `customer` key is the shop's: the catalogue (products on sale, their
 * colours, sizes, pictures and variants), filtered, searched, sorted and
 * paged by Adminium; the stock words of a variant (Inventory's "In stock",
 * "Only 3 left", "Sold out"); the shipping services and their prices; the
 * states shipped to and their tax; the shop's public settings; placing an
 * order with its lines, gift cards, codes and a gift card's payment in one
 * write, priced by Adminium and checked against the total the shopper saw;
 * a message to the shop, and the newsletter box. Once a customer signs in
 * with a code e-mailed to them: their own orders, returns and receipts, a
 * return asked, a review sent, "tell me when it's back".
 *
 * The `link` key opens one order by the code in its own link — the link its
 * e-mails carry, its code in the address's fragment — so the customer can
 * follow it, cancel it while it is not packed, and ask to send something
 * back, without signing in.
 *
 * Orders are placed through four doors: goods or gift cards alone, each to be
 * paid online (open while the shop takes payments online, to guests too) or
 * by bank transfer (open while it takes none and its owner said yes to
 * transfers, to a signed-in customer only, two unpaid at most).
 *
 * What never leaves through these keys: another customer's anything, the
 * desk's notes, the bank details (only on the customer's own transfer order),
 * Inventory's figures (only its words), the order's link code and retry key.
 */
import { NEWS_TICK } from "./people.ts";
import { setting } from "./tables.ts";

export const LINK_KEY = "link";
export const PUBLIC_KEYS = { [LINK_KEY]: {} };

/** What a customer sees of an order: its progress, their details, what it costs. Never the desk's note or who packed it. */
export const ORDER_SELECT = [
  "id",
  "number",
  "status",
  "kind",
  "pay_method",
  "name",
  "email",
  "ship_name",
  "address_line1",
  "address_line2",
  "city",
  "zip",
  "region_id",
  "state_code",
  "offer_id",
  "service_id",
  "tax_rate",
  "goods",
  "discount",
  "net",
  "shipping",
  "tax",
  "gifts",
  "total",
  "paid",
  "due",
  "refunded",
  "pieces",
  "placed_at",
  "pay_by",
  "transfer_by",
  "transfer_note",
  "paid_at",
  "ships_by",
  "arrives_from",
  "arrives_to",
  "est_ships_by",
  "est_from",
  "est_to",
  "packed_at",
  "shipped_at",
  "carrier",
  "tracking",
  "cancelled_at",
  "cancel_reason",
  "link_expires",
  "customer_proved",
];

/** What placing an order answers: its figures and progress, never the shopper's own details back. */
export const PLACED_SELECT = ORDER_SELECT.filter((c) => !["name", "email", "ship_name", "address_line1", "address_line2", "city", "zip", "transfer_note"].includes(c));

export const LINE_SELECT = ["id", "order_id", "variant_id", "qty", "sku", "product_id", "product_name", "colour", "size", "variant_label", "each", "line", "discount", "returned_qty", "returnable", "reviewed_at"];
export const GIFT_SELECT = ["id", "order_id", "amount_id", "amount", "to_name", "to_email", "message", "sender"];
export const PAYMENT_SELECT = ["id", "order_id", "method", "amount", "returned", "kept", "card_last4", "paid_at"];
export const REFUND_SELECT = ["id", "payment_id", "order_id", "return_id", "method", "amount", "refund_state", "made_at"];
export const RETURN_SELECT = ["id", "number", "order_id", "order_number", "status", "reason", "note", "tracking", "staff_reason", "refund_goods", "shipping_refund", "refund_amount", "refunded_total", "asked_at", "approved_at", "declined_at", "received_at", "refunded_at"];
export const RETURN_LINE_SELECT = ["id", "return_id", "line_id", "qty", "sku", "product_name", "variant_label", "refund"];

/**
 * The customer's own moves: a cancel while the order is not packed, with their own reason; and "paid" once a gift
 * card covered it all, while it waits for its money. The table's moves hold each: a paying order is cancelled by the
 * clock alone (its move waits for the deadline), and it is paid only when nothing is left to pay (`due ≤ 0`).
 */
const OWN_MOVES = {
  writable: ["status", "cancel_reason"],
  writableValues: { status: ["cancelled", "paid"], cancel_reason: ["customer"] },
  writableWhen: { status: ["paying", "paid", "awaiting_transfer"] },
};

/** The rows under an order, read where the order is. */
function underOrder(key?: string) {
  const keyed = key === undefined ? {} : { key };
  return [
    { table: "order_lines", ...keyed, methods: ["GET"], level: "verified", visibleWith: { table: "orders", via: "order_id" }, select: LINE_SELECT },
    { table: "gift_lines", ...keyed, methods: ["GET"], level: "verified", visibleWith: { table: "orders", via: "order_id" }, select: GIFT_SELECT },
    { table: "payments", ...keyed, methods: ["GET"], level: "verified", visibleWith: { table: "orders", via: "order_id" }, select: PAYMENT_SELECT },
    { table: "payment_refunds", ...keyed, methods: ["GET"], level: "verified", visibleWith: { table: "orders", via: "order_id" }, select: REFUND_SELECT },
    { table: "returns", ...keyed, methods: ["GET"], level: "verified", visibleWith: { table: "orders", via: "order_id" }, select: RETURN_SELECT },
    { table: "return_lines", ...keyed, methods: ["GET"], level: "verified", visibleWith: { table: "returns", via: "return_id" }, select: RETURN_LINE_SELECT },
  ];
}

// ── the catalogue ────────────────────────────────────────────────────────────

const ON_SALE = [{ column: "product_status", op: "eq", value: "active" }];

export const PRODUCT_SELECT = ["id", "name", "slug", "category_id", "category_name", "price", "blurb", "description", "specs", "size_guide_id", "size_name", "featured", "new_until", "position", "created_at", "variants_count"];
export const VARIANT_SELECT = ["id", "product_id", "colour_id", "size_id", "colour_code", "size_code", "colour_label", "size_label", "sku", "price_delta", "price", "active", "sold_out", "category_id"];
export const OPTION_SELECT = ["id", "product_id", "kind", "code", "label", "hex", "position"];
export const PICTURE_SELECT = ["id", "product_id", "colour_id", "picture", "alt", "position"];

/** The shop's public face: its words and promises, how it takes orders. Never the bank details: those are on the customer's own order. */
export const SETTINGS_SELECT = ["id", "shop_name", "email", "phone", "address_line1", "address_line2", "city", "state_code", "zip", "taking_orders", "pay_hold_minutes", "transfer_on", "transfer_days", "return_days", "refund_shipping_faulty", "max_pieces", "promise_1", "promise_2", "promise_3", "about", "privacy", "terms", "review_link"];

const CATALOGUE = [
  {
    table: "products",
    methods: ["GET"],
    select: PRODUCT_SELECT,
    filters: [{ column: "status", op: "eq", value: "active" }],
    filterable: ["category_id", { column: "price", ops: ["gte", "lte"] }, "featured", "slug"],
    searchable: ["name", "category_name"],
    orderable: ["position", "created_at", "price", "name"],
    via: { entry: "variants", on: "product_id", columns: ["colour_code", "size_code", "sold_out"] },
    count: true,
    pagination: { defaultLimit: 12, maxLimit: 48, order: "position.asc" },
  },
  {
    table: "variants",
    methods: ["GET"],
    select: VARIANT_SELECT,
    filters: [...ON_SALE, { column: "active", op: "eq", value: true }],
    filterable: ["product_id", { column: "id", ops: ["eq", "in"] }],
    pagination: { defaultLimit: 60, maxLimit: 100, order: "id.asc" },
  },
  { table: "option_values", methods: ["GET"], select: OPTION_SELECT, filters: ON_SALE, filterable: ["product_id"], pagination: { defaultLimit: 100, maxLimit: 100, order: "position.asc" } },
  { table: "product_pictures", methods: ["GET"], select: PICTURE_SELECT, filters: ON_SALE, filterable: ["product_id"], pictures: ["picture"], pagination: { defaultLimit: 100, maxLimit: 100, order: "position.asc" } },
  { table: "categories", methods: ["GET"], select: ["id", "name", "slug", "icon", "position", "products_count"] },
  { table: "size_guides", methods: ["GET"], select: ["id", "name", "columns_json", "rows_json", "note"] },
  // Whether a variant is in: Inventory's own words, and how many are left only as its owner set it.
  { table: "variants", kind: "availability", methods: ["GET"], words: "inventory:stock" },
  { table: "shipping_services", methods: ["GET"], select: ["id", "code", "label", "transit_min", "transit_max", "position"], filters: [{ column: "active", op: "eq", value: true }] },
  { table: "shipping_offers", methods: ["GET"], select: ["id", "service_id", "zone_id", "price", "free_from", "service_label", "transit_min", "transit_max"], filters: [{ column: "active", op: "eq", value: true }] },
  { table: "regions", methods: ["GET"], select: ["id", "code", "name", "zone_id", "tax_rate"], filters: [{ column: "active", op: "eq", value: true }], pagination: { defaultLimit: 60, maxLimit: 60, order: "name.asc" } },
  { table: "zones", methods: ["GET"], select: ["id", "code", "label"] },
  {
    table: "closures",
    methods: ["GET"],
    select: ["id", "from_date", "to_date", "reason"],
    filters: [
      { column: "active", op: "eq", value: true },
      { column: "to_date", op: "from-today" },
    ],
  },
  { table: "gift_amounts", methods: ["GET"], select: ["id", "amount", "position"], filters: [{ column: "active", op: "eq", value: true }] },
  { table: "settings", methods: ["GET"], select: SETTINGS_SELECT },
];

// ── placing an order ─────────────────────────────────────────────────────────

/** A line's limits: one variant a line, ten of it at most, thirty pieces an order (a setting). */
const LINES = {
  via: "order_id",
  writable: ["variant_id", "qty"],
  requires: ["variant_id"],
  select: LINE_SELECT.filter((c) => c !== "order_id"),
  max: 20,
  sumMax: { column: "qty", max: setting("max_pieces") },
};
/** A gift card bought: its amount the shop's own, a message of plain text; five an order at most. */
const GIFTS = {
  via: "order_id",
  writable: ["amount_id", "to_name", "to_email", "message"],
  requires: ["amount_id", "to_email"],
  select: GIFT_SELECT.filter((c) => c !== "order_id"),
  max: 5,
  plainText: ["to_name"],
};
const CODES = { via: "order_id", writable: ["typed"], select: ["id", "typed"], max: 4 };
/** One gift card paying, by its code: what it pays is the card's and the order's to say, never more than the goods. */
const CARD = { via: "order_id", writable: ["card_code"], select: ["id", "amount", "card_last4"], max: 1 };

type Kind = "goods" | "gift";
type Pay = "online" | "transfer";

function placeOrder(kind: Kind, pay: Pay) {
  const goods = kind === "goods";
  const online = pay === "online";
  return {
    table: "orders",
    methods: ["POST"],
    humanCheck: true,
    level: "verified",
    select: PLACED_SELECT,
    writable: [
      "name",
      "email",
      "language",
      "client_key",
      "news",
      ...(goods ? ["ship_name", "address_line1", "address_line2", "city", "zip", "region_id", "offer_id"] : []),
    ],
    requires: goods ? ["name", "email", "ship_name", "address_line1", "city", "zip", "region_id", "offer_id"] : ["name", "email"],
    defaults: { kind, pay_method: pay, ...(online ? {} : { status: "awaiting_transfer" }) },
    requireSetting: [setting("taking_orders"), ...(online ? [] : [setting("transfer_on")])],
    // A guest may pay online; a bank transfer is a signed-in customer's, two unpaid at most.
    ...(online
      ? { claimedBy: { table: "customers", column: "customer_id", optional: true as const }, identity: { table: "customers", email: "email", link: "customer_id", fill: { name: "name", language: "language" } } }
      : { claimedBy: { table: "customers", column: "customer_id" } }),
    consent: NEWS_TICK,
    shareLink: "link_token",
    anonymous: {
      perValue: { columns: ["email"], n: 3 },
      perIpHour: 6,
      perKeyHour: 300,
      plainText: goods
        ? ["name", "ship_name", "city"]
        : ["name"],
    },
    maxOpen: { column: "status", values: ["paying", "awaiting_transfer"], n: 2 },
    children: goods ? { order_lines: { ...LINES, min: 1 }, gift_lines: GIFTS, order_codes: CODES, payments: CARD } : { gift_lines: { ...GIFTS, min: 1 }, order_codes: CODES, payments: CARD },
    dryRun: true,
    expect: "total",
    clientKey: "client_key",
    requirePayments: online ? "on" : "off",
    ...(online ? { pay: true as const } : {}),
  };
}

/**
 * A return asked for a shipped order: its pieces chosen from the order's lines, no more than were bought less
 * what other returns still hold. Signed in, the order must be the customer's own; through the order's own link,
 * it is that order.
 */
function askReturn() {
  return {
    table: "returns",
    methods: ["POST"],
    level: "verified",
    claimedBy: { table: "customers", column: "customer_id" },
    select: RETURN_SELECT,
    writable: ["order_id", "reason", "note", "tracking", "client_key"],
    requires: ["order_id", "reason"],
    agrees: [{ column: "customer_id", eq: { via: "order_id", column: "customer_id" } }],
    children: {
      return_lines: {
        via: "return_id",
        writable: ["line_id", "qty"],
        select: RETURN_LINE_SELECT.filter((c) => c !== "return_id"),
        min: 1,
        max: 20,
      },
    },
    clientKey: "client_key",
  };
}

export const PUBLIC_ACCESS = [
  // ── the customer who signs in with a code e-mailed to them ──────────────────
  {
    table: "customers",
    methods: ["GET", "PATCH"],
    select: ["name", "email", "language", "news"],
    writable: ["name", "language"],
    claim: { verify: "email-link", email: "email" },
    humanCheck: true,
    // "Delete my details" stops every link their orders were e-mailed with, takes back the newsletter, and drops
    // their waiting back-in-stock requests. Their orders stay, as tax law asks.
    forget: { columns: ["email", "name", "news"], stamp: "forgotten_at", links: true },
  },
  { table: "orders", methods: ["GET", "PATCH"], level: "verified", claimedBy: { table: "customers", column: "customer_id" }, select: ORDER_SELECT, ...OWN_MOVES },
  ...underOrder(),
  askReturn(),
  // "Tell me when it's back": a signed-in customer's own requests, one a variant.
  {
    table: "restock_requests",
    methods: ["GET", "POST"],
    level: "verified",
    claimedBy: { table: "customers", column: "customer_id" },
    select: ["id", "variant_id", "sku", "asked_at", "notified_at"],
    writable: ["variant_id", "language"],
    requires: ["variant_id"],
  },

  // ── the catalogue ────────────────────────────────────────────────────────────
  ...CATALOGUE,

  // ── placing an order ─────────────────────────────────────────────────────────
  placeOrder("goods", "online"),
  placeOrder("gift", "online"),
  placeOrder("goods", "transfer"),
  placeOrder("gift", "transfer"),

  // ── a message to the shop, and the newsletter box ────────────────────────────
  {
    table: "enquiries",
    methods: ["POST"],
    humanCheck: true,
    select: ["id", "topic", "status"],
    writable: ["name", "email", "topic", "message", "order_number", "language", "client_key"],
    requires: ["name", "email", "topic", "message"],
    anonymous: { perValue: { columns: ["email"], n: 3 }, perIpHour: 3, perKeyHour: 60, plainText: ["name"] },
    clientKey: "client_key",
  },
  {
    table: "news_signups",
    methods: ["POST"],
    humanCheck: true,
    level: "verified",
    select: ["id"],
    writable: ["email", "language", "news", "client_key"],
    requires: ["email"],
    claimedBy: { table: "customers", column: "customer_id", optional: true },
    identity: { table: "customers", email: "email", link: "customer_id", fill: { language: "language" } },
    consent: NEWS_TICK,
    anonymous: { perValue: { columns: ["email"], n: 3 }, perIpHour: 5, perKeyHour: 120 },
    clientKey: "client_key",
  },

  // ── one order, by its own link ───────────────────────────────────────────────
  {
    table: "orders",
    key: LINK_KEY,
    methods: ["GET", "PATCH"],
    select: ORDER_SELECT,
    claim: { by: "token", column: "link_token", expires: "link_expires", stopped: "link_stopped", own: true, address: "email" },
    ...OWN_MOVES,
  },
  ...underOrder(LINK_KEY),
  // Through the order's own link a return is asked in two writes: the return, then each of its pieces, while it is
  // still asked. (A row's own link makes only rows under the row it opens, one at a time.)
  {
    table: "returns",
    key: LINK_KEY,
    methods: ["POST"],
    level: "verified",
    visibleWith: { table: "orders", via: "order_id" },
    select: RETURN_SELECT,
    writable: ["order_id", "reason", "note", "tracking"],
    requires: ["order_id", "reason"],
  },
  // A returned piece names its variant (copied from its line, for Inventory's "back in stock"): every key that makes
  // one reads the variants it may name, on sale or not. Only what a returns page shows of one.
  { table: "variants", key: LINK_KEY, methods: ["GET"], select: ["id", "product_id", "sku", "colour_label", "size_label"], filterable: [{ column: "id", ops: ["eq", "in"] }] },
  {
    table: "return_lines",
    key: LINK_KEY,
    methods: ["POST"],
    level: "verified",
    visibleWith: { table: "returns", via: "return_id" },
    select: RETURN_LINE_SELECT,
    writable: ["return_id", "line_id", "qty"],
    requires: ["return_id", "line_id", "qty"],
  },
];
