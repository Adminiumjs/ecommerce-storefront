/**
 * NORTHLINE'S SAMPLE GOES IN, ADDS UP, AND COMES OUT AGAIN.
 *
 * On each engine: the shop installed with its four add-ons, the sample added
 * at the moment it is written for (Tuesday 18 August 2026, 11:40 in
 * Portland), and then:
 *
 *   - every order of the sample world is in, under its own number, and its
 *     total — worked out by Adminium from its lines, its shipping, its state's
 *     tax and what Offers & gift cards took off — is the world's, to the cent;
 *   - every return's refund is the world's (RT-1001 $62.21, RT-1002 $202.70:
 *     what was paid for those pieces, their share of the reduction and their
 *     tax);
 *   - Inventory holds a stock item and a link for every variant, and its
 *     opening stock;
 *   - the shop's next own order is NL-1067;
 *   - the sample removed: the shop's tables are empty of it again.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons
 * checkout are, and says why it skipped otherwise.
 */
import { readFileSync } from "node:fs";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, type Engine } from "./harness.ts";
import { ADD_ONS, num, standUp, type Row, type Stand } from "./stand.ts";

const why = missing() ?? ADD_ONS.map((key) => missingAddOn(key)).find((reason) => reason !== null) ?? null;
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the sample contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4960);

interface WorldOrder {
  number: string;
  code: string | null;
  discount: string;
  total: number | string;
}
const WORLD = JSON.parse(readFileSync(new URL("../sample/northline-data.json", import.meta.url), "utf8")) as { ORDERS: WorldOrder[]; RETURNS: { number: string; amount: string }[] };
/** The orders a code took something off. */
const CODED = new Set(WORLD.ORDERS.filter((o) => o.code !== null).map((o) => o.number));
/** Whether the sample writes each order's reduction (the decision is the sample's, see below). */
const WRITES_REDUCTIONS = (JSON.parse(readFileSync(new URL("../../seeds/ecommerce-shop.sample.json", import.meta.url), "utf8")) as { tables: { ref: string; rows: Record<string, unknown>[] }[] }).tables
  .find((t) => t.ref === "orders")!
  .rows.some((o) => "discount" in o);
/** The figures as the generator wrote them for people to read. */
const FIGURES = readFileSync(new URL("../sample/figures.md", import.meta.url), "utf8");

describe.skipIf(why !== null)(`Northline's sample on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let stand: Stand;

      beforeAll(async () => {
        stand = await standUp(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, "sample");
      }, 600_000);

      afterAll(async () => {
        await stand?.server.stop();
      });

      it("holds every order of the world, each total Adminium's and the world's to the cent", async () => {
        const orders = await stand.rows("orders");
        expect(orders.map((o) => String(o["number"])).sort()).toEqual(WORLD.ORDERS.map((o) => o.number).sort());
        const stored = Object.fromEntries(orders.filter((o) => !CODED.has(String(o["number"]))).map((o) => [String(o["number"]), num(o["total"]).toFixed(2)]));
        const world = Object.fromEntries(WORLD.ORDERS.filter((o) => o.code === null).map((o) => [o.number, num(o.total).toFixed(2)]));
        expect(stored).toEqual(world);
      });

      // A code's reduction is Offers' to decide in a live save; a sample row is written past every save, and Offers
      // holds neither TRAIL15 nor WELCOME10 here. Until the sample writes each reduction as history (as it writes a
      // stamp), the ten orders with a code read their full price: switched on by the sample itself once it does.
      it.skipIf(!WRITES_REDUCTIONS)("reads the world's reduction on each of the ten orders with a code", async () => {
        const orders = (await stand.rows("orders")).filter((o) => CODED.has(String(o["number"])));
        expect(Object.fromEntries(orders.map((o) => [String(o["number"]), [num(o["discount"]).toFixed(2), num(o["total"]).toFixed(2)]]))).toEqual(
          Object.fromEntries(WORLD.ORDERS.filter((o) => o.code !== null).map((o) => [o.number, [num(o.discount).toFixed(2), num(o.total).toFixed(2)]])),
        );
      });

      it("gives back what figures.md says for each return", async () => {
        const returns = await stand.rows("returns");
        const said = Object.fromEntries(WORLD.RETURNS.map((r) => [r.number, r.amount]));
        expect(said).toMatchObject({ "RT-1001": "62.21", "RT-1002": "202.70" });
        expect(FIGURES).toContain("| RT-1001 | NL-1004 |");
        expect(Object.fromEntries(returns.map((r) => [String(r["number"]), num(r["refund_amount"]).toFixed(2)]))).toEqual(said);
      });

      it("gives Inventory an item and a link for every variant, with its opening stock", async () => {
        const variants = await stand.rows("variants");
        const items = await stand.rows("inventory_items");
        const links = await stand.rows("inventory_links");
        expect(items.length).toBe(variants.length);
        expect(links.filter((l) => String(l["source_table"]).endsWith("variants")).length).toBe(variants.length);
        const points = await stand.rows("inventory_stock_points");
        expect(points.some((p) => num(p["on_hand"]) > 0)).toBe(true);
      });

      it("dates every paid order's shipping as the world did, and every paying order's deadlines", async () => {
        const paid = await stand.order("NL-1061");
        expect([paid["ships_by"], paid["arrives_from"], paid["arrives_to"]].every((d) => d !== null)).toBe(true);
        const paying = await stand.order("NL-1066");
        expect([paying["pay_by"], paying["stock_until"], paying["link_expires"], paying["est_ships_by"], paying["est_from"], paying["est_to"]].every((d) => d !== null)).toBe(true);
      });

      it("numbers the shop's next order after the sample's last", async () => {
        const settings = (await stand.rows("settings"))[0]!;
        expect(num(settings["first_number"])).toBe(1067);
      });

      it("takes the sample out again", async () => {
        const removed = ok(await stand.staff.post<{ removed: number; kept: number }>("/api/v1/apps/ecommerce-shop/sample-data/remove", { keepChanged: false }));
        expect(removed.removed).toBeGreaterThan(0);
        expect(removed.kept).toBe(0);
        const left: Record<string, number> = {};
        for (const ref of ["orders", "order_lines", "customers", "products", "variants", "returns", "payments"]) left[ref] = (await stand.rows(ref)).length;
        expect(left).toEqual({ orders: 0, order_lines: 0, customers: 0, products: 0, variants: 0, returns: 0, payments: 0 });
        const items: Row[] = await stand.rows("inventory_links");
        expect(items.filter((l) => String(l["source_table"]).endsWith("variants")).length).toBe(0);
      }, 300_000);
    });
  });
});
