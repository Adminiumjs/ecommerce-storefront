/**
 * The checkout's small rules on their own: the retry key's life, which lines
 * the out-of-stock refusal marks, which prices moved, and what the way back
 * from the pay page means.
 */
import { describe, expect, it } from "vitest";

import { backOf, firstName, marksOf, movedLines, retryKey } from "./pay.ts";
import type { Quote } from "./port.ts";
import type { BasketLine } from "./store.ts";

const line = (key: string, variantId: number, qty: number, added = "10.00"): BasketLine => ({ key, variantId, productId: 1, slug: "x", qty, added, name: key, label: null, sku: key, categoryIcon: null });

const quote = (patch: Partial<Quote>): Quote => ({ order: {}, lines: [], gifts: [], applied: [], postings: [], payment: null, ...patch });

describe("the retry key", () => {
  it("is kept while the order is the same, and new when anything in it changes", () => {
    let n = 0;
    const make = () => `k${(n += 1)}`;
    const first = retryKey(null, "a", make);
    expect(first.key).toBe("k1");
    expect(retryKey(first, "a", make)).toBe(first);
    expect(retryKey(first, "b", make).key).toBe("k2");
  });
});

describe("the out-of-stock marks", () => {
  const shell = line("shell", 1, 2);
  const beanie = line("beanie", 2, 1);

  it("marks a sold-out line, and a line asking more than is left", () => {
    const marks = marksOf([shell, beanie], { "1": { state: "low", left: 1 }, "2": { state: "out", left: null } }, null);
    expect(marks).toEqual([
      { key: "shell", kind: "left", left: 1 },
      { key: "beanie", kind: "out", left: null },
    ]);
  });

  it("reads the dry run's stock posting, by the line's place among those sent", () => {
    // The beanie is sold out, so it is not sent: the shell is line 0 of the order.
    const q = quote({ postings: [{ ledger: "stock", state: "refused", reason: "out-of-stock", line: 0, left: "1" }] });
    expect(marksOf([beanie, shell], { "2": { state: "out", left: null } }, q)).toEqual([
      { key: "beanie", kind: "out", left: null },
      { key: "shell", kind: "left", left: 1 },
    ]);
  });

  it("says 'try fewer' where the shop shows no number, and nothing once the line fits", () => {
    const q = quote({ postings: [{ ledger: "stock", state: "refused", reason: "out-of-stock", line: 0 }] });
    expect(marksOf([shell], {}, q)).toEqual([{ key: "shell", kind: "fewer", left: null }]);
    expect(marksOf([line("shell", 1, 1)], { "1": { state: "low", left: 1 } }, quote({}))).toEqual([]);
  });
});

describe("the moved prices", () => {
  it("compares each line's price when added with the dry run's", () => {
    const q = quote({ lines: [{ variant_id: 1, each: "199.00" }, { variant_id: 2, each: "10.00" }] });
    expect(movedLines([line("shell", 1, 1, "189.00"), line("beanie", 2, 1)], q).map((m) => [m.line.key, m.now])).toEqual([["shell", "199.00"]]);
  });
});

describe("the way back from the pay page", () => {
  it("reads the payment's state and the order's row together", () => {
    expect(backOf("paid", null)).toBe("paid");
    expect(backOf("paid", { status: "paying" })).toBeNull();
    expect(backOf("paid", { status: "paying" }, true)).toBe("paid");
    expect(backOf(null, { status: "paid" })).toBe("paid");
    expect(backOf("confirming", { status: "paying" })).toBe("confirming");
    expect(backOf("failed", { status: "paying" })).toBe("failed");
    expect(backOf("expired", null)).toBe("expired");
    expect(backOf("open", { status: "paying" })).toBeNull();
    expect(backOf("none", { status: "paying" })).toBeNull();
    expect(backOf("none", { status: "paying" }, true)).toBe("notPaid");
    expect(backOf("none", { status: "cancelled", cancel_reason: "unpaid" })).toBe("expired");
    expect(backOf("paid", { status: "cancelled", cancel_reason: "unpaid" })).toBe("paidCancelled");
  });

  it("thanks the shopper by the first word of the name they typed", () => {
    expect(firstName("  Priya Raman ")).toBe("Priya");
    expect(firstName("")).toBe("");
  });
});
