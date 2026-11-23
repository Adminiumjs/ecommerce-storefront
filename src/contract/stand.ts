/**
 * Northline stood up for a contract: the BUILT Adminium booted on one engine,
 * the shop installed on it as an operator installs it, with the four add-ons
 * it ticks (Inventory, Offers & gift cards, Invoices & Receipts, Forms &
 * surveys), Portland's clock and US dollars set, the sample added at the
 * moment the designs pin (Tuesday 18 August 2026, 11:40), the public API on
 * and the links in its e-mails pointed at it.
 *
 * Then the two ways in, both over HTTP only: the operator (`staff`, the data
 * API) and a shopper (`Shopper`, the public API with the shop's own browser
 * key, as the shop's pages speak it — the human check solved, the session
 * header carried, the e-mailed code typed back).
 *
 * Tests only; nothing that ships imports it.
 */
import { randomBytes } from "node:crypto";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { addOnBundle, addSample, appBundle, boot, Caller, ok, solve, until, type Engine, type Server } from "./harness.ts";
import { MANIFEST_TEXT } from "./release.ts";

export const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
export const ADD_ONS = ["inventory", "offers", "invoices", "forms"] as const;
/** Tuesday 18 August 2026, 11:40 in Portland (Pacific daylight time): the sample's moment. */
export const CLOCK = Date.parse("2026-08-18T18:40:00Z");
/** The shop's own prefix: every table it makes is `ecommerce_shop_<ref>`. */
export const PREFIX = "ecommerce_shop_";
/** A database name of this branch's own, so parallel runs never meet. */
export const dbName = (name: string, engine: Engine) => `p77_model_${name}_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}`;

export type Row = Record<string, unknown>;

/** One reply of the public API: its status, body, and the error's code and params. */
export interface PublicReply<T = Row> {
  status: number;
  body: { data: T; children?: Record<string, { data: Row }[]>; link?: { key: string; token: string; session: string | null; expiresAt: number | null } | null; payUrl?: string | null; replayed?: boolean; postings?: Row[]; applied?: Row[] } & Record<string, unknown>;
  code: string | undefined;
  params: Record<string, unknown>;
}

/**
 * A shopper's tab: the shop's browser key, a public session once one is held,
 * and the human check solved for every create and claim (one proof, one
 * request). With `rehearsal`, the tab is the one somebody who manages
 * payments opens on the staff address to rehearse the checkout: their own
 * session cookie and write token go with every request.
 */
export class Shopper {
  session: string | null = null;
  readonly base: string;
  readonly key: string;
  private readonly rehearsal: { cookie: string; csrf: string } | null;
  constructor(base: string, key: string, rehearsal: { cookie: string; csrf: string } | null = null) {
    this.base = base;
    this.key = key;
    this.rehearsal = rehearsal;
  }

  private async proof(purpose: "write" | "claim"): Promise<string> {
    const challenge = (await this.raw("GET", `/api/v1/public/challenge?purpose=${purpose}`)).body.data as unknown as { id: string; salt: string; difficulty: number };
    return `${challenge.id}.${solve(challenge.salt, challenge.difficulty)}`;
  }

  async raw<T = Row>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<PublicReply<T>> {
    for (let attempt = 0; ; attempt += 1) {
      const res = await fetch(`${this.base}${path}`, {
        method,
        headers: {
          origin: this.base,
          authorization: `Bearer ${this.key}`,
          ...(this.session === null ? {} : { "x-adminium-public-session": this.session }),
          ...(this.rehearsal === null ? {} : { cookie: this.rehearsal.cookie, ...(method === "GET" ? {} : { "x-adminium-csrf": this.rehearsal.csrf }) }),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      // A burst over the visitor's requests a minute is the server's flood guard, not the shop's rule: waited out, as
      // a person's next click would be. (A cap the app sets answers 409 PUBLIC_LIMIT_REACHED, never this.)
      if (res.status === 429 && attempt < 6) {
        const after = Number(res.headers.get("retry-after") ?? "10");
        await new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(after, 1), 30) * 1_000));
        continue;
      }
      const text = await res.text();
      let parsed: unknown = null;
      try {
        parsed = text === "" ? null : JSON.parse(text);
      } catch {
        parsed = text;
      }
      const error = (parsed as { error?: { code?: string; params?: Record<string, unknown>; details?: Record<string, unknown> } } | null)?.error;
      return { status: res.status, body: parsed as PublicReply<T>["body"], code: error?.code, params: error?.params ?? error?.details ?? {} };
    }
  }

  /** A create or a claim, with a fresh proof solved for it. */
  async proved<T = Row>(purpose: "write" | "claim", path: string, body: unknown, extra: Record<string, string> = {}): Promise<PublicReply<T>> {
    return this.raw<T>("POST", path, body, { ...extra, "x-adminium-proof": await this.proof(purpose) });
  }

  get = <T = Row>(path: string) => this.raw<T>("GET", path);
  list = async (ref: string, query = ""): Promise<Row[]> => {
    const reply = await this.raw<Row[]>("GET", `/api/v1/public/records/${ref}?limit=100${query}`);
    if (reply.status !== 200) throw new Error(`list ${ref}: ${String(reply.status)} ${JSON.stringify(reply.body).slice(0, 400)}`);
    return reply.body.data;
  };
  quote = (ref: string, write: unknown) => this.raw("POST", `/api/v1/public/records/${ref}/dry-run`, write);
  create = (ref: string, write: unknown) => this.proved("write", `/api/v1/public/records/${ref}`, write);
  patch = (ref: string, id: unknown, values: Row) => this.raw("PATCH", `/api/v1/public/records/${ref}/${String(id)}`, { values });

  /** Sign in as the shop's pages do: an e-mailed link and code, the code typed back. */
  async signIn(server: Server, email: string): Promise<void> {
    const before = (await inbox(server)).length;
    let asked = await this.proved("claim", "/api/v1/public/claim/link", { email });
    // Five links a minute from one visitor: a contract signing in many customers waits its turn, as a person would.
    for (let tries = 0; asked.code === "PUBLIC_RATE_LIMITED" && tries < 8; tries += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      asked = await this.proved("claim", "/api/v1/public/claim/link", { email });
    }
    if (asked.status !== 202 && asked.status !== 200) throw new Error(`sign-in link for ${email}: ${String(asked.status)} ${JSON.stringify(asked.body).slice(0, 400)}`);
    const mail = await until(async () => (await inbox(server)).slice(before).find((m) => m.to.includes(email)), `the sign-in e-mail to ${email}`, 90_000);
    const code = /\b(\d{6})\b/.exec(mail.text)?.[1];
    if (code === undefined) throw new Error(`no code in the sign-in e-mail: ${mail.text.slice(0, 400)}`);
    const verified = await this.raw<{ session: string }>("POST", "/api/v1/public/claim/link/verify", { email, code });
    if (verified.status !== 200) throw new Error(`verify ${email}: ${String(verified.status)} ${JSON.stringify(verified.body).slice(0, 400)}`);
    this.session = verified.body.data.session;
  }

  /** Open an order by the code in its own link. */
  async openLink(token: string): Promise<PublicReply<{ session: string }>> {
    const opened = await this.raw<{ session: string }>("POST", "/api/v1/public/claim/token", { token });
    if (opened.status === 200) this.session = opened.body.data.session;
    return opened;
  }
}

export interface Mail {
  to: string[];
  subject: string;
  text: string;
  html: string;
}
export const inbox = async (server: Server): Promise<Mail[]> => (await (await fetch(`${server.sink}/messages`)).json()) as Mail[];

export interface Stand {
  server: Server;
  staff: Caller;
  connectionId: string;
  /** The shop's browser key, and the order link's. */
  shopKey: string;
  linkKey: string;
  /** The public refs the shop's key serves, with what each entry is. */
  refs: Record<string, Row>;
  /** A table's data API path, by the app's ref (`orders`) or an add-on's real name (`inventory_items`). */
  data(ref: string): string;
  rows(ref: string): Promise<Row[]>;
  row(ref: string, id: unknown): Promise<Row>;
  create(ref: string, values: Row): Promise<Row>;
  patch(ref: string, id: unknown, values: Row): Promise<Row>;
  order(number: string): Promise<Row>;
  /** A fresh shopper's tab on the shop's key (or the order link's). */
  shopper(key?: "shop" | "link"): Shopper;
  /** The tab of somebody who manages payments, rehearsing the checkout: payments on, in test mode, for them. */
  rehearsing(): Promise<Shopper>;
  /** The entry that places an order of a kind paid a way: its ref on the shop's key. */
  placeRef(kind: "goods" | "gift", pay: "online" | "transfer"): string;
  /** Pay an order on the pay page with the demo service, as the person rehearsing. */
  payDemo(payUrl: string): Promise<void>;
}

const tableName = (ref: string) => (ref.includes("_") && /^(inventory|offers|invoices|forms)_/.test(ref) ? ref : `${PREFIX}${ref}`);

/** Boot, install with the four add-ons, set Portland's clock and dollars, add the sample (unless asked not to), and open the shop. */
export async function standUp(engine: Engine, port: number, name: string, options: { sample?: boolean; clock?: number } = {}): Promise<Stand> {
  const clock = options.clock ?? CLOCK;
  const server = await boot(engine, port, clock - 60_000, { database: dbName(name, engine) });
  try {
    const staff = new Caller(server.base, { origin: server.base });
    await staff.signIn(ADMIN.email, ADMIN.password);
    let connectionId: string;
    if (engine === "sqlite") {
      const file = join(tmpdir(), `${dbName(name, engine)}-${String(port)}.db`);
      rmSync(file, { force: true });
      writeFileSync(file, "");
      connectionId = ok(await staff.post<{ id: string }>("/api/v1/connections", { name: "northline", engine: "sqlite", dsn: `sqlite:${file}` }), 201).id;
    } else {
      connectionId = ok(await staff.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections")).connections.find((c) => c.name === "northwind")!.id;
    }
    const addOns = ADD_ONS.map((key) => addOnBundle(key));
    for (const addOn of addOns) {
      const staged = await staff.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(addOn.integrity)}`, addOn.buffer);
      if (![200, 201].includes(staged.status)) throw new Error(`${addOn.key} upload: ${JSON.stringify(staged.body).slice(0, 600)}`);
    }
    const app = appBundle({ manifest: MANIFEST_TEXT });
    const staged = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
    if (![200, 201].includes(staged.status)) throw new Error(`upload: ${JSON.stringify(staged.body).slice(0, 1500)}`);
    const body = { key: app.key, version: app.version, connectionId };
    const plan = ok(await staff.post<{ plan: { checksum: string; installable: boolean } }>("/api/v1/apps/plan", body)).plan;
    if (!plan.installable) throw new Error(`not installable: ${JSON.stringify(plan).slice(0, 3000)}`);
    const installed = ok(await staff.post<{ rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, shippingUnticked: [], addOns: addOns.map((a) => ({ key: a.key, version: a.version })) }));
    if (installed.rules.skipped.length > 0) throw new Error(`the install skipped rules: ${JSON.stringify(installed.rules.skipped).slice(0, 3000)}`);
    ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: "America/Los_Angeles", currency: "USD" }));
    if (options.sample !== false) {
      // The sample is written for 11:40 on the dot: the clock stands there while it goes in, then runs on.
      await server.setClock(clock, true);
      await addSample(staff);
      await server.setClock(clock);
    } else {
      await server.setClock(clock);
    }
    ok(await staff.put("/api/v1/public-api", { enabled: true }));
    ok(await staff.put("/api/v1/settings/email", { publicOrigin: server.base }));
    const served = ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys?: Record<string, string> }>("/apps/ecommerce-shop/customer/surface-config.json"));
    const shopKey = served.publishableKey;
    const linkKey = served.publicKeys?.["link"] ?? "";
    const config = ok(await new Caller(server.base, { origin: server.base, authorization: `Bearer ${shopKey}` }).get<{ data?: { refs?: Record<string, Row> }; refs?: Record<string, Row> }>("/api/v1/public/config"));
    const refs = config.data?.refs ?? config.refs ?? {};

    const data = (ref: string) => `/api/v1/data/${connectionId}/${encodeURIComponent(tableName(ref))}`;
    const rows = async (ref: string): Promise<Row[]> => {
      const out: Row[] = [];
      for (let offset = 0; ; offset += 200) {
        const page = ok(await staff.get<{ data: Row[] }>(`${data(ref)}?limit=200&offset=${String(offset)}`)).data;
        out.push(...page);
        if (page.length < 200) return out;
      }
    };
    const row = async (ref: string, id: unknown) => ok(await staff.get<{ data: Row }>(`${data(ref)}/${encodeURIComponent(String(id))}`)).data;
    const create = async (ref: string, values: Row) => {
      const reply = await staff.post<{ data: Row }>(data(ref), { values });
      if (reply.status !== 201 && reply.status !== 200) throw new Error(`create ${ref}: ${String(reply.status)} ${JSON.stringify(reply.body).slice(0, 800)}`);
      return reply.body.data;
    };
    const patch = async (ref: string, id: unknown, values: Row) => {
      const reply = await staff.patch<{ data: Row }>(`${data(ref)}/${encodeURIComponent(String(id))}`, { values });
      if (reply.status !== 200) throw new Error(`patch ${ref} ${String(id)}: ${String(reply.status)} ${JSON.stringify(reply.body).slice(0, 800)}`);
      return reply.body.data;
    };

    // The four place-order entries, in the manifest's order: goods and gift cards paid online, then by bank transfer.
    const placeRef = (kind: "goods" | "gift", pay: "online" | "transfer"): string => {
      const suffix = (ref: string) => Number(/_(\d+)$/.exec(ref)?.[1] ?? 1);
      const places = Object.keys(refs)
        .filter((r) => r.startsWith(`${PREFIX}orders_verified`) && JSON.stringify(refs[r]?.["actions"] ?? []) === '["create"]')
        .sort((a, b) => suffix(a) - suffix(b));
      const ref = places[["goods/online", "gift/online", "goods/transfer", "gift/transfer"].indexOf(`${kind}/${pay}`)];
      if (ref === undefined || places.length !== 4) throw new Error(`no place-order entry ${kind}/${pay} in ${JSON.stringify(Object.keys(refs))}`);
      return ref;
    };

    return {
      server,
      staff,
      connectionId,
      shopKey,
      linkKey,
      refs,
      data,
      rows,
      row,
      create,
      patch,
      order: async (number) => (await rows("orders")).find((o) => o["number"] === number)!,
      shopper: (key = "shop") => new Shopper(server.base, key === "shop" ? shopKey : linkKey),
      rehearsing: async () => {
        ok(await staff.put("/api/v1/payments/rehearsal", { on: true }));
        const config = ok(await staff.get<{ publishableKey: string; rehearsal?: { csrfToken: string } }>("/apps/ecommerce-shop/customer/surface-config.json"));
        if (config.rehearsal?.csrfToken === undefined) throw new Error("the customer config carries no rehearsal token");
        return new Shopper(server.base, config.publishableKey, { cookie: staff.cookies, csrf: config.rehearsal.csrfToken });
      },
      placeRef,
      payDemo: async (payUrl: string) => {
        const token = new URL(payUrl, server.base).pathname.split("/").pop()!;
        const challenge = ok(await staff.get<{ id: string; salt: string; difficulty: number }>(`/pay/api/${token}/challenge`));
        const started = ok(await staff.post<{ url?: string }>(`/pay/api/${token}/checkout`, { source: "demo" }, { "x-adminium-proof": `${challenge.id}.${solve(challenge.salt, challenge.difficulty)}` }));
        if (started.url === undefined) throw new Error(`no demo checkout: ${JSON.stringify(started)}`);
        const attempt = new URL(started.url, server.base).pathname.split("/").pop()!;
        const done = ok(await staff.post<{ back: string }>(`/pay/api/demo/${attempt}`, { action: "succeeds" }));
        const nonce = done.back.split("/").pop()!.split("?")[0]!;
        ok(await staff.get(`/pay/api/back/${nonce}`));
      },
    };
  } catch (error) {
    await server.stop();
    throw error;
  }
}

export const num = (value: unknown) => Number(value);
export const yes = (value: unknown) => value === true || value === 1 || value === "1" || value === "true";

// ── the shop's rows a basket names, and an order as the checkout sends it ────

export interface Shop {
  variant(sku: string): Row;
  region(code: string): Row;
  /** The shipping offer of a service (`standard`, `express`, `overnight`) to a state's zone. */
  offer(service: string, state: string): Row;
  giftAmount(amount: number): Row;
  settings: Row;
}

export async function shopOf(stand: Stand): Promise<Shop> {
  const [variants, regions, offers, services, amounts, settings] = await Promise.all(["variants", "regions", "shipping_offers", "shipping_services", "gift_amounts", "settings"].map((ref) => stand.rows(ref)));
  const find = <T>(list: Row[], test: (row: Row) => boolean, what: string): Row => {
    const found = list.find(test);
    if (found === undefined) throw new Error(`no ${what}`);
    return found as Row & T;
  };
  return {
    variant: (sku) => find(variants!, (v) => v["sku"] === sku, `variant ${sku}`),
    region: (code) => find(regions!, (r) => r["code"] === code, `state ${code}`),
    offer: (service, state) => {
      const zone = find(regions!, (r) => r["code"] === state, `state ${state}`)["zone_id"];
      const serviceId = find(services!, (s) => s["code"] === service, `service ${service}`)["id"];
      return find(offers!, (o) => String(o["service_id"]) === String(serviceId) && String(o["zone_id"]) === String(zone), `${service} to ${state}`);
    },
    giftAmount: (amount) => find(amounts!, (a) => num(a["amount"]) === amount, `gift amount ${String(amount)}`),
    settings: settings![0]!,
  };
}

export interface Who {
  name: string;
  email: string;
}

/** A goods order as the checkout writes it: who, where to, how it ships, and its lines by SKU. */
export function goodsOrder(shop: Shop, who: Who, state: string, service: string, lines: [string, number][], more: { codes?: string[]; card?: string; gifts?: Row[] } = {}): { values: Row; children: Record<string, { values: Row }[]> } {
  return {
    values: { name: who.name, email: who.email, language: "en-US", ship_name: who.name, address_line1: "500 Pine St", city: "Springfield", zip: "97477", region_id: shop.region(state)["id"], offer_id: shop.offer(service, state)["id"] },
    children: {
      order_lines: lines.map(([sku, qty]) => ({ values: { variant_id: shop.variant(sku)["id"], qty } })),
      ...(more.gifts === undefined ? {} : { gift_lines: more.gifts.map((values) => ({ values })) }),
      ...(more.codes === undefined ? {} : { order_codes: more.codes.map((typed) => ({ values: { typed } })) }),
      ...(more.card === undefined ? {} : { payments: [{ values: { card_code: more.card } }] }),
    },
  };
}

/** A gift-cards-only order: who buys, and each card's amount and recipient. */
export function giftOrder(shop: Shop, who: Who, cards: { amount: number; to_name: string; to_email: string; message?: string }[], more: { card?: string; codes?: string[] } = {}): { values: Row; children: Record<string, { values: Row }[]> } {
  return {
    values: { name: who.name, email: who.email, language: "en-US" },
    children: {
      gift_lines: cards.map((c) => ({ values: { amount_id: shop.giftAmount(c.amount)["id"], to_name: c.to_name, to_email: c.to_email, ...(c.message === undefined ? {} : { message: c.message }) } })),
      ...(more.codes === undefined ? {} : { order_codes: more.codes.map((typed) => ({ values: { typed } })) }),
      ...(more.card === undefined ? {} : { payments: [{ values: { card_code: more.card } }] }),
    },
  };
}

/** A retry key as the checkout makes one, once per order the shopper means to place: 22 to 64 letters, digits, `-` and `_`. */
export const retryKey = (label: string) => `${label}-${randomBytes(16).toString("hex")}`.slice(0, 64);

/**
 * Place as the checkout places: priced by a dry run, sent with the total the
 * shopper saw and a retry key, and sent again (the same key) when the order
 * number's lock was busy, twice at most with a back-off — as the page does.
 */
export async function place(shopper: Shopper, ref: string, write: { values: Row; children: Record<string, { values: Row }[]> }, key = retryKey("nl")): Promise<PublicReply & { quoted: Row }> {
  const quote = await shopper.quote(ref, write);
  if (quote.status !== 200) return { ...quote, quoted: {} };
  const total = num(quote.body.data["total"]).toFixed(2);
  for (let attempt = 0; ; attempt += 1) {
    const made = await shopper.create(ref, { values: { ...write.values, client_key: key }, children: write.children, expect: { total } });
    if (made.code === "PUBLIC_SLOT_BUSY" && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1) + Math.random() * 300));
      continue;
    }
    return { ...made, quoted: quote.body.data };
  }
}

/** A customer of the shop on an address that gets mail (not one kept for examples), made as the desk makes one. */
export async function customer(stand: Stand, name: string, email: string): Promise<Row> {
  return stand.create("customers", { name, email, language: "en-US" });
}
