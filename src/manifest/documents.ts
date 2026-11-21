/**
 * The documents the shop declares, drawn by Invoices & Receipts.
 *
 *   receipt       for an order (the feature `receipts`): each line as it was
 *                 sold, its name, the colour and size under it, how many, the
 *                 price of one and the line; the goods, the delivery on a row of
 *                 its own (nothing from "free from" up prints no row), the
 *                 state's sales tax at its rate, and the total — a total below
 *                 them prints the codes' reductions as the difference; under it
 *                 each payment that paid it (online, a gift card, a transfer).
 *   packing-slip  for an order (the feature `packing-slips`): what goes in the
 *                 parcel, for whoever packs it. No money: the slip's outline
 *                 has no slot a price could be mapped to, so the packer, who
 *                 reads no money, may draw it. Its number, whom it is for, how
 *                 it goes, and each line counted.
 *
 * The receipt reads the order's money, so only a role that reads it may draw
 * it: Adminium refuses a document to whoever cannot read every table and
 * column it reads.
 *
 * The packing slip prints no address yet: a document slot of lines reads one
 * column, and no formula may put a person's address together into one (their
 * street, city and ZIP are personal data). The carrier's label carries it.
 */
import { l } from "./labels.ts";

export const DOCUMENTS = [
  {
    kind: "receipt",
    addOn: "invoices",
    table: "orders",
    feature: "receipts",
    name: l("Receipt"),
    mapping: {
      reference: { column: "number" },
      issuedAt: { column: "placed_at" },
      customerName: { column: "name" },
      customerEmail: { column: "email" },
      items: {
        collection: {
          table: "order_lines",
          via: "order_id",
          orderBy: "id",
          columns: { desc: "product_name", options: "variant_label", qty: "qty", rate: "each", amount: "line" },
        },
      },
      subtotal: { column: "goods" },
      delivery: { column: "shipping" },
      taxRate: { column: "tax_rate" },
      tax: { column: "tax" },
      total: { column: "total" },
      payments: {
        collection: {
          table: "payments",
          via: "order_id",
          orderBy: "id",
          columns: { paidOn: "paid_at", method: "method", amount: "amount" },
        },
      },
    },
  },
  {
    kind: "packing-slip",
    addOn: "invoices",
    table: "orders",
    feature: "packing-slips",
    name: l("Packing slip"),
    mapping: {
      orderNumber: { column: "number" },
      issuedAt: { column: "placed_at" },
      shipToName: { column: "ship_name" },
      deliveryService: { column: "service_label" },
      items: {
        collection: {
          table: "order_lines",
          via: "order_id",
          orderBy: "id",
          columns: { desc: "product_name", variant: "variant_label", sku: "sku", qty: "qty" },
        },
      },
    },
  },
  {
    // SKU labels for the stockroom: one variant's SKU as a Code 128 label, as many as the person printing asks.
    kind: "label-sheet",
    addOn: "barcode-labels",
    table: "variants",
    feature: "sku-labels",
    name: l("SKU labels"),
    mapping: {
      sku: { column: "sku" },
      code: { column: "sku" },
      reference: { column: "product_name" },
    },
    requestValues: ["count"],
  },
];
