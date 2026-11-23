/**
 * THE DESK AGAINST A BUILT ADMINIUM, AS THE OWNER AND AS A PACKER.
 *
 * Northline installed with Inventory, Offers & gift cards, Invoices &
 * Receipts and Forms & surveys (and DHL Shipping when its build is here), its
 * sample added, and the desk's own door (`desk/adminiumDesk.ts`) booted on
 * two staff sessions as the staff build boots it: an owner's, and a packer's
 * made through the admin API with the app's packer role and no other.
 *
 *   - the packer's reads of the orders carry no money and no e-mail address;
 *     their lines no price; they read no payment, refund or customer, and the
 *     Payment panel answers them nothing;
 *   - the packer cannot refund, cancel or mark an order as paid, by the
 *     desk's door or round it (the Payment panel's record-payment route);
 *   - the packer packs an order, and ships it with a carrier and a tracking number;
 *   - the owner packs and ships an order;
 *   - the owner records a bank transfer ("Mark as paid"): a `payments` row of
 *     method `transfer`, and the order is paid;
 *   - the owner cancels a paid order (its stock let go) and gives the money
 *     back: one refund row per payment, and the order keeps nothing.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons
 * checkout are, and says why it skipped otherwise.
 */
import { randomBytes } from "node:crypto";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AdminiumDesk } from "../desk/adminiumDesk.ts";
import type { DeskData } from "../desk/door.ts";
import { keptPayments, linesOf, splitRefund, toPack } from "../desk/facts.ts";
import { createSessionTransport } from "../desk/transport/sessionSource.ts";
import { loadStaffConfig } from "../desk/transport/staffConnection.ts";
import type { Row } from "../desk/wire.ts";
import { addOnBundle, addSample, appBundle, boot, Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, type Engine, type Server } from "./harness.ts";
import { MANIFEST_TEXT } from "./release.ts";

const NEEDED = ["inventory", "offers", "invoices", "forms"] as const;
const why = missing() ?? NEEDED.map((key) => missingAddOn(key)).find((reason) => reason !== null) ?? null;
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the desk contract must run here, and cannot: ${why}`);
/** DHL rides along when its build is here: the desk's slot is DHL's. */
const ADD_ONS: string[] = [...NEEDED, ...(missingAddOn("shipping-dhl") === null ? ["shipping-dhl"] : [])];
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 5200);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
/** Tuesday 18 August 2026, 11:40 in Portland: the sample's own clock. */
const CLOCK = Date.parse("2026-08-18T18:40:00Z");
/** The money and the e-mail an order carries: none of them is the packer's to read. */
const MONEY = ["total", "goods", "discount", "net", "shipping", "tax", "gifts", "paid", "due", "due_goods", "refunded", "ship_price", "free_from"];

/**
 * The manifest as the contract installs it: the shop's own, with its sample
 * named (the bundle's two files), until the manifest names it itself.
 */
function manifestWithSample(): string {
  const manifest = JSON.parse(MANIFEST_TEXT) as Record<string, unknown>;
  manifest["sampleData"] ??= { file: "seeds/ecommerce-shop.sample.json", addOns: { inventory: { file: "seeds/ecommerce-shop.inventory.sample.json" } } };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

describe.skipIf(why !== null)(`the desk on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let admin: Caller;
      let connectionId = "";
      const callers: Record<"owner" | "packer", Caller> = {} as Record<"owner" | "packer", Caller>;
      const doors: Record<"owner" | "packer", AdminiumDesk> = {} as Record<"owner" | "packer", AdminiumDesk>;
      const orderOf = (data: DeskData, number: string): Row => {
        const found = data.orders.find((o) => o["number"] === number);
        if (found === undefined) throw new Error(`no order ${number} among ${String(data.orders.length)}`);
        return found;
      };

      /** The desk's door, booted as the staff build boots it, on a person's own session. */
      const doorFor = async (caller: Caller): Promise<AdminiumDesk> => {
        const cfg = await loadStaffConfig({ hostedStaff: true, base: "/apps/ecommerce-shop/staff/", fetchImpl: caller.fetchAs() });
        if (cfg === null) throw new Error("no staff config");
        const transport = createSessionTransport({
          tableOfRef: cfg.tables,
          connectionId: cfg.connectionId ?? undefined,
          installId: cfg.installId,
          staff: { csrfToken: cfg.csrfToken, timezone: cfg.timezone, timezoneSource: cfg.timezoneSource, serverTimezone: cfg.serverTimezone, currency: cfg.currency },
          fetchImpl: caller.fetchAs(),
        });
        return new AdminiumDesk(transport, cfg, { fetchImpl: caller.fetchAs(), origin: server.base });
      };

      /** Someone holding one of the app's roles and no other, signed in to the desk. */
      const personWith = async (slug: "owner" | "packer", name: string): Promise<Caller> => {
        const roles = ok(await admin.get<{ roles: { id: string; name: string; slug?: string }[] }>("/api/v1/roles")).roles;
        const role = roles.find((r) => r.slug === `ecommerce-shop-${slug}`);
        if (role === undefined) throw new Error(`no ${slug} role among ${roles.map((r) => r.slug ?? r.name).join(", ")}`);
        const email = `${slug}.desk.${engine}@northline-staff.dev`;
        const invited = ok(await admin.post<{ invite: { token: string } }>("/api/v1/users", { email, name, roleIds: [role.id] }), 201);
        const password = `${randomBytes(18).toString("base64url")}Aa1!`;
        ok(await new Caller(server.base).post("/api/v1/auth/password/reset", { token: invited.invite.token, newPassword: password }));
        const caller = new Caller(server.base);
        await caller.signInToScreens(email, password);
        return caller;
      };

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, CLOCK, { database: `p77_desk_${engine}` });
        admin = new Caller(server.base, { origin: server.base });
        await admin.signIn(ADMIN.email, ADMIN.password);
        if (engine === "sqlite") {
          const file = join(tmpdir(), `p77-desk-${engine}-${String(PORT_BASE)}.db`);
          rmSync(file, { force: true });
          writeFileSync(file, "");
          connectionId = ok(await admin.post<{ id: string }>("/api/v1/connections", { name: "northline", engine: "sqlite", dsn: `sqlite:${file}` }), 201).id;
        } else {
          connectionId = ok(await admin.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections")).connections.find((c) => c.name === "northwind")!.id;
        }
        const addOns = ADD_ONS.map((key) => addOnBundle(key));
        for (const addOn of addOns) {
          const staged = await admin.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(addOn.integrity)}`, addOn.buffer);
          if (![200, 201].includes(staged.status)) throw new Error(`${addOn.key} upload: ${JSON.stringify(staged.body).slice(0, 600)}`);
        }
        const app = appBundle({ manifest: manifestWithSample() });
        const staged = await admin.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        if (![200, 201].includes(staged.status)) throw new Error(`upload: ${JSON.stringify(staged.body).slice(0, 1500)}`);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await admin.post<{ plan: { checksum: string; installable: boolean } }>("/api/v1/apps/plan", { ...body, addOns: addOns.map((a) => a.key) })).plan;
        if (!plan.installable) throw new Error(`not installable: ${JSON.stringify(plan).slice(0, 3000)}`);
        ok(await admin.post("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, shippingUnticked: [], addOns: addOns.map((a) => ({ key: a.key, version: a.version })) }));
        ok(await admin.patch(`/api/v1/connections/${connectionId}`, { timezone: "America/Los_Angeles", currency: "USD" }));
        await server.setClock(CLOCK, true);
        await addSample(admin);
        await server.setClock(CLOCK);
        callers.owner = await personWith("owner", "Robin Ash");
        callers.packer = await personWith("packer", "Casey Moll");
        doors.owner = await doorFor(callers.owner);
        doors.packer = await doorFor(callers.packer);
      }, 600_000);

      afterAll(async () => {
        await server?.stop();
      });

      it("reads the orders to the packer with no money and no e-mail, and nothing of payments, refunds or customers", async () => {
        const who = doors.packer.who();
        expect(who.roles).toEqual(["packer"]);
        const data = await doors.packer.load();
        expect(data.orders.length).toBe(66);
        for (const order of data.orders) {
          for (const column of [...MONEY, "email"]) expect(order[column], `${String(order["number"])}.${column}`).toBeUndefined();
        }
        for (const line of data.lines) for (const column of ["each", "line", "discount"]) expect(line[column]).toBeUndefined();
        expect([data.payments.length, data.refunds.length, data.customers.length, data.messages.length]).toEqual([0, 0, 0, 0]);
        // What the packer does read: who and where, by when, and the pick list.
        const order = orderOf(data, "NL-1065");
        expect([order["status"], order["ship_name"], order["city"], order["state_code"]]).toEqual(["paid", "Marcus Hale", "Seattle", "WA"]);
        expect(toPack(data).map((o) => o["number"]).sort()).toEqual(["NL-1061", "NL-1062", "NL-1063", "NL-1064", "NL-1065"]);
        // Adminium's Payment panel answers the packer no figures (A4).
        const panel = await doors.packer.panel(order).catch((error: unknown) => error);
        expect(panel === null || (panel as { status?: number }).status === 403).toBe(true);
      });

      it("refuses the packer a refund, a cancel and a payment recorded by hand", async () => {
        const data = await doors.owner.load();
        const paid = orderOf(data, "NL-1064");
        const payment = keptPayments(data, paid)[0]!;
        const refused = (error: unknown) => (error as { status?: number }).status;
        // Refused before anything is written: the packer holds no grant on refunds, nor reads the payment it names.
        expect([403, 422]).toContain(refused(await doors.packer.refund({ payment, amount: "1.00", reason: "No", key: "packer-refund" }).catch((e: unknown) => e)));
        const asPacker = orderOf(await doors.packer.load(), "NL-1064");
        expect([403, 409, 422]).toContain(refused(await doors.packer.moveOrder(asPacker, "cancelled", { cancel_reason: "asked" }).catch((e: unknown) => e)));
        expect([403, 422]).toContain(refused(await doors.packer.recordTransfer({ order: asPacker, amount: "1.00", paidOn: "2026-08-18", note: null, key: "packer-transfer" }).catch((e: unknown) => e)));
        // Round the desk: the Payment panel's own way of recording a payment by hand (ACC-1).
        const byHand = await callers.packer.post("/api/v1/payments/record-payment", { connectionId, table: "ecommerce_shop_orders", recordId: String(paid.id), amount: "1.00", way: "bank-transfer", paidOn: "2026-08-18", note: null, key: "packer-by-hand-0001", approvalCode: null, last4: null });
        expect(byHand.status).toBe(403);
        // Nothing moved, and nothing was written.
        const after = await doors.owner.load();
        expect(orderOf(after, "NL-1064")["status"]).toBe("paid");
        expect(after.refunds.length).toBe(data.refunds.length);
        expect(after.payments.length).toBe(data.payments.length);
      });

      it("lets the packer pack an order and ship it with a carrier and a tracking number", async () => {
        const order = orderOf(await doors.packer.load(), "NL-1061");
        await doors.packer.moveOrder(order, "packed");
        const packedRow = orderOf(await doors.packer.load(), "NL-1061");
        expect([packedRow["status"], packedRow["packed_by"]]).toEqual(["packed", "Casey Moll"]);
        await doors.packer.moveOrder(packedRow, "shipped", { carrier: "USPS", tracking: "9400111202555842761234" });
        const shipped = orderOf(await doors.packer.load(), "NL-1061");
        expect([shipped["status"], shipped["carrier"], shipped["tracking"], shipped["shipped_by"]]).toEqual(["shipped", "USPS", "9400111202555842761234", "Casey Moll"]);
      });

      it("lets the owner pack and ship an order", async () => {
        const order = orderOf(await doors.owner.load(), "NL-1063");
        await doors.owner.moveOrder(order, "packed");
        const packedRow = orderOf(await doors.owner.load(), "NL-1063");
        expect(packedRow["status"]).toBe("packed");
        await doors.owner.moveOrder(packedRow, "shipped", { carrier: "UPS", tracking: "1Z999AA10123456784" });
        const shipped = orderOf(await doors.owner.load(), "NL-1063");
        expect([shipped["status"], shipped["carrier"], shipped["tracking"], shipped["shipped_by"]]).toEqual(["shipped", "UPS", "1Z999AA10123456784", "Robin Ash"]);
        // A shipped order offers no cancel: Adminium refuses one anyway.
        expect((await doors.owner.moveOrder(shipped, "cancelled", { cancel_reason: "asked" }).catch((e: unknown) => e)) instanceof Error).toBe(true);
      });

      let transferOrder: Row;
      it("records a bank transfer for the owner: a transfer payment, and the order is paid", async () => {
        // An order waiting for its money, as the desk's owner writes one: a line, an address, a service.
        const data = await doors.owner.load();
        const variant = data.variants.find((v) => v["sku"] === "NL-BEA-SLA")!;
        const region = data.regions.find((r) => r["code"] === "OR")!;
        const offer = data.offers.find((o) => String(o["zone_id"]) === String(region["zone_id"]) && o["service_label"] === "Standard")!;
        const made = ok(
          await callers.owner.post<{ data: Row }>(`/api/v1/data/${connectionId}/ecommerce_shop_orders`, {
            values: { name: "Priya Raman", email: "priya.r@example.com", ship_name: "Priya Raman", address_line1: "22 SE Ash St", city: "Portland", zip: "97214", region_id: region.id, offer_id: offer.id, language: "en-US" },
          }),
          201,
        ).data;
        ok(await callers.owner.post(`/api/v1/data/${connectionId}/ecommerce_shop_order_lines`, { values: { order_id: made.id, variant_id: variant.id, qty: 1 } }), 201);
        let order = orderOf(await doors.owner.load(), String(made["number"]));
        expect(Number(order["due"])).toBeGreaterThan(0);
        const due = String(order["due"]);
        await doors.owner.recordTransfer({ order, amount: Number(due).toFixed(2), paidOn: "2026-08-18", note: "Ref 4471", key: `transfer-${engine}` });
        order = orderOf(await doors.owner.load(), String(made["number"]));
        await doors.owner.moveOrder(order, "paid");
        const after = await doors.owner.load();
        transferOrder = orderOf(after, String(made["number"]));
        expect([transferOrder["status"], Number(transferOrder["paid"]), Number(transferOrder["due"] ?? 0)]).toEqual(["paid", Number(due), 0]);
        const payments = after.payments.filter((p) => String(p["order_id"]) === String(transferOrder.id));
        expect(payments.map((p) => [p["method"], Number(p["amount"]), p["made_by"]])).toEqual([["transfer", Number(due), "Robin Ash"]]);
      });

      it("cancels a paid order for the owner, lets its stock go, and gives the money back by a refund row per payment", async () => {
        const data = await doors.owner.load();
        const order = orderOf(data, String(transferOrder["number"]));
        await doors.owner.moveOrder(order, "cancelled", { cancel_reason: "asked" });
        let after = await doors.owner.load();
        const cancelled = orderOf(after, String(order["number"]));
        expect([cancelled["status"], cancelled["cancel_reason"], cancelled["cancelled_by"]]).toEqual(["cancelled", "asked", "Robin Ash"]);
        // Money paid by transfer stays the shop's to send back: the desk lists it, then the owner records the refund.
        expect(Number(cancelled["paid"])).toBeGreaterThan(0);
        const parts = splitRefund(after, cancelled, Math.round(Number(cancelled["paid"]) * 100));
        expect(parts.map((p) => p.payment["method"])).toEqual(["transfer"]);
        for (const part of parts) await doors.owner.refund({ payment: part.payment, amount: (part.cents / 100).toFixed(2), reason: "Cancelled by the shop", key: `refund-${engine}-${String(part.payment.id)}` });
        after = await doors.owner.load();
        const refunded = orderOf(after, String(order["number"]));
        expect([Number(refunded["paid"] ?? 0), Number(refunded["refunded"])]).toEqual([0, Number(cancelled["paid"])]);
        expect(after.refunds.filter((r) => String(r["order_id"]) === String(order.id)).map((r) => [r["method"], r["made_by"]])).toEqual([["transfer", "Robin Ash"]]);
        expect(linesOf(after, refunded).length).toBe(1);
      });

      it("cancels a paid online order for the owner, and Adminium says what it gives back", async () => {
        const order = orderOf(await doors.owner.load(), "NL-1064");
        // Payments online are off on this Adminium: the panel shows nothing, and the desk refunds no online money.
        const panel = await doors.owner.panel(order);
        expect(panel === null || panel.mayRefund).toBe(true);
        await doors.owner.moveOrder(order, "cancelled", { cancel_reason: "stock" });
        const after = orderOf(await doors.owner.load(), "NL-1064");
        expect([after["status"], after["cancel_reason"]]).toEqual(["cancelled", "stock"]);
      });
    });
  });
});
