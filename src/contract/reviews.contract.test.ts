/**
 * NORTHLINE'S CUSTOMERS REVIEW WHAT THEY BOUGHT, KEPT BY FORMS & SURVEYS.
 *
 * On each engine, Northline installed with its add-ons and its sample at
 * Tuesday 18 August 2026, 11:40 in Portland. A signed-in customer's order
 * is paid, packed and shipped. Then, through Adminium's review route on the
 * customer's own order lines (the app ships no review rows: no sample may):
 *
 *   - a shipped line of their own is open to a review, and takes one, once;
 *     another customer's line is not there for them, and a line not yet
 *     shipped is not open;
 *   - a review waits; published by the owner it moves the product's totals,
 *     hidden it leaves them;
 *   - the customer deletes their details: the review keeps its stars and its
 *     words, and loses its name.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons
 * checkout are, and says why it skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ENGINES, missing, missingAddOn, PORTS_PER_ENGINE, until, type Engine } from "./harness.ts";
import { ADD_ONS, customer, goodsOrder, num, place, PREFIX, shopOf, standUp, type Row, type Shop, type Shopper, type Stand } from "./stand.ts";

const why = missing() ?? ADD_ONS.map((key) => missingAddOn(key)).find((reason) => reason !== null) ?? null;
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the reviews contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4960);
const LINES = `${PREFIX}order_lines_verified`;

describe.skipIf(why !== null)(`reviews of what Northline sold${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let stand: Stand;
      let shop: Shop;
      const mail = (who: string) => `${who}.${engine}@northline-shoppers.dev`;
      const person = (who: string) => ({ name: `${who.replace(/^./, (c) => c.toUpperCase())} Raman`, email: mail(who) });

      const signedIn = async (who: string): Promise<{ tab: Shopper; who: { name: string; email: string } }> => {
        const p = person(who);
        await customer(stand, p.name, p.email);
        const tab = await stand.rehearsing();
        await tab.signIn(stand.server, p.email);
        return { tab, who: p };
      };
      /** Placed and paid online; with `ship`, packed and shipped by the desk too. Its lines. */
      const bought = async (tab: Shopper, who: { name: string; email: string }, sku: string, ship: boolean): Promise<Row[]> => {
        const made = await place(tab, stand.placeRef("goods", "online"), goodsOrder(shop, who, "OR", "standard", [[sku, 1]]));
        expect(made.status, JSON.stringify(made.body).slice(0, 600)).toBe(201);
        await stand.payDemo(made.body.payUrl!);
        await until(async () => ((await stand.row("orders", made.body.data["id"]))["status"] === "paid" ? true : undefined), "the order paid", 60_000);
        if (ship) {
          await stand.patch("orders", made.body.data["id"], { status: "packed" });
          await stand.patch("orders", made.body.data["id"], { status: "shipped", carrier: "UPS", tracking: "1Z999AA10123456784" });
        }
        return (await stand.rows("order_lines")).filter((l) => String(l["order_id"]) === String(made.body.data["id"]));
      };
      const review = (tab: Shopper, line: Row) => tab.raw("GET", `/api/v1/public/records/${LINES}/${String(line["id"])}/review`);
      const send = (tab: Shopper, line: Row, body: Row) => tab.raw("POST", `/api/v1/public/records/${LINES}/${String(line["id"])}/review`, body);
      /** The product's totals row, as Forms & surveys keeps it: [count, sum]. */
      const totals = async (productId: unknown): Promise<[number, number]> => {
        const row = (await stand.rows("forms_review_totals")).find((t) => String(t["about_key"]) === String(productId) && String(t["about_table"]).endsWith("products"));
        return row === undefined ? [0, 0] : [num(row["count"]), num(row["sum"])];
      };
      const reviewOf = async (line: Row) => (await stand.rows("forms_reviews")).find((r) => String(r["subject_key"]) === String(line["id"]) && String(r["subject_table"]).endsWith("order_lines"));

      beforeAll(async () => {
        stand = await standUp(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, "reviews");
        shop = await shopOf(stand);
      }, 600_000);

      afterAll(async () => {
        await stand?.server.stop();
      });

      let priya: { tab: Shopper; who: { name: string; email: string } };
      let line: Row;
      it("opens a shipped line of the customer's own to a review, takes one, and stamps the line", async () => {
        priya = await signedIn("priya");
        [line] = (await bought(priya.tab, priya.who, "NL-BSH-EMB-M", true)) as [Row];
        const asked = await review(priya.tab, line);
        expect(asked.status, JSON.stringify(asked.body).slice(0, 400)).toBe(200);
        expect([asked.body.data["open"], asked.body.data["reviewedAt"], asked.body.data["shownName"]]).toEqual([true, null, "Priya R."]);
        const sent = await send(priya.tab, line, { stars: 4, title: "Dry all week", body: "Kept me dry for three days on the coast." });
        expect(sent.status, JSON.stringify(sent.body).slice(0, 400)).toBe(201);
        expect((await stand.row("order_lines", line["id"]))["reviewed_at"]).not.toBeNull();
        const kept = (await reviewOf(line))!;
        expect([kept["state"], num(kept["stars"]), kept["shown_name"], kept["about_name"], kept["about_detail"]]).toEqual(["waiting", 4, "Priya R.", "Basalt Rain Shell", "Ember · M"]);
      }, 240_000);

      it("takes one review a line: the second is refused", async () => {
        const again = await send(priya.tab, line, { stars: 5 });
        expect([again.status, again.code]).toEqual([409, "PUBLIC_REVIEW_DONE"]);
      });

      it("does not open another customer's line, nor a line not yet shipped", async () => {
        const other = await signedIn("omar");
        const theirs = await send(other.tab, line, { stars: 1 });
        expect([theirs.status, theirs.code]).toEqual([404, "PUBLIC_REF_NOT_FOUND"]);
        const [waiting] = (await bought(other.tab, other.who, "NL-MUG-MOS", false)) as [Row];
        const early = await send(other.tab, waiting, { stars: 5 });
        expect([early.status, early.code]).toEqual([409, "PUBLIC_REVIEW_NOT_YET"]);
      }, 240_000);

      it("moves the product's totals when the owner publishes a review, and leaves them when it is hidden", async () => {
        const kept = (await reviewOf(line))!;
        const before = await totals(line["product_id"]);
        await stand.patch("forms_reviews", kept["id"], { state: "published" });
        expect(await totals(line["product_id"])).toEqual([before[0] + 1, before[1] + 4]);
        await stand.patch("forms_reviews", kept["id"], { state: "hidden", hide_reason: "not-about-us" });
        expect(await totals(line["product_id"])).toEqual(before);
        await stand.patch("forms_reviews", kept["id"], { state: "published", hide_reason: null });
        expect(await totals(line["product_id"])).toEqual([before[0] + 1, before[1] + 4]);
      }, 120_000);

      it("keeps a forgotten customer's stars and words, and drops their name", async () => {
        const forgotten = await priya.tab.raw("DELETE", "/api/v1/public/account");
        expect([200, 202, 204], JSON.stringify(forgotten.body).slice(0, 400)).toContain(forgotten.status);
        const kept = await until(async () => {
          const r = await reviewOf(line);
          return r !== undefined && (r["person_key"] === null || r["person_key"] === "") ? r : undefined;
        }, "the review to lose its person", 60_000);
        expect([num(kept["stars"]), kept["title"], kept["state"]]).toEqual([4, "Dry all week", "published"]);
        expect(kept["shown_name"] ?? "").toBe("");
        expect((await totals(line["product_id"]))[0]).toBeGreaterThan(0);
      }, 120_000);
    });
  });
});
