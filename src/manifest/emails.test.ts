/**
 * The outbox and its templates, as the plan and the comp ask (N3):
 *
 *   - every kind has a template in every language, and something that sends it;
 *   - only the newsletter welcome is marketing; the shop's own mail has no class
 *     and goes to the shop's e-mail in Settings (R5), never carrying a code;
 *   - every private link opens the order by the code in its fragment, and says
 *     right under it that it is just for the reader (ACC-5, N3-F15);
 *   - a payment's e-mail is dropped once paid or cancelled, the clock's cancel
 *     says the right words for the way it was to be paid;
 *   - each template stays inside what Adminium sends: 1–40 blocks, a subject
 *     and preheader of at most 200 characters, a footer of at most 1000, no
 *     HTML block, the same lists in every language.
 */
import { describe, expect, it } from "vitest";

import { buildManifest } from "./build.ts";
import { emailTemplates, ORDER_LINK, templateOf } from "./emails.ts";
import { LOCALES } from "./labels.ts";
import { KINDS, MARKETING, OUTBOX, TO_SHOP, type Kind } from "./outbox.ts";
import { EMAIL_KINDS, TABLES } from "./tables.ts";

type Producer = { kind: string; link: string; recipient?: unknown; dropWhen?: { column: string }[]; onCreate?: unknown; onChange?: { where?: unknown } };
const producers = OUTBOX.producers as Producer[];
const json = (value: unknown) => JSON.stringify(value);

describe("the outbox", () => {
  it("names every kind the messages table offers, and sends each one", () => {
    expect(Object.keys(EMAIL_KINDS)).toEqual([...KINDS]);
    expect([...new Set(producers.map((p) => p.kind))].sort()).toEqual([...KINDS].sort());
    expect(Object.keys(OUTBOX.kinds).sort()).toEqual([...KINDS].sort());
  });

  it("links only the messages table's own nullable keys", () => {
    const messages = TABLES.find((t) => t.ref === "messages")!;
    for (const column of Object.values(OUTBOX.links)) {
      const found = messages.columns.find((c) => c.ref === column);
      expect(found?.references, column).toBeDefined();
      expect(found?.nullable, column).toBe(true);
    }
  });

  it("marks the welcome alone as marketing, and the shop's own mail with no class", () => {
    expect(Object.entries(OUTBOX.classes).filter(([, c]) => c === "marketing").map(([k]) => k)).toEqual([...MARKETING]);
    for (const kind of TO_SHOP) {
      expect(OUTBOX.classes).not.toHaveProperty(kind);
      expect(producers.filter((p) => p.kind === kind).every((p) => json(p.recipient) === json({ setting: { table: "settings", column: "email" } }))).toBe(true);
    }
  });

  it("answers replies at the shop's own address", () => {
    expect(OUTBOX.settings.replyTo).toBe("email");
  });

  it("drops the transfer reminder once the order is paid or cancelled", () => {
    const reminder = producers.find((p) => p.kind === "transfer-reminder")!;
    expect(reminder.dropWhen?.map((d) => d.column)).toEqual(["due", "status"]);
  });

  it("tells a clock's cancel apart by the way the order was to be paid", () => {
    const online = producers.find((p) => p.kind === "order-cancelled-unpaid")!;
    const transfer = producers.find((p) => p.kind === "transfer-cancelled")!;
    expect(json(online.dropWhen)).toContain('"eq":"transfer"');
    expect(json(transfer.dropWhen)).toContain('"eq":"online"');
  });

  it("e-mails a back-in-stock request once, when the rule stamps it", () => {
    const back = producers.find((p) => p.kind === "back-in-stock")!;
    expect(back.onChange).toMatchObject({ table: "restock_requests", columns: ["notified_at"], changed: true });
    expect(back).not.toHaveProperty("repeat");
  });
});

describe.each(KINDS.map((kind) => [kind] as [Kind]))("%s", (kind) => {
  const en = templateOf(kind);
  const text = json(en);

  it("is within what Adminium sends", () => {
    for (const tag of LOCALES) {
      const t = templateOf(kind, tag);
      expect(t.blocks.length).toBeGreaterThan(0);
      expect(t.blocks.length).toBeLessThanOrEqual(40);
      expect(t.subject.length).toBeLessThanOrEqual(200);
      expect(t.preheader.length).toBeLessThanOrEqual(200);
      expect(t.footer.length).toBeLessThanOrEqual(1000);
      expect(t.blocks.map((b) => b.block)).not.toContain("email.html");
      // Every language lists the same rows: Adminium refuses a template whose `from` differs.
      expect(t.blocks.map((b) => json([b.id, b.block, b.data["from"], b.data["onlyWith"], b.data["onlyWithout"]]))).toEqual(en.blocks.map((b) => json([b.id, b.block, b.data["from"], b.data["onlyWith"], b.data["onlyWithout"]])));
    }
  });

  if (TO_SHOP.has(kind)) {
    it("carries no customer's link, and opens the desk", () => {
      expect(text).not.toContain("link_token");
      expect(text).not.toContain("manage_url");
    });
  } else if (text.includes("{{order.link_token}}")) {
    it("opens the order by its code in the fragment, and says it is just for the reader", () => {
      const buttons = en.blocks.filter((b) => b.block === "email.button" && json(b).includes("link_token"));
      expect(buttons.every((b) => b.data["url"] === ORDER_LINK)).toBe(true);
      const last = en.blocks.findIndex((b) => b.id === "just-for-you");
      expect(last).toBeGreaterThan(en.blocks.indexOf(buttons.at(-1)!));
      expect(en.blocks[last - 1]!.block).toBe("email.button");
    });
  }

  it("signs off as the comp does: help, why, and the shop's address (the welcome's address is Adminium's)", () => {
    if (TO_SHOP.has(kind)) expect(en.footer).toBe("Sent to the shop's e-mail address in Settings.");
    else if (kind === "news-welcome") expect(en.footer).not.toContain("practice.address_line1");
    else expect(en.footer).toMatch(/^Questions\?[\s\S]*\{\{practice\.address_line1\}\}/);
  });
});

describe("the private link", () => {
  it("is in every customer e-mail about an order or a return that is still the customer's to open", () => {
    const linked = KINDS.filter((kind) => json(templateOf(kind)).includes("{{order.link_token}}"));
    expect(linked).toEqual([
      "order-paid",
      "order-transfer",
      "transfer-reminder",
      "order-cancelled",
      "order-cancelled-by-us",
      "order-shipped",
      "order-new-number",
      "gift-sent",
      "return-asked",
      "return-approved",
      "return-received",
      "return-refunded",
      "return-declined",
    ]);
  });
});

describe("the manifest", () => {
  it("carries the outbox and a template for each kind", () => {
    const manifest = buildManifest() as { outbox: typeof OUTBOX; emailTemplates: { key: string; vars: string[] }[] };
    expect(manifest.outbox).toBe(OUTBOX);
    expect(manifest.emailTemplates.map((t) => t.key)).toEqual(Object.values(OUTBOX.kinds));
    expect(emailTemplates().length).toBeLessThanOrEqual(32);
    expect(producers.length).toBeLessThanOrEqual(32);
    for (const t of manifest.emailTemplates) expect(t.vars.length, t.key).toBeLessThanOrEqual(60);
  });
});
