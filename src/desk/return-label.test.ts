import { describe, expect, it } from "vitest";

import { RETURN_LABEL_ADD_ON, returnLabelPayload } from "./return-label.tsx";

describe("the return label's payload", () => {
  it("names the return and its order, and comes from the real carrier only", () => {
    const payload = returnLabelPayload({ id: 7, number: "RT-7" }, { id: 42 }, Date.UTC(2026, 10, 23, 9), "UTC");
    expect(payload).toMatchObject({ entity: "return", recordId: "7", order: { table: "orders", id: "42" } });
    expect(RETURN_LABEL_ADD_ON).toBe("shipping-shippo");
  });
});
