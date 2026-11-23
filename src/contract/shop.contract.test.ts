/**
 * NORTHLINE'S SHOP, THROUGH ITS OWN DOOR, ON A BUILT ADMINIUM.
 *
 * On each engine: the app installed with Inventory, Offers & gift cards,
 * Invoices & Receipts and Forms & surveys, as an operator installs it; the
 * sample added, or (while the manifest ships none) the rows the walk needs
 * written as the desk writes them, with their opening stock posted by
 * Inventory itself. Then a shopper walks the shop through the real door
 * (`AdminiumShop`, on the surface config Adminium serves):
 *
 * - browses with a filter: the shell is found by one variant that is both
 *   the colour and the size, a product with the colour in one variant and
 *   the size in another is not; the count comes back, and Inventory's words;
 * - with payments on (someone who manages payments rehearsing the checkout),
 *   prices a basket in a dry run: free Standard from $100, Washington's
 *   6.5 % on the goods after any discount;
 * - places it at the total shown, with a retry key: the pay link comes back,
 *   the same key answers the same order, a total that is no longer right is
 *   refused with the one it came to;
 * - pays it on the pay page with the demo service, and the door reads it paid;
 * - follows it by its own link, cancels it, and sees the refund row Adminium
 *   makes for a paid order the customer cancelled.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons
 * checkout are, and says why it skipped otherwise. Its ports start at
 * `CONTRACT_PORT_BASE` (5100), three an engine.
 */
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AdminiumShop, type ShopServed } from "../shop/door.ts";
import { isShopError, type Id, type OrderBody, type Placed, type Row } from "../shop/port.ts";
import { addOnBundle, addSample, appBundle, boot, Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, solve, until, type Engine, type Server } from "./harness.ts";
import { MANIFEST_TEXT } from "./release.ts";

const ADD_ONS = ["inventory", "offers", "invoices", "forms"] as const;
const why = missing() ?? ADD_ONS.map((key) => missingAddOn(key)).find((reason) => reason !== null) ?? null;
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the shop contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 5100);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
/** Tuesday 18 August 2026, 11:40 in Portland (Pacific daylight time), as the designs draw it. */
const CLOCK = Date.parse("2026-08-18T18:40:00Z");
const num = (value: unknown) => Number(value);

/**
 * The rows the walk needs, from the sample world (`northline-data.json`):
 * the shell in Slate/M (and Ember/M, a few left; Slate/XL, none), the
 * Ridgeline pack in Slate, and a crew with Slate in one variant (L) and M in
 * another (Glacier), which a Slate-and-M filter must not find.
 */
const WORLD = {
  shellSlateM: "NL-BSH-SLA-M",
  shellEmberM: "NL-BSH-EMB-M",
  shellSlateXl: "NL-BSH-SLA-XL",
  pack: "NL-RDG28-SLA",
  crewSlateL: "NL-MER-SLA-L",
  crewGlacierM: "NL-MER-GLA-M",
};

describe.skipIf(why !== null)(`Northline's shop through its own door on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let staff: Caller;
      let connectionId = "";
      /** Whether this run wrote the rows itself (the manifest ships no sample yet), so it knows exactly what the shop holds. */
      let written = false;
      let served: ShopServed;
      /** The shop as a guest opens it: browsing needs nobody signed in. */
      let guest: AdminiumShop;
      /** The shop as someone who manages payments opens it while rehearsing: payments on, for them alone. */
      let shop: AdminiumShop;
      const table = (ref: string) => `ecommerce_shop_${ref}`;
      const path = (real: string, id?: unknown) => `/api/v1/data/${connectionId}/${encodeURIComponent(real)}${id === undefined ? "" : `/${encodeURIComponent(String(id))}`}`;
      const create = async (real: string, values: Row): Promise<Row> => {
        const reply = await staff.post<{ data: Row }>(path(real), { values });
        if (reply.status !== 201 && reply.status !== 200) throw new Error(`create ${real}: ${String(reply.status)} ${JSON.stringify(reply.body).slice(0, 800)}`);
        return (reply.body as { data: Row }).data;
      };
      const update = async (real: string, id: unknown, values: Row): Promise<Row> => {
        const reply = await staff.patch<{ data: Row }>(path(real, id), { values });
        if (reply.status !== 200) throw new Error(`update ${real} ${String(id)} ${JSON.stringify(values)}: ${String(reply.status)} ${JSON.stringify(reply.body).slice(0, 800)}`);
        return (reply.body as { data: Row }).data;
      };
      const rows = async (real: string): Promise<Row[]> => ok(await staff.get<{ data: Row[] }>(`${path(real)}?limit=200`)).data;

      /** The variants, regions and offers the walk uses, by their codes, whoever wrote them. */
      const v: Record<keyof typeof WORLD, Row> = {} as never;
      let wa: Row;
      let standard: Row;

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, CLOCK, { database: `p77_shop_${engine}` });
        staff = new Caller(server.base, { origin: server.base });
        await staff.signIn(ADMIN.email, ADMIN.password);
        if (engine === "sqlite") {
          const file = join(tmpdir(), `p77-shop-contract-${engine}-${String(PORT_BASE)}.db`);
          rmSync(file, { force: true });
          writeFileSync(file, "");
          connectionId = ok(await staff.post<{ id: string }>("/api/v1/connections", { name: "northline", engine: "sqlite", dsn: `sqlite:${file}` }), 201).id;
        } else {
          connectionId = ok(await staff.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections")).connections.find((c) => c.name === "northwind")!.id;
        }
        const addOns = ADD_ONS.map((key) => addOnBundle(key));
        for (const addOn of addOns) {
          const staged = await staff.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(addOn.integrity)}`, addOn.buffer);
          if (![200, 201].includes(staged.status)) throw new Error(`${addOn.key} upload: ${JSON.stringify(staged.body).slice(0, 600)}`);
        }
        const app = appBundle({ manifest: MANIFEST_TEXT });
        const staged = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        if (![200, 201].includes(staged.status)) throw new Error(`upload: ${JSON.stringify(staged.body).slice(0, 1500)}`);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await staff.post<{ plan: { checksum: string; installable: boolean } }>("/api/v1/apps/plan", body)).plan;
        if (!plan.installable) throw new Error(`not installable: ${JSON.stringify(plan).slice(0, 3000)}`);
        const installed = ok(await staff.post<{ rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, shippingUnticked: [], addOns: addOns.map((a) => ({ key: a.key, version: a.version })) }));
        if (installed.rules.skipped.length > 0) throw new Error(`the install skipped rules: ${JSON.stringify(installed.rules.skipped).slice(0, 3000)}`);
        ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: "America/Los_Angeles", currency: "USD" }));

        // The sample first, as an operator adds it; a manifest that ships none is refused at once, and the rows are written instead.
        try {
          await server.setClock(CLOCK, true);
          await addSample(staff);
        } catch (error) {
          if (!String(error).startsWith("Error: expected 200")) throw error;
          written = true;
          await writeRows();
        } finally {
          await server.setClock(CLOCK);
        }
        await findRows();

        ok(await staff.put("/api/v1/public-api", { enabled: true }));
        ok(await staff.put("/api/v1/settings/email", { publicOrigin: server.base }));
        const doc = ok(await new Caller(server.base).get<{ publishableKey: string; tables?: Record<string, string>; publicKeys?: Record<string, string>; addOns?: Record<string, { present?: boolean }> }>("/apps/ecommerce-shop/customer/surface-config.json"));
        served = { baseUrl: server.base, publishableKey: doc.publishableKey, ...(doc.tables === undefined ? {} : { tables: doc.tables }), ...(doc.publicKeys === undefined ? {} : { publicKeys: doc.publicKeys }), ...(doc.addOns === undefined ? {} : { addOns: doc.addOns }) };
        // The server's allowed origins: a page served by the server itself. Node has no sessionStorage; the door keeps its sessions in memory.
        const originFetch: typeof fetch = (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("origin", server.base);
          return fetch(input, { ...init, headers });
        };
        guest = new AdminiumShop(served, { fetch: originFetch });
      }, 480_000);

      afterAll(async () => {
        await server?.stop();
      });

      /** The rows the walk needs, written as the desk writes them, and their opening stock received through Inventory. */
      async function writeRows(): Promise<void> {
        await create(table("settings"), { shop_name: "Northline", email: "hello@northline.example", address_line1: "1400 NW Kearney St", address_line2: "Suite 210", city: "Portland", state_code: "OR", zip: "97209" });
        const packs = await create(table("categories"), { name: "Packs & bags", slug: "packs", icon: "backpack" });
        const clothing = await create(table("categories"), { name: "Clothing", slug: "clothing", icon: "shirt" });
        const product = async (values: Row, colours: [string, string, string][], sizes: [string, string][]) => {
          const made = await create(table("products"), { ...values, specs: [] });
          await update(table("products"), made["id"], { status: "active" });
          const opts: Record<string, Row> = {};
          for (const [i, [code, label, hex]] of colours.entries()) opts[`colour:${code}`] = await create(table("option_values"), { product_id: made["id"], kind: "colour", code, label, hex, position: i });
          for (const [i, [code, label]] of sizes.entries()) opts[`size:${code}`] = await create(table("option_values"), { product_id: made["id"], kind: "size", code, label, position: i });
          return { made, opts };
        };
        const variant = (p: { made: Row; opts: Record<string, Row> }, sku: string, colour: string, size: string | null, extra: Row = {}) =>
          create(table("variants"), { product_id: p.made["id"], colour_id: p.opts[`colour:${colour}`]!["id"], ...(size === null ? {} : { size_id: p.opts[`size:${size}`]!["id"] }), sku, ...extra });
        const pack = await product({ name: "Ridgeline 28 Daypack", slug: "ridgeline-28", category_id: packs["id"], price: 129, blurb: "A 28-litre pack for a full day on the trail.", featured: true }, [["slate", "Slate", "#4b5563"]], []);
        await variant(pack, WORLD.pack, "slate", null, { weight_g: 980 });
        const shell = await product({ name: "Basalt Rain Shell", slug: "basalt-shell", category_id: clothing["id"], price: 189, blurb: "Three layers." }, [["slate", "Slate", "#4b5563"], ["ember", "Ember", "#c2410c"]], [["m", "M"], ["xl", "XL"]]);
        await variant(shell, WORLD.shellSlateM, "slate", "m", { weight_g: 380 });
        await variant(shell, WORLD.shellEmberM, "ember", "m", { weight_g: 380 });
        await variant(shell, WORLD.shellSlateXl, "slate", "xl", { weight_g: 400, price_delta: 10 });
        const crew = await product({ name: "Merino Base Layer Crew", slug: "merino-crew", category_id: clothing["id"], price: 75, blurb: "Warm when wet." }, [["slate", "Slate", "#4b5563"], ["glacier", "Glacier", "#7fa7b8"]], [["m", "M"], ["l", "L"]]);
        await variant(crew, WORLD.crewSlateL, "slate", "l", { weight_g: 200 });
        await variant(crew, WORLD.crewGlacierM, "glacier", "m", { weight_g: 200 });

        const contiguous = await create(table("zones"), { code: "contiguous", label: "Contiguous US" });
        const remote = await create(table("zones"), { code: "remote", label: "Alaska & Hawaii" });
        await create(table("regions"), { code: "WA", name: "Washington", zone_id: contiguous["id"], tax_rate: 6.5 });
        await create(table("regions"), { code: "OR", name: "Oregon", zone_id: contiguous["id"], tax_rate: 0 });
        await create(table("regions"), { code: "AK", name: "Alaska", zone_id: remote["id"], tax_rate: 0 });
        const std = await create(table("shipping_services"), { code: "standard", label: "Standard", transit_min: 3, transit_max: 5, position: 0 });
        const express = await create(table("shipping_services"), { code: "express", label: "Express", transit_min: 2, transit_max: 2, position: 1 });
        await create(table("shipping_offers"), { service_id: std["id"], zone_id: contiguous["id"], price: 7, free_from: 100 });
        await create(table("shipping_offers"), { service_id: std["id"], zone_id: remote["id"], price: 16 });
        await create(table("shipping_offers"), { service_id: express["id"], zone_id: contiguous["id"], price: 18 });

        // Each variant adopted a stock item of its own when it was made; the opening stock arrives on one receipt Inventory posts.
        const settings = (await rows("inventory_settings"))[0];
        const place = await create("inventory_places", { name: "Stockroom", for_sale: true, active: true, position: 0 });
        if (settings !== undefined) await update("inventory_settings", settings["id"], { show_left_below: 5, default_place_id: place["id"] });
        const items = await rows("inventory_items");
        const item = (sku: string) => items.find((i) => String(i["sku"] ?? "").trim() === sku || String(i["name"] ?? "").endsWith(sku));
        const onHand: [string, number][] = [[WORLD.pack, 24], [WORLD.shellSlateM, 20], [WORLD.shellEmberM, 4], [WORLD.crewSlateL, 16], [WORLD.crewGlacierM, 16]];
        const receipt = await create("inventory_receipts", { kind: "opening", place_id: place["id"], note: "Opening stock" });
        for (const [sku, qty] of onHand) {
          const found = item(sku);
          if (found === undefined) throw new Error(`no stock item for ${sku}: ${JSON.stringify(items.map((i) => [i["name"], i["sku"]]))}`);
          await create("inventory_receipt_lines", { receipt_id: receipt["id"], item_id: found["id"], qty_typed: qty });
        }
        await update("inventory_receipts", receipt["id"], { status: "posting" });
        for (const line of (await rows("inventory_receipt_lines")).filter((l) => String(l["receipt_id"]) === String(receipt["id"]))) await update("inventory_receipt_lines", line["id"], { status: "posted" });
        await update("inventory_receipts", receipt["id"], { status: "posted" });
      }

      async function findRows(): Promise<void> {
        const variants = await rows(table("variants"));
        for (const [name, sku] of Object.entries(WORLD) as [keyof typeof WORLD, string][]) {
          const found = variants.find((r) => String(r["sku"]) === sku);
          if (found === undefined) throw new Error(`no variant ${sku}`);
          v[name] = found;
        }
        const regions = await rows(table("regions"));
        wa = regions.find((r) => r["code"] === "WA")!;
        const zone = wa["zone_id"];
        const service = (await rows(table("shipping_services"))).find((s) => s["code"] === "standard")!;
        standard = (await rows(table("shipping_offers"))).find((o) => String(o["service_id"]) === String(service["id"]) && String(o["zone_id"]) === String(zone))!;
        expect(["WA", "OR", "AK"].every((code) => regions.some((r) => r["code"] === code))).toBe(true);
      }

      /** The shopper pays on the pay page with the demo service (a test link, driven by the person rehearsing). */
      async function payDemo(payUrl: string): Promise<void> {
        const token = new URL(payUrl, server.base).pathname.split("/").pop()!;
        const challenge = ok(await staff.get<{ id: string; salt: string; difficulty: number }>(`/pay/api/${token}/challenge`));
        const started = ok(await staff.post<{ url?: string; state?: string }>(`/pay/api/${token}/checkout`, { source: "demo" }, { "x-adminium-proof": `${challenge.id}.${solve(challenge.salt, challenge.difficulty)}` }));
        expect(started.url, JSON.stringify(started)).toBeTruthy();
        const attempt = new URL(started.url!, server.base).pathname.split("/").pop()!;
        const done = ok(await staff.post<{ back: string }>(`/pay/api/demo/${attempt}`, { action: "succeeds" }));
        const nonce = done.back.split("/").pop()!.split("?")[0]!;
        ok(await staff.get(`/pay/api/back/${nonce}`));
      }

      const basket = (): OrderBody => ({
        values: { name: "Marcus Hale", email: "marcus.h@example.com", ship_name: "Marcus Hale", address_line1: "500 Pine St", city: "Seattle", zip: "98101", region_id: wa["id"], offer_id: standard["id"], language: "en-US" },
        children: { order_lines: [{ values: { variant_id: v.shellSlateM["id"] as Id, qty: 1 } }, { values: { variant_id: v.pack["id"] as Id, qty: 1 } }] },
      });
      /** One shell (189.00) and one pack (129.00): goods 318.00, Standard free from 100.00, Washington's 6.5 % on 318.00 = 20.67. */
      const TOTAL = "338.67";
      let placed: Placed;
      let orderId: Id;

      it("browses with a filter: one variant both the colour and the size, counted, with Inventory's words", async () => {
        const page = await guest.products({ colour: "slate", size: "m" });
        const slugs = page.products.map((p) => p.slug);
        expect(slugs).toContain("basalt-shell");
        // The crew has Slate (in L) and M (in Glacier), never together; the pack has Slate and no size.
        expect(slugs).not.toContain("ridgeline-28");
        if (written) {
          expect(slugs).toEqual(["basalt-shell"]);
          expect(slugs).not.toContain("merino-crew");
          expect(page.count).toEqual({ rows: 1, atLeast: false });
        } else {
          expect(page.count?.rows).toBe(page.products.length);
        }
        const found = await guest.variantsOf(page.products.map((p) => p.id));
        for (const p of page.products) expect(found.some((x) => String(x.productId) === String(p.id) && x.colourCode === "slate" && x.sizeCode === "m")).toBe(true);
        // Unfiltered, every product on sale is counted.
        const all = await guest.products({});
        if (written) expect(all.count?.rows).toBe(3);

        // Inventory's words, which may be a few seconds old: in; in with how many are left (below the owner's five; "low" is
        // Inventory's own reorder point, which this shop does not set); none.
        const ids = [v.shellSlateM["id"], v.shellEmberM["id"], v.shellSlateXl["id"]] as Id[];
        const words = await until(async () => {
          const said = await guest.stock(ids);
          return said[String(ids[0])]?.state === "in" && said[String(ids[2])]?.state === "out" ? said : undefined;
        }, "Inventory's stock words", 20_000);
        expect(words[String(ids[0])]).toEqual({ state: "in", left: null });
        expect(words[String(ids[2])]?.state).toBe("out");
        if (written) expect(words[String(ids[1])]).toEqual({ state: "in", left: 4 });
      });

      it("quotes a basket with payments on: free shipping from $100, Washington's tax on the goods after discount", async () => {
        ok(await staff.put("/api/v1/payments/rehearsal", { on: true }));
        const doc = ok(await staff.get<{ rehearsal?: { csrfToken: string } }>("/apps/ecommerce-shop/customer/surface-config.json"));
        expect(doc.rehearsal?.csrfToken).toBeTruthy();
        // The person rehearsing opens the shop on the server's address with their own session: their writes carry their token.
        shop = new AdminiumShop({ ...served, rehearsalToken: doc.rehearsal!.csrfToken }, { fetch: staff.fetchAs() });
        expect(await shop.payments().available()).toEqual({ online: true, test: true });
        const quote = await shop.quote("goods", "online", basket());
        expect([quote.order["goods"], quote.order["discount"], quote.order["shipping"], quote.order["tax"], quote.order["total"]].map(num)).toEqual([318, 0, 0, 20.67, num(TOTAL)]);
        expect(quote.lines.map((l) => [l["sku"], num(l["each"]), num(l["qty"])])).toEqual([
          [WORLD.shellSlateM, 189, 1],
          [WORLD.pack, 129, 1],
        ]);
        expect(quote.postings.filter((p) => p.state !== "ok")).toEqual([]);
      });

      it("places it at the total shown, answers the same order to the same retry key, and refuses a total no longer right", async () => {
        const key = `p77-shop-${engine}-${String(Math.random()).slice(2)}`;
        placed = await shop.place("goods", "online", basket(), key, TOTAL);
        orderId = placed.order["id"] as Id;
        expect(placed.replayed).toBe(false);
        expect(placed.payUrl).toMatch(/\/pay\//);
        expect(placed.link?.token).toBeTruthy();
        expect([placed.order["status"], num(placed.order["total"])]).toEqual(["paying", num(TOTAL)]);
        expect(String(placed.order["number"])).toMatch(/^NL-/);

        const again = await shop.place("goods", "online", basket(), key, TOTAL);
        expect([again.replayed, String(again.order["id"])]).toEqual([true, String(orderId)]);

        const refused = await shop.place("goods", "online", basket(), `${key}-b`, "300.00").catch((error: unknown) => error);
        expect(isShopError(refused), String(refused)).toBe(true);
        if (!isShopError(refused)) return;
        expect(refused.refused.code).toBe("PUBLIC_PRICE_CHANGED");
        expect(num(refused.refused.changed?.total)).toBe(num(TOTAL));
      });

      /** The order as its own link reads it, through the door's link client and the session the place adopted. */
      const linkRead = async (ref: string): Promise<Row[]> => (await shop.linkClient!.list<Row>(ref, { limit: 50 })).data;

      it("is paid on the pay page with the demo service, and the door reads it paid", async () => {
        await payDemo(placed.payUrl!);
        const state = await until(async () => {
          const said = await shop.payments().state("link", orderId);
          return said === "paid" ? said : undefined;
        }, "the payment paid", 30_000);
        expect(state).toBe("paid");
        // The payment reads paid a moment before the order's own status moves (a cancel sent in that moment is refused
        // 404 PUBLIC_REF_NOT_FOUND, as writableWhen answers a row it does not reach): the page waits for the order.
        const order = await until(async () => {
          const [row] = await linkRead(shop.linkRefs.order);
          return row?.["status"] === "paid" ? row : undefined;
        }, "the order paid", 30_000);
        expect([num(order["paid"]), num(order["due"])]).toEqual([num(TOTAL), 0]);
      });

      // The order's page reads it as the after-order door does: the link's own entries take no filter, so the door
      // reads them whole (the link's session reaches only its own order).
      it("is followed by its own link with the door's readShared", async () => {
        const after = shop.after();
        expect(await after.openShared(placed.link!.token)).toBe("opened");
        const read = await after.readShared().catch((error: unknown) => {
          console.log(`readShared refused: ${isShopError(error) ? `${String(error.refused.status)} ${error.refused.code}` : ""} ${String(error)}`);
          throw error;
        });
        expect([read!.order["status"], read!.lines.length]).toEqual(["paid", 2]);
      });

      it("is followed by its own link: paid, with its lines (read through the door's link client)", async () => {
        expect(await shop.after().openShared(placed.link!.token)).toBe("opened");
        expect(shop.after().sharedHeld()).toBe(true);
        const [order] = await linkRead(shop.linkRefs.order);
        expect([String(order!["id"]), order!["status"], num(order!["paid"]), num(order!["due"])]).toEqual([String(orderId), "paid", num(TOTAL), 0]);
        expect((await linkRead(shop.linkRefs.lines)).map((l) => [String(l["order_id"]), l["sku"]]).sort()).toEqual([[String(orderId), WORLD.pack], [String(orderId), WORLD.shellSlateM]].sort());
        expect((await linkRead(shop.linkRefs.payments)).map((p) => num(p["amount"]))).toEqual([num(TOTAL)]);
      });

      it("is cancelled by the customer through its link", async () => {
        const cancelled = await shop.after().cancel("link", orderId);
        expect([cancelled["status"], cancelled["cancel_reason"]]).toEqual(["cancelled", "customer"]);
      });

      it("carries the refund row Adminium makes for it (read through the door's link client)", async () => {
        const refunds = await until(async () => {
          const found = await linkRead(shop.linkRefs.refunds);
          return found.length > 0 ? found : undefined;
        }, "the refund row", 15_000);
        expect(refunds.map((r) => [String(r["order_id"]), num(r["amount"])])).toEqual([[String(orderId), num(TOTAL)]]);
        const [order] = await linkRead(shop.linkRefs.order);
        expect(order!["status"]).toBe("cancelled");
      });

      it("carries the refund row in the door's readShared", async () => {
        const read = await shop.after().readShared();
        expect(read!.refunds.length).toBe(1);
      });
    });
  });
});
