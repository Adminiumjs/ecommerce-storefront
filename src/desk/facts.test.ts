/**
 * What the desk reads out of the rows, unit by unit: the lists each tile
 * counts, the pick list and its "Count this", one refund row per payment,
 * how an order's money stands, the moves each role is offered, the variants
 * grid, and how a day and money are written.
 */
import { describe, expect, it } from "vitest";

import { filterOrders, grid, holdEndingSoon, orderMoves, packed, payState, pickList, search, shipsByOf, skuFor, splitRefund, stockLists, stockOf, toPack, waitingForPayment } from "./facts.ts";
import { makeFmt } from "./format.ts";
import { DESK_NAV } from "./nav.ts";
import { FakeDoor, NOW } from "./testing/fakeDoor.ts";
import { ownerData, packerData } from "./testing/fixture.ts";
import type { Row } from "./wire.ts";
import { MESSAGES } from "../i18n/messages/index.ts";
import { LOCALE_TAGS } from "../i18n/locales.ts";

const data = ownerData();
const byNumber = (n: string): Row => data.orders.find((o) => o["number"] === n)!;
const numbers = (rows: Row[]) => rows.map((o) => o["number"]);

describe("the lists Today counts", () => {
  it("to pack: paid goods orders, oldest payment first; a gift card order is never to pack", () => {
    expect(numbers(toPack(data))).toEqual(["NL-1061", "NL-1065"]);
    expect(numbers(packed(data))).toEqual(["NL-1059"]);
    expect(numbers(waitingForPayment(data))).toEqual(["NL-1070", "NL-1066"]);
  });

  it("a paid order whose stock hold runs out within a week", () => {
    expect(holdEndingSoon(data, NOW)).toEqual([]);
    expect(numbers(holdEndingSoon(data, Date.parse("2026-09-28T00:00:00Z")))).toEqual(["NL-1061", "NL-1065"]);
  });

  it("low and sold out over the variants on sale, by Inventory's words", () => {
    const lists = stockLists(data);
    expect(lists.low.map((v) => v["sku"])).toEqual(["NL-BSH-EMB-M"]);
    expect(lists.out.map((v) => v["sku"])).toEqual(["NL-BSH-SLA-XL", "NL-CAS45-MOS-ML"]);
  });
});

describe("the pick list", () => {
  it("adds up the pieces by SKU over the orders to pack, and flags a line Inventory is short of", () => {
    const picks = pickList(data);
    expect(picks.map((p) => [p.sku, p.qty, p.short, p.places])).toEqual([
      ["NL-BSH-SLA-M", 1, false, ["Stockroom"]],
      ["NL-CAS45-MOS-ML", 2, true, ["Stockroom"]],
    ]);
  });

  it("drops a packed order's lines", () => {
    const after = ownerData();
    after.orders.find((o) => o["number"] === "NL-1061")!["status"] = "packed";
    expect(pickList(after).map((p) => [p.sku, p.qty])).toEqual([["NL-CAS45-MOS-ML", 1]]);
  });

  it("reads the same for the packer, whose lines carry no money", () => {
    expect(pickList(packerData()).map((p) => p.sku)).toEqual(["NL-BSH-SLA-M", "NL-CAS45-MOS-ML"]);
  });
});

describe("stock", () => {
  it("is Inventory's figure for a variant it counts, and nothing for one it does not", () => {
    expect(stockOf(data, 111)).toMatchObject({ available: 3, state: "low", onHand: 4, held: 1 });
    const unlinked = ownerData();
    unlinked.stock!.links = [];
    expect(stockOf(unlinked, 111)).toBeNull();
    expect(stockOf({ ...data, stock: null }, 111)).toBeNull();
  });
});

describe("refunds", () => {
  it("lays one refund row per payment: online first, then the gift card, each up to what it keeps", () => {
    const mixed = ownerData();
    mixed.payments.push({ id: 50, order_id: 65, method: "gift_card", amount: "20.00", kept: "20.00" }, { id: 51, order_id: 65, method: "transfer", amount: "5.00", kept: "0.00" });
    const order = mixed.orders.find((o) => o["number"] === "NL-1065")!;
    expect(splitRefund(mixed, order, 22_625).map((p) => [p.payment.id, p.cents])).toEqual([
      [1, 21_625],
      [50, 1_000],
    ]);
    expect(splitRefund(mixed, order, 10_000).map((p) => [p.payment.id, p.cents])).toEqual([[1, 10_000]]);
  });

  it("says how an order's money stands", () => {
    expect(payState(byNumber("NL-1065"))).toBe("paid");
    expect(payState(byNumber("NL-1066"))).toBe("unpaid");
    expect(payState(byNumber("NL-1058"))).toBe("unpaid");
    expect(payState({ ...byNumber("NL-1065"), refunded: "62.21", paid: "154.04" })).toBe("part-refunded");
    expect(payState({ ...byNumber("NL-1065"), refunded: "216.25", paid: "0.00" })).toBe("refunded");
    expect(payState({ ...byNumber("NL-1058"), paid: "149.00" })).toBe("owed");
  });
});

describe("orders", () => {
  it("filters by status, service, paid or not, and searches number, name and e-mail", () => {
    expect(numbers(filterOrders(data, { status: "paid", service: "all", paid: "all" }))).toEqual(["NL-1065", "NL-1061"]);
    expect(numbers(filterOrders(data, { status: "all", service: "2", paid: "all" }))).toEqual(["NL-1065", "NL-1059"]);
    expect(numbers(filterOrders(data, { status: "all", service: "all", paid: "unpaid" }))).toEqual(["NL-1070", "NL-1066", "NL-1058"]);
    expect(numbers(filterOrders(data, { status: "all", service: "all", paid: "all" }, "marcus.h"))).toEqual(["NL-1065"]);
  });

  it("gives no ship-by to an order that never ships by parcel", () => {
    expect(shipsByOf(byNumber("NL-1013"))).toBeNull();
    expect(shipsByOf(byNumber("NL-1058"))).toBeNull();
    expect(shipsByOf(byNumber("NL-1065"))).toBe("2026-08-18");
  });

  it("offers each role its moves: the packer packs and ships, only the owner cancels and records a transfer", () => {
    const owner = new FakeDoor("owner").who();
    const packer = new FakeDoor("packer").who();
    expect(orderMoves(byNumber("NL-1065"), owner)).toMatchObject({ packed: true, cancel: true, markPaid: false });
    expect(orderMoves(byNumber("NL-1065"), packer)).toMatchObject({ packed: true, cancel: false, markPaid: false });
    expect(orderMoves(byNumber("NL-1066"), owner).cancel).toBe(false);
    expect(orderMoves(byNumber("NL-1070"), owner)).toMatchObject({ cancel: true, markPaid: true });
    expect(orderMoves(byNumber("NL-1070"), packer)).toMatchObject({ cancel: false, markPaid: false });
    expect(orderMoves(byNumber("NL-1005"), owner).cancel).toBe(false);
    expect(orderMoves(byNumber("NL-1059"), packer).shipped).toBe(true);
  });

  it("finds orders, customers and SKUs from two characters", () => {
    expect(search(data, "h").orders).toEqual([]);
    expect(numbers(search(data, "hale").orders)).toEqual(["NL-1065"]);
    expect(search(data, "priya").customers.map((c) => c["name"])).toEqual(["Priya Raman"]);
    expect(search(data, "bsh-emb").variants.map((v) => v["sku"])).toEqual(["NL-BSH-EMB-S", "NL-BSH-EMB-M", "NL-BSH-EMB-L", "NL-BSH-EMB-XL"]);
  });
});

describe("the variants grid", () => {
  it("has a row for each colour and size, with the hole not made, and names a new variant's SKU from its siblings'", () => {
    const shell = data.products[0]!;
    const rows = grid(data, shell);
    expect(rows.length).toBe(10);
    const holes = rows.filter((r) => r.variant === null);
    expect(holes.map((r) => [r.colour?.["label"], r.size?.["label"]])).toEqual([["Ember", "XS"]]);
    expect(skuFor(data, shell, holes[0]!.colour, holes[0]!.size)).toBe("NL-BSH-EMB-XS");
  });
});

describe("how the desk writes a day and money", () => {
  it("writes the shop's day with its weekday, and money to the cent", () => {
    const fmt = makeFmt("en-US", "America/Los_Angeles", "USD");
    expect(fmt.day("2026-08-18")).toBe("Tue 18 Aug");
    expect(fmt.dayTime("2026-08-18T17:06:00.000Z")).toBe("Tue 18 Aug 10:06");
    expect(fmt.money("216.25")).toBe("$216.25");
    expect(fmt.money(null)).toBe("");
    expect(fmt.pct("6.500")).toBe("6.5%");
  });
});

describe("the desk's words", () => {
  it("names every section in every language", () => {
    for (const locale of LOCALE_TAGS) for (const entry of DESK_NAV) expect(MESSAGES[locale][entry.labelKey], `${locale} ${entry.labelKey}`).toBeTruthy();
  });

  it("translates the desk's words in every language, keeping each one's placeholders", () => {
    const en = MESSAGES["en-US"];
    const keys = Object.keys(en).filter((k) => k.startsWith("desk."));
    for (const locale of LOCALE_TAGS.filter((l) => l !== "en-US")) {
      const bundle = MESSAGES[locale];
      const copied = keys.filter((k) => bundle[k] === en[k] && /[a-z]{5,} [a-z]{3,}/i.test(en[k]!));
      expect(copied, `${locale} English copies`).toEqual([]);
      for (const k of keys) {
        const want = new Set(en[k]!.match(/\{\w+\}/g) ?? []);
        const got = new Set(bundle[k]!.match(/\{\w+\}/g) ?? []);
        for (const p of got) expect(want.has(p), `${locale} ${k} ${p}`).toBe(true);
      }
    }
  });
});
