/**
 * A stand-in Adminium for the desk's tests: one role's rows, and every write
 * the screens make written down in order, as a call the test reads back. A
 * write the role holds no grant for is refused (403) the way Adminium
 * refuses it, so a test can show the screen never offers it.
 */
import { createRegistry, type AddOnRegistry } from "../../add-ons/host.ts";
import type { Action, DeskData, DeskDoor, DeskFacts, Drawn, PaymentPanel, Person, StaffPayments, Table } from "../door.ts";
import { ApiError, type Id, type Row } from "../wire.ts";
import { ownerData, packerData } from "./fixture.ts";

export interface Call {
  op: string;
  args: unknown[];
}

/** Tuesday 18 August 2026, 11:40 in Portland. */
export const NOW = Date.parse("2026-08-18T18:40:00Z");

const PACKER_GRANTS: Partial<Record<Table, Action[]>> = {
  orders: ["read", "update"],
  order_lines: ["read"],
  returns: ["read", "update"],
  return_lines: ["read", "update"],
  products: ["read"],
  variants: ["read"],
  settings: ["read"],
};

export class FakeDoor implements DeskDoor {
  readonly role: "owner" | "packer";
  readonly calls: Call[] = [];
  data: DeskData;
  addOns: string[];
  private readonly addOnSettings: Record<string, Record<string, unknown>>;
  private readonly paying: StaffPayments | null;

  constructor(role: "owner" | "packer" = "owner", options: { addOns?: string[]; addOnSettings?: Record<string, Record<string, unknown>>; data?: DeskData; payments?: StaffPayments | null } = {}) {
    this.role = role;
    this.data = options.data ?? (role === "owner" ? ownerData() : packerData());
    this.addOns = options.addOns ?? ["inventory", "offers", "invoices", "forms"];
    this.addOnSettings = options.addOnSettings ?? {};
    this.paying = options.payments === undefined ? { on: true, online: true, test: false, refund: role === "owner" } : options.payments;
  }

  who(): Person {
    const role = this.role;
    return {
      name: role === "owner" ? "Robin Ash" : "Casey Moll",
      roles: [role],
      can: (table: Table, action: Action) => role === "owner" || (PACKER_GRANTS[table]?.includes(action) ?? false),
    };
  }
  facts(): DeskFacts {
    return { zone: "America/Los_Angeles", currency: "USD", addOns: this.addOns, addOnSettings: this.addOnSettings, appSettings: { cutoff: "14:00", ship_days: "mon,tue,wed,thu,fri" }, connectionId: "c1" };
  }
  now(): number {
    return NOW;
  }
  payments(): StaffPayments | null {
    return this.paying;
  }
  async addOnRegistry(): Promise<AddOnRegistry> {
    return createRegistry([]);
  }
  async load(): Promise<DeskData> {
    return structuredClone(this.data);
  }

  private write(op: string, table: Table, action: Action, ...args: unknown[]): void {
    if (!this.who().can(table, action)) throw new ApiError(403, "TABLE_FORBIDDEN", "Not yours to do.");
    this.calls.push({ op, args });
  }
  private moved(table: "orders" | "returns", row: Row, to: string, values: Record<string, unknown>): Row {
    const list = table === "orders" ? this.data.orders : this.data.returns;
    const found = list.find((r) => String(r.id) === String(row.id));
    if (found !== undefined) Object.assign(found, values, { status: to });
    return { ...row, ...values, status: to };
  }

  async moveOrder(order: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    if (this.role === "packer" && !["packed", "shipped", "paid"].includes(to)) throw new ApiError(403, "TABLE_FORBIDDEN", "Not yours to do.");
    this.write("moveOrder", "orders", "update", order["number"], to, values);
    return this.moved("orders", order, to, values);
  }
  async saveOrder(order: Row, values: Record<string, unknown>): Promise<Row> {
    this.write("saveOrder", "orders", "update", order["number"], values);
    return { ...order, ...values };
  }
  async panel(order: Row): Promise<PaymentPanel | null> {
    if (this.role === "packer") return null;
    return { currency: "USD", total: String(order["total"]), due: String(order["due"]), paid: String(order["paid"]), mayRefund: true, mayRecord: order["status"] === "awaiting_transfer", waiting: false, payments: [] };
  }
  async recordTransfer(input: { order: Row; amount: string; paidOn: string; note: string | null; key: string }): Promise<Row> {
    this.write("recordTransfer", "payments", "create", input.order["number"], input.amount, input.paidOn, input.note);
    return { id: 99, order_id: input.order.id, method: "transfer", amount: input.amount };
  }
  async refund(input: { payment: Row; amount: string; reason: string; returnId?: Id | null; key: string }): Promise<Row> {
    this.write("refund", "payment_refunds", "create", input.payment.id, input.amount, input.reason, input.returnId ?? null);
    return { id: 77, payment_id: input.payment.id, amount: input.amount };
  }
  async resend(message: Row): Promise<Row> {
    this.write("resend", "messages", "update", message.id);
    return { ...message, status: "queued" };
  }
  async moveReturn(ret: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    if (this.role === "packer" && to !== "received") throw new ApiError(403, "TABLE_FORBIDDEN", "Not yours to do.");
    this.write("moveReturn", "returns", "update", ret["number"], to, values);
    return this.moved("returns", ret, to, values);
  }
  async saveReturn(ret: Row, values: Record<string, unknown>): Promise<Row> {
    this.write("saveReturn", "returns", "update", ret["number"], values);
    return { ...ret, ...values };
  }
  async saveReturnLine(line: Row, values: Record<string, unknown>): Promise<Row> {
    this.write("saveReturnLine", "return_lines", "update", line.id, values);
    return { ...line, ...values };
  }
  async saveProduct(product: Row, values: Record<string, unknown>): Promise<Row> {
    this.write("saveProduct", "products", "update", product.id, values);
    return { ...product, ...values };
  }
  async createOption(values: Record<string, unknown>): Promise<Row> {
    this.write("createOption", "option_values", "create", values);
    return { id: 900, ...values };
  }
  async createVariant(values: Record<string, unknown>): Promise<Row> {
    this.write("createVariant", "variants", "create", values);
    return { id: 901, ...values };
  }
  async saveVariant(variant: Row, values: Record<string, unknown>): Promise<Row> {
    this.write("saveVariant", "variants", "update", variant.id, values);
    return { ...variant, ...values };
  }
  async saveReview(review: Row, values: Record<string, unknown>): Promise<Row> {
    if (this.role !== "owner") throw new ApiError(403, "TABLE_FORBIDDEN", "Not yours to do.");
    this.calls.push({ op: "saveReview", args: [review.id, values] });
    return { ...review, ...values };
  }
  async saveSettings(settings: Row, values: Record<string, unknown>): Promise<Row> {
    this.write("saveSettings", "settings", "update", values);
    return { ...settings, ...values };
  }
  async render(input: { kind: string; ref: Table; pk: Id }): Promise<Drawn> {
    this.calls.push({ op: "render", args: [input.kind, input.ref, input.pk] });
    return { contentUrl: `/doc/${String(input.pk)}`, printUrl: `/doc/${String(input.pk)}/print` };
  }
  async printAll(urls: string[]): Promise<boolean> {
    this.calls.push({ op: "printAll", args: [urls] });
    return true;
  }

  /** The calls of one kind, by their arguments. */
  ops(op: string): unknown[][] {
    return this.calls.filter((c) => c.op === op).map((c) => c.args);
  }
}
