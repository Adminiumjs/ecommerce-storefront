/**
 * NORTHLINE'S STOCK, COUNTED BY INVENTORY, ON A BUILT ADMINIUM.
 *
 * On each engine, Northline installed with its add-ons and its sample (each
 * variant a stock item of Inventory's, linked to it, with its opening stock),
 * at Tuesday 18 August 2026, 11:40 in Portland. Then, through the shop's own
 * doors and the desk's moves:
 *
 *   - an order's stock is HELD when it is placed, TAKEN when it is packed,
 *     and LET GO when it is cancelled before that, by the desk or by the
 *     clock when it is not paid in thirty minutes;
 *   - an order paid at minute five is packed days later: its stock stayed
 *     held all along (the hold's own end is 45 days from placing, never the
 *     pay deadline);
 *   - a returned piece the desk receives, with "put back in stock" on, is
 *     back on the shelf;
 *   - TEN shoppers at once for the last unit: one wins, and every other is
 *     told nothing is left, in Inventory's own words for a hold;
 *   - a variant linked to no stock item sells, and nothing is held for it;
 *   - Inventory switched off for the shop (STK-10): what an order is told.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons
 * checkout are, and says why it skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, until, type Engine } from "./harness.ts";
import { ADD_ONS, ADMIN, CLOCK, customer, goodsOrder, num, place, shopOf, standUp, type Row, type Shop, type Shopper, type Stand } from "./stand.ts";

const why = missing() ?? ADD_ONS.map((key) => missingAddOn(key)).find((reason) => reason !== null) ?? null;
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the stock contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4960);
const MINUTE = 60_000;
const DAY = 86_400_000;

describe.skipIf(why !== null)(`Northline's stock on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let stand: Stand;
      let shop: Shop;
      let paying: Shopper;
      /** The server's clock as the contract last set it. */
      let now = CLOCK;
      const mail = (who: string) => `${who}.${engine}@northline-shoppers.dev`;
      const guest = (who: string) => ({ name: `${who.replace(/^./, (c) => c.toUpperCase())} Okafor`, email: mail(who) });

      /** Move the server's clock on, sign the operator in again, and open a fresh rehearsing tab. */
      const later = async (ms: number) => {
        now += ms;
        await stand.server.setClock(now);
        await stand.staff.signIn(ADMIN.email, ADMIN.password);
        paying = await stand.rehearsing();
      };

      /** The stock point of a variant's item: on hand, held, and what may still be sold. */
      const stockOf = async (sku: string): Promise<[number, number, number]> => {
        const variant = shop.variant(sku);
        const link = (await stand.rows("inventory_links")).find((l) => String(l["source_row"]) === String(variant["id"]) && String(l["source_table"]).endsWith("variants"));
        if (link === undefined) throw new Error(`${sku} is linked to no stock item`);
        const point = (await stand.rows("inventory_stock_points")).find((p) => String(p["item_id"]) === String(link["item_id"]))!;
        return [num(point["on_hand"]), num(point["held"] ?? point["reserved"] ?? 0), num(point["available"])];
      };
      const order = (id: unknown) => stand.row("orders", id);
      const placeOne = async (who: string, sku: string, qty = 1, tab: Shopper = paying): Promise<Row & { payUrl: string }> => {
        const made = await place(tab, stand.placeRef("goods", "online"), goodsOrder(shop, guest(who), "OR", "standard", [[sku, qty]]));
        expect(made.status, JSON.stringify(made.body).slice(0, 800)).toBe(201);
        return { ...made.body.data, payUrl: made.body.payUrl! };
      };
      const paid = async (placed: Row & { payUrl: string }) => {
        await stand.payDemo(placed.payUrl);
        return until(async () => {
          const row = await order(placed["id"]);
          return row["status"] === "paid" ? row : undefined;
        }, "the order paid", 60_000);
      };

      beforeAll(async () => {
        stand = await standUp(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, "stock");
        shop = await shopOf(stand);
        paying = await stand.rehearsing();
      }, 600_000);

      afterAll(async () => {
        await stand?.server.stop();
      });

      it("holds an order's stock when it is placed, and takes it when it is packed", async () => {
        const before = await stockOf("NL-RDG28-SLA");
        const placed = await placeOne("ada", "NL-RDG28-SLA", 2);
        expect(await stockOf("NL-RDG28-SLA")).toEqual([before[0], before[1] + 2, before[2] - 2]);
        await paid(placed);
        expect(await stockOf("NL-RDG28-SLA")).toEqual([before[0], before[1] + 2, before[2] - 2]);
        await stand.patch("orders", placed["id"], { status: "packed" });
        expect(await stockOf("NL-RDG28-SLA")).toEqual([before[0] - 2, before[1], before[2] - 2]);
      }, 120_000);

      it("lets it go when the desk cancels a paid order before it is packed", async () => {
        const before = await stockOf("NL-RDG28-SLA");
        const placed = await placeOne("ben", "NL-RDG28-SLA");
        await paid(placed);
        await stand.patch("orders", placed["id"], { status: "cancelled", cancel_reason: "stock" });
        expect(await stockOf("NL-RDG28-SLA")).toEqual(before);
      }, 120_000);

      it("packs a sample order that used a code: Offers holds the code it looks at again", async () => {
        // NL-1065 used TRAIL15: Offers holds the code, so looking at it again on the move to packed finds it.
        const coded = await stand.order("NL-1065");
        expect(coded["status"]).toBe("paid");
        const packed = await stand.staff.patch(`${stand.data("orders")}/${String(coded["id"])}`, { values: { status: "packed" } });
        expect(packed.status, JSON.stringify(packed.body).slice(0, 600)).toBe(200);
        const after = await stand.order("NL-1065");
        expect([after["status"], num(after["discount"]).toFixed(2), num(after["total"]).toFixed(2)]).toEqual(["packed", "32.85", "216.25"]);
      }, 60_000);

      it("puts a packed order's stock back on the shelf when the owner cancels it before it ships", async () => {
        const before = await stockOf("NL-RDG28-SLA");
        const placed = await placeOne("bo", "NL-RDG28-SLA");
        await paid(placed);
        await stand.patch("orders", placed["id"], { status: "packed" });
        expect(await stockOf("NL-RDG28-SLA")).toEqual([before[0] - 1, before[1], before[2] - 1]);
        await stand.patch("orders", placed["id"], { status: "cancelled", cancel_reason: "address" });
        expect(await stockOf("NL-RDG28-SLA")).toEqual(before);
        // Its money went back with the cancel, through the service it came by.
        const refunds = await until(async () => {
          const rows = (await stand.rows("payment_refunds")).filter((r) => String(r["order_id"]) === String(placed["id"]));
          return rows.length > 0 ? rows : undefined;
        }, "the cancel's refund", 60_000);
        expect(num(refunds[0]!["amount"]).toFixed(2)).toBe(num(placed["total"]).toFixed(2));
      }, 120_000);

      it("keeps the stock of an order paid at minute five held until it is packed days later", async () => {
        const before = await stockOf("NL-MUG-MOS");
        const placed = await placeOne("cleo", "NL-MUG-MOS");
        await later(5 * MINUTE);
        await paid(placed);
        // Three days on, long past the thirty-minute pay deadline: still held, as the hold's own end is 45 days.
        await later(3 * DAY);
        const row = await order(placed["id"]);
        expect(Date.parse(String(row["stock_until"])) - Date.parse(String(row["placed_at"]))).toBe(45 * DAY);
        expect(await stockOf("NL-MUG-MOS")).toEqual([before[0], before[1] + 1, before[2] - 1]);
        await stand.patch("orders", placed["id"], { status: "packed" });
        expect(await stockOf("NL-MUG-MOS")).toEqual([before[0] - 1, before[1], before[2] - 1]);
      }, 180_000);

      it("lets it go when the clock cancels an order not paid in thirty minutes", async () => {
        const before = await stockOf("NL-MUG-MOS");
        const placed = await placeOne("dee", "NL-MUG-MOS");
        expect(await stockOf("NL-MUG-MOS")).toEqual([before[0], before[1] + 1, before[2] - 1]);
        await later(31 * MINUTE);
        const cancelled = await until(async () => {
          const row = await order(placed["id"]);
          return row["status"] === "cancelled" ? row : undefined;
        }, "the unpaid order cancelled by the clock", 120_000);
        expect(cancelled["cancel_reason"]).toBe("unpaid");
        expect(await stockOf("NL-MUG-MOS")).toEqual(before);
      }, 180_000);

      it("puts a returned piece back on the shelf when the desk receives it", async () => {
        const placed = await placeOne("eve", "NL-RDG28-SLA");
        await paid(placed);
        await stand.patch("orders", placed["id"], { status: "packed" });
        await stand.patch("orders", placed["id"], { status: "shipped", carrier: "UPS", tracking: "1Z999AA10123456784" });
        const before = await stockOf("NL-RDG28-SLA");
        const line = (await stand.rows("order_lines")).find((l) => String(l["order_id"]) === String(placed["id"]))!;
        const asked = await stand.create("returns", { order_id: placed["id"], reason: "fit" });
        await stand.create("return_lines", { return_id: asked["id"], line_id: line["id"], qty: 1 });
        await stand.patch("returns", asked["id"], { status: "approved" });
        expect(await stockOf("NL-RDG28-SLA")).toEqual(before);
        await stand.patch("returns", asked["id"], { status: "received" });
        expect(await stockOf("NL-RDG28-SLA")).toEqual([before[0] + 1, before[1], before[2] + 1]);
      }, 120_000);

      it("sells a variant linked to no stock item, and holds nothing for it", async () => {
        const variant = shop.variant("NL-BEA-SLA");
        const link = (await stand.rows("inventory_links")).find((l) => String(l["source_row"]) === String(variant["id"]) && String(l["source_table"]).endsWith("variants"))!;
        const points = async () => (await stand.rows("inventory_stock_points")).map((p) => [p["id"], num(p["held"] ?? p["reserved"] ?? 0)]);
        const unlinked = await stand.staff.send("DELETE", `${stand.data("inventory_links")}/${String(link["id"])}`);
        expect([200, 204], JSON.stringify(unlinked.body).slice(0, 400)).toContain(unlinked.status);
        const before = await points();
        const placed = await placeOne("fay", "NL-BEA-SLA");
        expect(placed["status"]).toBe("paying");
        expect(await points()).toEqual(before);
      }, 120_000);

      it("tells an order what Inventory switched off for the shop means (STK-10)", async () => {
        // A fresh hour for this visitor, past every order above.
        await later(61 * MINUTE);
        ok(await stand.staff.patch("/api/v1/add-ons/inventory", { attachedTo: "ecommerce-shop", enabled: false }));
        try {
          const before = await stockOf("NL-RDG28-SLA");
          const write = goodsOrder(shop, guest("gil"), "OR", "standard", [["NL-RDG28-SLA", 1]]);
          const quote = await paying.quote(stand.placeRef("goods", "online"), write);
          const made = await place(paying, stand.placeRef("goods", "online"), write);
          // Switched off for the app, Inventory is not asked: the quote says its hold is unavailable (what the shop's
          // checkout reads to say "We can't take orders right now"), yet the save is not refused, and nothing is held.
          expect((quote.body.postings ?? []).map((p) => p["state"]), JSON.stringify(quote.body.postings)).toContain("unavailable");
          expect([made.status, made.code ?? null], JSON.stringify(made.body).slice(0, 600)).toEqual([201, null]);
          expect(await stockOf("NL-RDG28-SLA")).toEqual(before);
        } finally {
          ok(await stand.staff.patch("/api/v1/add-ons/inventory", { attachedTo: "ecommerce-shop", enabled: true }));
        }
      }, 120_000);

      it("sells the last unit to one of ten shoppers at once, and tells the other nine nothing is left", async () => {
        // The owner shows "Only N left" below five: a refusal may then say how many are left.
        const settings = (await stand.rows("inventory_settings"))[0]!;
        await stand.patch("inventory_settings", settings["id"], { show_left_below: 5 });
        const sku = "NL-TSH-SAN-30";
        expect((await stockOf(sku))[2]).toBe(1);
        // Five customers, signed in, two orders each: a signed-in customer holds two unpaid orders at most.
        const tabs: { tab: Shopper; who: { name: string; email: string } }[] = [];
        for (const who of ["hana", "ivo", "jun", "kai", "lia"]) {
          const person = guest(who);
          await customer(stand, person.name, person.email);
          const tab = await stand.rehearsing();
          await tab.signIn(stand.server, person.email);
          tabs.push({ tab, who: person });
        }
        const made = await Promise.all([...tabs, ...tabs].map(({ tab, who }) => place(tab, stand.placeRef("goods", "online"), goodsOrder(shop, who, "OR", "standard", [[sku, 1]]))));
        const won = made.filter((m) => m.status === 201);
        const lost = made.filter((m) => m.status !== 201);
        expect(won.length, JSON.stringify(made.map((m) => [m.status, m.code]))).toBe(1);
        expect(lost.map((m) => [m.status, m.code])).toEqual(Array(9).fill([409, "PUBLIC_OUT_OF_STOCK"]));
        // Told in Inventory's own words for a hold: nothing left of it.
        for (const m of lost) expect(String(m.params["left"] ?? "0"), JSON.stringify(m.params)).toMatch(/^0(\.0+)?$/);
        expect(lost.some((m) => m.params["left"] !== undefined), JSON.stringify(lost[0]!.params)).toBe(true);
        expect(await stockOf(sku)).toEqual([1, 1, 0]);
        // The shop's own words for it: sold out, for every shopper.
        const words = await stand.shopper().list(`${"ecommerce_shop_variants_availability"}`, `&id=${String(shop.variant(sku)["id"])}`).catch(() => null);
        if (words !== null) expect(JSON.stringify(words)).toMatch(/out/);
      }, 300_000);
    });
  });
});
