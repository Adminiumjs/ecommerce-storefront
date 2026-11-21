/**
 * SENDING SOMETHING BACK TO NORTHLINE, ON A BUILT ADMINIUM.
 *
 * On each engine, Northline installed with its add-ons and its sample at
 * Tuesday 18 August 2026, 11:40 in Portland (TRAIL15 among the codes it
 * brings into Offers' own tables). A signed-in customer orders two packs to Washington with
 * TRAIL15, pays, and the desk packs and ships them. Then:
 *
 *   - a return asked by the signed-in customer, in one write with its
 *     pieces; and through the order's own link, in two (the return, then its
 *     piece), with no sign-in;
 *   - never more pieces than were bought less what other returns still
 *     hold; another customer's order is not theirs to send back;
 *   - a return the desk declines (its pieces freed first, then the move)
 *     gives its pieces back to be returned again;
 *   - what a return gives back is what was paid for those pieces: their
 *     price, less their share of the reduction, plus their tax, to the cent;
 *   - received, its pieces go back on the shelf; refunded only once refund
 *     rows cover what it gives back.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons
 * checkout are, and says why it skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, until, type Engine } from "./harness.ts";
import { ADD_ONS, customer, goodsOrder, num, place, PREFIX, retryKey, shopOf, standUp, type Row, type Shop, type Shopper, type Stand } from "./stand.ts";

const why = missing() ?? ADD_ONS.map((key) => missingAddOn(key)).find((reason) => reason !== null) ?? null;
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the returns contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4960);
const money = (value: unknown) => num(value).toFixed(2);

describe.skipIf(why !== null)(`sending something back to Northline${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let stand: Stand;
      let shop: Shop;
      const mail = (who: string) => `${who}.${engine}@northline-shoppers.dev`;
      const guest = (who: string) => ({ name: `${who.replace(/^./, (c) => c.toUpperCase())} Ellison`, email: mail(who) });
      const askRef = `${PREFIX}returns_verified_2`;
      let linkRefs: Record<string, Row> = {};
      /** The link key's entry on a table that creates. */
      const linkCreate = (table: string) => {
        const found = Object.entries(linkRefs).find(([ref, entry]) => new RegExp(`^${PREFIX}${table}(_verified)?(_\\d+)?$`).test(ref) && JSON.stringify(entry["actions"]).includes("create"));
        if (found === undefined) throw new Error(`no create entry on ${table} through the link: ${JSON.stringify(Object.keys(linkRefs))}`);
        return found[0];
      };

      const signedIn = async (who: string): Promise<{ tab: Shopper; who: { name: string; email: string } }> => {
        const person = guest(who);
        await customer(stand, person.name, person.email);
        const tab = await stand.rehearsing();
        await tab.signIn(stand.server, person.email);
        return { tab, who: person };
      };
      /** Placed, paid online, packed and shipped: an order its customer may send things back from. */
      const shipped = async (tab: Shopper, who: { name: string; email: string }, lines: [string, number][], codes?: string[]) => {
        const made = await place(tab, stand.placeRef("goods", "online"), goodsOrder(shop, who, "WA", "standard", lines, codes === undefined ? {} : { codes }));
        expect(made.status, JSON.stringify(made.body).slice(0, 600)).toBe(201);
        await stand.payDemo(made.body.payUrl!);
        await until(async () => ((await stand.row("orders", made.body.data["id"]))["status"] === "paid" ? true : undefined), "the order paid", 60_000);
        await stand.patch("orders", made.body.data["id"], { status: "packed" });
        await stand.patch("orders", made.body.data["id"], { status: "shipped", carrier: "UPS", tracking: "1Z999AA10123456784" });
        const lines$ = (await stand.rows("order_lines")).filter((l) => String(l["order_id"]) === String(made.body.data["id"]));
        return { order: made.body.data, lines: lines$, link: made.body.link! };
      };
      const lineOf = async (id: unknown) => stand.row("order_lines", id);

      beforeAll(async () => {
        stand = await standUp(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, "returns");
        shop = await shopOf(stand);
        const config = ok(await new Caller(stand.server.base, { origin: stand.server.base, authorization: `Bearer ${stand.linkKey}` }).get<{ data?: { refs?: Record<string, Row> } }>("/api/v1/public/config"));
        linkRefs = config.data?.refs ?? {};
      }, 600_000);

      afterAll(async () => {
        await stand?.server.stop();
      });

      let ruth: { tab: Shopper; who: { name: string; email: string } };
      let order: Awaited<ReturnType<typeof shipped>>;
      let first: Row;
      it("takes a return asked by the signed-in customer in one write, and gives back what those pieces cost them", async () => {
        ruth = await signedIn("ruth");
        // Two packs with TRAIL15 to Washington: 258.00, less 38.70, 6.5 % on 219.30 is 14.25.
        order = await shipped(ruth.tab, ruth.who, [["NL-RDG28-SLA", 2]], ["TRAIL15"]);
        expect([order.order["discount"], order.order["tax"], order.order["total"]].map(money)).toEqual(["38.70", "14.25", "233.55"]);
        const line = order.lines[0]!;
        const asked = await ruth.tab.create(askRef, { values: { order_id: order.order["id"], reason: "fit", note: "Too long in the back", client_key: retryKey("rt") }, children: { return_lines: [{ values: { line_id: line["id"], qty: 1 } }] } });
        expect(asked.status, JSON.stringify(asked.body).slice(0, 600)).toBe(201);
        first = asked.body.data;
        expect([first["status"], String(first["number"]).startsWith("RT-")]).toEqual(["asked", true]);
        // One piece: 129.00 less its share of 38.70 (19.35), plus 6.5 % tax: 109.65 × 1.065 = 116.78.
        expect(money(first["refund_amount"])).toBe("116.78");
        expect((await stand.row("returns", first["id"]))["customer_id"]).not.toBeNull();
        expect(num((await lineOf(line["id"]))["returned_qty"])).toBe(1);
      }, 240_000);

      it("never takes back more pieces than were bought less what other returns hold", async () => {
        const line = order.lines[0]!;
        const tooMany = await ruth.tab.create(askRef, { values: { order_id: order.order["id"], reason: "mind", client_key: retryKey("rt") }, children: { return_lines: [{ values: { line_id: line["id"], qty: 2 } }] } });
        expect(tooMany.status, JSON.stringify(tooMany.body).slice(0, 400)).not.toBe(201);
        expect([400, 409]).toContain(tooMany.status);
        expect(num((await lineOf(line["id"]))["returned_qty"])).toBe(1);
      });

      it("refuses a return of another customer's order (ACC-6: `agrees` on the column the claim filled)", async () => {
        const other = await signedIn("sven");
        const theirs = await other.tab.create(askRef, { values: { order_id: order.order["id"], reason: "fit", client_key: retryKey("rt") }, children: { return_lines: [{ values: { line_id: order.lines[0]!["id"], qty: 1 } }] } });
        expect(theirs.status, JSON.stringify(theirs.body).slice(0, 400)).not.toBe(201);
        expect([400, 403, 404, 409]).toContain(theirs.status);
      }, 120_000);

      it("frees a declined return's pieces to come back in another", async () => {
        const line = order.lines[0]!;
        const pieces = (await stand.rows("return_lines")).filter((l) => String(l["return_id"]) === String(first["id"]));
        // The desk's Decline: each piece freed, then the move with the reason the customer reads.
        for (const piece of pieces) await stand.patch("return_lines", piece["id"], { void_at: new Date().toISOString() });
        await stand.patch("returns", first["id"], { status: "declined", staff_reason: "It has been worn outdoors." });
        expect(num((await lineOf(line["id"]))["returned_qty"])).toBe(0);
        const again = await ruth.tab.create(askRef, { values: { order_id: order.order["id"], reason: "fit", client_key: retryKey("rt") }, children: { return_lines: [{ values: { line_id: line["id"], qty: 2 } }] } });
        expect(again.status, JSON.stringify(again.body).slice(0, 600)).toBe(201);
        // Both pieces: 219.30 × 1.065 = 233.5545, 233.55 — what was paid for the goods.
        expect(money(again.body.data["refund_amount"])).toBe("233.55");
        expect(num((await lineOf(line["id"]))["returned_qty"])).toBe(2);
        second = again.body.data;
      }, 120_000);

      let second: Row;
      it("puts received pieces back on the shelf, and is refunded only once refunds cover what it gives back", async () => {
        await stand.patch("returns", second["id"], { status: "approved" });
        // Send it back within five shipping days of the approval: Tuesday 18 August, so by Tuesday 25 August.
        expect(String((await stand.row("returns", second["id"]))["send_by"]).slice(0, 10)).toBe("2026-08-25");
        await stand.patch("returns", second["id"], { status: "received" });
        const early = await stand.staff.patch(`${stand.data("returns")}/${String(second["id"])}`, { values: { status: "refunded" } });
        expect(early.status, JSON.stringify(early.body).slice(0, 400)).not.toBe(200);
        const payment = (await stand.rows("payments")).find((p) => String(p["order_id"]) === String(order.order["id"]))!;
        // Part first: still short.
        await stand.create("payment_refunds", { payment_id: payment["id"], return_id: second["id"], amount: "100.00", reason: "Return RT, part", client_key: retryKey("rf") });
        const short = await stand.staff.patch(`${stand.data("returns")}/${String(second["id"])}`, { values: { status: "refunded" } });
        expect(short.status).not.toBe(200);
        await stand.create("payment_refunds", { payment_id: payment["id"], return_id: second["id"], amount: "133.55", reason: "Return RT, the rest", client_key: retryKey("rf") });
        const held = await stand.row("returns", second["id"]);
        expect([money(held["refund_amount"]), money(held["refunded_total"]), money(held["refund_short"])]).toEqual(["233.55", "233.55", "0.00"]);
        await stand.patch("returns", second["id"], { status: "refunded" });
        expect((await stand.row("returns", second["id"]))["refunded_at"]).not.toBeNull();
      }, 120_000);

      let byLink: { order: Row; lines: Row[]; link: { token: string } };
      let asked: Row;
      let link: Shopper;
      it("takes a return asked through the order's own link, with no sign-in", async () => {
        const { tab, who } = await signedIn("tess");
        byLink = await shipped(tab, who, [["NL-MUG-MOS", 1]]);
        link = stand.shopper("link");
        const opened = await link.openLink(byLink.link.token);
        expect(opened.status, JSON.stringify(opened.body).slice(0, 400)).toBe(200);
        const made = await link.create(linkCreate("returns"), { values: { order_id: byLink.order["id"], reason: "expected" } });
        expect(made.status, JSON.stringify(made.body).slice(0, 600)).toBe(201);
        asked = made.body.data;
        // A guest's link names nobody: the return is the order's.
        const row = await stand.row("returns", asked["id"]);
        expect([row["status"], row["customer_id"]]).toEqual(["asked", null]);
      }, 240_000);

      // KNOWN GAP (reported, engine): the second write, a piece of that return through the same link, is refused
      // PUBLIC_WRITE_REFUSED with no reason, though the same row is taken from the desk and inside the signed-in
      // customer's one-write return. Switched on once the engine takes a grandchild's create through a row's own link.
      it.skipIf(process.env["CONTRACT_LINK_PIECES"] !== "1")("takes its piece in a second write through the same link", async () => {
        const piece = await link.create(linkCreate("return_lines"), { values: { return_id: asked["id"], line_id: byLink.lines[0]!["id"], qty: 1 } });
        expect(piece.status, JSON.stringify(piece.body).slice(0, 600)).toBe(201);
        expect(money((await stand.row("returns", asked["id"]))["refund_amount"])).toBe("23.43");
      }, 120_000);
    });
  });
});
