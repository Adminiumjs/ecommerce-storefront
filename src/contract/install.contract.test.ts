/**
 * NORTHLINE INSTALLS: THE SHOP ON A BUILT ADMINIUM, WITH THE ADD-ONS IT TICKS.
 *
 * On each engine: an empty database connected, Inventory, Offers & gift
 * cards, Invoices & Receipts and Forms & surveys uploaded from the add-ons
 * checkout, the app's plan installable with nothing skipped, and installed
 * with them. Then the shop's own rows are written as the desk writes them
 * (a category, a product, its colours and sizes, two variants, a zone, a
 * state, a service and its price), and a shopper's order is priced by a dry
 * run through the shop's public door: Adminium copies the variant's price,
 * adds shipping for the zone and the state's tax, and answers the total.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons
 * checkout are, and says why it skipped otherwise.
 */
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { addOnBundle, appBundle, boot, Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, solve, type Engine, type Server } from "./harness.ts";
import { MANIFEST_TEXT } from "./release.ts";

const ADD_ONS = ["inventory", "offers", "invoices", "forms"] as const;
const why = missing() ?? ADD_ONS.map((key) => missingAddOn(key)).find((reason) => reason !== null) ?? null;
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the install contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4960);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
/** Tuesday 18 August 2026, 11:40 in Portland (Pacific daylight time). */
const CLOCK = Date.parse("2026-08-18T18:40:00Z");

type Row = Record<string, unknown>;

describe.skipIf(why !== null)(`Northline installs on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let staff: Caller;
      let connectionId = "";
      const table = (ref: string) => `ecommerce_shop_${ref}`;
      const create = async (ref: string, values: Row): Promise<Row> => {
        const reply = await staff.post<{ data: Row }>(`/api/v1/data/${connectionId}/${table(ref)}`, { values });
        if (reply.status !== 201 && reply.status !== 200) throw new Error(`create ${ref}: ${reply.status} ${JSON.stringify(reply.body).slice(0, 800)}`);
        return (reply.body as { data: Row }).data;
      };

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, CLOCK, { database: `northline_install_${engine}` });
        staff = new Caller(server.base, { origin: server.base });
        await staff.signIn(ADMIN.email, ADMIN.password);
        if (engine === "sqlite") {
          const file = join(tmpdir(), `northline-install-${engine}-${String(PORT_BASE)}.db`);
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
        const installed = ok(await staff.post<{ rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, addOns: addOns.map((a) => ({ key: a.key, version: a.version })) }));
        if (installed.rules.skipped.length > 0) throw new Error(`the install skipped rules: ${JSON.stringify(installed.rules.skipped).slice(0, 3000)}`);
        ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: "America/Los_Angeles", currency: "USD" }));
        ok(await staff.put("/api/v1/public-api", { enabled: true }));
      }, 360_000);

      afterAll(async () => {
        await server?.stop();
      });

      let variant: Row;
      let offer: Row;
      let wa: Row;
      it("takes the shop's own rows as the desk writes them, and works out what Adminium decides", async () => {
        await create("settings", { shop_name: "Northline", email: "hello@northline.example", address_line1: "1400 NW Kearney St", city: "Portland", state_code: "OR", zip: "97209" });
        const cat = await create("categories", { name: "Clothing", slug: "clothing", icon: "shirt" });
        const shell = await create("products", { name: "Basalt Rain Shell", slug: "basalt-shell", category_id: cat["id"], price: 189, blurb: "Three layers.", specs: [] });
        expect(shell["status"]).toBe("draft");
        ok(await staff.patch(`/api/v1/data/${connectionId}/${table("products")}/${String(shell["id"])}`, { values: { status: "active" } }));
        const slate = await create("option_values", { product_id: shell["id"], kind: "colour", code: "slate", label: "Slate", hex: "#4b5563" });
        const m = await create("option_values", { product_id: shell["id"], kind: "size", code: "m", label: "M" });
        const xl = await create("option_values", { product_id: shell["id"], kind: "size", code: "xl", label: "XL" });
        variant = await create("variants", { product_id: shell["id"], colour_id: slate["id"], size_id: m["id"], sku: "NL-BSH-SLA-M ", weight_g: 380 });
        const big = await create("variants", { product_id: shell["id"], colour_id: slate["id"], size_id: xl["id"], sku: "NL-BSH-SLA-XL", price_delta: 10, weight_g: 400 });
        expect([variant["sku"], Number(variant["price"]), variant["colour_code"], variant["size_code"], variant["category_id"], variant["product_status"]]).toEqual(["NL-BSH-SLA-M", 189, "slate", "m", cat["id"], "active"]);
        expect(Number(big["price"])).toBe(199);
        // With Inventory on, each new variant has a stock item of its own, linked to it.
        const items = ok(await staff.get<{ data: Row[] }>(`/api/v1/data/${connectionId}/inventory_items?limit=50`)).data;
        expect(items.map((i) => i["name"]).sort()).toEqual(["Basalt Rain Shell · Slate · M · NL-BSH-SLA-M", "Basalt Rain Shell · Slate · XL · NL-BSH-SLA-XL"]);
        const zone = await create("zones", { code: "contiguous", label: "Contiguous US" });
        wa = await create("regions", { code: "WA", name: "Washington", zone_id: zone["id"], tax_rate: 6.5 });
        const standard = await create("shipping_services", { code: "standard", label: "Standard", transit_min: 3, transit_max: 5 });
        offer = await create("shipping_offers", { service_id: standard["id"], zone_id: zone["id"], price: 7, free_from: 100 });
        expect([offer["label"], offer["transit_min"]]).toEqual(["Standard · Contiguous US", 3]);
      });

      it("prices a shopper's basket in a dry run through the shop's door", async () => {
        const served = ok(await new Caller(server.base).get<{ publishableKey: string; tables?: Record<string, string> }>("/apps/ecommerce-shop/customer/surface-config.json"));
        const shopper = new Caller(server.base, { origin: server.base, authorization: `Bearer ${served.publishableKey}` });
        const config = ok(await shopper.get<Row>("/api/v1/public/config"));
        expect(JSON.stringify(config)).toContain("ecommerce_shop_products");
        const refs = Object.keys((config as { data?: { refs?: Row } }).data?.refs ?? (config as { refs?: Row }).refs ?? {});
        const place = refs.find((r) => r.startsWith("ecommerce_shop_orders") && r !== "ecommerce_shop_orders_claimed");
        expect(place).toBeDefined();
        const products = ok(await shopper.get<{ data: Row[] }>(`/api/v1/public/records/ecommerce_shop_products?via=${encodeURIComponent(JSON.stringify({ and: [{ column: "colour_code", op: "eq", value: "slate" }, { column: "size_code", op: "eq", value: "m" }] }))}`));
        expect(products.data.map((p) => p["slug"])).toEqual(["basalt-shell"]);
        void solve;
        // Someone who manages payments rehearses the checkout: the shop takes payments online, in test mode, for them.
        ok(await staff.put("/api/v1/payments/rehearsal", { on: true }));
        const body = {
          values: { name: "Marcus Hale", email: "marcus.h@northline-shoppers.dev", ship_name: "Marcus Hale", address_line1: "500 Pine St", city: "Seattle", zip: "98101", region_id: wa["id"], offer_id: offer["id"], language: "en-US" },
          children: { order_lines: [{ values: { variant_id: variant["id"], qty: 2 } }] },
        };
        const tried: string[] = [];
        let quoted: Row | undefined;
        for (const ref of refs.filter((r) => r.startsWith("ecommerce_shop_orders_verified"))) {
          const reply = await staff.send<{ data: Row }>("POST", `/api/v1/public/records/${ref}/dry-run`, body, { authorization: `Bearer ${served.publishableKey}` });
          tried.push(`${ref}: ${String(reply.status)} ${reply.code ?? ""} ${JSON.stringify(reply.details).slice(0, 300)}`);
          if (reply.status === 200) {
            quoted = (reply.body as { data: Row }).data;
            break;
          }
        }
        expect(quoted, tried.join("\n")).toBeDefined();
        // Two shells at 189.00: goods 378.00, shipping free from 100.00, Washington's 6.5 % on 378.00 = 24.57.
        expect([quoted!["goods"], quoted!["shipping"], quoted!["tax"], quoted!["total"]].map(Number)).toEqual([378, 0, 24.57, 402.57]);
        // The order itself is placed by the shop's door in the order contract; here the doors are listed.
        expect(refs.filter((r) => r.startsWith("ecommerce_shop_orders")).length).toBeGreaterThanOrEqual(5);
        void offer;
        void wa;
      });
    });
  });
});
