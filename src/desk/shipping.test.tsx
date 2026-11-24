/**
 * @vitest-environment jsdom
 *
 * THE SHIPMENT CARD AND SHIP FROM, AS EACH ROLE. A label moves nothing until
 * staff press "Handed over"; a test label never can; a new number reaches the
 * customer only on a press the role may make.
 */
import { afterEach, describe, expect, it } from "vitest";

import type { EngineBooking, EngineCarrier } from "../add-ons/vendor/host/engine-carrier.ts";
import type { ShipFromValues, ShippingStatus } from "./door.ts";
import { FakeDoor } from "./testing/fakeDoor.ts";
import { $, button, clickEl, mount, unmount } from "./testing/mount.tsx";

afterEach(unmount);

const booking = (over: Partial<EngineBooking> = {}): EngineBooking => ({
  id: "b1",
  state: "booked",
  test: false,
  purpose: "outbound",
  parcelNumber: 1,
  carrier: "shipping-shippo",
  service: "Ground",
  tracking: "9400111",
  carrierName: "USPS",
  reason: null,
  duplicates: 0,
  createdAt: 1,
  calledAt: 1,
  checkedAt: null,
  releaseAfter: null,
  applied: true,
  label: { state: "ready", size: null, sizeGot: null, sizeDiffers: false, customsInvoice: false, customsInvoiceOwed: false },
  ...over,
});

class ShippingDoor extends FakeDoor {
  bookings: EngineBooking[] = [];
  status: ShippingStatus | null = { carriers: [{ key: "shipping-shippo", name: "Shipping labels" }], activeCarrier: "shipping-shippo", shipFrom: null, shipFromMissing: ["name"] };
  savedFrom: ShipFromValues | null = null;
  private readonly client = {
    addOnKey: "shipping-shippo",
    access: async () => ({ appUpdated: true, carrier: "shipping-shippo", activeHere: true, mode: "live", manages: false, mayBook: true, mayCancel: false, mayCustoms: false, pricesHidden: true, booking: "open" }),
    bookings: async () => ({ bookings: this.bookings, bookable: false, blockedBy: "booking" }),
  } as unknown as EngineCarrier;
  shippingClient(): EngineCarrier {
    return this.client;
  }
  async shippingStatus(): Promise<ShippingStatus> {
    if (this.status === null) throw new Error("403");
    return this.status;
  }
  async saveShipFrom(values: ShipFromValues): Promise<ShippingStatus> {
    this.savedFrom = values;
    return { ...this.status!, shipFrom: values };
  }
}

const door = (role: "owner" | "packer", bookings: EngineBooking[]) => {
  const d = new ShippingDoor(role, { addOns: ["shipping-shippo"] });
  d.bookings = bookings;
  return d;
};
const card = () => $("[aria-labelledby=od-shipment]")?.textContent ?? "";
const handOver = () => [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Handed over");

describe("the Shipment card", () => {
  it("says a bought label has told nobody, and moves the order only on Handed over", async () => {
    const d = door("packer", [booking()]);
    await mount(d, { view: "order", orderId: 59 });
    expect(card()).toContain("Label ready");
    expect(card()).toContain("The customer hasn't been told.");
    expect(d.calls.filter((c) => c.op.includes("moveOrder"))).toEqual([]);
    await clickEl(handOver()!);
    const move = d.calls.find((c) => c.op.includes("moveOrder"))!;
    expect(JSON.stringify(move.args)).toContain("shipped");
    expect(JSON.stringify(move.args)).toContain("9400111");
    expect(JSON.stringify(move.args)).toContain("USPS");
  });

  it("draws a test label as a sample, with no number and no hand-over", async () => {
    await mount(door("owner", [booking({ test: true, tracking: "SHIPPO_TRANSIT" })]), { view: "order", orderId: 59 });
    expect(card()).toContain("SAMPLE");
    expect(card()).not.toContain("SHIPPO_TRANSIT");
    expect(handOver()).toBeUndefined();
  });

  it("offers no hand-over on a purchase with no known result", async () => {
    await mount(door("owner", [booking({ state: "unknown", tracking: null })]), { view: "order", orderId: 59 });
    expect(card()).toContain("Result unknown");
    expect(handOver()).toBeUndefined();
  });

  const changed = () => booking({ tracking: "9400222", track: { status: "TRANSIT", statusAt: 1, checkedAt: 1, flag: null, newNumber: true } });

  it("lets the owner tell the customer a new number, by a press", async () => {
    const d = door("owner", [changed()]);
    await mount(d, { view: "order", orderId: 5 });
    expect(d.calls.filter((c) => c.op.includes("saveOrder"))).toEqual([]);
    await clickEl(button("New number: tell the customer")!);
    const saved = JSON.stringify(d.calls.find((c) => c.op.includes("saveOrder"))!.args);
    expect(saved).toContain("9400222");
    expect(saved).toContain("new_number_at");
  });

  it("shows the packer the new number with no button", async () => {
    await mount(door("packer", [changed()]), { view: "order", orderId: 5 });
    expect(card()).toContain("9400222");
    expect([...document.querySelectorAll("button")].some((b) => b.textContent?.includes("tell the customer"))).toBe(false);
  });
});

describe("Ship from", () => {
  it("starts from the shop's address and always saves the US", async () => {
    const d = door("owner", []);
    await mount(d, { view: "settings" });
    expect((document.getElementById("sf-city") as HTMLInputElement).value).toBe(String(d.data.settings!["city"]));
    await clickEl(button("Save Ship from")!);
    expect(d.savedFrom?.country).toBe("US");
    expect(d.savedFrom?.name).toBe(String(d.data.settings!["shop_name"]));
  });

  it("tells someone who does not manage shipping who to ask", async () => {
    const d = door("owner", []);
    d.status = null;
    await mount(d, { view: "settings" });
    expect($("[aria-labelledby=set-shipfrom]")?.textContent).toContain("Set up shipping");
    expect(document.getElementById("sf-city")).toBeNull();
  });
});
