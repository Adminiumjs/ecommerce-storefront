/**
 * The shop's e-mails, one template per outbox kind, in the eight languages
 * the app ships.
 *
 * Each e-mail's words are a small record of sentences (`Words`), and the
 * layout that holds them is written once below, so a translation is only the
 * words: nobody builds a block list per language, and no language can lose a
 * block the others have. The other seven languages are in `emails-i18n.ts`.
 *
 * `{{…}}` are the outbox's variables, filled by Adminium when it sends:
 * `order.*`, `return.*`, `request.*` and `enquiry.*` through the message's
 * links (and one link further: `order.service.label` is the order's shipping
 * service, `request.variant.*` the variant asked about); `row.*` each line of
 * a list; `practice.*` the shop's settings row; `appName` the shop's name;
 * `recipient.first_name` the customer; `manage_url` the shop's order page,
 * which the order's own code opens from the fragment; `booking_url` the
 * shop's front page; `staff_url` the desk. Adminium writes every date, amount
 * and choice in the e-mail's language, and lays the whole thing out for mail
 * clients: tables, inline colours, one light palette, no SVG, and a
 * plain-text part with every figure on its own line.
 *
 * What the e-mails never read: a customer's personal columns on a linked row
 * (Adminium keeps those out of every e-mail; the customer is greeted by the
 * recipient's own name, and the address an order ships to is not repeated),
 * and anything the shop did not store. No figure is typed here: every amount,
 * date, number and day count is the row's or the settings'. Catalogue values
 * (a product's name, its colour and size, the service's name) print as the
 * shop wrote them, in every language.
 */
import type { Tag } from "./labels.ts";
import { EMAIL_TRANSLATIONS } from "./emails-i18n.ts";
import { KINDS, TO_SHOP, type Kind } from "./outbox.ts";

/** One e-mail's sentences. */
export interface Words {
  /** What the e-mail is called on the E-mails page. */
  name: string;
  subject: string;
  preheader: string;
  heading: string;
  paras: string[];
  /** Said after the lists and the buttons, in the small print's place. */
  after?: string[];
}

export type EmailWords = Record<Kind, Words> & {
  /** Under every button that opens the order's own link (N3-F15). */
  justForYou: string;
  yourOrder: string;
  yourReturn: string;
  shopAgain: string;
  visitShop: string;
  seeIt: string;
  openInDesk: string;
  /** The line under a heading that says which order, or which return. */
  orderMeta: string;
  shippedMeta: string;
  returnMeta: string;
  /** The facts rows. */
  paid: string;
  shipsBy: string;
  arrives: string;
  order: string;
  placed: string;
  service: string;
  carrier: string;
  tracking: string;
  /** The totals. */
  goods: string;
  shipping: string;
  tax: string;
  total: string;
  toPay: string;
  giftCard: string;
  /** Paying by bank transfer. */
  bankTransfer: string;
  accountName: string;
  bank: string;
  routing: string;
  account: string;
  reference: string;
  amount: string;
  payBy: string;
  /** What happens to the money of a cancelled order: paid, or never paid. */
  refunding: string;
  nothingTaken: string;
  /** Returns. */
  reason: string;
  refundIfApproved: string;
  refund: string;
  refundOnArrival: string;
  sendTo: string;
  ourReason: string;
  whyCancelled: string;
  returnDays: string;
  /** The variant that is back. */
  product: string;
  colour: string;
  size: string;
  price: string;
  /** The staff e-mails' rows. */
  from: string;
  topic: string;
  sent: string;
  asked: string;
  message: string;
  /** The footers: a question, why it came, and the shop's own. */
  help: string;
  whyOrder: string;
  whyReturn: string;
  whyNews: string;
  staffFoot: string;
};

export const EMAIL_EN: EmailWords = {
  justForYou: "This link is just for you — don't forward it.",
  yourOrder: "Your order",
  yourReturn: "Your return",
  shopAgain: "Shop again",
  visitShop: "Visit the shop",
  seeIt: "See it",
  openInDesk: "Open it in the desk",
  orderMeta: "Order {{order.number}} · placed {{order.placed_at}}",
  shippedMeta: "Order {{order.number}} · shipped {{order.shipped_at.date}}",
  returnMeta: "Return {{return.number}} · order {{order.number}} · asked {{return.asked_at}}",
  paid: "Paid",
  shipsBy: "Ships by",
  arrives: "Arrives",
  order: "Order",
  placed: "Placed",
  service: "Service",
  carrier: "Carrier",
  tracking: "Tracking number",
  goods: "Goods",
  shipping: "Shipping · {{order.service.label}}",
  tax: "Tax · {{order.state_code}}",
  total: "Total",
  toPay: "To pay",
  giftCard: "Gift card",
  bankTransfer: "Bank transfer",
  accountName: "Account name",
  bank: "Bank",
  routing: "Routing number",
  account: "Account number",
  reference: "Reference",
  amount: "Amount",
  payBy: "Pay by {{order.transfer_by}} or the order is cancelled.",
  refunding: "We're refunding {{order.total}} the way you paid. It can take a few days to show.",
  nothingTaken: "Nothing was taken.",
  reason: "Reason",
  refundIfApproved: "Refund if we approve it",
  refund: "Refund",
  refundOnArrival: "{{return.refund_amount}} once it arrives",
  sendTo: "Send it to",
  ourReason: "{{appName}}'s reason",
  whyCancelled: "Why we cancelled it",
  returnDays: "{{practice.return_days}} days to send it back. You can start a return from your order.",
  product: "Product",
  colour: "Colour",
  size: "Size",
  price: "Price",
  from: "From",
  topic: "Topic",
  sent: "Sent",
  asked: "Asked",
  message: "Message",
  help: "Questions? Reply to this e-mail, or write to {{practice.email}}.",
  whyOrder: "You're getting this e-mail because of your order {{order.number}}.",
  whyReturn: "You're getting this e-mail because of your return {{return.number}}.",
  whyNews: "You're getting this because you signed up for {{appName}} news.",
  staffFoot: "Sent to the shop's e-mail address in Settings.",
  "order-paid": {
    name: "Order paid",
    subject: "Your order {{order.number}} is paid",
    preheader: "Ships by {{order.ships_by}}. Arrives {{order.arrives_from}} – {{order.arrives_to}}.",
    heading: "Thank you, {{recipient.first_name}}. Your order is paid.",
    paras: [],
  },
  "order-transfer": {
    name: "Order placed, to pay by bank transfer",
    subject: "Order {{order.number}}: pay by bank transfer",
    preheader: "Pay {{order.total}} by {{order.transfer_by}}. Use {{order.number}} as the reference.",
    heading: "Thank you, {{recipient.first_name}}. Here's how to pay.",
    paras: ["Send {{order.total}} by bank transfer, with {{order.number}} as the reference. We ship your order once the money arrives."],
    after: ["Ships within one shipping day of your payment arriving."],
  },
  "transfer-reminder": {
    name: "Bank transfer reminder",
    subject: "Reminder: pay for order {{order.number}} by {{order.transfer_by}}",
    preheader: "We haven't received your bank transfer of {{order.total}} yet.",
    heading: "Your order is waiting for your payment",
    paras: ["We haven't received your bank transfer of {{order.total}} for order {{order.number}} yet."],
    after: ["If you've already paid, thank you. A transfer can take a day or two to reach us."],
  },
  "transfer-cancelled": {
    name: "Cancelled: the bank transfer didn't come",
    subject: "Order {{order.number}} was cancelled",
    preheader: "We didn't receive the bank transfer by {{order.transfer_by}}. Nothing was taken.",
    heading: "We cancelled order {{order.number}}",
    paras: ["We didn't receive your bank transfer by {{order.transfer_by}}, so the order was cancelled. Nothing was taken."],
    after: ["If you sent the money after that, we'll send it back to your account."],
  },
  "order-cancelled-unpaid": {
    name: "Cancelled: not paid in time",
    subject: "Your order {{order.number}} was cancelled",
    preheader: "It wasn't paid within {{practice.pay_hold_minutes}} minutes. Nothing was taken.",
    heading: "Your order was cancelled",
    paras: ["Your order was cancelled because it wasn't paid within {{practice.pay_hold_minutes}} minutes. Nothing was taken."],
  },
  "order-cancelled": {
    name: "Cancelled as the customer asked",
    subject: "Order {{order.number}} is cancelled",
    preheader: "You asked us to cancel order {{order.number}}, and we have.",
    heading: "Order {{order.number}} is cancelled",
    paras: ["You asked us to cancel it, {{recipient.first_name}}, and we have."],
  },
  "order-cancelled-by-us": {
    name: "Cancelled by the shop",
    subject: "We had to cancel order {{order.number}}",
    preheader: "We're sorry: we couldn't send your order.",
    heading: "We had to cancel order {{order.number}}",
    paras: ["We're sorry, {{recipient.first_name}}. We couldn't send your order, so we cancelled it."],
  },
  "order-shipped": {
    name: "Order shipped",
    subject: "Your order {{order.number}} is on its way",
    preheader: "Arrives {{order.arrives_from}} – {{order.arrives_to}}.",
    heading: "Your order is on its way, {{recipient.first_name}}",
    paras: [],
    after: ["Tell us how it went — you can review it from your order."],
  },
  "gift-sent": {
    name: "Gift cards sent",
    subject: "Your gift card is on its way",
    preheader: "We e-mailed it on {{order.paid_at.date}}.",
    heading: "Your gift card is on its way",
    paras: ["We e-mailed it on {{order.paid_at.date}} at {{order.paid_at.time}}. The code goes only to the person it's for."],
  },
  "return-asked": {
    name: "Return asked",
    subject: "We got your return request {{return.number}}",
    preheader: "Don't send anything yet. We'll e-mail you once we've looked at it.",
    heading: "We got your return request",
    paras: ["Please don't send anything yet. We'll look at your request and e-mail you."],
  },
  "return-approved": {
    name: "Return approved",
    subject: "Your return {{return.number}} is approved",
    preheader: "Send it to us. We'll refund {{return.refund_amount}} once it arrives.",
    heading: "Your return is approved",
    paras: ["Send it with any carrier you like. Keep the receipt until your refund arrives."],
  },
  "return-received": {
    name: "Return received",
    subject: "We got your return {{return.number}} back",
    preheader: "We're checking it now. Then we'll refund {{return.refund_amount}}.",
    heading: "We got it back",
    paras: ["We're checking it now. Once that's done, we'll refund {{return.refund_amount}} and e-mail you."],
  },
  "return-refunded": {
    name: "Return refunded",
    subject: "We've refunded {{return.refunded_total}} for return {{return.number}}",
    preheader: "It can take a few days to show.",
    heading: "We've refunded {{return.refunded_total}}",
    paras: ["We've refunded {{return.refunded_total}} the way you paid. It can take a few days to show."],
  },
  "return-declined": {
    name: "Return declined",
    subject: "We can't take return {{return.number}}",
    preheader: "Nothing has been refunded. You can keep the item.",
    heading: "We can't take this return",
    paras: ["Nothing has been refunded, and you can keep the item."],
    after: ["If you think we got this wrong, reply to this e-mail."],
  },
  "back-in-stock": {
    name: "Back in stock",
    subject: "{{request.variant.product_name}} is back in stock",
    preheader: "We sent this once, because you asked.",
    heading: "It's back",
    paras: ["The {{request.variant.product_name}} you asked about is back in stock."],
    after: ["We sent this once, because you asked. We won't e-mail you about it again."],
  },
  "news-welcome": {
    name: "Newsletter welcome",
    subject: "You're on the list",
    preheader: "{{appName}} news now and then. Say no at any time.",
    heading: "You're on the list",
    paras: ["Thanks for signing up. We'll send {{appName}} news now and then: new gear in the shop, and what we've been out testing."],
    after: ["You can say no at any time — every news e-mail has a link."],
  },
  "staff-new-order": {
    name: "Shop: a new order",
    subject: "New order {{order.number}}: {{order.paid}}",
    preheader: "Ships by {{order.ships_by}} · {{order.service.label}}",
    heading: "New order {{order.number}}",
    paras: ["{{order.name|A customer}} paid {{order.paid}}. It ships by {{order.ships_by}}."],
  },
  "staff-return": {
    name: "Shop: a return asked",
    subject: "Return asked: {{return.number}} on {{order.number}}",
    preheader: "{{return.reason.label}} · {{return.refund_amount}}",
    heading: "{{order.name|A customer}} asked to return something",
    paras: [],
  },
  "staff-enquiry": {
    name: "Shop: a message",
    subject: "New message from {{enquiry.name}}",
    preheader: "{{enquiry.topic.label}}",
    heading: "{{enquiry.name}} sent a message",
    paras: ["Write back to {{enquiry.name}} at {{enquiry.email}}."],
    after: ["Open the message in the console: Records › Messages from customers."],
  },
};

// ── the blocks ──────────────────────────────────────────────────────────────

export type Block = { block: string; id: string; data: Record<string, unknown> };

const text = (id: string, ...paras: string[]): Block => ({ block: "email.text", id, data: { paras } });
const only = (block: Block, onlyWith: string): Block => ({ ...block, data: { ...block.data, onlyWith } });
const unless = (block: Block, onlyWithout: string): Block => ({ ...block, data: { ...block.data, onlyWithout } });
/** Facts as label and value rows, the values in mono; a kicker names the box. */
const facts = (id: string, lines: { label: string; amount: string }[], kicker?: string): Block => ({
  block: "email.tax-breakdown",
  id,
  data: { lines, ...(kicker === undefined ? {} : { kicker }) },
});
const row = (label: string, amount: string) => ({ label, amount });
/** A labelled quote of words someone wrote: the shop's reason, the customer's message. */
const quote = (id: string, kicker: string, words: string): Block => ({ block: "email.po-terms", id, data: { kicker, text: words, onlyWith: words.slice(2, -2) } });
const button = (id: string, label: string, url: string): Block => ({ block: "email.button", id, data: { label, url } });

/** The order's own page, opened by the order's code in the fragment: never in the path, where logs keep it (ACC-5). */
export const ORDER_LINK = "{{manage_url}}#{{order.link_token}}";
const SHOP_LINK = "{{booking_url}}";
/** The shop's own address, as its settings hold it: the footer's last line. */
const ADDRESS = "{{appName}} · {{practice.address_line1}} · {{practice.city}}, {{practice.state_code}} {{practice.zip}}";

/** An order's lines: the product, its colour and size and SKU, how many at what, what the line comes to. */
const LINES: Block = {
  block: "email.rows",
  id: "lines",
  data: {
    from: { link: "order", table: "order_lines", via: "order_id", orderBy: "id", limit: 20 },
    row: { title: "{{row.product_name}}", meta: "{{row.variant_label}} · {{row.sku}}", amount: "{{row.line}}", note: "{{row.qty}} × {{row.each}}" },
  },
};
/** The gift cards an order sells: who each is for, and its amount. Never its code. */
const giftLines = (all: EmailWords): Block => ({
  block: "email.rows",
  id: "gift-lines",
  data: {
    from: { link: "order", table: "gift_lines", via: "order_id", orderBy: "id", limit: 5 },
    row: { title: all.giftCard, meta: "{{row.to_name|}}", amount: "{{row.amount}}", note: "{{row.message}}" },
  },
});
/**
 * What codes and offers took off, one line each, as Offers & gift cards
 * recorded them for this order. With the add-on away, or nothing taken off,
 * the list is empty and the block is left out.
 */
const REDUCTIONS: Block = {
  block: "email.rows",
  id: "reductions",
  data: {
    from: { link: "order", addOn: "offers", table: "applied", match: { table: "source_table", row: "source_row" }, orderBy: "id", limit: 20 },
    row: { title: "{{row.name}}", amount: "−{{row.amount}}" },
  },
};
/** A return's pieces: what comes back, and what each gives back. */
const RETURN_LINES: Block = {
  block: "email.rows",
  id: "return-lines",
  data: {
    from: { link: "return", table: "return_lines", via: "return_id", orderBy: "id", limit: 20 },
    row: { title: "{{row.product_name}} × {{row.qty}}", meta: "{{row.variant_label}} · {{row.sku}}", amount: "{{row.refund}}" },
  },
};

const totals = (all: EmailWords, last: string): Block[] => [
  REDUCTIONS,
  facts("totals", [row(all.goods, "{{order.goods}}"), row(all.shipping, "{{order.shipping}}"), row(all.tax, "{{order.tax}}"), row(last, "{{order.total}}")]),
];
const orderLines = (all: EmailWords): Block[] => [LINES, giftLines(all)];
/** The bank details the shop's settings hold, and the order's own reference. */
const bankDetails = (all: EmailWords): Block =>
  facts(
    "bank",
    [
      row(all.accountName, "{{practice.transfer_name}}"),
      row(all.bank, "{{practice.transfer_bank}}"),
      row(all.routing, "{{practice.transfer_routing}}"),
      row(all.account, "{{practice.transfer_account}}"),
      row(all.reference, "{{order.number}}"),
      row(all.amount, "{{order.total}}"),
    ],
    all.bankTransfer,
  );
/** What a cancelled order's money does: what was paid goes back, or nothing was taken. */
const moneyBack = (all: EmailWords): Block[] => [only(text("refund", all.refunding), "order.paid_at"), unless(text("nothing", all.nothingTaken), "order.paid_at")];
/** When it arrives, as Adminium dated it from the payment: left out while it has no date. */
const arrival = (all: EmailWords): Block => only(facts("arrives", [row(all.arrives, "{{order.arrives_from}} – {{order.arrives_to}}")]), "order.arrives_from");
const yourOrder = (all: EmailWords): Block => button("order", all.yourOrder, ORDER_LINK);
const yourReturn = (all: EmailWords): Block => button("return", all.yourReturn, ORDER_LINK);

function layout(kind: Kind, all: EmailWords) {
  const w = all[kind];
  const blocks: Block[] = [{ block: "email.heading", id: "heading", data: { text: w.heading } }];
  const body = w.paras.length === 0 ? [] : [text("body", ...w.paras)];
  let footer = [all.help, all.whyOrder, ADDRESS];
  switch (kind) {
    case "order-paid":
      blocks.push(text("meta", all.orderMeta));
      blocks.push(facts("when", [row(all.paid, "{{order.paid}}"), row(all.shipsBy, "{{order.ships_by}}")]), arrival(all));
      blocks.push(...orderLines(all), ...totals(all, all.total));
      blocks.push(yourOrder(all));
      blocks.push(text("return-days", all.returnDays));
      break;
    case "order-transfer":
      blocks.push(text("meta", all.orderMeta), ...body, bankDetails(all), text("pay-by", all.payBy));
      blocks.push(...orderLines(all), ...totals(all, all.toPay));
      blocks.push(yourOrder(all));
      break;
    case "transfer-reminder":
      blocks.push(...body, bankDetails(all), text("pay-by", all.payBy), yourOrder(all));
      break;
    case "transfer-cancelled":
      blocks.push(...body, ...orderLines(all), button("shop", all.shopAgain, SHOP_LINK));
      break;
    case "order-cancelled-unpaid":
      blocks.push(...body, facts("order", [row(all.order, "{{order.number}}"), row(all.placed, "{{order.placed_at}}")]));
      blocks.push(...orderLines(all), button("shop", all.shopAgain, SHOP_LINK));
      break;
    case "order-cancelled":
    case "order-cancelled-by-us":
      blocks.push(...body);
      if (kind === "order-cancelled-by-us") blocks.push(quote("why", all.whyCancelled, "{{order.cancel_reason.label}}"));
      blocks.push(...moneyBack(all), ...orderLines(all), ...totals(all, all.total));
      blocks.push(button("shop", all.shopAgain, SHOP_LINK), yourOrder(all));
      break;
    case "order-shipped":
      blocks.push(text("meta", all.shippedMeta));
      blocks.push(arrival(all));
      blocks.push(facts("carrier", [row(all.service, "{{order.service.label}}"), row(all.carrier, "{{order.carrier}}")]));
      // One parcel and one number an order; a carrier with no number (the DHL demo fills none) shows the carrier alone.
      blocks.push(only(facts("tracking", [row(all.tracking, "{{order.tracking}}")]), "order.tracking"));
      blocks.push(yourOrder(all), LINES);
      break;
    case "gift-sent":
      blocks.push(...body, giftLines(all), facts("order", [row(all.order, "{{order.number}}"), row(all.paid, "{{order.paid}}")]), yourOrder(all));
      break;
    case "return-asked":
      blocks.push(text("meta", all.returnMeta), RETURN_LINES);
      blocks.push(facts("refund", [row(all.reason, "{{return.reason.label}}"), row(all.refundIfApproved, "{{return.refund_amount}}")]));
      blocks.push(...body, yourReturn(all));
      footer = [all.help, all.whyReturn, ADDRESS];
      break;
    case "return-approved":
      blocks.push(text("meta", all.returnMeta), RETURN_LINES);
      // The shop's own address from its settings, a line each; a second line the shop left empty is left out.
      blocks.push({ block: "email.heading", id: "send-to", data: { text: all.sendTo, level: 2 } });
      blocks.push(text("address", "{{appName}}", "{{practice.address_line1}}", "{{practice.address_line2}}", "{{practice.city}}, {{practice.state_code}} {{practice.zip}}"));
      blocks.push(facts("refund", [row(all.refund, all.refundOnArrival)]));
      blocks.push(...body, yourReturn(all));
      footer = [all.help, all.whyReturn, ADDRESS];
      break;
    case "return-received":
      blocks.push(text("meta", all.returnMeta), RETURN_LINES, ...body, yourReturn(all));
      footer = [all.help, all.whyReturn, ADDRESS];
      break;
    case "return-refunded":
      blocks.push(text("meta", all.returnMeta), ...body, RETURN_LINES, yourReturn(all));
      footer = [all.help, all.whyReturn, ADDRESS];
      break;
    case "return-declined":
      blocks.push(text("meta", all.returnMeta), RETURN_LINES, quote("why", all.ourReason, "{{return.staff_reason}}"), ...body, yourReturn(all));
      footer = [all.help, all.whyReturn, ADDRESS];
      break;
    case "back-in-stock":
      blocks.push(...body);
      blocks.push(
        facts("variant", [
          row(all.product, "{{request.variant.product_name}}"),
          row(all.colour, "{{request.variant.colour_label}}"),
          row(all.size, "{{request.variant.size_label}}"),
          row(all.price, "{{request.variant.price}}"),
        ]),
      );
      blocks.push(button("see", all.seeIt, "{{booking_url}}p/{{request.variant.product_slug}}"));
      footer = [all.help, ADDRESS];
      break;
    case "news-welcome":
      blocks.push(...body);
      // The shop's own three promises, from its settings: one it left empty is left out.
      blocks.push({ block: "email.list", id: "promises", data: { items: ["{{practice.promise_1}}", "{{practice.promise_2}}", "{{practice.promise_3}}"] } });
      blocks.push(button("shop", all.visitShop, SHOP_LINK));
      // Adminium adds the postal address and the unsubscribe line itself, in the reader's language (N3-F7).
      footer = [all.whyNews];
      break;
    case "staff-new-order":
      blocks.push(...body, facts("order", [row(all.placed, "{{order.placed_at}}"), row(all.service, "{{order.service.label}}"), row(all.shipsBy, "{{order.ships_by}}")]));
      blocks.push(...orderLines(all), button("desk", all.openInDesk, "{{staff_url}}orders"));
      break;
    case "staff-return":
      blocks.push(
        facts("return", [
          row(all.order, "{{order.number}}"),
          row(all.reason, "{{return.reason.label}}"),
          row(all.refundIfApproved, "{{return.refund_amount}}"),
          row(all.asked, "{{return.asked_at}}"),
        ]),
      );
      blocks.push(RETURN_LINES, quote("note", all.message, "{{return.note}}"), button("desk", all.openInDesk, "{{staff_url}}returns"));
      break;
    case "staff-enquiry":
      blocks.push(facts("from", [row(all.from, "{{enquiry.name}}"), row(all.topic, "{{enquiry.topic.label}}"), row(all.sent, "{{enquiry.created_at}}")]));
      blocks.push(only(facts("order", [row(all.order, "{{enquiry.order_number}}")]), "enquiry.order_number"));
      blocks.push(quote("message", all.message, "{{enquiry.message}}"));
      // Where to write back: the address the customer typed, while Adminium lets the shop's e-mail carry it (R4).
      blocks.push(only(text("write-back", ...w.paras), "enquiry.email"));
      break;
  }
  if (w.after !== undefined) blocks.push(text("after", ...w.after));
  // Every e-mail that carries the order's own code says whose it is, right under its buttons.
  let linked = -1;
  blocks.forEach((b, i) => {
    if (JSON.stringify(b).includes("{{order.link_token}}")) linked = i;
  });
  if (linked >= 0) blocks.splice(linked + 1, 0, text("just-for-you", all.justForYou));
  if (TO_SHOP.has(kind)) footer = [all.staffFoot];
  return { subject: w.subject, preheader: w.preheader, blocks, footer: footer.join("\n") };
}

/** Every language's words: English here, the others in `emails-i18n.ts`. */
export function emailWords(): Record<Tag, EmailWords> {
  return { "en-US": EMAIL_EN, ...EMAIL_TRANSLATIONS };
}

/** Every kind's template in one language: what a test reads. */
export function templateOf(kind: Kind, tag: Tag = "en-US") {
  return layout(kind, emailWords()[tag]);
}

/** The variables each template reads, for the template editor's list. */
function varsOf(kind: Kind): string[] {
  const json = JSON.stringify(layout(kind, EMAIL_EN));
  const found = new Set<string>();
  for (const [, name] of json.matchAll(/\{\{([A-Za-z_.]+)[|}]/g)) found.add(name!);
  return [...found].filter((name) => !name.startsWith("row.")).sort();
}

/** The manifest's `emailTemplates`: one per kind, in every language the words are in. */
export function emailTemplates(kinds: readonly Kind[] = KINDS): unknown[] {
  const words = emailWords();
  return kinds.map((kind) => ({
    key: `ecommerce-shop-${kind}`,
    name: Object.fromEntries(Object.entries(words).map(([tag, w]) => [tag, w[kind].name])),
    vars: varsOf(kind),
    locales: Object.fromEntries(Object.entries(words).map(([tag, w]) => [tag, layout(kind, w)])),
  }));
}
