/**
 * What the pages after an order ask of Adminium, and the shapes it answers in.
 *
 * Two ways reach an order, and only these (never a number alone, never an
 * address alone):
 *
 *   - the customer signs in: Adminium e-mails a link and a six-digit code to
 *     the address typed (the same answer for any address), the code typed
 *     back proves the mailbox, and the session reads that person's own
 *     orders, their lines, payments, refunds and returns;
 *   - the order's own link (the one its e-mails carry, its code after `#`)
 *     opens that one order, and only it. It may cancel the order and ask a
 *     return, as the signed-in customer may.
 *
 * Every figure and date shown is a column Adminium wrote: a line's price and
 * share of a code, a return's refund, an order's arrival window. Nothing here
 * works one out.
 */
import type { Id, Product, Row } from "./port.ts";

/** Which session reads the order: the customer's own sign-in, or the order's own link. */
export type Via = "mine" | "link";

/** One order as its page shows it, with every row under it the session reads. */
export interface OrderRead {
  via: Via;
  order: Row;
  lines: Row[];
  gifts: Row[];
  payments: Row[];
  refunds: Row[];
  returns: Row[];
  returnLines: Row[];
}

/** The answer to a typed-back code, as the page says it. */
export type CodeAnswer = { ok: true } | { ok: false; reason: "wrong"; triesLeft: number } | { ok: false; reason: "spent" | "locked" };

/** The signed-in customer's own row: what their account shows. */
export interface Me {
  id: Id | null;
  name: string;
  email: string;
  news: boolean;
  language: string | null;
}

/** A line's review, as the engine's review route answers it: still open, or sent (its stamp). */
export interface ReviewState {
  open: boolean;
  reviewedAt: string | null;
}

/** What the customer writes about a line: whole stars, and their words as plain text. */
export interface ReviewValues {
  stars: number;
  title?: string;
  body: string;
}

/** A return as the customer asks it: why, a note, and the pieces of each line. */
export interface ReturnAsk {
  orderId: Id;
  reason: string;
  note: string;
  lines: { lineId: Id; qty: number }[];
  clientKey: string;
}

/** A document of the order the customer may download (Invoices' receipt). */
export interface Receipt {
  url: string;
  number: string | null;
}

export interface AfterPort {
  /** E-mail a sign-in link, with a code for this page, to the address typed (the same answer for any address). */
  requestCode(email: string, language: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<CodeAnswer>;
  /** The sign-in link from the e-mail (`/c#…`): the first name it greets, spending nothing; null for a used one. */
  peekSignInLink(token: string): Promise<string | null>;
  /** The sign-in link used, once: true when it opened a session. */
  openSignInLink(token: string): Promise<boolean>;
  /** Whether the shop's key holds a verified sign-in now. */
  signedIn(): boolean;
  signOut(): Promise<void>;
  /** "Delete my details": refused `PUBLIC_CODE_STEP_UP` unless a code was typed in the last ten minutes. */
  forgetMe(): Promise<void>;
  /** The signed-in customer's own row. */
  me(): Promise<Me | null>;
  /** "Stop news e-mails": the customer's own row, news off. */
  stopNews(me: Me): Promise<void>;
  /** The signed-in customer's orders, newest first. */
  myOrders(): Promise<Row[]>;
  /** The signed-in customer's returns, newest first. */
  myReturns(): Promise<Row[]>;
  /** One of the signed-in customer's orders, with everything under it. */
  readMine(orderId: Id): Promise<OrderRead | null>;
  /** Open the order the link names: `opened`, `unknown` (opens nothing) or `closed` (stopped or expired). */
  openShared(token: string): Promise<"opened" | "unknown" | "closed">;
  /** Whether a session on an order's own link is held. */
  sharedHeld(): boolean;
  /** The order the held link opens, or null when it opens nothing now. */
  readShared(): Promise<OrderRead | null>;
  /** Cancel the order, as its customer: only while paid or waiting for a bank transfer. */
  cancel(via: Via, orderId: Id): Promise<Row>;
  /** "Make a new link": the old link stops, the new one is e-mailed. Signed in only. */
  newLink(orderId: Id): Promise<void>;
  /** Ask a return: signed in, one write with its lines; through the link, the return then each line. */
  askReturn(via: Via, ask: ReturnAsk): Promise<Row>;
  /** A line's review state; null while reviews are off (the route answers 404). */
  reviewState(via: Via, lineId: Id): Promise<ReviewState | null>;
  sendReview(via: Via, lineId: Id, values: ReviewValues): Promise<{ reviewedAt: string | null }>;
  /** The order's receipt as Invoices draws it, when the key offers one; null otherwise. */
  receipt(via: Via, orderId: Id): Promise<Receipt | null>;
  /** Products by id, for Order again's basket lines. */
  productsByIds(ids: readonly Id[]): Promise<Product[]>;
}
