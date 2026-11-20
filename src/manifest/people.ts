/**
 * The shop's customers, as Adminium is told of them (`people`), and the tick
 * a customer gives at checkout or in the footer ("Send me news").
 *
 * A customer (`customers`) is the only people table: made by their first
 * order, sign-in or newsletter sign-up from the address they type, and signed
 * in to by a code e-mailed to it. `news` is the newsletter's consent, kept in
 * step with Adminium's consent log: a tick sets it, an unsubscribe clears it,
 * and "Delete my details" records the withdrawal before it empties it.
 *
 * A customer is also copied onto every order (the name and e-mail it was
 * placed with, the address it ships to), onto a gift card's line when they
 * are its recipient (found by the address), onto a message they sent and a
 * newsletter sign-up. Each copy is declared, so finding, exporting and erasing
 * a person reaches it; an order and its money are the shop's record of a
 * sale, which the law keeps (`keep` on their tables).
 */
import { LOCALES } from "./labels.ts";

/** The tick's words: one version, the same sentence in every language until the shop's words are translated. */
const NEWS_TEXT: Record<string, string> = Object.fromEntries(
  LOCALES.map((tag) => [tag, "Send me news and offers from Northline. You can stop them from any e-mail."]),
);

/** The checkout's and the footer's tick, as the consent log keeps it. A new wording is a new version. */
export const NEWS_TICK = {
  column: "news",
  purpose: "newsletter",
  wording: { version: 1, text: NEWS_TEXT },
};

export const PEOPLE = [
  {
    table: "customers",
    kind: "people",
    email: "email",
    name: "name",
    firstName: "firstWordOfName",
    language: "language",
    consent: { column: "news", purpose: "newsletter" },
    copies: [
      { table: "orders", column: "name", holds: "name", via: "customer_id" },
      { table: "orders", column: "email", holds: "email", via: "customer_id" },
      { table: "orders", column: "ship_name", holds: "name", via: "customer_id" },
      { table: "orders", column: "address_line1", holds: "details", via: "customer_id" },
      { table: "orders", column: "address_line2", holds: "details", via: "customer_id" },
      { table: "gift_lines", column: "to_name", holds: "name" },
      { table: "gift_lines", column: "to_email", holds: "email" },
      { table: "enquiries", column: "name", holds: "name" },
      { table: "enquiries", column: "email", holds: "email" },
      { table: "news_signups", column: "email", holds: "email", via: "customer_id" },
    ],
  },
];
