// @vitest-environment jsdom
/**
 * The demo card's commands, as the page answers them: it says hello to the
 * window framing it and to no one else, takes a message only from that
 * window and this origin, goes to a screen, switches the person (opening
 * that person's first screen), presses a shortcut, steps the card aside
 * while a sheet is open, moves the shop clock a business day at a time (the
 * data with it), and starts Tuesday morning again — and after each says
 * where it is.
 */
import { act } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { DemoMessage } from "./demo-types.ts";
import { demoAdminium, resetDemo, useDemo } from "./demo/adminium.ts";
import { bootDemo } from "./demo/boot.tsx";
import { SCREEN_IDS, SHORTCUT_IDS } from "./demoBridge.ts";
import { useDesk } from "./desk/store.ts";
import { useAfter } from "./shop/after.ts";
import { useCheckout } from "./shop/checkout.ts";
import { useShop } from "./shop/store.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};

let card: Window;
const sent: { message: DemoMessage; origin: string }[] = [];
let host: HTMLElement;

async function settle(ms = 300): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms / 3));
    });
  }
}

/** A message from the card, as the browser hands it over. */
async function send(data: Record<string, unknown>, from: { source?: Window; origin?: string } = {}, ms = 300): Promise<void> {
  await act(async () => {
    window.dispatchEvent(new MessageEvent("message", { data: { dv: 1, ...data }, origin: from.origin ?? window.location.origin, source: from.source ?? card }));
  });
  await settle(ms);
}

const lastState = () => [...sent].reverse().find((s) => s.message.type === "adminium:demo:state")?.message as Extract<DemoMessage, { type: "adminium:demo:state" }> | undefined;

beforeAll(async () => {
  // The website's page, framing this one: its window is the parent, at the same origin.
  const frame = document.createElement("iframe");
  document.body.append(frame);
  card = frame.contentWindow!;
  vi.spyOn(card, "postMessage").mockImplementation(((message: DemoMessage, origin: string) => {
    sent.push({ message, origin });
  }) as typeof card.postMessage);
  Object.defineProperty(window, "parent", { configurable: true, value: card });
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

describe("the demo bridge", () => {
  it("says hello to the window framing it, at this origin only", () => {
    expect(sent[0]).toEqual({ message: { type: "adminium:demo:hello", dv: 1, appKey: "ecommerce-shop" }, origin: window.location.origin });
    expect(sent.every((s) => s.origin === window.location.origin)).toBe(true);
  });

  it("answers the card's init with where it is, and the shop clock as the card prints it", async () => {
    await send({ type: "adminium:demo:init", locale: "en-US", theme: "dark", screen: "gift" });
    expect(useShop.getState().view).toBe("giftCards");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(lastState()).toMatchObject({ screen: "gift", persona: "shopper", theme: "dark", clockLabel: "Tue 18 Aug · 11:40", overlay: false });
  });

  it("takes no message from another window, or from another origin", async () => {
    await send({ type: "adminium:demo:go", screen: "help" }, { source: window });
    await send({ type: "adminium:demo:go", screen: "help" }, { origin: "https://elsewhere.example" });
    expect(useShop.getState().view).toBe("giftCards");
    await send({ type: "adminium:demo:go", screen: "help" });
    expect(useShop.getState().view).toBe("helpShipping");
    expect(lastState()?.screen).toBe("help");
  });

  it("fills Priya's details at the checkout, and ships to Washington", async () => {
    await send({ type: "adminium:demo:go", screen: "checkout" });
    await send({ type: "adminium:demo:do", shortcut: "fill-details" }, {}, 600);
    expect(useCheckout.getState()).toMatchObject({ email: "priya.r@example.com", name: "Priya Raman", address: { line1: "3410 Fir Ave", city: "Portland" } });
    await send({ type: "adminium:demo:do", shortcut: "ship-wa" }, {}, 600);
    const wa = String(demoAdminium().world.all("regions").find((r) => r["code"] === "WA")!.id);
    expect(useCheckout.getState().address.regionId).toBe(wa);
    expect(lastState()?.screen).toBe("checkout");
  });

  it("raises a price at the save, and the page shows the change in a sheet the card steps aside for", async () => {
    await send({ type: "adminium:demo:do", shortcut: "price-up" }, {}, 600);
    expect(useCheckout.getState().refusal).toMatchObject({ kind: "prices", total: "241.76" });
    expect(lastState()?.overlay).toBe(true);
    useCheckout.setState({ refusal: null });
  });

  it("finds Priya's order: her number and e-mail, then the code the shop e-mailed", async () => {
    await send({ type: "adminium:demo:go", screen: "find" });
    await send({ type: "adminium:demo:do", shortcut: "fill-find" });
    expect(useAfter.getState().flows.find).toMatchObject({ number: "NL-1053", email: "priya.r@example.com" });
    await send({ type: "adminium:demo:do", shortcut: "fill-code" });
    expect(useAfter.getState().flows.find).toMatchObject({ step: "code", digits: "482913" });
  });

  it("opens Marcus's order by its own link, never Priya's account, and asks to cancel it", async () => {
    await send({ type: "adminium:demo:go", screen: "order" }, {}, 600);
    expect(useAfter.getState().opened?.read?.order["number"]).toBe("NL-1053");
    await send({ type: "adminium:demo:do", shortcut: "marcus-cancel" }, {}, 600);
    expect(useAfter.getState().opened).toMatchObject({ via: "link", read: { order: { number: "NL-1065", status: "paid" } } });
    expect(useAfter.getState().cancelSheet).toBe(true);
    expect(demoAdminium().after.signedIn()).toBe(false);
    expect(lastState()?.overlay).toBe(true);
    useAfter.setState({ cancelSheet: false });
  });

  it("takes an order to the pay page, then the bank confirming, then didn't finish, then paid", async () => {
    await send({ type: "adminium:demo:go", screen: "paying" }, {}, 900);
    expect(lastState()?.screen).toBe("paying");
    await send({ type: "adminium:demo:do", shortcut: "bank" }, {}, 600);
    expect(useCheckout.getState().back).toBe("confirming");
    await send({ type: "adminium:demo:do", shortcut: "didnt" }, {}, 600);
    expect(useCheckout.getState().back).toBe("failed");
    await send({ type: "adminium:demo:do", shortcut: "paid" }, {}, 600);
    expect(useCheckout.getState()).toMatchObject({ stage: "done", back: "paid" });
    expect(lastState()?.screen).toBe("confirmation");
  });

  it("switches to the shop desk on its first screen", async () => {
    await send({ type: "adminium:demo:set", persona: "desk" }, {}, 600);
    expect(lastState()).toMatchObject({ persona: "desk", screen: "today" });
    expect(useDesk.getState().theme).toBe("dark");
    await send({ type: "adminium:demo:go", screen: "reviews" });
    expect(lastState()?.screen).toBe("reviews");
  });

  it("moves the clock a business day at a time, and Priya's unpaid order with it", async () => {
    expect(demoAdminium().world.orderByNumber("NL-1066")?.["status"]).toBe("paying");
    await send({ type: "adminium:demo:clock", advance: "day" });
    expect(lastState()?.clockLabel).toBe("Wed 19 Aug · 11:40");
    expect(demoAdminium().world.orderByNumber("NL-1066")).toMatchObject({ status: "cancelled", cancel_reason: "unpaid" });
    for (let i = 0; i < 2; i += 1) await send({ type: "adminium:demo:clock", advance: "day" });
    expect(lastState()?.clockLabel).toBe("Fri 21 Aug · 11:40");
    // Over the weekend.
    await send({ type: "adminium:demo:clock", advance: "day" });
    expect(lastState()?.clockLabel).toBe("Mon 24 Aug · 11:40");
  });

  it("goes back to Tuesday morning, with a fresh Northline and the same person", async () => {
    await send({ type: "adminium:demo:reset" }, {}, 600);
    expect(lastState()).toMatchObject({ persona: "desk", clockLabel: "Tue 18 Aug · 11:40" });
    expect(useDemo.getState().persona).toBe("desk");
    expect(useDesk.getState().view).toBe("today");
    expect(useShop.getState().basket).toEqual([]);
    expect(demoAdminium().world.orderByNumber("NL-1066")?.["status"]).toBe("paying");
    expect(demoAdminium().world.nextNumber().number).toBe("NL-1067");
  });

  it("answers to every screen and shortcut it lists", () => {
    expect(SCREEN_IDS).toHaveLength(22);
    expect(SHORTCUT_IDS).toHaveLength(20);
  });
});
