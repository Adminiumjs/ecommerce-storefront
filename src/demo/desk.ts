/**
 * The desk's door into the demo's Adminium: every row the screens read, and
 * each write made the way the real server makes it — an order or a return
 * moved only from the state the screen saw and only along its table's
 * states, stock taken on Packed and put back on a received return, an
 * online payment given back by itself on the shop's cancel, a refund that
 * counts against what its payment still keeps, a review published or hidden
 * with its reason.
 *
 * Signed in as Robin Ash, who owns the shop, so every screen is open.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import type { AddOnRegistry } from "../add-ons/host.ts";
import type { DeskData, DeskDoor, DeskFacts, Drawn, PaymentPanel, Person, StaffPayments, Table } from "../desk/door.ts";
import { ApiError, type Id, type Row } from "../desk/wire.ts";
import { cents, money, n, same } from "./rules.ts";
import { STOCK, realTable } from "./sample.ts";
import { DemoRefusal, type By, type DemoWorld } from "./world.ts";

const copy = <T>(value: T): T => structuredClone(value);
const byNumber = (column: string) => (a: Row, b: Row) => n(a[column]) - n(b[column]) || Number(a.id) - Number(b.id);

/** The person the desk is signed in as: the sample's owner. */
export const DEMO_PERSON: Person = { name: "Robin Ash", roles: ["owner"], can: () => true };
const BY: By = { origin: "staff", name: DEMO_PERSON.name };

/** A refusal of the world's, as the desk's screens read one. */
function asApi(error: unknown): unknown {
  return error instanceof DemoRefusal ? new ApiError(error.status, error.code, error.message, error.params) : error;
}

async function run<T>(work: () => T): Promise<T> {
  await Promise.resolve();
  try {
    return work();
  } catch (error) {
    throw asApi(error);
  }
}

const strip = ({ _label, ...row }: Row): Row => copy(row) as Row;

export class DemoDesk implements DeskDoor {
  private readonly world: DemoWorld;

  constructor(world: DemoWorld) {
    this.world = world;
  }

  who(): Person {
    return DEMO_PERSON;
  }

  facts(): DeskFacts {
    const w = this.world;
    return {
      zone: w.zone,
      currency: w.currency,
      addOns: [...w.addOns],
      // DHL's demo carrier: it books nothing, and its booking is marked as the demo's (C4); the pickup is the sample's.
      addOnSettings: w.addOns.has("shipping-dhl") ? { "shipping-dhl": { demo_transport: true, collection_cutoff: "15:00" } } : {},
      appSettings: { cutoff: "14:00", ship_days: "mon,tue,wed,thu,fri" },
      connectionId: null,
    };
  }

  now(): number {
    return this.world.now;
  }

  /** The demo takes payments online and no money moves; Robin may give money back, which the demo does at once. */
  payments(): StaffPayments {
    return { on: true, online: true, test: false, refund: true };
  }

  /** DHL's client half compiled into the demo, answering from its demo carrier: no real booking is made. */
  async addOnRegistry(): Promise<AddOnRegistry> {
    return (await import("../add-ons/registry.ts")).DESK_REGISTRY;
  }

  load(): Promise<DeskData> {
    return run((): DeskData => {
      const w = this.world;
      const all = (table: string) => w.all(table).map(strip);
      const variants = realTable("variants");
      return {
        settings: strip(w.settings()),
        categories: all("categories").sort(byNumber("position")),
        sizeGuides: all("size_guides"),
        products: all("products").sort(byNumber("position")),
        optionValues: all("option_values").sort((a, b) => n(a["product_id"]) - n(b["product_id"]) || n(a["position"]) - n(b["position"])),
        pictures: all("product_pictures"),
        variants: all("variants").sort((a, b) => n(a["product_id"]) - n(b["product_id"]) || Number(a.id) - Number(b.id)),
        zones: all("zones"),
        regions: all("regions"),
        services: all("shipping_services").sort(byNumber("position")),
        offers: all("shipping_offers"),
        closures: all("closures"),
        customers: all("customers"),
        orders: all("orders").sort((a, b) => Number(b.id) - Number(a.id)),
        lines: all("order_lines").sort((a, b) => n(a["order_id"]) - n(b["order_id"]) || Number(a.id) - Number(b.id)),
        giftLines: all("gift_lines"),
        codes: all("order_codes"),
        payments: all("payments"),
        refunds: all("payment_refunds"),
        returns: all("returns").sort((a, b) => Number(b.id) - Number(a.id)),
        returnLines: all("return_lines"),
        messages: all("messages"),
        stock: w.addOns.has("inventory")
          ? { items: all(`${STOCK}items`), links: all(`${STOCK}links`).filter((l) => l["source_table"] === variants), places: all(`${STOCK}places`), points: all(`${STOCK}stock_points`) }
          : null,
        reviews: w.addOns.has("forms") ? { reviews: all("forms.reviews").sort((a, b) => String(b["submitted_at"]).localeCompare(String(a["submitted_at"]))), totals: all("forms.review_totals") } : null,
      };
    });
  }

  // ── orders ────────────────────────────────────────────────────────────────

  moveOrder(order: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    return run(() => strip(this.world.moveOrder(order.id, String(order["status"]), to, values, BY)));
  }

  saveOrder(order: Row, values: Record<string, unknown>): Promise<Row> {
    return run(() => {
      const allowed = Object.fromEntries(Object.entries(values).filter(([k]) => ["staff_note", "carrier", "tracking", "link_stopped"].includes(k)));
      const row = this.world.update("orders", order.id, allowed);
      this.world.changed();
      return strip(row);
    });
  }

  panel(order: Row): Promise<PaymentPanel | null> {
    return run((): PaymentPanel => {
      const w = this.world;
      const held = w.get("orders", order.id) ?? order;
      const payments = w.all("payments").filter((p) => same(p["order_id"], held.id));
      return {
        currency: w.currency,
        total: String(held["total"]),
        due: String(held["due"]),
        paid: String(held["paid"]),
        mayRefund: true,
        mayRecord: held["status"] === "awaiting_transfer",
        waiting: held["status"] === "paying" && w.payStates.get(String(held.id)) === "confirming",
        payments: payments
          .filter((p) => p["method"] === "online")
          .map((p) => ({ amount: String(p["amount"]), method: "card", provider: (p["provider"] as string | null) ?? null, test: false, paidOn: String(p["paid_at"] ?? "").slice(0, 10), refundable: money(cents(p["kept"])), refundRefusal: null })),
      };
    });
  }

  recordTransfer(input: { order: Row; amount: string; paidOn: string; note: string | null; key: string }): Promise<Row> {
    return run(() => {
      const w = this.world;
      const again = w.all("payments").find((p) => p["client_key"] === input.key);
      if (again !== undefined) return strip(again);
      const row = w.insert("payments", { order_id: input.order.id, method: "transfer", amount: money(cents(input.amount)), paid_at: new Date(Date.parse(`${input.paidOn}T19:00:00Z`)).toISOString(), note: input.note, made_by: DEMO_PERSON.name, client_key: input.key });
      w.changed();
      return strip(row);
    });
  }

  refund(input: { payment: Row; amount: string; reason: string; returnId?: Id | null; key: string }): Promise<Row> {
    return run(() => {
      const w = this.world;
      const again = w.all("payment_refunds").find((r) => r["client_key"] === input.key);
      if (again !== undefined) return strip(again);
      const payment = w.get("payments", input.payment.id);
      if (payment === undefined) throw new DemoRefusal(404, "NOT_FOUND", "No such payment.");
      if (cents(input.amount) > cents(payment["kept"])) throw new DemoRefusal(409, "BALANCE_EXCEEDED", "More than the payment keeps.", { reason: "BALANCE_EXCEEDED" });
      // Given back at once, the way it came: a bank transfer is sent by hand, so its row only records it.
      const row = w.insert("payment_refunds", {
        payment_id: payment.id,
        order_id: payment["order_id"],
        return_id: input.returnId ?? null,
        method: payment["method"],
        amount: money(cents(input.amount)),
        reason: input.reason.trim() === "" ? null : input.reason.trim(),
        client_key: input.key,
        made_at: w.nowIso(),
        made_by: DEMO_PERSON.name,
        automatic: false,
        refund_state: "done",
        provider_ref: payment["method"] === "online" ? w.code("re_demo_", 24) : null,
      });
      if (payment["method"] === "gift_card") {
        const card = w.get("offers.gift_cards", payment["card_id"]);
        if (card !== undefined) card["balance"] = money(cents(card["balance"]) + cents(input.amount));
      }
      w.changed();
      return strip(row);
    });
  }

  resend(message: Row): Promise<Row> {
    return run(() => {
      const w = this.world;
      const held = w.get("messages", message.id);
      if (held === undefined) throw new DemoRefusal(404, "NOT_FOUND", "No such e-mail.");
      // Sent again at once: the demo's outbox has nothing to wait for.
      Object.assign(held, { status: "sent", sent_at: w.nowIso() });
      w.changed();
      return strip(held);
    });
  }

  // ── returns ───────────────────────────────────────────────────────────────

  moveReturn(ret: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    return run(() => strip(this.world.moveReturn(ret.id, String(ret["status"]), to, values, BY)));
  }

  saveReturn(ret: Row, values: Record<string, unknown>): Promise<Row> {
    return run(() => {
      const row = this.world.update("returns", ret.id, Object.fromEntries(Object.entries(values).filter(([k]) => ["shipping_refund", "staff_note", "tracking"].includes(k))));
      this.world.changed();
      return strip(row);
    });
  }

  saveReturnLine(line: Row, values: Record<string, unknown>): Promise<Row> {
    return run(() => {
      const row = this.world.update("return_lines", line.id, Object.fromEntries(Object.entries(values).filter(([k]) => ["restock", "void_at", "received"].includes(k))));
      this.world.changed();
      return strip(row);
    });
  }

  // ── the catalogue ─────────────────────────────────────────────────────────

  saveProduct(product: Row, values: Record<string, unknown>): Promise<Row> {
    return run(() => {
      const row = this.world.update("products", product.id, values);
      this.world.changed();
      return strip(row);
    });
  }

  createOption(values: Record<string, unknown>): Promise<Row> {
    return run(() => {
      const w = this.world;
      if (w.all("option_values").some((o) => same(o["product_id"], values["product_id"]) && o["kind"] === values["kind"] && o["code"] === values["code"])) throw new DemoRefusal(409, "UNIQUE_VIOLATION", "That one is there already.");
      const row = w.insert("option_values", values);
      w.changed();
      return strip(row);
    });
  }

  /** A new variant, and with Inventory on, a stock item of its own linked to it (the variants' `adopt` posting). */
  createVariant(values: Record<string, unknown>): Promise<Row> {
    return run(() => {
      const w = this.world;
      if (w.all("variants").some((v) => v["sku"] === values["sku"])) throw new DemoRefusal(409, "UNIQUE_VIOLATION", "That SKU is taken.");
      const row = w.insert("variants", { active: true, sold_out: false, price_delta: null, ...values });
      w.changed();
      if (w.addOns.has("inventory")) {
        const item = w.insert(`${STOCK}items`, { name: row["stock_name"], sku: row["sku"], active: true });
        w.insert(`${STOCK}links`, { source_table: realTable("variants"), source_row: row.id, kind: "item", item_id: item.id, qty: 1, per: "unit", action: "use" });
        w.changed();
      }
      return strip(row);
    });
  }

  saveVariant(variant: Row, values: Record<string, unknown>): Promise<Row> {
    return run(() => {
      const row = this.world.update("variants", variant.id, values);
      this.world.changed();
      return strip(row);
    });
  }

  saveReview(review: Row, values: Record<string, unknown>): Promise<Row> {
    return run(() => {
      const w = this.world;
      const reply = typeof values["reply"] === "string" ? { replied_at: w.nowIso() } : {};
      const row = w.update("forms.reviews", review.id, { ...values, ...reply });
      w.changed();
      return strip(row);
    });
  }

  saveSettings(settings: Row, values: Record<string, unknown>): Promise<Row> {
    return run(() => {
      const row = this.world.update("settings", settings.id, values);
      this.world.changed();
      return strip(row);
    });
  }

  /**
   * A packing slip, as Invoices would draw it: the order's number, its
   * address and its lines, a page made in the browser so it opens without
   * a server.
   */
  render(input: { kind: string; ref: Table; pk: Id }): Promise<Drawn> {
    return run((): Drawn => {
      const w = this.world;
      const order = w.get("orders", input.pk);
      const esc = (v: unknown) => String(v ?? "").replace(/[<>&"]/g, (c) => `&#${String(c.charCodeAt(0))};`);
      const lines = w.all("order_lines").filter((l) => same(l["order_id"], input.pk));
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(order?.["number"])}</title><style>body{font:14px system-ui,sans-serif;margin:32px}td{padding:4px 12px 4px 0}</style></head><body><h1>${esc(w.settings()["shop_name"])} · ${esc(order?.["number"])}</h1><p>${esc(order?.["ship_name"])}<br>${esc(order?.["address_line1"])}<br>${esc(order?.["city"])}, ${esc(order?.["state_code"])} ${esc(order?.["zip"])}</p><table>${lines.map((l) => `<tr><td>${esc(l["qty"])} ×</td><td>${esc(l["product_name"])}</td><td>${esc(l["variant_label"])}</td><td>${esc(l["sku"])}</td></tr>`).join("")}</table></body></html>`;
      const url = typeof URL.createObjectURL === "function" ? URL.createObjectURL(new Blob([html], { type: "text/html" })) : `data:text/html,${encodeURIComponent(html)}`;
      return { contentUrl: url, printUrl: url };
    });
  }

  /** The demo prints nothing: the slips open one by one instead. */
  async printAll(_urls: string[]): Promise<boolean> {
    return false;
  }
}
