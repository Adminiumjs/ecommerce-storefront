/**
 * The shop's section in Adminium's console: the Overview, the records the
 * desk works on, and the lists the owner manages the shop with.
 *
 * The desk (the staff screens) is the day's work: Today, Orders, Packing,
 * Returns, Products, Reviews, Customers, Settings. These pages are the
 * owner's: every row, every column, for the rare change the desk does not
 * make, and the shop's price lists (shipping, states and tax, closures, size
 * guides, gift card amounts). The packer never sees them.
 */
import { l, titles } from "./labels.ts";

export const NAV_GROUPS = [
  { key: "records", label: l("Records"), order: 1 },
  { key: "manage", label: l("Manage"), order: 2 },
];

type Field = Record<string, unknown>;
const f = (column: string, more: Field = {}): Field => ({ column, ...more });
const title = (column: string): Field => ({ column, control: "title", span: 2 });
const wide = (column: string, control = "textarea"): Field => ({ column, control, span: 2 });
const toggle = (column: string): Field => ({ column, control: "toggle-row" });
const money = (column: string): Field => ({ column, control: "currency" });
const ref = (column: string): Field => ({ column, control: "reference" });
const when = (column: string): Field => ({ column, control: "datetime" });
const day = (column: string): Field => ({ column, control: "date" });
const rows = (relation: string, columns: Field[]): Field => ({ relation, control: "child-rows", span: 2, columns });
const form = (...sections: Field[][]) => ({
  form: { v: 2, sections: sections.map((fields, i) => ({ id: `s${String(i + 1)}`, fields })) },
});

interface PageSpec {
  ref: string;
  template: string;
  title: string;
  group: string;
  icon: string;
  order: number;
  table?: string;
  config: Record<string, unknown>;
}

const SPECS: PageSpec[] = [
  // ── records ───────────────────────────────────────────────────────────────
  {
    ref: "ecommerce-orders",
    template: "page-crud",
    title: "Orders",
    group: "records",
    icon: "receipt",
    order: 1,
    table: "orders",
    config: form(
      [title("number"), f("status", { control: "segmented" }), f("kind", { control: "segmented" }), f("pay_method", { control: "segmented" })],
      [f("name"), f("email", { control: "email" }), ref("customer_id"), f("language")],
      [f("ship_name"), f("address_line1"), f("address_line2"), f("city"), ref("region_id"), f("zip"), ref("offer_id")],
      [
        rows("order_lines", [
          { column: "variant_id", control: "reference", width: "2fr" },
          { column: "qty", width: "80px" },
          { column: "each", control: "currency", width: "110px" },
          { column: "line", control: "currency", width: "110px" },
        ]),
      ],
      [money("goods"), money("discount"), money("net"), money("shipping"), money("tax"), money("gifts"), money("total"), money("paid"), money("due"), money("refunded")],
      [when("placed_at"), when("pay_by"), day("transfer_by"), when("paid_at"), day("ships_by"), day("arrives_from"), day("arrives_to"), when("packed_at"), f("packed_by"), when("shipped_at"), f("shipped_by")],
      [f("carrier"), f("tracking"), f("cancel_reason", { control: "select" }), when("cancelled_at"), f("cancelled_by"), wide("staff_note")],
      [when("link_expires"), toggle("link_stopped")],
    ),
  },
  {
    ref: "ecommerce-order-lines",
    template: "page-crud",
    title: "Order lines",
    group: "records",
    icon: "list",
    order: 2,
    table: "order_lines",
    config: form([ref("order_id"), ref("variant_id"), f("sku"), f("product_name"), f("variant_label"), f("qty", { control: "stepper" }), money("each"), money("line"), money("discount"), f("returned_qty"), when("reviewed_at")]),
  },
  {
    ref: "ecommerce-returns",
    template: "page-crud",
    title: "Returns",
    group: "records",
    icon: "undo-2",
    order: 3,
    table: "returns",
    config: form(
      [title("number"), f("status", { control: "segmented" }), ref("order_id"), f("reason", { control: "select" })],
      [wide("note"), f("tracking"), wide("staff_reason", "text"), wide("staff_note")],
      [rows("return_lines", [{ column: "line_id", control: "reference", width: "2fr" }, { column: "qty", width: "80px" }, { column: "refund", control: "currency", width: "110px" }, { column: "restock", width: "110px" }])],
      [money("refund_goods"), money("shipping_refund"), money("refund_amount"), money("refunded_total")],
      [when("asked_at"), when("approved_at"), when("declined_at"), when("received_at"), f("received_by"), when("refunded_at")],
    ),
  },
  {
    ref: "ecommerce-products",
    template: "page-crud",
    title: "Products",
    group: "records",
    icon: "package",
    order: 4,
    table: "products",
    config: form(
      [title("name"), f("slug"), ref("category_id"), money("price"), f("status", { control: "segmented" })],
      [wide("blurb", "text"), wide("description"), f("size_name"), ref("size_guide_id")],
      [toggle("featured"), day("new_until"), f("position", { control: "stepper" })],
      [rows("variants", [{ column: "sku", width: "1fr" }, { column: "colour_id", control: "reference", width: "1fr" }, { column: "size_id", control: "reference", width: "1fr" }, { column: "price_delta", control: "currency", width: "110px" }, { column: "active", width: "90px" }, { column: "sold_out", width: "90px" }])],
    ),
  },
  {
    ref: "ecommerce-variants",
    template: "page-crud",
    title: "Variants",
    group: "records",
    icon: "boxes",
    order: 5,
    table: "variants",
    config: form([title("sku"), ref("product_id"), ref("colour_id"), ref("size_id"), money("price_delta"), money("price"), f("weight_g", { control: "stepper" }), toggle("active"), toggle("sold_out")]),
  },
  {
    ref: "ecommerce-categories",
    template: "page-crud",
    title: "Categories",
    group: "records",
    icon: "folder-tree",
    order: 6,
    table: "categories",
    config: form([title("name"), f("slug"), f("icon", { control: "select" }), f("position", { control: "stepper" })]),
  },
  {
    ref: "ecommerce-customers",
    template: "page-crud",
    title: "Customers",
    group: "records",
    icon: "contact",
    order: 7,
    table: "customers",
    config: form([title("name"), f("email", { control: "email" }), f("language"), toggle("news"), when("news_since"), when("created_at"), when("forgotten_at")]),
  },
  {
    ref: "ecommerce-restock-requests",
    template: "page-crud",
    title: "Back-in-stock requests",
    group: "records",
    icon: "bell",
    order: 8,
    table: "restock_requests",
    config: form([ref("variant_id"), ref("customer_id"), f("sku"), when("asked_at"), when("notified_at")]),
  },
  {
    ref: "ecommerce-enquiries",
    template: "page-crud",
    title: "Messages from customers",
    group: "records",
    icon: "inbox",
    order: 9,
    table: "enquiries",
    config: form([f("name"), f("email", { control: "email" }), f("topic", { control: "select" }), f("order_number"), f("status", { control: "segmented" }), wide("message"), when("created_at")]),
  },
  {
    ref: "ecommerce-messages",
    template: "page-crud",
    title: "E-mails",
    group: "records",
    icon: "mail",
    order: 10,
    table: "messages",
    config: form([f("kind"), f("status", { control: "select" }), f("to_address", { control: "email" }), f("language"), ref("order_id"), ref("return_id"), ref("customer_id"), when("due"), when("sent_at"), f("skip_reason", { control: "select" }), wide("error", "text")]),
  },

  // ── manage ────────────────────────────────────────────────────────────────
  {
    ref: "ecommerce-settings",
    template: "page-crud",
    title: "Settings",
    group: "manage",
    icon: "settings",
    order: 1,
    table: "settings",
    config: form(
      [title("shop_name"), f("email", { control: "email" }), f("phone", { control: "phone" })],
      [f("address_line1"), f("address_line2"), f("city"), f("state_code"), f("zip")],
      [f("ref_prefix"), f("first_number", { control: "number" }), toggle("taking_orders"), f("pay_hold_minutes", { control: "stepper" }), f("max_pieces", { control: "stepper" })],
      [toggle("transfer_on"), f("transfer_name"), f("transfer_bank"), f("transfer_routing"), f("transfer_account"), f("transfer_days", { control: "stepper" })],
      [f("return_days", { control: "stepper" }), toggle("refund_shipping_faulty")],
      [f("promise_1"), f("promise_2"), f("promise_3"), wide("about"), wide("privacy"), wide("terms"), f("review_link")],
    ),
  },
  {
    ref: "ecommerce-shipping-services",
    template: "page-crud",
    title: "Shipping services",
    group: "manage",
    icon: "truck",
    order: 2,
    table: "shipping_services",
    config: form([title("label"), f("code"), f("transit_min", { control: "stepper" }), f("transit_max", { control: "stepper" }), f("dhl_product"), toggle("active"), f("position", { control: "stepper" })]),
  },
  {
    ref: "ecommerce-shipping-prices",
    template: "page-crud",
    title: "Shipping prices",
    group: "manage",
    icon: "badge-dollar-sign",
    order: 3,
    table: "shipping_offers",
    config: form([ref("service_id"), ref("zone_id"), money("price"), money("free_from"), toggle("active")]),
  },
  {
    ref: "ecommerce-regions",
    template: "page-crud",
    title: "States and tax",
    group: "manage",
    icon: "map",
    order: 4,
    table: "regions",
    config: form([title("name"), f("code"), ref("zone_id"), f("tax_rate", { control: "number" }), toggle("active")]),
  },
  {
    ref: "ecommerce-zones",
    template: "page-crud",
    title: "Shipping zones",
    group: "manage",
    icon: "globe",
    order: 5,
    table: "zones",
    config: form([title("label"), f("code")]),
  },
  {
    ref: "ecommerce-closures",
    template: "page-crud",
    title: "Closures",
    group: "manage",
    icon: "calendar-x",
    order: 6,
    table: "closures",
    config: form([day("from_date"), day("to_date"), wide("reason", "text"), toggle("active")]),
  },
  {
    ref: "ecommerce-size-guides",
    template: "page-crud",
    title: "Size guides",
    group: "manage",
    icon: "ruler",
    order: 7,
    table: "size_guides",
    config: form([title("name"), wide("note", "text")]),
  },
  {
    ref: "ecommerce-gift-amounts",
    template: "page-crud",
    title: "Gift card amounts",
    group: "manage",
    icon: "gift",
    order: 8,
    table: "gift_amounts",
    config: form([money("amount"), toggle("active"), f("position", { control: "stepper" })]),
  },
];

const pageOf = (spec: PageSpec) => ({
  ref: spec.ref,
  template: spec.template,
  title: { key: `mft.${spec.ref.replaceAll("-", ".")}`, fallback: spec.title },
  titles: titles(spec.title),
  nav: { group: spec.group, icon: spec.icon, order: spec.order },
  ...(spec.table === undefined ? {} : { bindings: { rows: spec.table } }),
  config: spec.config,
});

export function pages(): unknown[] {
  return SPECS.map(pageOf);
}

export const PAGE_REFS = SPECS.map((spec) => spec.ref);
