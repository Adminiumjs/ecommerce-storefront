/**
 * NORTHLINE'S SHIPPING, ENFORCED BY ADMINIUM, AS EACH ROLE.
 *
 * On each engine: what the packer and the owner may do with labels, that the
 * columns a bought label fills are no person's to type and no customer's to
 * read, that the hand-over mails once, and that a new number reaches the
 * customer only on a person's press. No carrier is called.
 *
 * It runs with `CONTRACT=1` where a built Adminium and add-ons are.
 */
import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ORDER_SELECT, PLACED_SELECT } from "../manifest/public.ts";
import { Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, type Engine } from "./harness.ts";
import { ADD_ONS, standUp, type Row, type Stand } from "./stand.ts";

const why = missing() ?? ADD_ONS.map((key) => missingAddOn(key)).find((reason) => reason !== null) ?? null;
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the shipping contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 5360);
const SHIPPING = "/api/v1/apps/ecommerce-shop/shipping";

interface Access {
  appUpdated: boolean;
  manages: boolean;
  mayBook: boolean;
  mayCancel: boolean;
  mayCustoms: boolean;
  pricesHidden: boolean;
  booking: string;
}

describe.skipIf(why !== null)(`Northline's shipping${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let stand: Stand;
      let packer: Caller;
      let owner: Caller;

      const member = async (role: RegExp, who: string): Promise<Caller> => {
        const roles = ok(await stand.staff.get<{ roles: { id: string; name: string; key?: string }[] }>("/api/v1/roles")).roles;
        const found = roles.find((r) => role.test(r.name) || role.test(r.key ?? ""));
        if (found === undefined) throw new Error(`no role ${String(role)}`);
        const email = `${who}.ship.${engine}@northline-staff.dev`;
        const invited = ok(await stand.staff.post<{ invite: { token: string } }>("/api/v1/users", { email, name: who, roleIds: [found.id] }), 201);
        const password = `${randomBytes(18).toString("base64url")}Aa1!`;
        ok(await new Caller(stand.server.base, { origin: stand.server.base }).post("/api/v1/auth/password/reset", { token: invited.invite.token, newPassword: password }));
        const caller = new Caller(stand.server.base, { origin: stand.server.base });
        await caller.signInToScreens(email, password);
        return caller;
      };
      const patch = (who: Caller, order: Row, values: Row) => who.patch(`${stand.data("orders")}/${String(order["id"])}`, { values });
      const mails = async (order: Row, kind: string) => {
        const where = encodeURIComponent(JSON.stringify({ column: "order_id", op: "eq", value: order["id"] }));
        const mine = ok(await stand.staff.get<{ data: Row[] }>(`${stand.data("messages")}?limit=200&where=${where}`)).data;
        return mine.filter((m) => m["kind"] === kind).length;
      };

      /** A producer queues its message just after the write: waits for the count, up to a deadline. */
      const mailsReach = async (order: Row, kind: string, want: number): Promise<number> => {
        const deadline = Date.now() + 20_000;
        let seen = await mails(order, kind);
        while (seen !== want && Date.now() < deadline) {
          await new Promise((done) => setTimeout(done, 250));
          seen = await mails(order, kind);
        }
        return seen;
      };

      beforeAll(async () => {
        stand = await standUp(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, "shipping");
        packer = await member(/packer/i, "Piet");
        owner = await member(/owner/i, "Olga");
      }, 600_000);

      afterAll(async () => {
        await stand?.server.stop();
      });

      it("gives the packer booking with prices hidden, and no refund or customs", async () => {
        const access = ok(await packer.get<{ data: Access }>(`${SHIPPING}/access`)).data;
        expect(access).toMatchObject({ appUpdated: true, manages: false, mayBook: true, mayCancel: false, mayCustoms: false, pricesHidden: true, booking: "no-limit" });
      });

      it("gives the owner booking and refunds with prices shown, inside the limits", async () => {
        const access = ok(await owner.get<{ data: Access }>(`${SHIPPING}/access`)).data;
        expect(access).toMatchObject({ manages: false, mayBook: true, mayCancel: true, mayCustoms: false, pricesHidden: false, booking: "no-limit" });
      });

      it("keeps Ship from for whoever manages shipping", async () => {
        for (const who of [packer, owner]) {
          expect((await who.get(SHIPPING)).status).toBe(403);
          expect((await who.put(`${SHIPPING}/ship-from`, { name: "Nope", country: "US" })).status).toBe(403);
        }
        const saved = ok(await stand.staff.put<{ data: { shipFrom: Row; shipFromMissing: string[] } }>(`${SHIPPING}/ship-from`, { name: "Northline", lines: ["1 Main St"], city: "Portland", region: "OR", postcode: "97201", country: "US" }));
        expect(saved.data.shipFrom["country"]).toBe("US");
        expect(saved.data.shipFromMissing).toEqual(["phone"]);
      });

      it("stores the US on every order, for the packer to read", async () => {
        const rows = ok(await packer.get<{ data: Row[] }>(`${stand.data("orders")}?limit=200`)).data;
        expect(rows.length).toBeGreaterThan(0);
        expect(new Set(rows.map((o) => o["ship_country"]))).toEqual(new Set(["US"]));
      });

      it("lets no role type what a label says or where it ships, and no customer read it", async () => {
        const order = await stand.order("NL-1063");
        for (const who of [packer, owner]) {
          for (const values of [{ label_tracking: "TYPED" }, { label_carrier: "TYPED" }, { ship_country: "DE" }]) {
            const refused = await patch(who, order, values);
            expect(refused.status, JSON.stringify(values)).toBeGreaterThanOrEqual(400);
          }
        }
        const after = await stand.row("orders", order["id"]);
        expect([after["label_tracking"] ?? null, after["label_carrier"] ?? null, after["ship_country"]]).toEqual([null, null, "US"]);
        for (const column of ["label_tracking", "label_carrier", "new_number_at"]) {
          expect(ORDER_SELECT).not.toContain(column);
          expect(PLACED_SELECT).not.toContain(column);
        }
      });

      it("mails the hand-over once, and a new number only when a person presses", { timeout: 60_000 }, async () => {
        // Sample rows never mail, so this one is the shop's own: an order with nothing left to pay.
        const order = await stand.create("orders", { name: "Ada Hale", email: "ada.hale@northline-mail.dev", language: "en-US", kind: "goods", pay_method: "transfer", status: "awaiting_transfer", ship_name: "Ada Hale", address_line1: "500 Pine St", city: "Springfield", zip: "97477" });
        ok(await patch(stand.staff, order, { status: "paid" }));
        ok(await patch(packer, order, { status: "packed" }));
        ok(await patch(packer, order, { status: "shipped", carrier: "USPS", tracking: "9400100000000000000001" }));
        expect(await mailsReach(order, "order-shipped", 1)).toBe(1);
        expect(await mails(order, "order-new-number")).toBe(0);

        // A number saved with no press tells nobody.
        ok(await patch(owner, order, { tracking: "9400100000000000000002" }));
        await new Promise((done) => setTimeout(done, 1500));
        expect(await mails(order, "order-new-number")).toBe(0);

        // The packer cannot press it: a shipped order is the owner's to change.
        expect((await patch(packer, order, { tracking: "9400100000000000000003", new_number_at: "2026-08-18T18:45:00.000Z" })).status).toBe(403);
        ok(await patch(owner, order, { tracking: "9400100000000000000003", new_number_at: "2026-08-18T18:45:00.000Z" }));
        expect(await mailsReach(order, "order-new-number", 1)).toBe(1);
        expect(await mails(order, "order-shipped")).toBe(1);
      });
    });
  });
});
