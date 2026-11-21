/**
 * NORTHLINE'S UPDATE CONTRACT: A SHOP ON THE OLD EXAMPLE TAKES THE REWORK.
 *
 * The old `ecommerce-storefront` example was never released as a package:
 * what is out there is its own database (`db/schema.sql` and `db/seed.sql`),
 * seven bare tables a shop ran on. So the update is not one package over
 * another, but the reworked app installed into a database that already holds
 * those tables. On SQLite, Postgres and MySQL, along the path a shop takes:
 *
 *   1. A DATABASE ON THE OLD EXAMPLE: products, categories,
 *      product_categories, customers, orders, order_items and shop_settings,
 *      under their bare names, in each engine's own words, with their keys,
 *      references and checks, and a few rows of each from the old seed;
 *   2. every old table read straight from the database, past Adminium: each
 *      column as the engine declares it, each row as the engine spells it,
 *      each key, index and check — the snapshot;
 *   3. that database connected to a built Adminium, and the rework and the
 *      four add-ons it ticks uploaded;
 *   4. THE PLAN: installable, with no problem; every table it makes is the
 *      shop's own under the `ecommerce_shop_` prefix (or an add-on's), and it
 *      takes none of the old tables for its own;
 *   5. installed, with Inventory, Offers & gift cards, Invoices & Receipts
 *      and Forms & surveys;
 *   6. EVERY OLD TABLE UNTOUCHED: read again, byte for byte the snapshot;
 *   7. the sample added, into the shop's own tables, and the old tables still
 *      the snapshot;
 *   8. A SHOPPER ORDERS through the shop's own door: it lands in
 *      `ecommerce_shop_orders` as NL-1067, and the old `orders` is still the
 *      snapshot.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons
 * checkout are, and says why it skipped otherwise. The database drivers are
 * the Adminium checkout's own (this repo adds none).
 */
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ADMINIUM_REPO, addOnBundle, addSample, appBundle, boot, Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, until, type Engine, type Server } from "./harness.ts";
import { MANIFEST_TEXT } from "./release.ts";
import { ADD_ONS, ADMIN, CLOCK, dbName, num, retryKey, Shopper, type Row } from "./stand.ts";

const why = missing() ?? ADD_ONS.map((key) => missingAddOn(key)).find((reason) => reason !== null) ?? null;
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the update contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4960);

// ── the old example's database ──────────────────────────────────────────────

/** The old tables, in the order they reference each other, each with the columns it is sorted by. */
const OLD: Record<string, string[]> = {
  products: ["id"],
  categories: ["id"],
  product_categories: ["product_id", "category_id"],
  customers: ["id"],
  orders: ["id"],
  order_items: ["id"],
  shop_settings: ["id"],
};
const OLD_NAMES = Object.keys(OLD);
/** The prefixes a new table may have: the shop's own, and the add-ons'. */
const NEW_PREFIXES = ["ecommerce_shop_", "inventory_", "offers_", "invoices_", "forms_"];

interface Words {
  id: string;
  text: (length: number) => string;
  moment: string;
  now: string;
}

const WORDS: Record<Engine, Words> = {
  sqlite: { id: "INTEGER PRIMARY KEY", text: () => "TEXT", moment: "TEXT", now: "CURRENT_TIMESTAMP" },
  postgres: { id: "serial PRIMARY KEY", text: () => "text", moment: "timestamptz", now: "now()" },
  mysql: { id: "INT AUTO_INCREMENT PRIMARY KEY", text: (n) => `VARCHAR(${String(n)})`, moment: "DATETIME", now: "CURRENT_TIMESTAMP" },
};

/** The old `db/schema.sql`, each table with every column it had, in the engine's own words. */
function oldSchema(engine: Engine): string[] {
  const { id, text, moment, now } = WORDS[engine];
  // MySQL gives a TEXT column no default: the old settings' empty-string defaults are VARCHARs there.
  const settingText = engine === "mysql" ? "VARCHAR(200) DEFAULT ''" : `${text(200)} DEFAULT ''`;
  return [
    `CREATE TABLE products (id ${id}, title ${text(200)} NOT NULL, sku ${text(64)} NOT NULL UNIQUE, price NUMERIC(10, 2) NOT NULL, image_url ${text(500)}, status ${text(16)} NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')), created_at ${moment} NOT NULL DEFAULT ${now})`,
    `CREATE TABLE categories (id ${id}, name ${text(120)} NOT NULL, slug ${text(120)} NOT NULL UNIQUE)`,
    `CREATE TABLE product_categories (product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE, category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE, PRIMARY KEY (product_id, category_id))`,
    `CREATE TABLE customers (id ${id}, name ${text(200)} NOT NULL, email ${text(254)} NOT NULL UNIQUE, created_at ${moment} NOT NULL DEFAULT ${now})`,
    `CREATE TABLE orders (id ${id}, number ${text(32)} NOT NULL UNIQUE, customer_id INTEGER NOT NULL REFERENCES customers (id) ON DELETE RESTRICT, total NUMERIC(10, 2) NOT NULL, status ${text(16)} NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'refunded')), placed_at ${moment} NOT NULL DEFAULT ${now})`,
    `CREATE TABLE order_items (id ${id}, order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE, product_id INTEGER NOT NULL REFERENCES products (id), qty INTEGER NOT NULL, unit_price NUMERIC(10, 2) NOT NULL)`,
    `CREATE TABLE shop_settings (id ${engine === "mysql" ? "INT PRIMARY KEY" : engine === "postgres" ? "integer PRIMARY KEY" : "INTEGER PRIMARY KEY"} CHECK (id = 1), ship_from_name ${settingText}, ship_from_line1 ${settingText}, ship_from_line2 ${settingText}, ship_from_city ${settingText}, ship_from_postcode ${settingText}, ship_from_country ${settingText})`,
    `CREATE INDEX idx_products_status ON products (status)`,
    `CREATE INDEX idx_orders_status ON orders (status)`,
    `CREATE INDEX idx_order_items_order ON order_items (order_id)`,
  ];
}

/** A few rows of each, from the old `db/seed.sql`. */
function oldRows(engine: Engine): string[] {
  // MySQL's DATETIME has no zone: the old seed's moments, as the shop's wall clock wrote them.
  const at = (moment: string) => (engine === "mysql" ? moment.replace(/\+\d\d$/, "") : moment);
  return [
    `INSERT INTO products (id, title, sku, price, image_url, status, created_at) VALUES
      (1, 'Ergo Keyboard K2', 'JKY-KB-K2', 129.00, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=75&auto=format&fit=crop', 'active', '${at("2026-05-01 09:00:00+00")}'),
      (5, 'Trail Runner GTX', 'JKY-SH-GTX', 189.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=75&auto=format&fit=crop', 'active', '${at("2026-05-01 09:00:00+00")}'),
      (7, 'Merino Beanie', 'JKY-BN-MR', 34.00, NULL, 'draft', '${at("2026-05-01 09:00:00+00")}')`,
    `INSERT INTO categories (id, name, slug) VALUES (1, 'Gear', 'gear'), (2, 'Apparel', 'apparel')`,
    `INSERT INTO product_categories (product_id, category_id) VALUES (1, 1), (5, 2), (7, 2)`,
    `INSERT INTO customers (id, name, email, created_at) VALUES
      (1, 'Ava Reyes', 'ava@example.com', '${at("2026-06-01 10:00:00+00")}'),
      (2, 'Liam Chen', 'liam.chen@example.com', '${at("2026-06-01 10:00:00+00")}')`,
    `INSERT INTO orders (id, number, customer_id, total, status, placed_at) VALUES
      (1, '1039', 1, 171.00, 'shipped', '${at("2026-07-14 10:24:00+00")}'),
      (4, '1042', 2, 174.00, 'pending', '${at("2026-07-21 18:52:00+00")}')`,
    `INSERT INTO order_items (id, order_id, product_id, qty, unit_price) VALUES (1, 1, 5, 1, 189.00), (2, 4, 1, 1, 129.00), (3, 4, 7, 1, 34.00)`,
    `INSERT INTO shop_settings (id, ship_from_name, ship_from_line1, ship_from_city, ship_from_postcode, ship_from_country) VALUES (1, 'Jacky''s', '1 Market St', 'Portland', '97209', 'US')`,
  ];
}

// ── the database, read past Adminium ────────────────────────────────────────

const driver = (name: string): unknown => createRequire(join(ADMINIUM_REPO, "apps", "e2e", "package.json"))(name);

interface Place {
  engine: Engine;
  name: string;
  dsn: string;
}
interface Read {
  shape: string[];
  rows: (string | null)[][];
}

async function sql(place: Place, statements: readonly string[]): Promise<Record<string, unknown>[][]> {
  const out: Record<string, unknown>[][] = [];
  if (place.engine === "sqlite") {
    type Db = { prepare(sql: string): { all(): Record<string, unknown>[]; run(): unknown; reader: boolean }; close(): void };
    const Database = driver("better-sqlite3") as new (file: string) => Db;
    const db = new Database(place.name);
    try {
      for (const statement of statements) {
        const prepared = db.prepare(statement);
        out.push(prepared.reader ? prepared.all() : (prepared.run(), []));
      }
    } finally {
      db.close();
    }
    return out;
  }
  if (place.engine === "postgres") {
    type Client = { connect(): Promise<void>; query(sql: string): Promise<{ rows: Record<string, unknown>[] }>; end(): Promise<void> };
    const pg = driver("pg") as { Client: new (options: { connectionString: string }) => Client };
    const client = new pg.Client({ connectionString: place.dsn });
    await client.connect();
    try {
      for (const statement of statements) out.push((await client.query(statement)).rows);
    } finally {
      await client.end();
    }
    return out;
  }
  type Connection = { query(sql: string): Promise<[unknown]>; end(): Promise<void> };
  const mysql = driver("mysql2/promise") as { createConnection(options: { uri: string; dateStrings: boolean }): Promise<Connection> };
  const connection = await mysql.createConnection({ uri: place.dsn, dateStrings: true });
  try {
    for (const statement of statements) {
      const [rows] = await connection.query(statement);
      out.push(Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []);
    }
  } finally {
    await connection.end();
  }
  return out;
}

const text = (value: unknown): string | null => (value === null || value === undefined ? null : Buffer.isBuffer(value) ? value.toString("hex") : String(value));

async function tablesIn(place: Place): Promise<string[]> {
  const query =
    place.engine === "sqlite"
      ? "SELECT name AS t FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      : place.engine === "postgres"
        ? "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = current_schema() ORDER BY table_name"
        : `SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${place.name}' ORDER BY TABLE_NAME`;
  return (await sql(place, [query]))[0]!.map((r) => String(r["t"]));
}

/** The old tables, each as the engine says it: what "byte for byte" is measured on. */
async function snapshot(place: Place): Promise<Record<string, Read>> {
  const out: Record<string, Read> = {};
  for (const [table, order] of Object.entries(OLD)) {
    let shape: string[];
    let select: string;
    if (place.engine === "sqlite") {
      const [create, indexes, columns] = await sql(place, [`SELECT sql FROM sqlite_master WHERE tbl_name = '${table}' AND sql IS NOT NULL ORDER BY type, name`, `PRAGMA index_list("${table}")`, `PRAGMA table_info("${table}")`]);
      shape = [...create!.map((r) => String(r["sql"])), ...indexes!.map((r) => JSON.stringify(r))];
      select = `SELECT ${columns!.map((c) => `quote("${String(c["name"])}")`).join(", ")} FROM "${table}" ORDER BY ${order.join(", ")}`;
    } else if (place.engine === "postgres") {
      const [columns, constraints, indexes] = await sql(place, [
        `SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, is_nullable, column_default, is_identity FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = '${table}' ORDER BY ordinal_position`,
        `SELECT conname, pg_get_constraintdef(o.oid) AS def FROM pg_constraint o JOIN pg_class c ON c.oid = o.conrelid WHERE c.relname = '${table}' AND c.relnamespace = current_schema()::regnamespace ORDER BY conname`,
        `SELECT indexdef FROM pg_indexes WHERE tablename = '${table}' AND schemaname = current_schema() ORDER BY indexname`,
      ]);
      shape = [...columns!.map((r) => JSON.stringify(r)), ...constraints!.map((r) => `${String(r["conname"])} ${String(r["def"])}`), ...indexes!.map((r) => String(r["indexdef"]))];
      select = `SELECT ${columns!.map((c) => `"${String(c["column_name"])}"::text`).join(", ")} FROM "${table}" ORDER BY ${order.join(", ")}`;
    } else {
      const [create, columns] = await sql(place, [`SHOW CREATE TABLE \`${table}\``, `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '${place.name}' AND TABLE_NAME = '${table}' ORDER BY ORDINAL_POSITION`]);
      shape = [String(create![0]!["Create Table"])];
      select = `SELECT ${columns!.map((c) => `CAST(\`${String(c["c"])}\` AS CHAR)`).join(", ")} FROM \`${table}\` ORDER BY ${order.join(", ")}`;
    }
    const [rows] = await sql(place, [select]);
    out[table] = { shape, rows: rows!.map((r) => Object.values(r).map(text)) };
  }
  return out;
}

async function makeOld(engine: Engine, name: string): Promise<Place> {
  let place: Place;
  if (engine === "sqlite") {
    const file = join(tmpdir(), `${name}.db`);
    rmSync(file, { force: true });
    place = { engine, name: file, dsn: `sqlite:${file}` };
  } else {
    const base = new URL(engine === "postgres" ? process.env["TEST_POSTGRES_URL"]! : process.env["TEST_MYSQL_URL"]!);
    const server: Place = { engine, name, dsn: base.toString() };
    await sql(server, engine === "postgres" ? [`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`, `CREATE DATABASE ${name}`] : [`DROP DATABASE IF EXISTS \`${name}\``, `CREATE DATABASE \`${name}\``]);
    const url = new URL(base.toString());
    url.pathname = `/${name}`;
    place = { engine, name, dsn: url.toString() };
  }
  await sql(place, [...oldSchema(engine), ...oldRows(engine)]);
  return place;
}

async function dropOld(place: Place): Promise<void> {
  if (place.engine === "sqlite") {
    rmSync(place.name, { force: true });
    return;
  }
  const base = new URL(place.dsn);
  base.pathname = place.engine === "postgres" ? "/postgres" : "/";
  await sql({ ...place, dsn: base.toString() }, place.engine === "postgres" ? [`DROP DATABASE IF EXISTS ${place.name} WITH (FORCE)`] : [`DROP DATABASE IF EXISTS \`${place.name}\``]);
}

// ── the contract ────────────────────────────────────────────────────────────

describe.skipIf(why !== null)(`a shop on the old example takes the rework${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let staff: Caller;
      let place: Place;
      let before: Record<string, Read>;
      let tablesBefore: string[];
      let connectionId = "";
      let app: ReturnType<typeof appBundle>;
      // Packed when the run starts, not when the tests are listed: a run that skips needs no add-ons checkout.
      let addOns: ReturnType<typeof addOnBundle>[] = [];
      const body = () => ({ key: app.key, version: app.version, connectionId });
      const data = (table: string) => `/api/v1/data/${connectionId}/${table}`;
      const rows = async (table: string): Promise<Row[]> => ok(await staff.get<{ data: Row[] }>(`${data(table)}?limit=200`)).data;

      beforeAll(async () => {
        app = appBundle({ manifest: MANIFEST_TEXT });
        addOns = ADD_ONS.map((key) => addOnBundle(key));
        place = await makeOld(engine as Engine, dbName("update_old", engine as Engine));
        before = await snapshot(place);
        tablesBefore = await tablesIn(place);
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, CLOCK - 60_000, { database: dbName("update", engine as Engine) });
        staff = new Caller(server.base, { origin: server.base });
        await staff.signIn(ADMIN.email, ADMIN.password);
        connectionId = ok(await staff.post<{ id: string }>("/api/v1/connections", { name: "jackys", engine, dsn: place.dsn }), 201).id;
        const introspect = await staff.post(`/api/v1/connections/${connectionId}/introspect`);
        expect([200, 202], JSON.stringify(introspect.body).slice(0, 600)).toContain(introspect.status);
        await until(async () => ((ok(await staff.get<{ snapshot?: unknown }>(`/api/v1/connections/${connectionId}`)).snapshot ?? null) === null ? undefined : true), "the old database's snapshot");
        for (const addOn of addOns) {
          const staged = await staff.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(addOn.integrity)}`, addOn.buffer);
          expect([200, 201], JSON.stringify(staged.body).slice(0, 600)).toContain(staged.status);
        }
        const staged = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        expect([200, 201], JSON.stringify(staged.body).slice(0, 600)).toContain(staged.status);
      }, 360_000);

      afterAll(async () => {
        await server?.stop();
        if (place !== undefined) await dropOld(place);
      });

      it("holds the old example's seven tables, bare, with their rows", () => {
        expect(tablesBefore).toEqual([...OLD_NAMES].sort());
        expect(Object.fromEntries(OLD_NAMES.map((t) => [t, before[t]!.rows.length]))).toEqual({ products: 3, categories: 2, product_categories: 3, customers: 2, orders: 2, order_items: 3, shop_settings: 1 });
      });

      it("plans the rework as installable, every table it makes its own under the prefix, none of the old ones taken", async () => {
        const plan = ok(await staff.post<{ plan: { installable: boolean; problems: unknown[]; create: { ref: string }[]; reuse: { ref: string }[]; references: { fromTable: string; to: string; resolution: string }[] } }>("/api/v1/apps/plan", { ...body(), addOns: addOns.map((a) => a.key) })).plan;
        expect(plan.problems, JSON.stringify(plan.problems)).toEqual([]);
        expect(plan.installable).toBe(true);
        expect(plan.reuse.map((t) => t.ref)).toEqual([]);
        const refs = (JSON.parse(MANIFEST_TEXT) as { requiredSchema: { tables: { ref: string }[] } }).requiredSchema.tables.map((t) => t.ref);
        expect(plan.create.map((t) => t.ref)).toEqual(expect.arrayContaining(refs));
        expect(plan.references.filter((r) => refs.includes(r.to) && r.resolution !== "internal").map((r) => `${r.fromTable}.${r.to} ${r.resolution}`)).toEqual([]);
      });

      it("installs with its four add-ons, and leaves every old table byte for byte as it was", async () => {
        const fresh = ok(await staff.post<{ plan: { checksum: string } }>("/api/v1/apps/plan", { ...body(), addOns: addOns.map((a) => a.key) })).plan;
        const install = await staff.post<{ rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body(), planChecksum: fresh.checksum, addOns: addOns.map((a) => ({ key: a.key, version: a.version })) });
        expect(install.status, JSON.stringify(install.body).slice(0, 3000)).toBe(200);
        expect(JSON.stringify(install.body.rules.skipped)).toBe("[]");
        expect(await snapshot(place)).toEqual(before);
        const added = (await tablesIn(place)).filter((t) => !tablesBefore.includes(t));
        expect(added.filter((t) => !NEW_PREFIXES.some((p) => t.startsWith(p)))).toEqual([]);
        expect(added).toEqual(expect.arrayContaining(["ecommerce_shop_products", "ecommerce_shop_categories", "ecommerce_shop_customers", "ecommerce_shop_orders", "ecommerce_shop_settings"]));
      }, 180_000);

      it("adds the sample into the shop's own tables, and the old tables are still as they were", async () => {
        ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: "America/Los_Angeles", currency: "USD" }));
        await server.setClock(CLOCK, true);
        await addSample(staff);
        await server.setClock(CLOCK);
        const orders = await rows("ecommerce_shop_orders");
        expect(orders.map((o) => o["number"])).toContain("NL-1066");
        expect(await snapshot(place)).toEqual(before);
      }, 300_000);

      it("lets a shopper order through the shop's own door, into the shop's orders and not the old ones", async () => {
        ok(await staff.put("/api/v1/public-api", { enabled: true }));
        ok(await staff.put("/api/v1/settings/email", { publicOrigin: server.base }));
        ok(await staff.put("/api/v1/payments/rehearsal", { on: true }));
        const served = ok(await staff.get<{ publishableKey: string; rehearsal?: { csrfToken: string } }>("/apps/ecommerce-shop/customer/surface-config.json"));
        const shopper = new Shopper(server.base, served.publishableKey, { cookie: staff.cookies, csrf: served.rehearsal!.csrfToken });
        const config = ok(await new Caller(server.base, { origin: server.base, authorization: `Bearer ${served.publishableKey}` }).get<{ data?: { refs?: Record<string, Row> } }>("/api/v1/public/config"));
        const ref = Object.keys(config.data?.refs ?? {}).filter((r) => r.startsWith("ecommerce_shop_orders_verified") && JSON.stringify(config.data!.refs![r]!["actions"]) === '["create"]').sort()[0]!;
        const region = (await rows("ecommerce_shop_regions")).find((r) => r["code"] === "OR")!;
        const offer = (await rows("ecommerce_shop_shipping_offers")).find((o) => String(o["zone_id"]) === String(region["zone_id"]) && num(o["price"]) === 7)!;
        const variant = (await rows("ecommerce_shop_variants")).find((v) => v["sku"] === "NL-MUG-MOS")!;
        const write = { values: { name: "Ava Reyes", email: `ava.${engine}@northline-shoppers.dev`, language: "en-US", ship_name: "Ava Reyes", address_line1: "1 Market St", city: "Portland", zip: "97209", region_id: region["id"], offer_id: offer["id"] }, children: { order_lines: [{ values: { variant_id: variant["id"], qty: 1 } }] } };
        const quote = await shopper.quote(ref, write);
        expect(quote.status, JSON.stringify(quote.body).slice(0, 600)).toBe(200);
        const made = await shopper.create(ref, { values: { ...write.values, client_key: retryKey("update") }, children: write.children, expect: { total: num(quote.body.data["total"]).toFixed(2) } });
        expect(made.status, JSON.stringify(made.body).slice(0, 600)).toBe(201);
        expect(made.body.data["number"]).toBe("NL-1067");
        expect((await rows("ecommerce_shop_orders")).map((o) => o["number"])).toContain("NL-1067");
        expect(await snapshot(place)).toEqual(before);
      }, 120_000);
    });
  });
});
