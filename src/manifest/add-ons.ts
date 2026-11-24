/**
 * The add-ons this shop works better with. It needs none: browsing, ordering,
 * paying, packing and shipping all work on Adminium alone.
 *
 * Five are needed by a feature and offered ticked: Inventory counts each
 * variant's stock (`stock`); Offers & gift cards takes codes and gift cards
 * and sells e-gift cards (`codes`, `gift-cards`); Invoices & Receipts draws
 * the receipt and the packing slip (`receipts`, `packing-slips`); Forms &
 * surveys keeps the customers' reviews and confirms a newsletter sign-up
 * (`reviews`, `news-confirm`). Without one, its feature is off and the rest
 * of the shop works as before. Shipping labels buys real labels on the shop's
 * own Shippo account (`shipping-labels`). DHL stays a demo of the dispatch flow
 * (`labels`). Without either, staff type the carrier and tracking number.
 *
 * Every range names this round's add-ons release: Inventory's words for a
 * hold, Offers' cards sold online and their recall, Invoices' packing slip and
 * the receipt's delivery and payment rows, Forms' reviews, and DHL and
 * Barcode labels attached to this shop's 0.2 line.
 */
import { l } from "./labels.ts";

export const ADD_ONS_RANGE = "^1.0.33";

export const ADD_ONS = {
  suggests: [
    { key: "inventory", range: ADD_ONS_RANGE, checked: true, reason: l("Count each size and colour, hold what is ordered, and show shoppers \"Only 3 left\".") },
    { key: "offers", range: ADD_ONS_RANGE, checked: true, reason: l("Take discount codes and gift cards at checkout, and sell e-gift cards.") },
    { key: "invoices", range: ADD_ONS_RANGE, checked: true, reason: l("Give customers a receipt, and print packing slips for a day's orders.") },
    { key: "forms", range: ADD_ONS_RANGE, checked: true, reason: l("Take reviews from customers who bought, and confirm newsletter sign-ups.") },
    { key: "shipping-dhl", range: ADD_ONS_RANGE, reason: l("Try DHL's dispatch flow on the desk (a demo carrier this release).") },
    { key: "shipping-shippo", range: "^1.0.36", reason: l("Buy shipping labels on your own Shippo account.") },
    { key: "barcode-labels", range: ADD_ONS_RANGE, reason: l("Print SKU labels for the stockroom.") },
    { key: "live-chat", range: ADD_ONS_RANGE, reason: l("Answer shoppers in a chat window on the shop.") },
  ],
  features: [
    { id: "stock", label: l("Stock per size and colour"), requires: ["inventory"] },
    { id: "codes", label: l("Discount codes and offers"), requires: ["offers"] },
    { id: "gift-cards", label: l("Gift cards"), requires: ["offers"] },
    { id: "receipts", label: l("Receipts"), requires: ["invoices"] },
    { id: "packing-slips", label: l("Packing slips"), requires: ["invoices"] },
    { id: "reviews", label: l("Customer reviews"), requires: ["forms"] },
    { id: "news-confirm", label: l("Confirm newsletter sign-ups by e-mail"), requires: ["forms"] },
    { id: "labels", label: l("DHL dispatch (demo carrier)"), requires: ["shipping-dhl"] },
    { id: "shipping-labels", label: l("Shipping labels"), requires: ["shipping-shippo"] },
    { id: "sku-labels", label: l("SKU labels"), requires: ["barcode-labels"] },
  ],
};
