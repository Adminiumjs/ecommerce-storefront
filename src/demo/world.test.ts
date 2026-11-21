/**
 * The demo's Northline is the sample's: every order's figures as the
 * sample's `figures.md` prints them, worked out by the demo's own rules from
 * the rows the sample adds; Inventory's words as the sample says them; and
 * a clock that moves the data (BN-14): "+1 business day" steps over the
 * weekend and Labor Day, and the clock's own moves run as it does.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import WORLD from "../sample/northline-data.json";
import { cents, closuresIn, nextBusinessDay } from "./rules.ts";
import { DemoWorld } from "./world.ts";

const FIGURES = readFileSync(new URL("../sample/figures.md", import.meta.url), "utf8");

/** A row of one of `figures.md`'s tables, by its first cell. */
const figureRow = (first: string): string[] => {
  const line = FIGURES.split("\n").find((l) => l.startsWith(`| ${first} |`));
  if (line === undefined) throw new Error(`figures.md has no row ${first}`);
  return line.split("|").slice(1, -1).map((c) => c.trim());
};

describe("the demo's Northline", () => {
  const world = new DemoWorld();

  it("stands on Tuesday 18 August 2026, 11:40 in Portland", () => {
    expect(figureRow("Clock")[1]).toBe("Tue 18 Aug 2026, 11:40 (America/Los_Angeles)");
    expect(world.today()).toBe("2026-08-18");
    expect(world.wallTime()).toBe("11:40");
  });

  it("holds every order at the sample's own figures", () => {
    expect(world.all("orders")).toHaveLength(66);
    for (const o of WORLD.ORDERS) {
      const row = world.orderByNumber(o.number)!;
      expect({ n: o.number, goods: row["goods"], discount: cents(row["discount"]), shipping: row["shipping"], tax: row["tax"], total: row["total"] }).toEqual({ n: o.number, goods: o.goods, discount: cents(o.discount), shipping: o.shipping, tax: o.tax, total: o.total });
    }
    // The orders figures.md prints, total by total.
    for (const number of ["NL-1059", "NL-1062", "NL-1063", "NL-1065", "NL-1066"]) expect(world.orderByNumber(number)!["total"]).toBe(figureRow(number)[11]);
    expect(world.nextNumber().number).toBe("NL-1067");
  });

  it("gives every order a link code of its own", () => {
    const tokens = world.all("orders").map((o) => String(o["link_token"]));
    expect(new Set(tokens).size).toBe(tokens.length);
    expect(tokens.every((t) => /^[A-Z2-9]{16}$/.test(t))).toBe(true);
  });

  it("says Inventory's words as the sample does: six low, four out", () => {
    const points = world.all("inventory.stock_points");
    expect(points.filter((p) => p["state"] === "low")).toHaveLength(6);
    expect(points.filter((p) => p["state"] === "out")).toHaveLength(4);
    const emberM = world.all("variants").find((v) => v["sku"] === "NL-BSH-EMB-M")!;
    expect(world.available(emberM.id)).toBe(Number(figureRow("NL-BSH-EMB-M")[3]));
  });

  it("gives each return the refund the sample prints", () => {
    for (const r of WORLD.RETURNS) expect(world.all("returns").find((x) => x["number"] === r.number)?.["refund_amount"]).toBe(r.amount);
  });

  it("steps a business day over the weekend and over Labor Day: Fri 4 Sep → Tue 8 Sep (N4-F4)", () => {
    const closures = closuresIn(world.tables);
    expect(closures).toEqual([{ from: "2026-09-07", to: "2026-09-07" }]);
    const days: string[] = [];
    let day = "2026-08-18";
    for (let i = 0; i < 16; i += 1) days.push((day = nextBusinessDay(day, closures)));
    expect(days).toEqual(["2026-08-19", "2026-08-20", "2026-08-21", "2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-08", "2026-09-09", "2026-09-10"]);
  });

  it("moves the data with the clock: Priya's NL-1066 cancelled unpaid, its stock let go, the time of day kept", () => {
    const moved = new DemoWorld();
    const emberM = moved.all("variants").find((v) => v["sku"] === "NL-BSH-EMB-M")!;
    expect(moved.orderByNumber("NL-1066")!["status"]).toBe("paying");
    moved.advanceBusinessDay();
    expect(moved.today()).toBe("2026-08-19");
    expect(moved.wallTime()).toBe("11:40");
    expect(moved.orderByNumber("NL-1066")).toMatchObject({ status: "cancelled", cancel_reason: "unpaid" });
    expect(moved.available(emberM.id)).toBe(4);
    expect(moved.all("messages").map((m) => m["kind"])).toContain("order-cancelled-unpaid");
  });
});
