/**
 * The after-order door on a real Adminium, built on the shop's own clients:
 * `AdminiumShop.client` (the shop's key, which holds the customer's sign-in)
 * and `.linkClient` (the order's own link key).
 *
 * Signing in is the `customers` claim by e-mailed link (`strategy:
 * email-link`): the page asks for a link and a code to the address typed and
 * types the code back. The order's own link is a token claim on the link key
 * (`POST /public/claim/token`). Two things the client has no verb for are
 * sent as they are through `raw`: the engine's review route on an order line.
 */
import { PublicApiError, type PublicClient } from "@adminiumjs/public-client";

import { answer, productOf, type AdminiumShop } from "./door.ts";
import type { AfterPort, CodeAnswer, Me, OrderRead, Receipt, ReturnAsk, ReviewState, ReviewValues, Via } from "./after-port.ts";
import type { Id, Product, Row } from "./port.ts";

const PAGE = 100;

/** Newest first, by when it was placed (or asked), then by its key. */
export const newestFirst = (column: string) => (a: Row, b: Row) => String(b[column] ?? "").localeCompare(String(a[column] ?? "")) || Number(b["id"]) - Number(a["id"]);

async function all(client: PublicClient, ref: string, options: Parameters<PublicClient["list"]>[1] = {}): Promise<Row[]> {
  const rows: Row[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 20; i += 1) {
    const page = await client.list<Row>(ref, { ...options, limit: PAGE, ...(cursor === undefined ? {} : { cursor }) });
    rows.push(...page.data);
    const next = page.cursor?.next ?? null;
    if (next === null || next === "" || page.data.length === 0) break;
    cursor = next;
  }
  return rows;
}

const yes = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";

export class AdminiumAfter implements AfterPort {
  readonly shop: AdminiumShop;
  constructor(shop: AdminiumShop) {
    this.shop = shop;
  }

  private on(via: Via): PublicClient {
    if (via === "mine") return this.shop.client;
    if (this.shop.linkClient === null) throw new Error("This shop has no key for an order's own link.");
    return this.shop.linkClient;
  }

  /** The browser key a client sends: the shop's own, or the link key's. */
  private keyOf(via: Via): string {
    if (via === "mine") return this.shop.served.publishableKey;
    const key = this.shop.served.publicKeys?.["link"];
    if (key === undefined) throw new Error("This shop has no key for an order's own link.");
    return key;
  }

  requestCode(email: string, language: string): Promise<void> {
    return answer(async () => {
      await this.shop.client.requestLink({ email: email.trim(), lang: language });
    });
  }

  verifyCode(email: string, code: string): Promise<CodeAnswer> {
    return answer(async () => {
      try {
        const out = await this.shop.client.verifyLinkCode({ email: email.trim(), code: code.trim() });
        if (out.ok) return { ok: true };
        return out.triesLeft > 0 ? { ok: false, reason: "wrong", triesLeft: out.triesLeft } : { ok: false, reason: "spent" };
      } catch (error) {
        if (error instanceof PublicApiError && error.code === "PUBLIC_CODE_EXPIRED") return { ok: false, reason: "spent" };
        if (error instanceof PublicApiError && (error.code === "PUBLIC_CLAIM_LOCKED" || error.code === "PUBLIC_CODE_LOCKED")) return { ok: false, reason: "locked" };
        throw error;
      }
    });
  }

  peekSignInLink(token: string): Promise<string | null> {
    return answer(() => this.shop.client.peekLink(token));
  }

  openSignInLink(token: string): Promise<boolean> {
    return answer(() => this.shop.client.openLink(token));
  }

  signedIn(): boolean {
    return this.shop.client.session()?.level === "verified";
  }

  signOut(): Promise<void> {
    return answer(() => this.shop.client.signOut());
  }

  forgetMe(): Promise<void> {
    return answer(() => this.shop.client.forgetMe());
  }

  me(): Promise<Me | null> {
    return answer(async () => {
      if (!this.signedIn()) return null;
      const page = await this.shop.client.list<Row>(this.shop.refs.customer, { limit: 1 });
      const row = page.data[0];
      if (row === undefined) return null;
      return { id: (row["id"] as Id | undefined) ?? null, name: String(row["name"] ?? ""), email: String(row["email"] ?? ""), news: yes(row["news"]), language: typeof row["language"] === "string" ? row["language"] : null };
    });
  }

  stopNews(me: Me): Promise<void> {
    return answer(async () => {
      // The customer's own row, by its key: the claim's entry reads only theirs.
      if (me.id === null) throw new PublicApiError("PUBLIC_WRITE_REFUSED", 400, "the customer's own row names no key", undefined, { column: "news" });
      await this.shop.client.update(this.shop.refs.customer, String(me.id), { news: false });
    });
  }

  myOrders(): Promise<Row[]> {
    return answer(async () => (await all(this.shop.client, this.shop.refs.myOrders)).sort(newestFirst("placed_at")));
  }

  myReturns(): Promise<Row[]> {
    return answer(async () => (await all(this.shop.client, this.shop.refs.myReturns)).sort(newestFirst("asked_at")));
  }

  /** Every row under one order, through the session that reads it. */
  private async under(via: Via, order: Row): Promise<OrderRead> {
    const client = this.on(via);
    const r = via === "mine" ? this.shop.refs : null;
    const l = this.shop.linkRefs;
    const ref = {
      lines: r?.myLines ?? l.lines,
      gifts: r?.myGifts ?? l.gifts,
      payments: r?.myPayments ?? l.payments,
      refunds: r?.myRefunds ?? l.refunds,
      returns: r?.myReturns ?? l.returns,
      returnLines: r?.myReturnLines ?? l.returnLines,
    };
    const where = { where: { column: "order_id", op: "eq" as const, value: order["id"] } };
    const [lines, gifts, payments, refunds, returns] = await Promise.all([all(client, ref.lines, where), all(client, ref.gifts, where), all(client, ref.payments, where), all(client, ref.refunds, where), all(client, ref.returns, where)]);
    const ids = returns.map((x) => x["id"]);
    const returnLines = ids.length === 0 ? [] : await all(client, ref.returnLines, { where: { column: "return_id", op: "in", value: ids as never } });
    const byId = (a: Row, b: Row) => Number(a["id"]) - Number(b["id"]);
    return { via, order, lines: lines.sort(byId), gifts: gifts.sort(byId), payments: payments.sort(byId), refunds: refunds.sort(byId), returns: returns.sort(newestFirst("asked_at")), returnLines: returnLines.sort(byId) };
  }

  readMine(orderId: Id): Promise<OrderRead | null> {
    return answer(async () => {
      const page = await this.shop.client.list<Row>(this.shop.refs.myOrders, { where: { column: "id", op: "eq", value: orderId }, limit: 1 });
      const order = page.data[0];
      return order === undefined ? null : this.under("mine", order);
    });
  }

  openShared(token: string): Promise<"opened" | "unknown" | "closed"> {
    return answer(async () => (this.shop.linkClient === null ? "unknown" : this.shop.linkClient.openShared(token)));
  }

  sharedHeld(): boolean {
    return this.shop.linkClient?.session() != null;
  }

  readShared(): Promise<OrderRead | null> {
    return answer(async () => {
      const client = this.shop.linkClient;
      if (client === null || client.session() === null) return null;
      const page = await client.list<Row>(this.shop.linkRefs.order, { limit: 1 });
      const order = page.data[0];
      return order === undefined ? null : this.under("link", order);
    });
  }

  cancel(via: Via, orderId: Id): Promise<Row> {
    const ref = via === "mine" ? this.shop.refs.myOrders : this.shop.linkRefs.order;
    return answer(() => this.on(via).update<Row>(ref, String(orderId), { status: "cancelled", cancel_reason: "customer" }));
  }

  newLink(orderId: Id): Promise<void> {
    return answer(() => this.shop.client.newLink(this.shop.refs.myOrders, orderId));
  }

  askReturn(via: Via, ask: ReturnAsk): Promise<Row> {
    return answer(async () => {
      const values: Row = { order_id: ask.orderId, reason: ask.reason, ...(ask.note.trim() === "" ? {} : { note: ask.note.trim() }) };
      if (via === "mine") {
        const made = await this.shop.client.createTree<Row>(this.shop.refs.askReturn, {
          values: { ...values, client_key: ask.clientKey },
          children: { return_lines: ask.lines.map((l) => ({ values: { line_id: l.lineId, qty: l.qty } })) } as never,
        });
        return made.data;
      }
      // A row's own link makes one row at a time: the return, then each of its pieces while it is still asked.
      const client = this.on("link");
      const made = await client.create<Row>(this.shop.linkRefs.askReturn, values);
      for (const line of ask.lines) await client.create<Row>(this.shop.linkRefs.askReturnLine, { return_id: made["id"], line_id: line.lineId, qty: line.qty });
      return made;
    });
  }

  private reviewPath(via: Via, lineId: Id): string {
    const ref = via === "mine" ? this.shop.refs.myLines : this.shop.linkRefs.lines;
    return `/api/v1/public/records/${ref}/${encodeURIComponent(String(lineId))}/review`;
  }

  reviewState(via: Via, lineId: Id): Promise<ReviewState | null> {
    return answer(async () => {
      try {
        const out = await this.shop.raw<{ data: { open?: boolean; reviewedAt?: string | null } }>(this.on(via), this.keyOf(via), this.reviewPath(via, lineId));
        return { open: out.data.open === true, reviewedAt: out.data.reviewedAt ?? null };
      } catch (error) {
        // Reviews off for the shop: the route is not there, and the page offers none.
        if (error instanceof PublicApiError && error.status === 404) return null;
        throw error;
      }
    });
  }

  sendReview(via: Via, lineId: Id, values: ReviewValues): Promise<{ reviewedAt: string | null }> {
    return answer(async () => {
      const body: Row = { stars: values.stars, body: values.body.trim(), ...(values.title === undefined || values.title.trim() === "" ? {} : { title: values.title.trim() }) };
      const out = await this.shop.raw<{ data: { reviewedAt?: string | null } }>(this.on(via), this.keyOf(via), this.reviewPath(via, lineId), { method: "POST", body: JSON.stringify(body) });
      return { reviewedAt: out.data?.reviewedAt ?? null };
    });
  }

  receipt(via: Via, orderId: Id): Promise<Receipt | null> {
    const ref = via === "mine" ? this.shop.refs.myOrders : this.shop.linkRefs.order;
    return answer(async () => {
      try {
        const client = this.on(via);
        const page = await client.documents.list({ ref, id: orderId, limit: 10 });
        const doc = page.data.find((d) => /receipt/i.test(d.kind) && d.hasContent);
        return doc === undefined ? null : { url: client.documents.contentUrl(doc.id), number: doc.number };
      } catch {
        // No documents on this key: the page offers no receipt.
        return null;
      }
    });
  }

  productsByIds(ids: readonly Id[]): Promise<Product[]> {
    return answer(async () => {
      const unique = [...new Set(ids.map(String))];
      if (unique.length === 0) return [];
      return (await all(this.shop.client, this.shop.refs.products, { where: { column: "id", op: "in", value: unique } })).map(productOf);
    });
  }
}
