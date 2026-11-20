/**
 * Who may do what, enforced by Adminium on every read and write.
 *
 *   owner    everything: the console's section, the catalogue and its
 *            prices, the settings, the customers, the e-mails; refunds of
 *            what a customer paid online; recording a bank transfer; the
 *            desk; moderating the shop's reviews (Forms & surveys keeps
 *            them); finding and erasing a customer.
 *   packer   the desk's screens only, never the console or the Overview:
 *            the orders to pack and ship (who and where, never an e-mail
 *            address and never money), marking them packed and shipped with
 *            a carrier and a tracking number, a return received and whether
 *            each piece goes back in stock. Never a price, a refund, a
 *            customer, a payment, a cancel or "Mark as paid".
 *
 * The desk shows or hides a button by the role, but the grants and limits
 * below are what refuse the write: a hidden button is not a lock. The
 * packer's column lists are what keep money out of their reads: one plain
 * read from another role would lift them, so the packer holds no other.
 */
import { PAGE_REFS } from "./pages.ts";
import { SHOP_CANCEL_REASONS, TABLE_REFS, TABLES } from "./tables.ts";

const grant = (table: string, ...actions: string[]) => actions.map((action) => `table:@${table}:${action}`);
const view = (page: string) => `page:@${page}:view`;
/** Seeing a table's personal columns. */
const pii = (table: string) => `table:@${table}:read_pii`;

/** The columns of a table Adminium decides: no role types them. */
const decided = (ref: string): Set<string> =>
  new Set(
    TABLES.find((t) => t.ref === ref)!
      .columns.filter((c) => {
        const rules = c.rules ?? {};
        return c.ref === "id" || ["rollup", "formula", "copy", "band", "stamp", "sequence", "format", "code", "lookup", "codeLast4"].some((rule) => rules[rule] !== undefined);
      })
      .map((c) => c.ref),
  );
/** Every column a person types on a table, less some. */
const typed = (ref: string, ...leaveOut: string[]): string[] =>
  TABLES.find((t) => t.ref === ref)!
    .columns.map((c) => c.ref)
    .filter((c) => !decided(ref).has(c) && !leaveOut.includes(c));

/** The customer's own on an order: their tick, the link's code, their retry key; and what an add-on or the payment decides. */
export const CUSTOMERS_OWN = ["news", "link_token", "client_key", "discount", "due", "customer_proved", "status", "kind", "pay_method"];

/** A gift card's whole code is typed and never read back. */
const PAYMENT_READS = TABLES.find((t) => t.ref === "payments")!.columns.map((c) => c.ref).filter((ref) => ref !== "card_code");

/** What the packer reads of an order: who, where, by when, how it ships. No e-mail and no money. */
export const PACKER_ORDER_READS = [
  "id",
  "number",
  "status",
  "kind",
  "name",
  "ship_name",
  "address_line1",
  "address_line2",
  "city",
  "zip",
  "region_id",
  "state_code",
  "zone_id",
  "offer_id",
  "service_id",
  "pieces",
  "weight_g",
  "placed_at",
  "paid_at",
  "ships_by",
  "stock_until",
  "packed_at",
  "packed_by",
  "shipped_at",
  "shipped_by",
  "carrier",
  "tracking",
  "cancelled_at",
  "staff_note",
];
export const PACKER_LINE_READS = ["id", "order_id", "variant_id", "qty", "sku", "product_id", "category_id", "product_name", "colour", "size", "variant_label", "weight_g", "line_weight_g", "returned_qty"];
const PACKER_VARIANT_READS = ["id", "product_id", "colour_id", "size_id", "colour_code", "size_code", "colour_label", "size_label", "combo", "sku", "weight_g", "active", "sold_out", "category_id", "product_name", "product_status", "stock_name"];
const PACKER_PRODUCT_READS = ["id", "name", "slug", "category_id", "category_name", "size_guide_id", "size_name", "status", "position"];
const PACKER_RETURN_READS = ["id", "number", "order_id", "order_number", "status", "reason", "note", "tracking", "staff_note", "asked_at", "approved_at", "received_at", "received_by"];
const PACKER_RETURN_LINE_READS = ["id", "return_id", "line_id", "qty", "variant_id", "sku", "product_name", "variant_label", "restock", "void_at"];

/** Inventory's rows the desk reads to show each variant's stock: the packer without costs. */
const INVENTORY_READS = [
  { addOn: "inventory", table: "items", actions: ["read"], limit: { readable: ["id", "name", "sku", "unit_id", "active"] } },
  { addOn: "inventory", table: "links", actions: ["read"], limit: { readable: ["id", "source_table", "source_row", "kind", "item_id", "qty", "per", "action"] } },
  { addOn: "inventory", table: "places", actions: ["read"], limit: { readable: ["id", "name"] } },
  { addOn: "inventory", table: "stock_points", actions: ["read"], limit: { readable: ["id", "item_id", "place_id", "on_hand", "available", "held", "low", "state"] } },
];
/** The shop's reviews, kept by Forms & surveys: read and moderated, the shop's own only. */
const REVIEWS = [
  { addOn: "forms", table: "reviews", actions: ["read", "update"], limit: { writable: ["state", "hide_reason", "reply"] } },
  { addOn: "forms", table: "review_totals", actions: ["read"] },
];
/** What Offers & gift cards wrote on an order: what each code took off. */
const APPLIED_READ = { addOn: "offers", table: "applied", actions: ["read"], limit: { readable: ["source_table", "source_row", "source_line", "name", "kind", "amount", "typed", "at"] } };

const REFUND_WRITTEN = ["payment_id", "return_id", "client_key", "amount", "reason"];

export const ROLES = [
  {
    key: "owner",
    name: "Owner",
    permissions: [
      "app:@:staff",
      ...TABLE_REFS.flatMap((table) =>
        // The e-mails are the shop's record of what was sent; a payment and a refund are records of money: nobody deletes them.
        ["messages", "payments", "payment_refunds"].includes(table) ? grant(table, "read", "create", "update") : grant(table, "read", "create", "update", "delete"),
      ),
      ...PAGE_REFS.flatMap((page) => [view(page), `page:@${page}:edit`]),
      ...["orders", "customers", "enquiries", "messages", "gift_lines", "news_signups"].map(pii),
      "privacy:@:people",
      // Giving back money a customer paid online for one of the shop's orders, and only those (shown at install).
      "payments:@:refund",
    ],
    limits: {
      orders: {
        writable: typed("orders", ...CUSTOMERS_OWN).concat(["status"]),
        creatable: typed("orders", ...CUSTOMERS_OWN),
        writableValues: { cancel_reason: SHOP_CANCEL_REASONS },
      },
      // "Mark as paid": a bank transfer the owner records, with its amount, day and note. Money online is Adminium's.
      payments: { readable: PAYMENT_READS, creatable: ["order_id", "method", "amount", "paid_at", "note", "client_key"], creatableValues: { method: ["transfer"] }, writable: ["note"] },
      payment_refunds: { creatable: REFUND_WRITTEN, writable: ["reason"] },
    },
    tables: [...INVENTORY_READS, ...REVIEWS, APPLIED_READ],
  },
  {
    key: "packer",
    name: "Packer",
    screensOnly: true,
    permissions: [
      "app:@:staff",
      ...["settings", "categories", "products", "variants", "option_values", "product_pictures", "shipping_services", "zones", "regions", "closures", "orders", "order_lines", "returns", "return_lines"].flatMap((table) => grant(table, "read")),
      pii("orders"),
      ...grant("orders", "update"),
      ...grant("returns", "update"),
      ...grant("return_lines", "update"),
    ],
    limits: {
      orders: {
        readable: PACKER_ORDER_READS,
        writable: ["status", "carrier", "tracking", "staff_note"],
        writableValues: { status: ["packed", "shipped", "paid"] },
        writableFrom: { status: ["paid", "packed"] },
      },
      order_lines: { readable: PACKER_LINE_READS },
      products: { readable: PACKER_PRODUCT_READS },
      variants: { readable: PACKER_VARIANT_READS },
      settings: { readable: ["id", "shop_name", "address_line1", "address_line2", "city", "state_code", "zip", "phone", "return_days"] },
      returns: { readable: PACKER_RETURN_READS, writable: ["status", "staff_note"], writableValues: { status: ["received"] }, writableFrom: { status: ["approved"] } },
      return_lines: { readable: PACKER_RETURN_LINE_READS, writable: ["restock"] },
    },
    tables: INVENTORY_READS.map((entry) => (entry.table === "stock_points" ? { ...entry, limit: { readable: ["id", "item_id", "place_id", "on_hand", "available", "held", "low", "state"] } } : entry)),
  },
];
