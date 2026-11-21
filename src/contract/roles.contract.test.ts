/**
 * WHO MAY DO WHAT AT NORTHLINE'S DESK, ENFORCED BY ADMINIUM.
 *
 * On each engine, Northline installed with its add-ons and its sample at
 * Tuesday 18 August 2026, 11:40 in Portland. Two members of staff are
 * invited, each with one of the shop's roles and no other, and sign in on
 * the desk's own screens. Then, as each of them, over the data API:
 *
 *   - the PACKER reads the orders to pack and ship — who, where, by when —
 *     with no money and no e-mail address in any row, and their lines with
 *     no price; packs and ships an order; and cannot refund, cancel or
 *     record a payment. The Payment panel answers them nothing (A4);
 *   - the OWNER reads it all, the Payment panel's figures too, records a
 *     bank transfer, and gives money back.
 *
 * A hidden button is not a lock: every refusal here is the server's.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons
 * checkout are, and says why it skipped otherwise.
 */
import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, type Engine } from "./harness.ts";
import { ADD_ONS, num, PREFIX, retryKey, standUp, type Row, type Stand } from "./stand.ts";

const why = missing() ?? ADD_ONS.map((key) => missingAddOn(key)).find((reason) => reason !== null) ?? null;
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the roles contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4960);
/** Money and the customer's address: never in a packer's read of an order. */
const NOT_THE_PACKERS = ["email", "goods", "discount", "net", "shipping", "tax", "gifts", "total", "paid", "due", "refunded", "ship_price", "free_from", "due_goods", "transfer_note"];

describe.skipIf(why !== null)(`who may do what at Northline's desk${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let stand: Stand;
      let packer: Caller;
      let owner: Caller;
      const orders = () => stand.data("orders");

      /** A member of staff with one of the shop's roles and no other, signed in on the desk's screens. */
      const member = async (role: RegExp, who: string): Promise<Caller> => {
        const roles = ok(await stand.staff.get<{ roles: { id: string; name: string; key?: string }[] }>("/api/v1/roles")).roles;
        const found = roles.find((r) => role.test(r.name) || role.test(r.key ?? ""));
        if (found === undefined) throw new Error(`no role ${String(role)} in ${JSON.stringify(roles.map((r) => r.name))}`);
        const email = `${who}.${engine}@northline-staff.dev`;
        const invited = ok(await stand.staff.post<{ invite: { token: string } }>("/api/v1/users", { email, name: who.replace(/^./, (c) => c.toUpperCase()), roleIds: [found.id] }), 201);
        const password = `${randomBytes(18).toString("base64url")}Aa1!`;
        ok(await new Caller(stand.server.base, { origin: stand.server.base }).post("/api/v1/auth/password/reset", { token: invited.invite.token, newPassword: password }));
        const caller = new Caller(stand.server.base, { origin: stand.server.base });
        await caller.signInToScreens(email, password);
        return caller;
      };
      const read = async (who: Caller, ref: string): Promise<Row[]> => ok(await who.get<{ data: Row[] }>(`${stand.data(ref)}?limit=200`)).data;
      /** The orders table as the connection's schema keys it: what the record page sends the panel. */
      let ordersId = "";
      const panel = (who: Caller, order: Row) => who.post<{ data: Row | null }>("/api/v1/payments/panel", { connectionId: stand.connectionId, table: ordersId, recordId: String(order["id"]) });

      beforeAll(async () => {
        stand = await standUp(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, "roles");
        const schema = ok(await stand.staff.get<{ model: { tables: { id: string; name: string }[] } }>(`/api/v1/connections/${stand.connectionId}/schema`));
        ordersId = schema.model.tables.find((t) => t.name === `${PREFIX}orders`)!.id;
        // The shop's orders made payable, as whoever manages payments switches them on: the Payment panel answers then.
        ok(await stand.staff.post("/api/v1/payments/apps/switch", { connectionId: stand.connectionId, appKey: "ecommerce-shop", enabled: true }));
        packer = await member(/packer/i, "piet");
        owner = await member(/owner/i, "olga");
      }, 600_000);

      afterAll(async () => {
        await stand?.server.stop();
      });

      describe("the packer", () => {
        it("reads the orders to pack — who, where, by when — with no money and no e-mail, and lines with no price", async () => {
          const rows = await read(packer, "orders");
          expect(rows.length).toBe(66);
          const paid = rows.find((o) => o["number"] === "NL-1063")!;
          expect([paid["status"], paid["ship_name"], paid["city"], paid["state_code"], String(paid["ships_by"]).slice(0, 10)]).toEqual(["paid", "Grace Okafor", expect.any(String), "CA", expect.stringMatching(/^2026-08-1[89]$/)]);
          for (const column of NOT_THE_PACKERS) expect(rows.some((o) => column in o && o[column] !== undefined), column).toBe(false);
          const lines = await read(packer, "order_lines");
          for (const column of ["each", "line", "discount", "tax_rate"]) expect(lines.some((l) => column in l), column).toBe(false);
          expect(lines.some((l) => l["sku"] === "NL-TAL-9")).toBe(true);
        });

        it("cannot read a customer, a payment or a refund", async () => {
          for (const ref of ["customers", "payments", "payment_refunds", "messages", "enquiries"]) {
            const refused = await packer.get(`${stand.data(ref)}?limit=5`);
            expect([403, 404], `${ref}: ${String(refused.status)}`).toContain(refused.status);
          }
        });

        it("packs and ships an order, and moves nothing else", async () => {
          const order = await stand.order("NL-1064");
          ok(await packer.patch(`${orders()}/${String(order["id"])}`, { values: { status: "packed" } }));
          ok(await packer.patch(`${orders()}/${String(order["id"])}`, { values: { status: "shipped", carrier: "UPS", tracking: "1Z999AA10123456784" } }));
          expect((await stand.row("orders", order["id"]))["shipped_by"]).toBe("Piet");
        });

        it("cannot cancel an order, give money back, or record a payment", async () => {
          const order = await stand.order("NL-1063");
          const cancel = await packer.patch(`${orders()}/${String(order["id"])}`, { values: { status: "cancelled", cancel_reason: "address" } });
          expect(cancel.status, JSON.stringify(cancel.body).slice(0, 300)).toBe(403);
          const payment = (await stand.rows("payments")).find((p) => String(p["order_id"]) === String(order["id"]))!;
          const refund = await packer.post(stand.data("payment_refunds"), { values: { payment_id: payment["id"], amount: "1.00", reason: "No" } });
          expect([403, 404]).toContain(refund.status);
          const recorded = await packer.post(stand.data("payments"), { values: { order_id: order["id"], method: "transfer", amount: "1.00", paid_at: new Date().toISOString() } });
          expect([403, 404]).toContain(recorded.status);
          const marked = await packer.post("/api/v1/payments/record-payment", { connectionId: stand.connectionId, table: ordersId, recordId: String(order["id"]), amount: "1.00", way: "bank-transfer", paidOn: "2026-08-18", note: null, approvalCode: null, last4: null, key: `packer_${randomBytes(8).toString("hex")}` });
          expect([403, 404]).toContain(marked.status);
          expect((await stand.row("orders", order["id"]))["status"]).toBe("paid");
        });

        it("draws an order's packing slip, which holds no money, and never its receipt", async () => {
          const order = await stand.order("NL-1063");
          const slip = await packer.post<{ printUrl?: string }>("/api/v1/apps/ecommerce-shop/documents/render", { kind: "packing-slip", ref: "orders", pk: { id: order["id"] } });
          expect([200, 201], JSON.stringify(slip.body).slice(0, 600)).toContain(slip.status);
          // The words a reader sees: styles and tags left out.
          const page = String((await packer.get(slip.body.printUrl!)).body).replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
          for (const words of ["NL-1063", "Grace Okafor", "Overnight", "NL-TAL-9"]) expect(page, words).toContain(words);
          expect(page).not.toMatch(/\$\s?\d/);
          const receipt = await packer.post("/api/v1/apps/ecommerce-shop/documents/render", { kind: "receipt", ref: "orders", pk: { id: order["id"] } });
          expect([403, 404], JSON.stringify(receipt.body).slice(0, 400)).toContain(receipt.status);
        });

        it("is answered no figures by the Payment panel (A4)", async () => {
          const order = await stand.order("NL-1063");
          const said = await panel(packer, order);
          expect([200, 403, 404]).toContain(said.status);
          if (said.status === 200) expect(said.body.data).toBeNull();
          expect(JSON.stringify(said.body)).not.toContain("184.08");
        });
      });

      describe("the owner", () => {
        it("reads the money, the Payment panel's figures too", async () => {
          const rows = await read(owner, "orders");
          const order = rows.find((o) => o["number"] === "NL-1063")!;
          expect([order["email"], num(order["total"]).toFixed(2)]).toEqual([expect.stringContaining("@"), "184.08"]);
          const said = ok(await panel(owner, order));
          expect(said.data).not.toBeNull();
          expect(JSON.stringify(said.data)).toMatch(/184\.08/);
        });

        it("draws an order's receipt: its lines, delivery, sales tax and total, and how it was paid", async () => {
          const order = await stand.order("NL-1063");
          const drawn = await owner.post<{ printUrl?: string }>("/api/v1/apps/ecommerce-shop/documents/render", { kind: "receipt", ref: "orders", pk: { id: order["id"] } });
          expect([200, 201], JSON.stringify(drawn.body).slice(0, 600)).toContain(drawn.status);
          const page = String((await owner.get(drawn.body.printUrl!)).body).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&");
          for (const words of ["NL-1063", "Talus Trail Runner", "139.00", "35.00", "10.08", "184.08"]) expect(page, words).toContain(words);
        });

        it("records a bank transfer on an order waiting for one, and gives money back", async () => {
          // An order the desk writes itself (how it is paid is the customer's door's to say), then paid by a transfer.
          const region = (await stand.rows("regions")).find((r) => r["code"] === "OR")!;
          const offer = (await stand.rows("shipping_offers"))[0]!;
          const variant = (await stand.rows("variants")).find((v) => v["sku"] === "NL-MUG-MOS")!;
          const made = ok(
            await owner.post<{ data: Row }>(orders(), { values: { name: "Ada Hale", email: "ada.hale@northline-shoppers.dev", ship_name: "Ada Hale", address_line1: "1 Elm St", city: "Bend", zip: "97701", region_id: region["id"], offer_id: offer["id"] } }),
            201,
          ).data;
          ok(await owner.post(stand.data("order_lines"), { values: { order_id: made["id"], variant_id: variant["id"], qty: 1 } }), 201);
          const due = (await stand.row("orders", made["id"]))["total"];
          const paid = await owner.post<{ data: Row }>(stand.data("payments"), { values: { order_id: made["id"], method: "transfer", amount: num(due).toFixed(2), paid_at: "2026-08-18T17:00:00.000Z", note: "Transfer received", client_key: retryKey("pay") } });
          expect(paid.status, JSON.stringify(paid.body).slice(0, 500)).toBe(201);
          ok(await owner.patch(`${orders()}/${String(made["id"])}`, { values: { status: "paid" } }));
          const row = await stand.row("orders", made["id"]);
          expect([row["status"], num(row["due"]).toFixed(2), String(row["paid_at"]).slice(0, 10)]).toEqual(["paid", "0.00", "2026-08-18"]);
          // Sent back by hand, and recorded.
          const refund = await owner.post(stand.data("payment_refunds"), { values: { payment_id: paid.body.data["id"], amount: "5.00", reason: "A dented mug" } });
          expect(refund.status, JSON.stringify(refund.body).slice(0, 500)).toBe(201);
          expect(num((await stand.row("orders", made["id"]))["refunded"]).toFixed(2)).toBe("5.00");
        });
      });
    });
  });
});
