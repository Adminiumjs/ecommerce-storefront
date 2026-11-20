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
  constructor(
    readonly base: string,
    readonly key: string,
    private readonly rehearsal: { cookie: string; csrf: string } | null = null,
  ) {}

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
      // The rate limit's own burst refusal is not the contract's: waited out (a cap the app sets says its own code).
      if (res.status === 429 && res.headers.get("retry-after") !== null && attempt < 4 && !(await res.clone().text()).includes("PUBLIC_RATE_LIMITED")) {
        await new Promise((resolve) => setTimeout(resolve, 3_000));
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
    const asked = await this.proved("claim", "/api/v1/public/claim/link", { email });
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
    const installed = ok(await staff.post<{ rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, addOns: addOns.map((a) => ({ key: a.key, version: a.version })) }));
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

    // The four place-order entries, told apart by what each writes by default (`kind`, `pay_method`).
    const placeRef = (kind: "goods" | "gift", pay: "online" | "transfer"): string => {
      const found = Object.entries(refs).find(([, entry]) => {
        const text = JSON.stringify(entry);
        return entry["table"] === `${PREFIX}orders` && text.includes(`"kind":"${kind}"`) && text.includes(`"pay_method":"${pay}"`);
      });
      if (found !== undefined) return found[0];
      // The config may not show an entry's defaults: the entries are listed in the manifest's order.
      const places = Object.keys(refs).filter((r) => r.startsWith(`${PREFIX}orders_verified`) && JSON.stringify(refs[r]).includes('"POST"'));
      const order = ["goods/online", "gift/online", "goods/transfer", "gift/transfer"].indexOf(`${kind}/${pay}`);
      const ref = places[order];
      if (ref === undefined) throw new Error(`no place-order entry ${kind}/${pay} in ${JSON.stringify(Object.keys(refs))}`);
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
