/**
 * NORTHLINE TAKES ORDERS: EVERY FIGURE ADMINIUM'S, EVERY DOOR HELD.
 *
 * On each engine, Northline installed with its add-ons and its sample at
 * Tuesday 18 August 2026, 11:40 in Portland. Then, through the shop's own
 * public doors only:
 *
 *   - PAYING ONLINE (somebody who manages payments rehearsing the checkout):
 *     an order is placed once, priced by a dry run and sent with the total
 *     the shopper saw; it is NL-1067, waits for its money, is paid with the
 *     demo service and dated to ship today;
 *   - THE FIGURES: line, goods, shipping (free from $100 on Standard), the
 *     state's tax (WA, CA, NY; Oregon none) and the total, against the
 *     sample world's own orders (`figures.md`);
 *   - a price moved between the quote and the order: refused, nothing made;
 *     a variant with nothing left: refused, naming its line;
 *   - the retry key: the same order sent twice is one row; ten orders at
 *     once: each lands (the order number's lock retried as the page does),
 *     numbered without a gap;
 *   - THE BANK-TRANSFER DOOR (payments off, transfers on): a guest refused,
 *     a signed-in customer's order waiting five shipping days, two unpaid at
 *     most, cancelled by the clock at 23:59 on its last day;
 *   - THE GIFT-CARDS-ONLY DOOR: paid, and sent by the shop's rule;
 *   - the seventh unpaid order from one visitor in an hour: refused.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons
 * checkout are, and says why it skipped otherwise.
 */
import { readFileSync } from "node:fs";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, until, type Engine } from "./harness.ts";
import { ADD_ONS, ADMIN, CLOCK, customer, giftOrder, goodsOrder, num, place, retryKey, shopOf, standUp, type Row, type Shop, type Shopper, type Stand } from "./stand.ts";

const why = missing() ?? ADD_ONS.map((key) => missingAddOn(key)).find((reason) => reason !== null) ?? null;
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the orders contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4960);

interface WorldOrder {
  number: string;
  service: string | null;
  code: string | null;
  ship: { state: string } | null;
  lines: { sku: string; qty: number; line: string }[];
  goods: string;
  shipping: string;
  tax: string;
  total: string;
}
const WORLD = JSON.parse(readFileSync(new URL("../sample/northline-data.json", import.meta.url), "utf8")) as { ORDERS: WorldOrder[] };
const FIGURES = readFileSync(new URL("../sample/figures.md", import.meta.url), "utf8");
/** The sample's own orders, priced again: under "free from" in Washington and Oregon, free in New York and California, Overnight to California. */
const CASES = ["NL-1020", "NL-1060", "NL-1062", "NL-1063", "NL-1064"];
const money = (value: unknown) => num(value).toFixed(2);

describe.skipIf(why !== null)(`Northline takes orders on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let stand: Stand;
      let shop: Shop;
      let paying: Shopper;
      const mail = (who: string) => `${who}.${engine}@northline-shoppers.dev`;
      // A name is plain text, no digits: "ten3" is "Tend Hale".
      const guest = (who: string) => ({ name: `${who.replace(/\d/g, (d) => "abcdefghij"[Number(d)]!).replace(/^./, (c) => c.toUpperCase())} Hale`, email: mail(who) });

      /** A signed-in tab: a customer made by the desk, signed in by the e-mailed code; rehearsing payments when asked. */
      const signedIn = async (who: string, rehearsing: boolean): Promise<{ tab: Shopper; who: { name: string; email: string } }> => {
        const person = guest(who);
        await customer(stand, person.name, person.email);
        const tab = rehearsing ? await stand.rehearsing() : stand.shopper();
        await tab.signIn(stand.server, person.email);
        return { tab, who: person };
      };

      beforeAll(async () => {
        stand = await standUp(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, "orders");
        shop = await shopOf(stand);
        paying = await stand.rehearsing();
      }, 600_000);

      afterAll(async () => {
        await stand?.server.stop();
      });

      describe("paying online", () => {
        let placed: Row;
        let payUrl: string;
        it("places an order once: priced by a dry run, sent with the total seen, numbered after the sample, waiting for its money", async () => {
          const ref = stand.placeRef("goods", "online");
          const made = await place(paying, ref, goodsOrder(shop, guest("ada"), "WA", "standard", [["NL-RDG28-SLA", 1]]));
          expect(made.status, JSON.stringify(made.body).slice(0, 800)).toBe(201);
          placed = made.body.data;
          expect([placed["number"], placed["status"], placed["kind"], placed["pay_method"]]).toEqual(["NL-1067", "paying", "goods", "online"]);
          // Washington's 6.5 % on 129.00 is 8.385, half up 8.39; Standard is free from 100.00.
          expect([placed["goods"], placed["shipping"], placed["tax"], placed["total"], placed["due"]].map(money)).toEqual(["129.00", "0.00", "8.39", "137.39", "137.39"]);
          expect(made.body.payUrl).toMatch(/\/pay\//);
          payUrl = made.body.payUrl!;
          // The pay deadline and the stock's own hold are stamped once, from placing: 30 minutes, and 45 days.
          const row = await stand.row("orders", placed["id"]);
          expect(Date.parse(String(row["pay_by"])) - Date.parse(String(row["placed_at"]))).toBe(30 * 60_000);
          expect(Date.parse(String(row["stock_until"])) - Date.parse(String(row["placed_at"]))).toBe(45 * 86_400_000);
          expect(Date.parse(String(row["link_expires"])) - Date.parse(String(row["placed_at"]))).toBe(120 * 86_400_000);
          expect([row["service_label"], row["transfer_by"]]).toEqual(["Standard", expect.anything()]);
          // Told before paying: shipped today if paid now (before two), arriving three to five shipping days on.
          expect([row["est_ships_by"], row["est_from"], row["est_to"]].map((d) => String(d).slice(0, 10))).toEqual(["2026-08-18", "2026-08-21", "2026-08-25"]);
        });

        it("is paid on the pay page, its payment lands once, and it ships today", async () => {
          await stand.payDemo(payUrl);
          const paid = await until(async () => {
            const row = await stand.row("orders", placed["id"]);
            return row["status"] === "paid" ? row : undefined;
          }, "the order paid", 60_000);
          expect([money(paid["paid"]), money(paid["due"])]).toEqual(["137.39", "0.00"]);
          const payments = (await stand.rows("payments")).filter((p) => String(p["order_id"]) === String(placed["id"]));
          expect(payments.map((p) => [p["method"], money(p["amount"])])).toEqual([["online", "137.39"]]);
          expect(paid["paid_at"]).not.toBeNull();
          expect([paid["ships_by"], paid["arrives_from"], paid["arrives_to"]].map((d) => String(d).slice(0, 10))).toEqual(["2026-08-18", "2026-08-21", "2026-08-25"]);
        }, 120_000);
      });

      it("works out each figure as the sample world did: lines, goods, shipping free from $100, the state's tax, the total", async () => {
        const ref = stand.placeRef("goods", "online");
        for (const number of CASES) {
          const w = WORLD.ORDERS.find((o) => o.number === number)!;
          expect(FIGURES.includes(`| ${number} |`) || w.ship!.state === "WA", number).toBe(true);
          const quote = await paying.quote(ref, goodsOrder(shop, guest("quote"), w.ship!.state, w.service!, w.lines.map((l) => [l.sku, l.qty])));
          expect(quote.status, `${number}: ${JSON.stringify(quote.body).slice(0, 600)}`).toBe(200);
          const q = quote.body.data;
          expect([q["goods"], q["discount"] ?? 0, q["shipping"], q["tax"], q["total"]].map(money), number).toEqual([w.goods, "0.00", w.shipping, w.tax, w.total]);
          expect((quote.body.children?.["order_lines"] ?? []).map((l) => money(l.data["line"])), number).toEqual(w.lines.map((l) => l.line));
        }
      });

      it("refuses an order whose price moved after the quote, and makes nothing", async () => {
        const ref = stand.placeRef("goods", "online");
        const write = goodsOrder(shop, guest("moved"), "OR", "standard", [["NL-RDG28-SLA", 1]]);
        const quote = await paying.quote(ref, write);
        const product = shop.variant("NL-RDG28-SLA")["product_id"];
        const before = (await stand.row("products", product))["price"];
        await stand.patch("products", product, { price: num(before) + 10 });
        try {
          const key = retryKey("moved");
          const refused = await paying.create(ref, { values: { ...write.values, client_key: key }, children: write.children, expect: { total: money(quote.body.data["total"]) } });
          expect([refused.status, refused.code], JSON.stringify(refused.body).slice(0, 400)).toEqual([409, "PUBLIC_PRICE_CHANGED"]);
          expect((await stand.rows("orders")).filter((o) => o["email"] === write.values["email"])).toEqual([]);
        } finally {
          await stand.patch("products", product, { price: before });
        }
      });

      it("refuses a variant with nothing left, naming its line", async () => {
        const refused = await place(paying, stand.placeRef("goods", "online"), goodsOrder(shop, guest("out"), "OR", "standard", [["NL-RDG28-SLA", 1], ["NL-BSH-SLA-XL", 1]]));
        expect([refused.status, refused.code], JSON.stringify(refused.body).slice(0, 600)).toEqual([409, "PUBLIC_OUT_OF_STOCK"]);
        expect(JSON.stringify(refused.params)).toMatch(/"(index|path)"/);
      });

      it("lands an order sent twice with one retry key on one row", async () => {
        const { tab, who } = await signedIn("twice", true);
        const key = retryKey("twice");
        const write = goodsOrder(shop, who, "OR", "standard", [["NL-RDG28-SLA", 1]]);
        const first = await place(tab, stand.placeRef("goods", "online"), write, key);
        const again = await place(tab, stand.placeRef("goods", "online"), write, key);
        expect([first.status, again.status], JSON.stringify(again.body).slice(0, 400)).toEqual([201, expect.any(Number)]);
        expect([200, 201]).toContain(again.status);
        expect([again.body.replayed, again.body.data["id"]]).toEqual([true, first.body.data["id"]]);
        // The key is kept as Adminium keeps it (not as sent): one order of this customer's, the one placed.
        expect((await stand.rows("orders")).filter((o) => o["email"] === who.email).map((o) => o["id"])).toEqual([first.body.data["id"]]);
      }, 120_000);

      it("takes ten orders at once, the order number's lock retried as the page does, numbered without a gap", async () => {
        // Five customers, two orders each: a signed-in customer holds two unpaid orders at most.
        const shoppers: Awaited<ReturnType<typeof signedIn>>[] = [];
        for (let i = 0; i < 5; i += 1) shoppers.push(await signedIn(`ten${String(i)}`, true));
        const made = await Promise.all([...shoppers, ...shoppers].map(({ tab, who }) => place(tab, stand.placeRef("goods", "online"), goodsOrder(shop, who, "OR", "standard", [["NL-MUG-MOS", 1]]))));
        expect(made.map((m) => m.status), JSON.stringify(made.filter((m) => m.status !== 201).map((m) => [m.code, m.params]))).toEqual(Array(10).fill(201));
        const numbers = made.map((m) => Number(String(m.body.data["number"]).replace("NL-", ""))).sort((a, b) => a - b);
        expect(numbers.at(-1)! - numbers[0]!).toBe(9);
        expect(new Set(numbers).size).toBe(10);
      }, 300_000);

      it("sends a gift-cards-only order on once it is paid: there is nothing to pack", async () => {
        const made = await place(paying, stand.placeRef("gift", "online"), giftOrder(shop, guest("gifter"), [{ amount: 50, to_name: "Theo Brandt", to_email: mail("theo") }]));
        expect(made.status, JSON.stringify(made.body).slice(0, 600)).toBe(201);
        expect([made.body.data["kind"], made.body.data["status"], money(made.body.data["total"]), money(made.body.data["shipping"])]).toEqual(["gift", "paying", "50.00", "0.00"]);
        await stand.payDemo(made.body.payUrl!);
        const sent = await until(async () => {
          const row = await stand.row("orders", made.body.data["id"]);
          return row["status"] === "sent" ? row : undefined;
        }, "the gift order sent", 90_000);
        expect(sent["shipped_at"]).not.toBeNull();
      }, 180_000);

      describe("by bank transfer, while the shop takes no payments online", () => {
        let waiting: Row;
        beforeAll(async () => {
          ok(await stand.staff.put("/api/v1/payments/rehearsal", { on: false }));
        });

        it("closes the online doors and refuses a guest at the transfer door", async () => {
          const shut = await stand.shopper().quote(stand.placeRef("goods", "online"), goodsOrder(shop, guest("shut"), "OR", "standard", [["NL-RDG28-SLA", 1]]));
          expect([shut.status, shut.code]).toEqual([403, "PUBLIC_SWITCHED_OFF"]);
          const refused = await place(stand.shopper(), stand.placeRef("goods", "transfer"), goodsOrder(shop, guest("stranger"), "OR", "standard", [["NL-RDG28-SLA", 1]]));
          expect(refused.status, JSON.stringify(refused.body).slice(0, 400)).not.toBe(201);
          // The transfer entry is a signed-in customer's: to a stranger it is not there.
        expect([401, 403, 404]).toContain(refused.status);
        });

        it("takes a signed-in customer's order to pay in five shipping days, two unpaid at most", async () => {
          const { tab, who } = await signedIn("transfer", false);
          const ref = stand.placeRef("goods", "transfer");
          const first = await place(tab, ref, goodsOrder(shop, who, "OR", "standard", [["NL-RDG28-SLA", 1]]));
          expect(first.status, JSON.stringify(first.body).slice(0, 600)).toBe(201);
          waiting = first.body.data;
          expect([waiting["status"], waiting["pay_method"]]).toEqual(["awaiting_transfer", "transfer"]);
          // Tuesday 18 August, before two: five shipping days on is Tuesday 25 August.
          expect(String(waiting["transfer_by"]).slice(0, 10)).toBe("2026-08-25");
          const second = await place(tab, ref, goodsOrder(shop, who, "OR", "standard", [["NL-MUG-MOS", 1]]));
          expect(second.status).toBe(201);
          const third = await place(tab, ref, goodsOrder(shop, who, "OR", "standard", [["NL-MUG-MOS", 2]]));
          expect([third.status, third.code]).toEqual([409, "PUBLIC_LIMIT_REACHED"]);
        }, 120_000);

        it("cancels an unpaid transfer order by the clock at 23:59 on its last day, and not before", async () => {
          // 23:58 on Tuesday 25 August in Portland: still waiting.
          await stand.server.setClock(Date.parse("2026-08-26T06:58:00Z"));
          // A week on, the operator's own session has run out: signed in again.
          await stand.staff.signIn(ADMIN.email, ADMIN.password);
          await new Promise((resolve) => setTimeout(resolve, 5_000));
          expect((await stand.row("orders", waiting["id"]))["status"]).toBe("awaiting_transfer");
          await stand.server.setClock(Date.parse("2026-08-26T07:00:30Z"));
          const cancelled = await until(async () => {
            const row = await stand.row("orders", waiting["id"]);
            return row["status"] === "cancelled" ? row : undefined;
          }, "the transfer order cancelled by the clock", 120_000);
          expect(cancelled["cancel_reason"]).toBe("unpaid");
        }, 180_000);
      });

      it("refuses a seventh unpaid order from one visitor in an hour", async () => {
        // An hour and more on from every order above: this visitor's hour starts empty.
        await stand.server.setClock(Date.parse("2026-08-26T09:00:00Z"));
        await stand.staff.signIn(ADMIN.email, ADMIN.password);
        const tab = await stand.rehearsing();
        const ref = stand.placeRef("goods", "online");
        const replies: { status: number; code: string | undefined }[] = [];
        for (let i = 0; i < 7; i += 1) {
          const made = await place(tab, ref, goodsOrder(shop, guest(`visitor${String(i)}`), "OR", "standard", [["NL-MUG-MOS", 1]]));
          replies.push({ status: made.status, code: made.code });
        }
        expect(replies.slice(0, 6).map((r) => r.status), JSON.stringify(replies)).toEqual(Array(6).fill(201));
        expect(replies[6]).toEqual({ status: 409, code: "PUBLIC_LIMIT_REACHED" });
      }, 180_000);

      void CLOCK;
    });
  });
});
