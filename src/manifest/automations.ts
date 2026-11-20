/**
 * The shop's rules: what Adminium does on its own when something happens.
 *
 *   - A gift-cards-only order, once paid, is sent: Offers & gift cards loads
 *     and mails its cards when the payment lands, and there is nothing to pack.
 *   - "Tell me when it's back": every 15 minutes Adminium visits the waiting
 *     requests, asks Inventory whether the variant is in (at least one whole
 *     unit), and stamps the request before its e-mail goes, so the next visit
 *     passes it by. Inventory off, not answering, or the variant counted by
 *     nothing: the answer is no, and nobody is mailed.
 */
import { l } from "./labels.ts";

const node = (id: string, kind: string, title: string, more: Record<string, unknown> = {}) => ({ id, kind, title: l(title), ...more });

export const AUTOMATIONS = [
  {
    key: "gift-order-sent",
    name: l("A gift-cards-only order is paid: it is sent"),
    description: l("Moves a paid order that sells only gift cards to Sent: Offers & gift cards mails each card when the payment lands."),
    enabled: true,
    trigger: {
      kind: "record",
      event: "updated",
      table: "orders",
      changedColumn: "status",
      when: [
        { left: { field: "status" }, op: "is", right: "paid" },
        { left: { field: "kind" }, op: "is", right: "gift" },
      ],
    },
    graph: {
      version: 1,
      nodes: [
        node("t", "trigger", "A gift-cards-only order is paid"),
        node("sent", "action", "Mark it sent", { action: { kind: "record.update", values: { status: "sent" } } }),
      ],
    },
  },
  {
    key: "back-in-stock",
    name: l("A variant is back in stock: the customers who asked are told"),
    description: l("Every 15 minutes, each waiting back-in-stock request whose variant Inventory says is in is stamped and its customer e-mailed once."),
    enabled: true,
    trigger: {
      kind: "schedule",
      schedule: { kind: "interval", everyMinutes: "15" },
      forEach: { table: "restock_requests", where: [{ left: { field: "notified_at" }, op: "is_empty" }], once: false },
    },
    graph: {
      version: 1,
      nodes: [
        node("t", "trigger", "Each waiting back-in-stock request"),
        node("in", "condition", "Inventory says the variant is in", { condition: { left: { words: "inventory:stock", of: "variant_id" }, op: "is", right: "in" } }),
        node("stamp", "action", "Stamp it told", { action: { kind: "record.update", values: { notified_at: { now: true } } } }),
      ],
    },
  },
];
