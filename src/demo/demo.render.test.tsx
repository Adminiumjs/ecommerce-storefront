// @vitest-environment jsdom
/**
 * THE DEMO, DRAWN: both sides boot over the one Northline in the page, with
 * no server: the shopper places an order at the total the checkout showed,
 * pays it at the demo's pay step (no card field anywhere), and the shop desk
 * has it to pack; the desk packs it and the shop's order page says so.
 */
import { act } from "react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { applyDemoMessage } from "../demoBridge.ts";
import { useDesk } from "../desk/store.ts";
import { openOrderLink, useAfter } from "../shop/after.ts";
import { placeOrder, setAddress, setContact, useCheckout, chosenQuote } from "../shop/checkout.ts";
import { goView, useShop } from "../shop/store.ts";
import { demoAdminium, resetDemo, useDemo } from "./adminium.ts";
import { bootDemo, DEMO_PAY_MS } from "./boot.tsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom draws no page to scroll; a new screen asks to start at its top.
window.scrollTo = () => {};

let host: HTMLElement;

/** Let the screens' effects, the doors' promises and the dry runs run. */
async function settle(ms = 300): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms / 4));
    });
  }
}

const say = (message: Parameters<typeof applyDemoMessage>[0]) =>
  act(async () => {
    await applyDemoMessage(message);
  });

beforeAll(async () => {
  localStorage.setItem("northline-locale", "en-US");
  resetDemo();
  host = document.createElement("div");
  document.body.append(host);
  await act(async () => {
    await bootDemo(host);
  });
  await settle();
});

afterAll(() => {
  host.remove();
});

describe("the demo, with no server", () => {
  it("opens on Northline's home, its catalogue read from the sample", async () => {
    expect(useDemo.getState().persona).toBe("shopper");
    expect(useShop.getState().loading).toBe("ok");
    await say({ type: "adminium:demo:go", dv: 1, screen: "shop" });
    await settle();
    expect(host.textContent).toContain("Basalt Rain Shell");
    expect(host.textContent).toContain("Ridgeline 28 Daypack");
  });

  it("places an order as NL-1067 at the total the checkout showed, and pays it with no card field", async () => {
    await say({ type: "adminium:demo:do", dv: 1, shortcut: "fill-basket" });
    await act(async () => {
      goView("checkout");
      setContact({ email: "priya.r@example.com", name: "Priya Raman" });
      setAddress({ shipName: "Priya Raman", line1: "3410 Fir Ave", city: "Seattle", zip: "98101", regionId: String(demoAdminium().world.all("regions").find((r) => r["code"] === "WA")!.id) });
      useCheckout.setState({ step: "pay" });
    });
    await settle();
    // Goods $217.00, Standard free from $100.00, Washington's 6.5 % on the goods: $14.105, half up.
    expect(chosenQuote()?.order["total"]).toBe("231.11");
    expect(chosenQuote()?.order["tax"]).toBe("14.11");
    expect(host.querySelector("input[autocomplete^='cc-'], input[name*='card' i]")).toBeNull();
    await act(async () => {
      await placeOrder();
    });
    expect(host.textContent).toContain("Taking you to the secure payment page…");
    await settle(DEMO_PAY_MS + 600);
    expect(useCheckout.getState().back).toBe("paid");
    expect(host.textContent).toContain("NL-1067");
    const w = demoAdminium().world;
    const order = w.orderByNumber("NL-1067")!;
    expect(order).toMatchObject({ status: "paid", total: "231.11", paid: "231.11", due: "0.00", ships_by: "2026-08-18" });
    expect(w.all("payments").filter((p) => p["order_id"] === order.id).map((p) => [p["method"], p["amount"]])).toEqual([["online", "231.11"]]);
  });

  it("has that order on the shop desk to pack, when the card switches to the shop desk", async () => {
    await say({ type: "adminium:demo:set", dv: 1, persona: "desk" });
    await settle();
    expect(useDemo.getState().persona).toBe("desk");
    expect(useDesk.getState().view).toBe("today");
    expect(host.querySelector(".nl-app")).toBeNull();
    expect(host.textContent).toContain("6 paid orders to pack");
    await say({ type: "adminium:demo:go", dv: 1, screen: "orders" });
    await settle();
    expect(host.textContent).toContain("NL-1067");
    expect(host.textContent).toContain("Priya Raman");
  });

  it("packs it on the desk, and the shop's order page shows it packed", async () => {
    const w = demoAdminium().world;
    const order = w.orderByNumber("NL-1067")!;
    await act(async () => {
      await demoAdminium().desk.moveOrder({ ...order }, "packed");
    });
    expect(w.orderByNumber("NL-1067")).toMatchObject({ status: "packed", packed_by: "Robin Ash" });
    await say({ type: "adminium:demo:set", dv: 1, persona: "shopper" });
    await settle();
    await act(async () => {
      goView("order");
      await openOrderLink(String(order["link_token"]));
    });
    await settle();
    expect(useAfter.getState().opened?.read?.order).toMatchObject({ number: "NL-1067", status: "packed" });
    expect(host.querySelector(".nl-app")).not.toBeNull();
  });

  it("runs every shortcut it offers on the desk: the parcel back, DHL's flow, the stock counted in", async () => {
    await say({ type: "adminium:demo:do", dv: 1, shortcut: "return-back" });
    await settle();
    expect(useDesk.getState().overlay).toMatchObject({ kind: "receive" });
    await say({ type: "adminium:demo:do", dv: 1, shortcut: "dhl" });
    for (let i = 0; i < 25 && host.querySelector("[data-add-on-slot='order.dispatch.actions']") === null; i += 1) await settle(200);
    expect(useDesk.getState().overlay).toMatchObject({ kind: "dispatch" });
    expect(host.querySelector("[data-add-on-slot='order.dispatch.actions']")?.textContent).toContain("Book a collection");
    await say({ type: "adminium:demo:do", dv: 1, shortcut: "count-back" });
    await settle();
    expect(useDesk.getState().view).toBe("product");
    const slateXl = demoAdminium().world.all("variants").find((v) => v["sku"] === "NL-BSH-SLA-XL")!;
    expect(demoAdminium().world.available(slateXl.id)).toBe(6);
    // Ruth asked to be told when it is back: "Tell me when it's back" tells her, once.
    const told = demoAdminium().world.all("messages").filter((m) => m["kind"] === "back-in-stock");
    expect(told.map((m) => m["to_address"])).toEqual(["ruth.e@example.com"]);
    expect(demoAdminium().world.all("restock_requests").find((r) => r["variant_id"] === slateXl.id)?.["notified_at"]).toBeTruthy();
  });
});
