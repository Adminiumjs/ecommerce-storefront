import { describe, expect, it } from "vitest";

import type { OptionValue } from "./port.ts";
import { sizeOrder } from "./screens/Shop.tsx";

const size = (label: string, position = 0): OptionValue => ({ id: label, productId: 1, kind: "size", code: label.toLowerCase(), label, hex: null, position });

describe("the shop's size chips", () => {
  it("read letters small to large, then numbers low to high, then the rest as placed", () => {
    const sizes = ["S/M", "XS", "S", "30", "7", "Regular", "M/L", "M", "32", "L/XL", "8", "Long", "L", "34", "9", "XL", "36", "10", "11", "12"].map((l, i) => size(l, i));
    expect(sizeOrder(sizes).map((s) => s.label)).toEqual(["XS", "S", "S/M", "M", "M/L", "L", "L/XL", "XL", "7", "8", "9", "10", "11", "12", "30", "32", "34", "36", "Regular", "Long"]);
  });
});
