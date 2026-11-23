/**
 * THE SHOP'S E-MAILS, SENT BY A BUILT ADMINIUM TO ITS SMTP SINK.
 *
 * On each engine: the app installed as an operator installs it (every one of
 * its nineteen templates passes Adminium's own check on the way in), the
 * shop's rows written as the desk writes them, its e-mail set in Settings,
 * and orders placed through the shop's own door while someone who manages
 * payments rehearses the checkout (payments on, in test mode), each paid on
 * the pay page with the demo service. Then, read from the sink:
 *
 *   - the paid order's confirmation, in English and in German, with its own
 *     link (the code in the fragment) and "just for you" under it;
 *   - the shop's new-order mail, at the shop's own address in Settings;
 *   - the shipped mail, with the carrier and the tracking number;
 *   - the cancel mail, with what goes back;
 *   - a message sent through the contact form, to the shop;
 *   - and for every event one e-mail, never two: its row in the outbox once,
 *     the sink holding it once.
 *
 * It runs with `CONTRACT=1` where a built Adminium is, and says why it skipped
 * otherwise. Its ports start at `CONTRACT_PORT_BASE` (5400), three an engine.
 */
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createPublicClient, newClientKey, type PublicClient } from "@adminiumjs/public-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { appBundle, boot, Caller, ENGINES, missing, ok, PORTS_PER_ENGINE, solve, until, type Engine, type Server } from "./harness.ts";
import { plain, sinkMail, type Mail } from "./mail.ts";
import { MANIFEST_TEXT } from "./release.ts";

const why = missing();
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the mail contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 5400);
const DB = `p77_mail`;
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
/** Tuesday 18 August 2026, 11:40 in Portland (Pacific daylight time): before the two o'clock cut-off. */
const CLOCK = Date.parse("2026-08-18T18:40:00Z");
/** The shop's own address: on a made-up domain the outbox sends to (never one kept for examples). */
const SHOP_EMAIL = "desk@northline-mail.dev";

type Row = Record<string, unknown>;
type Template = { key: string; locales: Record<string, { subject: string }> };
const MANIFEST = JSON.parse(MANIFEST_TEXT) as { outbox: { kinds: Record<string, string> }; emailTemplates: Template[] };

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Any subject a template writes, its names matched by any words. */
const subjectPattern = (subject: string) =>
  new RegExp(`^(\\[TEST\\] )?${subject.split(/(\{\{[^{}]+\}\})/).map((part) => (/^\{\{.+\}\}$/.test(part) ? ".+?" : escape(part))).join("")}$`);
/** A kind's subject in a language, as a pattern: the names given filled in, any other matched by any words. */
function subject(kind: string, tag: string, known: Record<string, string> = {}): RegExp {
  const template = MANIFEST.emailTemplates.find((t) => t.key === MANIFEST.outbox.kinds[kind])!;
  const pattern = template.locales[tag]!.subject.split(/(\{\{[^{}]+\}\})/)
    .map((part) => {
      const name = /^\{\{([\w.]+)(?:\|[^{}]*)?\}\}$/.exec(part)?.[1];
      if (name === undefined) return escape(part);
      return name in known ? escape(known[name]!) : ".+?";
    })
    .join("");
  // A rehearsal's mail goes to the person rehearsing, its subject marked so.
  return new RegExp(`^(\\[TEST\\] )?${pattern}$`);
}

describe.skipIf(why !== null)(`the shop's e-mails on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let staff: Caller;
      let connectionId = "";
      let shop: PublicClient;
      let orderRef = "";
      let enquiryRef = "";
      const ids: Record<string, Row> = {};
      const table = (ref: string) => `ecommerce_shop_${ref}`;
      const create = async (ref: string, values: Row): Promise<Row> => {
        const reply = await staff.post<{ data: Row }>(`/api/v1/data/${connectionId}/${table(ref)}`, { values });
        if (reply.status !== 201 && reply.status !== 200) throw new Error(`create ${ref}: ${reply.status} ${JSON.stringify(reply.body).slice(0, 800)}`);
        return (reply.body as { data: Row }).data;
      };
      const change = async (ref: string, id: unknown, values: Row): Promise<Row> => ok(await staff.patch<{ data: Row }>(`/api/v1/data/${connectionId}/${table(ref)}/${String(id)}`, { values })).data;
      const row = async (ref: string, id: unknown): Promise<Row> => ok(await staff.get<{ data: Row }>(`/api/v1/data/${connectionId}/${table(ref)}/${String(id)}`)).data;
      const messages = async (): Promise<Row[]> => ok(await staff.get<{ data: Row[] }>(`/api/v1/data/${connectionId}/${table("messages")}?limit=200`)).data;
      const of = (column: string, id: unknown) => async () => (await messages()).filter((m) => String(m[column]) === String(id));

      /** A kind's one row about a row, once it has gone: sent, or what it says went wrong. */
      async function sent(kind: string, column: string, id: unknown): Promise<Row> {
        const done = await until(async () => {
          const mine = (await of(column, id)()).filter((m) => m["kind"] === kind);
          return mine.some((m) => m["status"] !== "queued") ? mine : undefined;
        }, `the ${kind} e-mail to leave the outbox`, 120_000);
        expect(done.length, `${kind}: ${JSON.stringify(done)}`).toBe(1);
        const [message] = done;
        expect({ kind, status: message!["status"], error: message!["error"] ?? null }).toEqual({ kind, status: "sent", error: null });
        return message!;
      }
      /** The one e-mail the sink holds to an address under a subject. */
      async function inSink(to: string, title: RegExp): Promise<Mail> {
        const matching = async () => (await sinkMail(server.sink)).filter((m) => m.to.includes(to) && title.test(m.subject));
        const deadline = Date.now() + 60_000;
        let held = await matching();
        while (held.length === 0) {
          if (Date.now() > deadline) throw new Error(`the sink holds no ${String(title)} to ${to}; it holds ${JSON.stringify((await sinkMail(server.sink)).map((m) => [m.to, m.subject]))}`);
          await new Promise((resolve) => setTimeout(resolve, 1_000));
          held = await matching();
        }
        // Once: a second look a little later finds no other.
        await new Promise((resolve) => setTimeout(resolve, 3_000));
        const again = await matching();
        expect(again.length, `${String(title)} to ${to}: ${JSON.stringify(again.map((m) => m.subject))}`).toBe(1);
        return held[0]!;
      }

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, CLOCK, { database: `${DB}_${engine}` });
        staff = new Caller(server.base, { origin: server.base });
        await staff.signIn(ADMIN.email, ADMIN.password);
        if (engine === "sqlite") {
          const file = join(tmpdir(), `${DB}-${engine}-${String(PORT_BASE)}.db`);
          rmSync(file, { force: true });
          writeFileSync(file, "");
          connectionId = ok(await staff.post<{ id: string }>("/api/v1/connections", { name: "northline", engine: "sqlite", dsn: `sqlite:${file}` }), 201).id;
        } else {
          connectionId = ok(await staff.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections")).connections.find((c) => c.name === "northwind")!.id;
        }
        // The shop alone: every e-mail here is the app's own, and needs no add-on.
        const app = appBundle({ manifest: MANIFEST_TEXT });
        const staged = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        if (![200, 201].includes(staged.status)) throw new Error(`upload: ${JSON.stringify(staged.body).slice(0, 1500)}`);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await staff.post<{ plan: { checksum: string; installable: boolean } }>("/api/v1/apps/plan", body)).plan;
        if (!plan.installable) throw new Error(`not installable: ${JSON.stringify(plan).slice(0, 3000)}`);
        // Adminium checks every template on the way in (a form a column has not, a block it does not know): refused, nothing installs.
        const installed = ok(await staff.post<{ rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, shippingUnticked: [], addOns: [] }));
        if (installed.rules.skipped.length > 0) throw new Error(`the install skipped rules: ${JSON.stringify(installed.rules.skipped).slice(0, 3000)}`);
        ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: "America/Los_Angeles", currency: "USD" }));
        ok(await staff.put("/api/v1/public-api", { enabled: true }));
        // Links in e-mails are built from the server's public address.
        ok(await staff.put("/api/v1/settings/email", { publicOrigin: server.base }));

        // The shop's rows, as the desk writes them.
        ids["settings"] = await create("settings", {
          shop_name: "Northline",
          email: SHOP_EMAIL,
          address_line1: "1400 NW Kearney St, Suite 210",
          city: "Portland",
          state_code: "OR",
          zip: "97209",
          transfer_name: "Northline Outdoor LLC",
          transfer_bank: "Sample Savings Bank",
          transfer_routing: "012345678",
          transfer_account: "000123456789",
        });
        const cat = await create("categories", { name: "Clothing", slug: "clothing", icon: "shirt" });
        const shell = await create("products", { name: "Basalt Rain Shell", slug: "basalt-shell", category_id: cat["id"], price: 189, blurb: "Three layers.", specs: [] });
        await change("products", shell["id"], { status: "active" });
        const ember = await create("option_values", { product_id: shell["id"], kind: "colour", code: "ember", label: "Ember" });
        const m = await create("option_values", { product_id: shell["id"], kind: "size", code: "m", label: "M" });
        ids["variant"] = await create("variants", { product_id: shell["id"], colour_id: ember["id"], size_id: m["id"], sku: "NL-BSH-EMB-M", weight_g: 380 });
        const zone = await create("zones", { code: "contiguous", label: "Contiguous US" });
        ids["region"] = await create("regions", { code: "WA", name: "Washington", zone_id: zone["id"], tax_rate: 6.5 });
        const standard = await create("shipping_services", { code: "standard", label: "Standard", transit_min: 3, transit_max: 5 });
        ids["offer"] = await create("shipping_offers", { service_id: standard["id"], zone_id: zone["id"], price: 7, free_from: 100 });

        // Someone who manages payments rehearses the checkout: the shop takes payments online, in test mode, for them.
        ok(await staff.put("/api/v1/payments/rehearsal", { on: true }));
        const served = ok(await staff.get<{ publishableKey: string; rehearsal?: { csrfToken: string } }>("/apps/ecommerce-shop/customer/surface-config.json"));
        expect(served.rehearsal?.csrfToken).toBeTruthy();
        shop = createPublicClient({ baseUrl: server.base, publishableKey: served.publishableKey, csrfToken: served.rehearsal!.csrfToken, fetch: staff.fetchAs() })!;
        const config = ok(await new Caller(server.base, { origin: server.base, authorization: `Bearer ${served.publishableKey}` }).get<{ data?: { refs?: Row }; refs?: Row }>("/api/v1/public/config"));
        const refs = Object.keys(config.data?.refs ?? config.refs ?? {});
        enquiryRef = refs.find((r) => r.startsWith("ecommerce_shop_enquiries"))!;
        // The door open now for goods paid online: the one that prices the basket.
        for (const ref of refs.filter((r) => r.startsWith("ecommerce_shop_orders_verified"))) {
          try {
            await shop.quote(ref, orderOf("Marcus Hale", "marcus.h@northline-shoppers.dev", "en-US"));
            orderRef = ref;
            break;
          } catch {
            // closed, or for gift cards alone
          }
        }
        expect(orderRef).not.toBe("");
      }, 360_000);

      afterAll(async () => {
        await staff?.put("/api/v1/payments/rehearsal", { on: false }).catch(() => undefined);
        await server?.stop();
      });

      function orderOf(name: string, email: string, language: string) {
        return {
          values: { name, email, language, ship_name: name, address_line1: "500 Pine St", city: "Seattle", zip: "98101", region_id: ids["region"]!["id"], offer_id: ids["offer"]!["id"] },
          children: { order_lines: [{ values: { variant_id: ids["variant"]!["id"], qty: 1 } }] },
        };
      }

      /** Placed through the shop's door at the total Adminium quoted, then paid on the pay page with the demo service. */
      async function placeAndPay(name: string, email: string, language: string): Promise<Row> {
        const write = orderOf(name, email, language);
        const quoted = await shop.quote(orderRef, write);
        const placed = await shop.createTree(orderRef, { ...write, values: { ...write.values, client_key: newClientKey() }, expect: { total: String(quoted.data["total"]) } });
        expect(placed.payUrl).toMatch(/\/pay\//);
        const token = new URL(placed.payUrl!, server.base).pathname.split("/").pop()!;
        const challenge = ok(await staff.get<{ id: string; salt: string; difficulty: number }>(`/pay/api/${token}/challenge`));
        const started = ok(await staff.post<{ url?: string }>(`/pay/api/${token}/checkout`, { source: "demo" }, { "x-adminium-proof": `${challenge.id}.${solve(challenge.salt, challenge.difficulty)}` }));
        const attempt = new URL(started.url!, server.base).pathname.split("/").pop()!;
        const done = ok(await staff.post<{ back: string }>(`/pay/api/demo/${attempt}`, { action: "succeeds" }));
        ok(await staff.get(`/pay/api/back/${done.back.split("/").pop()!.split("?")[0]!}`));
        return until(async () => {
          const now = await row("orders", placed.data["id"]);
          return now["status"] === "paid" ? now : undefined;
        }, "the order paid", 60_000);
      }

      let english: Row;
      let german: Row;
      /** Where a rehearsal's mail goes: the person rehearsing, never the shopper they typed. */
      const REHEARSER = ADMIN.email;

      describe("paid online while someone who manages payments rehearses the checkout", () => {
        it("confirms a paid order in English, with its own link, and nothing before it was paid", async () => {
          english = await placeAndPay("Marcus Hale", "marcus.h@northline-shoppers.dev", "en-US");
          const message = await sent("order-paid", "order_id", english["id"]);
          expect([message["language"], message["to_address"]]).toEqual(["en-US", REHEARSER]);
          const mail = await inSink(REHEARSER, subject("order-paid", "en-US", { "order.number": String(english["number"]) }));
          const words = plain(mail.html);
          expect(words).toContain("Your order is paid.");
          expect(words).toContain("Basalt Rain Shell");
          expect(words).toContain("NL-BSH-EMB-M");
          // Every figure is Adminium's: 189.00 + Washington's 6.5 % = 201.29, shipping off from 100.00.
          expect(words).toContain("$201.29");
          expect(words).toContain("This link is just for you — don't forward it.");
          // The order's code rides the fragment of its own page's address, never its path.
          expect(`${mail.text}\n${mail.html}`).toMatch(/\/o#[A-Za-z0-9]{16}/);
          expect(mail.text).toContain(`Questions? Reply to this e-mail, or write to ${SHOP_EMAIL}.`);
          // Nothing went for it while it waited for the money: the paid e-mails are its first.
          expect((await of("order_id", english["id"])()).map((m) => m["kind"]).sort()).toEqual(["order-paid", "staff-new-order"]);
        });

        it("confirms an order placed in German in German", async () => {
          german = await placeAndPay("Lena Vogt", "lena.v@northline-shoppers.dev", "de-DE");
          const message = await sent("order-paid", "order_id", german["id"]);
          expect(message["language"]).toBe("de-DE");
          const mail = await inSink(REHEARSER, subject("order-paid", "de-DE", { "order.number": String(german["number"]) }));
          const words = plain(mail.html);
          expect(words).toContain("Deine Bestellung ist bezahlt.");
          expect(words).toContain("Dieser Link ist nur für dich. Bitte leite ihn nicht weiter.");
          expect(words).toContain("Basalt Rain Shell");
          // Adminium writes the money the German way: the dollars, to the cent.
          expect(words).toContain("201,29 $");
        });

        it("e-mails the shipped order with its carrier and tracking number", async () => {
          await change("orders", english["id"], { status: "packed" });
          await change("orders", english["id"], { status: "shipped", carrier: "UPS", tracking: "1Z999AA10123456784" });
          await sent("order-shipped", "order_id", english["id"]);
          const mail = await inSink(REHEARSER, subject("order-shipped", "en-US", { "order.number": String(english["number"]) }));
          const words = plain(mail.html);
          expect(words).toContain("Your order is on its way");
          expect(words).toContain("UPS");
          expect(words).toContain("1Z999AA10123456784");
          expect(words).toContain("Standard");
        });

        it("e-mails the cancel the customer asked for, with what goes back", async () => {
          await change("orders", german["id"], { status: "cancelled", cancel_reason: "asked" });
          await sent("order-cancelled", "order_id", german["id"]);
          const mail = await inSink(REHEARSER, subject("order-cancelled", "de-DE", { "order.number": String(german["number"]) }));
          const words = plain(mail.html);
          expect(words).toContain("Du wolltest sie stornieren");
          // Paid, so the money goes back: what it was paid, as Adminium wrote it.
          expect(words).toContain("Wir erstatten dir 201,29 $");
          expect(words).not.toContain("Es wurde nichts abgebucht.");
          // The shop's own reason words are for an order the shop cancelled: never these.
          expect((await of("order_id", german["id"])()).map((m) => m["kind"]).sort()).toEqual(["order-cancelled", "order-paid", "staff-new-order"]);
        });
      });

      describe("an order the desk takes by bank transfer, payments off", () => {
        let order: Row;
        beforeAll(async () => {
          ok(await staff.put("/api/v1/payments/rehearsal", { on: false }));
        });

        it("tells the customer how to pay, at the address the order holds", async () => {
          order = await create("orders", { status: "awaiting_transfer", pay_method: "transfer", name: "Priya Raman", email: "priya.r@northline-shoppers.dev", language: "en-US", ship_name: "Priya Raman", address_line1: "500 Pine St", city: "Seattle", zip: "98101", region_id: ids["region"]!["id"], offer_id: ids["offer"]!["id"] });
          await create("order_lines", { order_id: order["id"], variant_id: ids["variant"]!["id"], qty: 1 });
          const message = await sent("order-transfer", "order_id", order["id"]);
          expect(message["to_address"]).toBe("priya.r@northline-shoppers.dev");
          const mail = await inSink("priya.r@northline-shoppers.dev", subject("order-transfer", "en-US", { "order.number": String(order["number"]) }));
          const words = plain(mail.html);
          expect(words).toContain("Here's how to pay.");
          expect(words).toContain("Sample Savings Bank");
          expect(words).toContain("012345678");
          expect(words).toContain("This link is just for you — don't forward it.");
          // The one reminder waits for the third day, and is dropped once the money comes.
          const reminder = (await of("order_id", order["id"])()).find((m) => m["kind"] === "transfer-reminder");
          expect(reminder?.["status"]).toBe("queued");
        });

        it("confirms it once the transfer is recorded, and tells the shop at its own address in Settings", async () => {
          const now = await row("orders", order["id"]);
          await create("payments", { order_id: order["id"], method: "transfer", amount: now["total"], paid_at: new Date(CLOCK + 60_000).toISOString() });
          await change("orders", order["id"], { status: "paid" });
          const paid = await sent("order-paid", "order_id", order["id"]);
          expect(paid["to_address"]).toBe("priya.r@northline-shoppers.dev");
          const mail = await inSink("priya.r@northline-shoppers.dev", subject("order-paid", "en-US", { "order.number": String(order["number"]) }));
          expect(plain(mail.html)).toContain("Thank you, Priya. Your order is paid.");
          const told = await sent("staff-new-order", "order_id", order["id"]);
          expect(told["to_address"]).toBe(SHOP_EMAIL);
          const desk = await inSink(SHOP_EMAIL, subject("staff-new-order", "en-US", { "order.number": String(order["number"]) }));
          const text = `${desk.text}\n${plain(desk.html)}`;
          expect(text).toContain("Sent to the shop's e-mail address in Settings.");
          expect(text).toContain("Priya Raman paid $201.29.");
          expect(text).not.toMatch(/\/o#/);
          expect(text).toMatch(/\/staff\/orders/);
          // Paid in time: the reminder is dropped, never sent.
          await until(async () => {
            const reminder = (await of("order_id", order["id"])()).find((m) => m["kind"] === "transfer-reminder");
            return reminder?.["status"] === "skipped" ? reminder : undefined;
          }, "the reminder dropped", 120_000);
        });
      });

      it("hands a message from the contact form to the shop", async () => {
        const served = ok(await new Caller(server.base).get<{ publishableKey: string }>("/apps/ecommerce-shop/customer/surface-config.json"));
        const guest = createPublicClient({ baseUrl: server.base, publishableKey: served.publishableKey, humanCheck: true, fetch: (input, init) => fetch(input, { ...init, headers: { ...Object.fromEntries(new Headers(init?.headers)), origin: server.base } }) })!;
        let made: Row;
        try {
          made = await guest.create<Row>(enquiryRef, { name: "Hana Sato", email: "hana.s@northline-shoppers.dev", topic: "product", message: "Does the Ember 2 Tent fit two people and their packs?", language: "en-US", client_key: newClientKey() });
        } catch (error) {
          throw new Error(`the contact form refused: ${JSON.stringify(error)}`);
        }
        const message = await sent("staff-enquiry", "enquiry_id", made["id"]);
        expect(message["to_address"]).toBe(SHOP_EMAIL);
        const mail = await inSink(SHOP_EMAIL, subject("staff-enquiry", "en-US", { "enquiry.name": "Hana Sato" }));
        const words = plain(mail.html);
        expect(words).toContain("Does the Ember 2 Tent fit two people and their packs?");
        expect(words).toContain("Open the message in the console: Records › Messages from customers.");
        // "Write back to Hana at …" goes only with her address, which Adminium keeps out of every e-mail (a personal
        // column of a linked row): never a line with a hole in it.
        expect(words.includes("Write back to Hana Sato at hana.s@northline-shoppers.dev.") || !words.includes("Write back")).toBe(true);
      });

      it("sent every e-mail once: one row a kind a row, one mail a row", async () => {
        const all = await messages();
        const keys = all.map((m) => `${String(m["kind"])}:${String(m["order_id"] ?? m["enquiry_id"] ?? m["return_id"])}`);
        expect(keys.length).toBe(new Set(keys).size);
        const gone = all.filter((m) => m["status"] === "sent");
        expect(all.filter((m) => !["sent", "skipped"].includes(String(m["status"])))).toEqual([]);
        // The sink holds Adminium's own mail too (the rehearsal's payment notices): ours are those under our subjects.
        const ours = (await sinkMail(server.sink)).filter((m) => MANIFEST.emailTemplates.some((t) => Object.values(t.locales).some((l) => subjectPattern(l.subject).test(m.subject))));
        expect(ours.length, JSON.stringify((await sinkMail(server.sink)).map((m) => m.subject))).toBe(gone.length);
      });
    });
  });
});
