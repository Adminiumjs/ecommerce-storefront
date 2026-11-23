/**
 * The desk's door into a real Adminium: the data API as the person signed in
 * to it, the app served by Adminium at `/apps/ecommerce-shop/staff/`, riding
 * that person's session. Their roles and limits hold every read and write: a
 * packer reads an order's lines and address, never its money or e-mail, and
 * may mark it packed and shipped; only the owner refunds, cancels and records
 * a bank transfer.
 *
 * Everything the desk needs to start is in the staff `surface-config.json`:
 * the connection, the tables' real names, the shop's zone and money, the
 * app's settings, who is signed in and what they may do, the add-ons on.
 *
 * A move is a change of a state column, judged by the table's states: the
 * state the screen saw goes with it (`from`), so an order that moved on since
 * is refused rather than moved twice.
 *
 * Each engine spells a moment and a yes/no its own way (SQLite: the server's
 * wall time with no zone, and 0 or 1); every row is read back here as the
 * screens expect it, an ISO instant and a boolean.
 */
import { createEngineCarrier, type EngineCarrier } from "../add-ons/vendor/host/engine-carrier.ts";
import { engineSend } from "../add-ons/connected.ts";
import type { ShipFromValues, ShippingStatus } from "./door.ts";
import { withInstall, type StaffConfig } from "./transport/staffConnection.ts";
import { SessionPortError, type SessionTransport } from "./transport/sessionSource.ts";
import { momentOf } from "./time.ts";
import type { Action, DeskData, DeskDoor, DeskFacts, Drawn, PanelPayment, PaymentPanel, Person, ReviewRows, StaffPayments, StockRows, Table } from "./door.ts";
import { ApiError, type Id, type Row } from "./wire.ts";
import { loadConnectedAddOns, type ConnectedProblem } from "../add-ons/connected.ts";
import { createRegistry, type AddOnRegistry } from "../add-ons/host.ts";

export const APP_KEY = "ecommerce-shop";
const PAGE = 200;

/** The moments each table holds: SQLite hands them back without a zone. */
export const MOMENTS: Readonly<Partial<Record<Table | string, readonly string[]>>> = {
  products: ["created_at"],
  customers: ["news_since", "forgotten_at", "created_at"],
  orders: ["placed_at", "pay_by", "stock_until", "paid_at", "packed_at", "shipped_at", "cancelled_at", "link_expires"],
  payments: ["paid_at"],
  payment_refunds: ["made_at"],
  returns: ["asked_at", "approved_at", "declined_at", "received_at", "refunded_at"],
  return_lines: ["void_at"],
  messages: ["due", "created_at", "sent_at"],
  order_lines: ["reviewed_at"],
  reviews: ["submitted_at", "replied_at"],
};

/** The yes/no columns each table holds: SQLite and MySQL hand back 0 or 1. */
export const YES_NO: Readonly<Partial<Record<Table | string, readonly string[]>>> = {
  settings: ["taking_orders", "transfer_on", "refund_shipping_faulty"],
  products: ["featured"],
  variants: ["active", "sold_out"],
  regions: ["active"],
  shipping_services: ["active"],
  shipping_offers: ["active"],
  closures: ["active"],
  customers: ["news"],
  orders: ["customer_proved", "link_stopped", "news"],
  payment_refunds: ["automatic"],
  return_lines: ["restock", "received"],
  items: ["active"],
};

const yesNo = (value: unknown): unknown => (value === null || value === undefined || typeof value === "boolean" ? value : value === 1 || value === "1" || value === "true");

/** The transport's refusal as the screens read one: its status, its code, what it said beside. */
function asApiError(error: unknown): unknown {
  if (error instanceof SessionPortError) {
    const details = error.details !== null && typeof error.details === "object" && !Array.isArray(error.details) ? (error.details as Record<string, unknown>) : {};
    return new ApiError(error.status, error.code, error.message, details);
  }
  return error;
}

const q = (value: unknown) => encodeURIComponent(JSON.stringify(value));
const str = (value: unknown): string => (value === null || value === undefined ? "0" : String(value));

export interface DeskDoorOptions {
  /** The server's clock less the device's, as the config said it. */
  skew?: number;
  /** How the add-ons' list and bundles and the print copies are read: the browser's `fetch`, or a test's. */
  fetchImpl?: typeof fetch;
  /** The origin the desk was served from: where Adminium serves the add-ons' bundles. */
  origin?: string;
  importBundle?: (url: string) => Promise<unknown>;
  /** Prints one page holding many: the browser's own print, or a test's. */
  print?: (html: string) => Promise<boolean>;
}

export class AdminiumDesk implements DeskDoor {
  private readonly t: SessionTransport;
  private readonly cfg: StaffConfig;
  private readonly skew: number;
  private readonly fetchImpl: typeof fetch;
  private readonly options: DeskDoorOptions;
  private registry: Promise<AddOnRegistry> | null = null;
  private engineClient: EngineCarrier | null | undefined;
  /** Why an add-on Adminium listed for this app did not load (its slot stays empty). */
  addOnProblems: ConnectedProblem[] = [];

  constructor(transport: SessionTransport, config: StaffConfig, options: DeskDoorOptions = {}) {
    this.t = transport;
    this.cfg = config;
    this.skew = options.skew ?? 0;
    this.fetchImpl = withInstall(options.fetchImpl ?? globalThis.fetch.bind(globalThis), config.installId);
    this.options = options;
  }

  addOnRegistry(): Promise<AddOnRegistry> {
    this.registry ??= loadConnectedAddOns({
      appKey: APP_KEY,
      origin: this.options.origin ?? window.location.origin,
      request: this.fetchImpl,
      csrfToken: () => this.cfg.csrfToken,
      installId: this.cfg.installId,
      allowed: new Set(Object.keys(this.cfg.addOns)),
      ...(this.options.importBundle === undefined ? {} : { importBundle: this.options.importBundle }),
    }).then((loaded) => {
      this.addOnProblems = loaded.problems;
      return createRegistry(loaded.addOns);
    });
    return this.registry;
  }

  shippingClient(): EngineCarrier | null {
    if (this.engineClient !== undefined) return this.engineClient;
    const attached = ["shipping-shippo", "shipping-dhl"].find((key) => key in this.cfg.addOns);
    this.engineClient =
      attached === undefined
        ? null
        : createEngineCarrier({ send: engineSend(this.fetchImpl, this.options.origin ?? window.location.origin, () => this.cfg.csrfToken), appKey: APP_KEY, addOnKey: attached });
    return this.engineClient;
  }

  shippingStatus(): Promise<ShippingStatus> {
    return this.run(async () => (await this.t.get<{ data: ShippingStatus }>(`/api/v1/apps/${APP_KEY}/shipping`)).data);
  }

  saveShipFrom(values: ShipFromValues): Promise<ShippingStatus> {
    return this.run(async () => {
      await this.t.port.config();
      return (await this.t.mutate<{ data: ShippingStatus }>(`/api/v1/apps/${APP_KEY}/shipping/ship-from`, "PUT", values)).data;
    });
  }

  // ── the wire ──────────────────────────────────────────────────────────────

  private get serverZone(): string {
    return this.cfg.serverTimezone ?? "UTC";
  }
  private real(table: Table): string {
    return this.cfg.tables[table] ?? `ecommerce_shop_${table}`;
  }
  private realAddOn(addOn: string, table: string): string {
    return this.cfg.addOns[addOn]?.tables?.[table] ?? this.cfg.tables[`${addOn}:${table}`] ?? `${addOn.replace(/-/g, "_")}_${table}`;
  }
  /** Whether this person reads an add-on's table, as Adminium says it; a server that does not say is asked anyway. */
  private readsAddOn(addOn: string, table: string): boolean {
    if (!Object.keys(this.cfg.addOns).includes(addOn)) return false;
    return this.cfg.access === null || (this.cfg.access.tables[this.realAddOn(addOn, table)]?.includes("read") ?? this.cfg.access.tables[`${addOn}:${table}`]?.includes("read") ?? false);
  }
  private async conn(): Promise<string> {
    return this.cfg.connectionId ?? (await this.t.connection());
  }
  private async path(real: string, rest = ""): Promise<string> {
    return `/api/v1/data/${encodeURIComponent(await this.conn())}/${encodeURIComponent(real)}${rest}`;
  }
  private row(table: string, row: Row): Row {
    const out: Row = { ...row };
    for (const column of MOMENTS[table] ?? []) if (column in out) out[column] = momentOf(out[column], this.serverZone);
    for (const column of YES_NO[table] ?? []) if (column in out) out[column] = yesNo(out[column]);
    return out;
  }
  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      throw asApiError(error);
    }
  }
  private async listReal(short: string, real: string, query: { where?: unknown; order?: string } = {}): Promise<Row[]> {
    const rows: Row[] = [];
    const extra = `${query.where === undefined ? "" : `&where=${q(query.where)}`}${query.order === undefined ? "" : `&order=${encodeURIComponent(query.order)}`}`;
    for (let offset = 0; offset < 50 * PAGE; offset += PAGE) {
      const got = await this.t.get<{ data: Row[] }>(await this.path(real, `?limit=${String(PAGE)}&offset=${String(offset)}${extra}`));
      rows.push(...got.data.map((r) => this.row(short, r)));
      if (got.data.length < PAGE) break;
    }
    return rows;
  }
  /** A table the person may read, every row; none at all when their roles do not let them read it. */
  private async list(table: Table, order?: string): Promise<Row[]> {
    if (!this.who().can(table, "read")) return [];
    return this.listReal(table, this.real(table), order === undefined ? {} : { order });
  }
  /** An add-on's table the person may read; null when they may not, or it is not there. */
  private async listAddOn(addOn: string, table: string, query: { where?: unknown; order?: string } = {}): Promise<Row[] | null> {
    if (!this.readsAddOn(addOn, table)) return null;
    try {
      return await this.listReal(table, this.realAddOn(addOn, table), query);
    } catch (error) {
      if (error instanceof SessionPortError && (error.status === 403 || error.status === 404 || error.status === 412)) return null;
      throw error;
    }
  }
  private async create(table: Table, values: Record<string, unknown>): Promise<Row> {
    return this.row(table, (await this.t.mutate<{ data: Row }>(await this.path(this.real(table)), "POST", { values })).data);
  }
  private async change(table: Table, id: Id, values: Record<string, unknown>, from?: string): Promise<Row> {
    const body = from === undefined ? { values } : { values, from };
    return this.row(table, (await this.t.mutate<{ data: Row }>(await this.path(this.real(table), `/${encodeURIComponent(String(id))}`), "PATCH", body)).data);
  }

  // ── who, and the desk ─────────────────────────────────────────────────────

  who(): Person {
    const prefix = `${APP_KEY}-`;
    const roles = (this.cfg.access?.roles ?? []).map((r) => r.slug).filter((slug) => slug.startsWith(prefix)).map((slug) => slug.slice(prefix.length));
    const access = this.cfg.access;
    return {
      name: this.cfg.user?.name ?? "",
      roles,
      can: (table: Table, action: Action) => access === null || (access.tables[table]?.includes(action) ?? access.tables[this.real(table)]?.includes(action) ?? false),
    };
  }

  facts(): DeskFacts {
    return {
      zone: this.cfg.timezone ?? this.cfg.serverTimezone ?? "UTC",
      currency: this.cfg.currency ?? "USD",
      addOns: Object.keys(this.cfg.addOns),
      addOnSettings: Object.fromEntries(Object.entries(this.cfg.addOns).map(([key, addOn]) => [key, { ...addOn.settings }])),
      appSettings: { ...this.cfg.settings },
      connectionId: this.cfg.connectionId,
    };
  }

  now(): number {
    return Date.now() + this.skew;
  }

  payments(): StaffPayments | null {
    return this.cfg.payments ?? null;
  }

  async signOut(): Promise<void> {
    await this.run(async () => {
      await this.t.port.config();
      await this.t.mutate("/api/v1/auth/logout", "POST", {});
    });
  }

  load(): Promise<DeskData> {
    return this.run(async () => {
      // The session's write token comes with the first read.
      await this.t.port.config();
      const [settings, categories, sizeGuides, products, optionValues, pictures, variants, zones, regions, services, offers, closures, customers, orders, lines, giftLines, codes, payments, refunds, returns, returnLines, messages] = await Promise.all([
        this.list("settings"),
        this.list("categories", "position.asc,id.asc"),
        this.list("size_guides"),
        this.list("products", "position.asc,id.asc"),
        this.list("option_values", "product_id.asc,position.asc"),
        this.list("product_pictures", "product_id.asc,position.asc"),
        this.list("variants", "product_id.asc,id.asc"),
        this.list("zones"),
        this.list("regions"),
        this.list("shipping_services", "position.asc,id.asc"),
        this.list("shipping_offers"),
        this.list("closures", "from_date.asc"),
        this.list("customers", "id.asc"),
        this.list("orders", "id.desc"),
        this.list("order_lines", "order_id.asc,id.asc"),
        this.list("gift_lines", "order_id.asc,id.asc"),
        this.list("order_codes"),
        this.list("payments", "id.asc"),
        this.list("payment_refunds", "id.asc"),
        this.list("returns", "id.desc"),
        this.list("return_lines", "return_id.asc,id.asc"),
        this.list("messages", "id.asc"),
      ]);
      const [stock, reviews] = await Promise.all([this.stock(), this.reviews()]);
      return { settings: settings[0] ?? null, categories, sizeGuides, products, optionValues, pictures, variants, zones, regions, services, offers, closures, customers, orders, lines, giftLines, codes, payments, refunds, returns, returnLines, messages, stock, reviews };
    });
  }

  /** Inventory's items, links, places and stock points, as the person's role reads them; null without Inventory. */
  private async stock(): Promise<StockRows | null> {
    const [items, links, places, points] = await Promise.all([
      this.listAddOn("inventory", "items"),
      this.listAddOn("inventory", "links"),
      this.listAddOn("inventory", "places"),
      this.listAddOn("inventory", "stock_points"),
    ]);
    if (items === null || links === null || points === null) return null;
    // Only the links that say which variant counts which item: the shop's own, not another app's.
    const variants = this.real("variants");
    return { items, links: links.filter((l) => String(l["source_table"] ?? "").endsWith(variants) || String(l["source_table"] ?? "") === "variants"), places: places ?? [], points };
  }

  /** Forms & surveys' reviews of this shop, through the owner's grant; null for anyone else. */
  private async reviews(): Promise<ReviewRows | null> {
    const where = { column: "app", op: "eq", value: APP_KEY };
    const [reviews, totals] = await Promise.all([this.listAddOn("forms", "reviews", { where, order: "submitted_at.desc" }), this.listAddOn("forms", "review_totals", { where })]);
    if (reviews === null) return null;
    return { reviews, totals: totals ?? [] };
  }

  // ── the writes ────────────────────────────────────────────────────────────

  moveOrder(order: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    return this.run(() => this.change("orders", order.id, { status: to, ...values }, String(order["status"])));
  }

  saveOrder(order: Row, values: Record<string, unknown>): Promise<Row> {
    return this.run(() => this.change("orders", order.id, values));
  }

  panel(order: Row): Promise<PaymentPanel | null> {
    return this.run(async () => {
      await this.t.port.config();
      const reply = await this.t.mutate<{ data: Record<string, unknown> | null }>("/api/v1/payments/panel", "POST", {
        connectionId: await this.conn(),
        table: this.real("orders"),
        recordId: String(order.id),
      });
      const p = reply.data;
      if (p === null || p === undefined) return null;
      const payments = Array.isArray(p["payments"]) ? (p["payments"] as Record<string, unknown>[]) : [];
      const refusal = (value: unknown): string | null => (value !== null && typeof value === "object" ? String((value as Record<string, unknown>)["message"] ?? "") || null : null);
      return {
        currency: String(p["currency"] ?? ""),
        total: str(p["total"]),
        due: str(p["due"]),
        paid: str(p["paid"]),
        mayRefund: p["mayRefund"] === true,
        mayRecord: p["mayRecord"] === true,
        waiting: Array.isArray(p["waiting"]) && p["waiting"].length > 0,
        payments: payments.map(
          (one): PanelPayment => ({
            amount: str(one["amount"]),
            method: String(one["method"] ?? ""),
            provider: typeof one["provider"] === "string" ? one["provider"] : null,
            test: one["test"] === true,
            paidOn: String(one["paidOn"] ?? ""),
            refundable: str(one["refundable"]),
            refundRefusal: refusal(one["refundRefusal"]),
          }),
        ),
      };
    });
  }

  recordTransfer(input: { order: Row; amount: string; paidOn: string; note: string | null; key: string }): Promise<Row> {
    return this.run(() =>
      this.create("payments", {
        order_id: input.order.id,
        method: "transfer",
        amount: input.amount,
        // The day the money arrived, at noon on the shop's clock: a day, not a moment anyone saw.
        paid_at: `${input.paidOn}T12:00:00`,
        ...(input.note === null ? {} : { note: input.note }),
        client_key: input.key,
      }),
    );
  }

  refund(input: { payment: Row; amount: string; reason: string; returnId?: Id | null; key: string }): Promise<Row> {
    return this.run(() =>
      this.create("payment_refunds", {
        payment_id: input.payment.id,
        amount: input.amount,
        reason: input.reason,
        client_key: input.key,
        ...(input.returnId === undefined || input.returnId === null ? {} : { return_id: input.returnId }),
      }),
    );
  }

  resend(message: Row): Promise<Row> {
    return this.run(async () => this.row("messages", (await this.t.mutate<{ data: Row }>(await this.path(this.real("messages"), `/${encodeURIComponent(String(message.id))}`), "PATCH", { values: { status: "queued" } })).data));
  }

  moveReturn(ret: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    return this.run(() => this.change("returns", ret.id, { status: to, ...values }, String(ret["status"])));
  }

  saveReturn(ret: Row, values: Record<string, unknown>): Promise<Row> {
    return this.run(() => this.change("returns", ret.id, values));
  }

  saveReturnLine(line: Row, values: Record<string, unknown>): Promise<Row> {
    return this.run(() => this.change("return_lines", line.id, values));
  }

  saveProduct(product: Row, values: Record<string, unknown>): Promise<Row> {
    return this.run(() => this.change("products", product.id, values));
  }

  createOption(values: Record<string, unknown>): Promise<Row> {
    return this.run(() => this.create("option_values", values));
  }

  createVariant(values: Record<string, unknown>): Promise<Row> {
    return this.run(() => this.create("variants", values));
  }

  saveVariant(variant: Row, values: Record<string, unknown>): Promise<Row> {
    return this.run(() => this.change("variants", variant.id, values));
  }

  saveReview(review: Row, values: Record<string, unknown>): Promise<Row> {
    return this.run(async () => {
      const real = this.realAddOn("forms", "reviews");
      return this.row("reviews", (await this.t.mutate<{ data: Row }>(await this.path(real, `/${encodeURIComponent(String(review.id))}`), "PATCH", { values })).data);
    });
  }

  saveSettings(settings: Row, values: Record<string, unknown>): Promise<Row> {
    return this.run(() => this.change("settings", settings.id, values));
  }

  render(input: { kind: string; ref: Table; pk: Id }): Promise<Drawn> {
    return this.run(async () => {
      const made = await this.t.mutate<{ contentUrl: string; printUrl?: string }>(`/api/v1/apps/${APP_KEY}/documents/render`, "POST", { kind: input.kind, ref: input.ref, pk: { id: input.pk } });
      return { contentUrl: made.contentUrl, printUrl: made.printUrl ?? null };
    });
  }

  /**
   * One print job of many print copies (C11b): each copy's page is read from
   * the same origin, and their bodies are laid one after the other, a page
   * break between, in one page the browser prints once.
   */
  async printAll(urls: string[]): Promise<boolean> {
    const bodies: string[] = [];
    let head = "";
    for (const url of urls) {
      const res = await this.fetchImpl(url, { credentials: "same-origin" });
      if (!res.ok) throw new ApiError(res.status, "PRINT_REFUSED", "A packing slip could not be read.");
      const doc = new DOMParser().parseFromString(await res.text(), "text/html");
      if (head === "") head = Array.from(doc.head.querySelectorAll("style")).map((s) => s.outerHTML).join("");
      bodies.push(`<section style="break-after:page">${doc.body.innerHTML}</section>`);
    }
    const html = `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${bodies.join("")}</body></html>`;
    return (this.options.print ?? printHtml)(html);
  }
}

/** Prints a page of HTML once, from a frame of its own that holds no script. */
function printHtml(html: string): Promise<boolean> {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-modals allow-same-origin");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;inset-inline-start:-10000px;inline-size:1px;block-size:1px;border:0";
    frame.srcdoc = html;
    frame.onload = () => {
      try {
        frame.contentWindow?.print();
        resolve(true);
      } catch {
        resolve(false);
      } finally {
        setTimeout(() => frame.remove(), 60_000);
      }
    };
    document.body.append(frame);
  });
}
