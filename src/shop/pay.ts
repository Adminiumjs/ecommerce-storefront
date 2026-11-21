/**
 * The checkout's small rules, kept apart from its state so they can be read
 * and tested alone: what an order sent to the pay page keeps for the way
 * back, how the tab leaves for that page, which lines the out-of-stock
 * refusal marks, the retry key's life, and what the way back from the pay
 * page means.
 *
 * Nothing here works out a figure. A line's "Now" is the dry run's, an
 * order's deadline its own `pay_by`, how many are left Inventory's.
 */
import { newClientKey } from "@adminiumjs/public-client";

import type { AdminiumShop } from "./door.ts";
import type { Applied, Id, PayState, Posting, Quote, Row, ShopPort, StockWord } from "./port.ts";
import type { BasketLine } from "./store.ts";

// ── what an order placed keeps for the way back ────────────────────────────

/**
 * An order this tab placed: its row and lines as Adminium answered them, and
 * what the shopper typed that the answer does not carry back (their name,
 * for "Thank you, Priya"). Kept in `sessionStorage` while the shopper is on
 * the pay page, so the order's page finds it again on the way back.
 */
export interface Held {
  order: Row;
  lines: Row[];
  gifts: Row[];
  applied: Applied[];
  /** What a gift card took, and what is still to pay. */
  payment: { amount: string; due: string } | null;
  /** The name as the shopper typed it (or their account's). */
  name: string;
  /** The delivery service's name, as the shop calls it. */
  service: string | null;
  online: boolean;
  /** The order's own link, for "See your order" (`/o#<token>`). */
  token: string | null;
  /** The last four of the gift card paying part of it. */
  card: string | null;
  /** Each line's category icon, for its stand-in picture (the lines' order). */
  icons?: (string | null)[];
}

const SLOT = "northline.shop.checkout";

export function keepHeld(held: Held): void {
  try {
    sessionStorage.setItem(SLOT, JSON.stringify(held));
  } catch {
    // not kept: back from paying, the order's page asks for its link as it always does
  }
}

export function keptHeld(): Held | null {
  try {
    const raw = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(SLOT);
    if (raw === null) return null;
    const held = JSON.parse(raw) as Partial<Held>;
    return held.order !== undefined && held.order !== null && typeof held.order === "object" ? (held as Held) : null;
  } catch {
    return null;
  }
}

export function forgetHeld(): void {
  try {
    sessionStorage.removeItem(SLOT);
  } catch {
    // nothing kept
  }
}

// ── leaving for the pay page ──────────────────────────────────────────────

/** How the tab goes to the pay page: the whole tab, as a link would (a seam the tests take over). */
let leave: (url: string) => void = (url) => window.location.assign(url);

export function setLeave(go: ((url: string) => void) | null): void {
  leave = go ?? ((url) => window.location.assign(url));
}

export function leaveFor(url: string): void {
  leave(url);
}

// ── reading the order again ─────────────────────────────────────────────────

export type OrderReader = (port: ShopPort, id: Id) => Promise<Row | null>;

/**
 * The order's row through its own link: placing it opened a session on that
 * link (`AdminiumShop.place` adopts it), and that row carries what the
 * placing answer leaves out (the bank-transfer note) and what changes once
 * paid (the ships-by, the arrival window). A door with no link key reads
 * nothing, and the page keeps what placing answered.
 */
const linkReader: OrderReader = async (port, id) => {
  const door = port as Partial<Pick<AdminiumShop, "linkClient" | "linkRefs">>;
  if (door.linkClient === undefined || door.linkClient === null || door.linkRefs === undefined) return null;
  return await door.linkClient.get<Row>(door.linkRefs.order, String(id));
};

let reader: OrderReader = linkReader;

/** For tests: read the order from somewhere else, or (null) through its link again. */
export function setOrderReader(read: OrderReader | null): void {
  reader = read ?? linkReader;
}

/** The order as Adminium now has it, or null when it cannot be read. Never throws. */
export async function readOrder(port: ShopPort, id: Id): Promise<Row | null> {
  try {
    return await reader(port, id);
  } catch {
    return null;
  }
}

// ── the retry key ───────────────────────────────────────────────────────────

/**
 * The key an order is sent with: kept while the order is the same, so a
 * retry of a reply that was lost answers the order already made; new as soon
 * as anything in it changes (the basket's own key changes with the basket,
 * its codes and its gift card; the values with the address, the service and
 * the contact).
 */
export function retryKey(prev: { sig: string; key: string } | null, sig: string, make: () => string = newClientKey): { sig: string; key: string } {
  return prev !== null && prev.sig === sig ? prev : { sig, key: make() };
}

// ── the out-of-stock refusal ────────────────────────────────────────────────

/** A basket line the out-of-stock refusal marks: sold out, fewer left than asked, or fewer left with no number to say. */
export interface Mark {
  key: string;
  kind: "out" | "left" | "fewer";
  left: number | null;
}

/**
 * Which lines cannot be sent as they are: Inventory's words say sold out, or
 * fewer left than the line asks; or the dry run's stock posting refuses the
 * line (with how many are left where the shop shows a number, else "try
 * fewer"). A line is unmarked once it is removed, or changed to what is left
 * and the dry run takes it.
 */
export function marksOf(basket: readonly BasketLine[], words: Readonly<Record<string, StockWord>>, quote: Quote | null): Mark[] {
  const orderable = basket.filter((l) => words[String(l.variantId)]?.state !== "out");
  const refused = new Map<number, Posting>();
  for (const p of quote?.postings ?? []) {
    const at = typeof p.line === "number" ? p.line : typeof p.path?.[1] === "number" ? p.path[1] : null;
    if (p.ledger === "stock" && p.state === "refused" && at !== null) refused.set(at, p);
  }
  const marks: Mark[] = [];
  for (const line of basket) {
    const word = words[String(line.variantId)];
    if (word?.state === "out") {
      marks.push({ key: line.key, kind: "out", left: null });
      continue;
    }
    const posting = refused.get(orderable.indexOf(line));
    const said = posting?.left === undefined || posting.left === "" ? null : Number(posting.left);
    const left = said !== null && Number.isFinite(said) ? said : word?.state === "low" ? word.left : null;
    const short = word?.state === "low" && word.left !== null && line.qty > word.left;
    if (posting === undefined && !short) continue;
    if (left !== null && left <= 0) marks.push({ key: line.key, kind: "out", left: null });
    else marks.push({ key: line.key, kind: left === null ? "fewer" : "left", left });
  }
  return marks;
}

/** The lines whose price moved since they went in the basket: "Was" the price then, "Now" the dry run's. */
export function movedLines(orderable: readonly BasketLine[], quote: Quote): { line: BasketLine; now: string }[] {
  const moved: { line: BasketLine; now: string }[] = [];
  orderable.forEach((line, i) => {
    const row = quote.lines[i];
    if (row === undefined || String(row["variant_id"]) !== String(line.variantId)) return;
    const now = row["each"];
    if (now !== undefined && now !== null && Math.round(Number(now) * 100) !== Math.round(Number(line.added) * 100)) moved.push({ line, now: String(now) });
  });
  return moved;
}

// ── the way back from the pay page ──────────────────────────────────────────

/**
 * What the page says while and after the shopper pays: on the way to the pay
 * page, checking, the bank confirming, paid (the confirmation), did not
 * finish, not paid yet, cancelled unpaid, paid after it was cancelled, or a
 * pay link Adminium would not give.
 */
export type Back = "handoff" | "checking" | "confirming" | "paid" | "failed" | "notPaid" | "expired" | "paidCancelled" | "startRefused";

/** The statuses an order is in once its money is in. */
const PAID = new Set(["paid", "packed", "shipped", "sent"]);

/**
 * What the payment's state and the order's row say together; null while
 * there is nothing to say yet (a checkout still open at the service, or a
 * payment Adminium has heard of but not yet written on the order). `last`
 * is the final ask: what is still undecided then is said as it stands.
 */
export function backOf(state: PayState | null, order: Row | null, last = false): Back | null {
  const status = order === null ? null : String(order["status"] ?? "");
  if (status === "cancelled") return state === "paid" ? "paidCancelled" : "expired";
  if (status !== null && PAID.has(status)) return "paid";
  switch (state) {
    case "paid":
      // The money arrived: the order is read again until it says so.
      return order === null || last ? "paid" : null;
    case "confirming":
      return "confirming";
    case "failed":
      return "failed";
    case "expired":
      return "expired";
    case "none":
      return last ? "notPaid" : null;
    default:
      return null;
  }
}

/** The first word of a name as the shopper typed it ("Priya"), or "". */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? "";
