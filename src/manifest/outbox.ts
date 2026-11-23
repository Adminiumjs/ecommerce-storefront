/**
 * The shop's e-mails: the `messages` table is the outbox, and every e-mail is
 * a row in it the console lists.
 *
 * To the customer, every one service mail (each is about their own order,
 * return, request or sign-up):
 *   order-paid              the order is paid: what it is, what it came to,
 *                           when it ships and arrives, and its own link. A
 *                           bank transfer the owner records sends it too;
 *   order-transfer          placed with payments off: the shop's bank
 *                           details, the reference, the day to pay by;
 *   transfer-reminder       the one nudge, three days after placing, while
 *                           the transfer has not come;
 *   transfer-cancelled      the transfer never came: the clock cancelled it;
 *   order-cancelled-unpaid  paying online, it was not paid in time;
 *   order-cancelled         cancelled as the customer asked (on their order's
 *                           page, or by asking the shop): what comes back;
 *   order-cancelled-by-us   the shop had to cancel it, and why;
 *   order-shipped           on its way: the service, the carrier, the
 *                           tracking number;
 *   gift-sent               a gift-cards-only order went: Offers & gift cards
 *                           mails each card to the person it is for, and the
 *                           buyer is told it went (never the code);
 *   return-*                one e-mail per step of a return: asked, approved,
 *                           received, refunded, or declined with the shop's
 *                           reason;
 *   back-in-stock           a variant asked about is in again: once, ever;
 * and one marketing mail:
 *   news-welcome            "You're on the list", to a newsletter sign-up
 *                           that said yes. Adminium adds its unsubscribe link,
 *                           its headers and the postal address itself.
 * To the shop's own address in Settings (staff mail, no class):
 *   staff-new-order, staff-return, staff-enquiry.
 *
 * Two more e-mails a customer gets are not the app's: the code they sign in
 * (and find an order) with is Adminium's own, and a gift card's code is
 * Offers & gift cards' own e-mail to the person it is for.
 *
 * Each kind goes once for its row (the outbox is the log): a cancel the clock
 * or the desk makes again is never told twice. An e-mail about an order is
 * addressed to its customer and written in the language the order was placed
 * in; a reply to any of them reaches the shop's own mailbox.
 */

export const KINDS = [
  "order-paid",
  "order-transfer",
  "transfer-reminder",
  "transfer-cancelled",
  "order-cancelled-unpaid",
  "order-cancelled",
  "order-cancelled-by-us",
  "order-shipped",
  "order-new-number",
  "gift-sent",
  "return-asked",
  "return-approved",
  "return-received",
  "return-refunded",
  "return-declined",
  "back-in-stock",
  "news-welcome",
  "staff-new-order",
  "staff-return",
  "staff-enquiry",
] as const;
export type Kind = (typeof KINDS)[number];

/** Mail to the shop's own address: no class. */
export const TO_SHOP: ReadonlySet<Kind> = new Set(["staff-new-order", "staff-return", "staff-enquiry"]);

/** The one marketing mail: it goes only to a yes in the consent log, and carries Adminium's unsubscribe. */
export const MARKETING: ReadonlySet<Kind> = new Set(["news-welcome"]);

/** The outbox's kinds, as the E-mails page names them (the `messages` table's `kind`). */
export const KIND_NAMES: Record<Kind, string> = {
  "order-paid": "Order paid",
  "order-transfer": "Order placed, to pay by bank transfer",
  "transfer-reminder": "Bank transfer reminder",
  "transfer-cancelled": "Cancelled: the bank transfer didn't come",
  "order-cancelled-unpaid": "Cancelled: not paid in time",
  "order-cancelled": "Cancelled as the customer asked",
  "order-cancelled-by-us": "Cancelled by the shop",
  "order-shipped": "Order shipped",
  "order-new-number": "Your parcel has a new tracking number",
  "gift-sent": "Gift cards sent",
  "return-asked": "Return asked",
  "return-approved": "Return approved",
  "return-received": "Return received",
  "return-refunded": "Return refunded",
  "return-declined": "Return declined",
  "back-in-stock": "Back in stock",
  "news-welcome": "Newsletter welcome",
  "staff-new-order": "Shop: a new order",
  "staff-return": "Shop: a return asked",
  "staff-enquiry": "Shop: a message",
};

/** The shop's own address (R5): without one, nothing is sent to the shop. */
const shop = { setting: { table: "settings", column: "email" } };

const onOrder = (to: string, where?: Record<string, unknown>) => ({ onChange: { table: "orders", column: "status", to, ...(where === undefined ? {} : { where }) } });
const onReturn = (to: string) => ({ onChange: { table: "returns", column: "status", to } });

/**
 * The clock cancels an unpaid order the same way however it was to be paid;
 * the e-mail says which. Each waits a few seconds, and the one for the other
 * way to pay is dropped.
 */
const unpaidBy = (other: "online" | "transfer") => ({
  ...onOrder("cancelled", { column: "cancel_reason", eq: "unpaid" }),
  holdSeconds: 5,
  dropWhen: [{ column: "pay_method", eq: other, reason: "no-longer-needed" }],
});

/**
 * A return is asked in one write signed in, and in two through the order's
 * own link (the return, then its pieces): its e-mails wait a minute, so they
 * list the pieces and the refund they come to.
 */
const ONCE_ITS_PIECES_ARE_IN = 60;

export const OUTBOX = {
  table: "messages",
  columns: {
    kind: "kind",
    status: "status",
    to: "to_address",
    language: "language",
    due: "due",
    sentAt: "sent_at",
    error: "error",
    skipReason: "skip_reason",
    repeatKey: "repeat_key",
  },
  links: { order: "order_id", return: "return_id", enquiry: "enquiry_id", request: "request_id", signup: "signup_id", customer: "customer_id" },
  recipient: {
    via: "customer_id",
    table: "customers",
    email: "email",
    name: "name",
    // Written in the language the order (the return, the request) was placed in, whatever the customer's row says.
    language: { column: "language" },
    // An order nobody's customer row holds carries its own name and address.
    fallback: { via: "order_id", email: "email", name: "name", language: "language" },
  },
  // A reply to any of them reaches the shop's own mailbox, as the e-mails promise (N3-F8).
  settings: { table: "settings", name: "shop_name", phone: "phone", replyTo: "email" },
  // An order's own link opens its page on the shop's side, its code in the fragment (`/o#<code>`).
  pages: { manage: "/o", booking: "/" },
  kinds: Object.fromEntries(KINDS.map((kind) => [kind, `ecommerce-shop-${kind}`])),
  classes: Object.fromEntries(KINDS.filter((kind) => !TO_SHOP.has(kind)).map((kind) => [kind, MARKETING.has(kind) ? "marketing" : "service"])),
  producers: [
    // Paid, online or by a transfer the owner recorded: the receipt and the dates. A gift-cards-only order has its own.
    { kind: "order-paid", link: "order_id", ...onOrder("paid", { column: "kind", eq: "goods" }) },
    // Payments off: the order waits for a bank transfer from the moment it is written.
    { kind: "order-transfer", link: "order_id", onCreate: { table: "orders", where: { column: "status", eq: "awaiting_transfer" } } },
    // The one reminder, on the third day at nine, unless it is paid or cancelled by then.
    {
      kind: "transfer-reminder",
      link: "order_id",
      onCreate: { table: "orders", where: { column: "status", eq: "awaiting_transfer" } },
      due: { date: "placed_at", days: 3, at: "09:00" },
      dropWhen: [
        { column: "due", lte: 0, reason: "paid" },
        { column: "status", eq: "cancelled", reason: "void" },
      ],
    },
    { kind: "transfer-cancelled", link: "order_id", ...unpaidBy("online") },
    { kind: "order-cancelled-unpaid", link: "order_id", ...unpaidBy("transfer") },
    // The customer cancelled it on their order's page, or asked the shop to: "you asked us to, and we have".
    { kind: "order-cancelled", link: "order_id", ...onOrder("cancelled", { column: "cancel_reason", in: ["customer", "asked"] }) },
    { kind: "order-cancelled-by-us", link: "order_id", ...onOrder("cancelled", { column: "cancel_reason", in: ["address", "stock", "other"] }) },
    { kind: "order-shipped", link: "order_id", ...onOrder("shipped") },
    // Never by a carrier's word alone: staff press to tell the customer, and that press stamps this column.
    { kind: "order-new-number", link: "order_id", onChange: { table: "orders", columns: ["new_number_at"], changed: true, where: { column: "new_number_at", isNull: false } } },
    // A gift-cards-only order is sent once it is paid; each card's code goes from Offers & gift cards to its person.
    { kind: "gift-sent", link: "order_id", gate: { feature: "gift-cards" }, ...onOrder("sent") },
    { kind: "return-asked", link: "return_id", onCreate: { table: "returns" }, holdSeconds: ONCE_ITS_PIECES_ARE_IN },
    { kind: "return-approved", link: "return_id", ...onReturn("approved") },
    { kind: "return-received", link: "return_id", ...onReturn("received") },
    { kind: "return-refunded", link: "return_id", ...onReturn("refunded") },
    { kind: "return-declined", link: "return_id", ...onReturn("declined") },
    // The back-in-stock rule stamps the request when Inventory says the variant is in: that stamp sends this, once.
    {
      kind: "back-in-stock",
      link: "request_id",
      onChange: { table: "restock_requests", columns: ["notified_at"], changed: true, where: { column: "notified_at", isNull: false } },
    },
    // The newsletter box said yes: welcome, once. The consent log is what lets it go.
    { kind: "news-welcome", link: "signup_id", onCreate: { table: "news_signups", where: { column: "news", eq: true } } },
    // To the shop: an order to pack, a return to decide, a message to answer.
    { kind: "staff-new-order", link: "order_id", ...onOrder("paid"), recipient: shop },
    { kind: "staff-return", link: "return_id", onCreate: { table: "returns" }, holdSeconds: ONCE_ITS_PIECES_ARE_IN, recipient: shop },
    { kind: "staff-enquiry", link: "enquiry_id", onCreate: { table: "enquiries" }, recipient: shop },
  ],
};
