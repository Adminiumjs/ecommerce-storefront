// @vitest-environment jsdom
/**
 * THE CHECKOUT, ITS PAYING STATES AND THE CONFIRMATION, FROM THE SAMPLE WORLD.
 *
 * The whole shop side is mounted against the stand-in for Adminium
 * (`testing.ts`) with Priya's basket (the Basalt shell in Ember M and the
 * moss beanie) and walked as she walks it: contact, delivery to a state, the
 * services priced by their own dry runs, Pay. Then the refusals a save can
 * meet, the retry key, payments off, and the way back from the pay page
 * (`PayReturn`, which the order's page shows), every state of it.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { heldCheckout, resetCheckout, useCheckout } from "./checkout.ts";
import { dayRange } from "./format.ts";
import { keepHeld, keptHeld, setLeave, setOrderReader, type Held } from "./pay.ts";
import { ShopError, type Placed, type Refused } from "./port.ts";
import ShopApp from "./ShopApp.tsx";
import { PayReturn } from "./screens/Checkout.tsx";
import { addToBasket, go, loadShop, resetShop, useCard, useCode, useShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let port: FakePort;
let root: Root | null = null;
let host: HTMLDivElement | null = null;
let left: string[] = [];

async function settle(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
  }
}

async function mount(locale = "en-US"): Promise<void> {
  localStorage.setItem("northline-locale", locale);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <I18nProvider>
        <ShopApp />
      </I18nProvider>,
    );
  });
  await settle();
}

function unmount(): void {
  act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
}

const text = () => document.body.textContent ?? "";
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const byText = (tag: string, words: string | RegExp) => [...document.querySelectorAll<HTMLElement>(tag)].find((el) => (typeof words === "string" ? el.textContent?.trim() === words : words.test(el.textContent ?? ""))) ?? null;
const click = async (el: Element | null, times = 6) => {
  expect(el).not.toBeNull();
  await act(async () => {
    (el as HTMLElement).click();
  });
  await settle(times);
};
const visit = async (place: Parameters<typeof go>[0]) => {
  await act(async () => go(place));
  await settle();
};

async function type(selector: string, value: string): Promise<void> {
  const el = $<HTMLInputElement | HTMLSelectElement>(selector);
  if (el === null) throw new Error(`nothing to type into: ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
  await settle(2);
}

const regionId = (code: string) => String(port.world.regions.find((r) => r.code === code)!.id);
const variant = (sku: string) => port.world.variants.find((v) => v.sku === sku)!;
const product = (slug: string) => port.world.products.find((p) => p.slug === slug)!;

/** Priya's basket: the Basalt shell in Ember M and the moss beanie, $217.00 of goods. */
async function priyasBasket(shellQty = 1): Promise<void> {
  await act(async () => {
    addToBasket(product("basalt-shell"), variant("NL-BSH-EMB-M"), shellQty, "shirt");
    addToBasket(product("wool-beanie"), variant("NL-BEA-MOS"), 1, "shirt");
  });
  await settle();
}

const next = () => click(byText("button", "Continue"));
const pay = () => click($(".nl-co-pay"));

async function toDelivery(email = "priya.r@example.com"): Promise<void> {
  await visit({ view: "checkout" });
  await type("#co-email", email);
  await next();
}

async function address(state = "OR"): Promise<void> {
  await type("#co-ship-name", "Priya Raman");
  await type("#co-line1", "3410 Fir Ave");
  await type("#co-city", "Portland");
  await type("#co-zip", "97214");
  await type("#co-region", regionId(state));
  await settle();
}

async function toPay(state = "OR"): Promise<void> {
  await toDelivery();
  await address(state);
  await next();
}

const places = () => port.calls.filter((c) => c.call === "place");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.history.replaceState(null, "", "/");
  sessionStorage.clear();
  port = fakePort();
  resetShop(port);
  resetCheckout();
  left = [];
  setLeave((url) => left.push(url));
  setOrderReader(null);
});

afterEach(() => {
  unmount();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
  setLeave(null);
  setOrderReader(null);
});

describe("the checkout's steps", () => {
  it("asks for an e-mail it can use, with the message tied to the field", async () => {
    await mount();
    await priyasBasket();
    await visit({ view: "checkout" });
    expect($("h1")?.textContent).toBe("Checkout");
    expect([...document.querySelectorAll(".nl-co-step")].map((b) => b.textContent)).toEqual(["1Contact", "2Delivery", "3Pay"]);
    expect($<HTMLInputElement>('.nl-co-news input[type="checkbox"]')?.checked).toBe(false);
    expect(text()).toContain("Send me Northline news now and then");
    expect(text()).toContain("You can say no at any time — every news e-mail has a link.");
    await type("#co-email", "priya");
    await next();
    expect(text()).toContain("Enter an e-mail address, like name@example.com.");
    expect($("#co-email")?.getAttribute("aria-describedby")).toBe("co-email-err");
    expect(document.activeElement?.id).toBe("co-email");
    await type("#co-email", "priya.r@example.com");
    await next();
    expect($(".nl-co-step[aria-current='step']")?.textContent).toBe("2Delivery");
    expect($(".nl-co-step")?.textContent).toContain("✓");
    expect(text()).toContain("We ship to the 50 states and DC.");
  });

  it("opens the sign-in sheet from 'Sign in for a faster checkout'", async () => {
    await mount();
    await priyasBasket();
    await visit({ view: "checkout" });
    await click(byText("button", "Sign in for a faster checkout"));
    expect(useShop.getState().signInSheet).toBe(true);
  });

  it("prices each service Oregon is offered by its own dry run: tax $0.00, total $217.00", async () => {
    await mount();
    await priyasBasket();
    await toDelivery();
    await address("OR");
    const speeds = [...document.querySelectorAll(".nl-co-speed")].map((s) => [s.querySelector(".nl-co-speed-name")?.textContent, s.querySelector(".nl-co-speed-price")?.textContent]);
    expect(speeds).toEqual([
      ["Standard", "Free"],
      ["Express", "$18.00"],
      ["Overnight", "$35.00"],
    ]);
    expect(text()).toContain(`Arrives ${dayRange("2026-08-21", "2026-08-25", "en-US")} if you pay now`);
    const quotes = port.calls.filter((c) => c.call === "quote" && c.body.values["region_id"] === Number(regionId("OR")));
    expect(new Set(quotes.map((q) => q.body.values["offer_id"])).size).toBe(3);
    const summary = $(".nl-co-summary")!.textContent ?? "";
    expect(summary).toContain("Tax$0.00");
    expect(summary).toContain("Total$217.00");
  });

  it("taxes Washington: $14.11, total $231.11", async () => {
    await mount();
    await priyasBasket();
    await toDelivery();
    await address("WA");
    const summary = $(".nl-co-summary")!.textContent ?? "";
    expect(summary).toContain("Tax$14.11");
    expect(summary).toContain("Total$231.11");
  });

  it("offers Alaska Standard $16.00 and Express $34.00, no Overnight; an Overnight chosen falls back to Standard", async () => {
    await mount();
    await priyasBasket();
    await toDelivery();
    await address("OR");
    await click(byText(".nl-co-speed", /Overnight/)!.querySelector("input"));
    await type("#co-region", regionId("AK"));
    const speeds = [...document.querySelectorAll(".nl-co-speed")].map((s) => [s.querySelector(".nl-co-speed-name")?.textContent, s.querySelector(".nl-co-speed-price")?.textContent]);
    expect(speeds).toEqual([
      ["Standard", "$16.00"],
      ["Express", "$34.00"],
    ]);
    expect($<HTMLInputElement>(".nl-co-speed--on input")?.closest("label")?.textContent).toContain("Standard");
    expect($(".nl-co-summary")?.textContent).toContain("Total$233.00");
  });

  it("checks the address before the next step, each message tied to its field", async () => {
    await mount();
    await priyasBasket();
    await toDelivery();
    await type("#co-zip", "972");
    await next();
    expect(text()).toContain("Enter your full name.");
    expect(text()).toContain("Enter the street and number.");
    expect(text()).toContain("Choose a state.");
    expect(text()).toContain("Enter a 5-digit ZIP code.");
    expect($("#co-zip")?.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement?.id).toBe("co-ship-name");
  });

  it("reviews the order and pays at the dry run's total: the values sent, the basket emptied, off to the pay page", async () => {
    await mount();
    await priyasBasket();
    await toPay("OR");
    const review = $(".nl-co-review")!.textContent ?? "";
    expect(review).toContain("priya.r@example.com");
    expect(review).toContain("Priya Raman, 3410 Fir Ave, Portland, OR 97214");
    expect(review).toContain("Standard · Arrives");
    expect($(".nl-co-pay")?.textContent).toBe("Pay $217.00 now");
    expect($(".nl-co-pay .nl-mono")?.textContent).toBe("$217.00");
    expect(text()).toContain("You’ll pay on the Stripe or PayPal page.");
    await pay();
    const sent = places()[0]!;
    expect(sent.kind).toBe("goods");
    expect(sent.pay).toBe("online");
    expect(sent.expect).toBe("217.00");
    expect(sent.body.values).toEqual({ language: "en-US", name: "Priya Raman", email: "priya.r@example.com", ship_name: "Priya Raman", address_line1: "3410 Fir Ave", city: "Portland", zip: "97214", region_id: Number(regionId("OR")), offer_id: sent.body.values["offer_id"], news: false });
    expect(sent.body.children.order_lines).toHaveLength(2);
    expect(useShop.getState().basket).toEqual([]);
    expect(left).toEqual(["https://pay.example/1067"]);
    expect(text()).toContain("Taking you to the secure payment page…");
    expect(text()).toContain("NL-1067");
    expect(text()).toContain("We’re holding your items until 12:10");
    expect(keptHeld()?.order["number"]).toBe("NL-1067");
    expect(heldCheckout()).toBe(true);
  });

  it("shows 'Checking…' with a spinner inside the Pay button while the save runs", async () => {
    await mount();
    await priyasBasket();
    await toPay("OR");
    const release = port.hold();
    await act(async () => $(".nl-co-pay")!.click());
    expect($(".nl-co-pay")?.getAttribute("aria-busy")).toBe("true");
    expect($(".nl-co-pay")?.textContent).toBe("Checking…");
    expect($(".nl-co-pay .nl-spin")).not.toBeNull();
    await act(async () => release());
    await settle();
    expect(places()).toHaveLength(1);
  });
});

describe("the refusals", () => {
  it("prices changed: each moved line Was / Now, the totals of a new dry run, and Order at the new total", async () => {
    await mount();
    await priyasBasket();
    await toPay("OR");
    port.raise("NL-BSH-EMB-M", "10.00");
    await pay();
    const dialog = $('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain("Prices changed since you added these. Here’s the total now.");
    expect(dialog.textContent).toContain("Basalt Rain Shell");
    expect(dialog.querySelector(".nl-co-was")?.textContent).toBe("$189.00");
    expect(dialog.querySelector(".nl-co-ref-now")?.textContent).toBe("Now $199.00");
    expect(dialog.textContent).toContain("Total$227.00");
    expect(dialog.textContent).toContain("Nothing is ordered until you press again.");
    expect(places()).toHaveLength(1);
    await click(byText("button", "Order at $227.00"));
    expect(places()).toHaveLength(2);
    expect(places()[1]!.expect).toBe("227.00");
    expect(left).toHaveLength(1);
  });

  it("sold out while checking out: the line marked, Order held until it is removed, then Adminium's total for what is left", async () => {
    await mount();
    await priyasBasket();
    await toPay("OR");
    port.setLeft("NL-BSH-EMB-M", 0);
    await pay();
    const dialog = () => $('[role="alertdialog"]')!;
    expect(dialog().textContent).toContain("Some things sold while you were checking out.");
    expect(dialog().textContent).toContain("Sold out now");
    expect(byText("button", /Change it/)).toBeNull();
    const order = () => dialog().querySelector<HTMLButtonElement>(".nl-co-ref-order")!;
    expect(order().disabled).toBe(true);
    expect(order().textContent).toBe("Place the order");
    await click(dialog().querySelector('[aria-label="Remove it · Basalt Rain Shell"]'));
    expect(order().disabled).toBe(false);
    expect(order().textContent).toMatch(/^Order at \$\d+\.\d\d$/);
    await click(order());
    expect(places()).toHaveLength(2);
    expect(places()[1]!.body.children.order_lines).toHaveLength(1);
  });

  it("fewer left than asked: 'Only 1 left now', Change it, then the order goes", async () => {
    await mount();
    await priyasBasket(2);
    await toPay("OR");
    port.setLeft("NL-BSH-EMB-M", 1);
    await pay();
    const dialog = $('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain("Only 1 left now");
    expect(dialog.querySelector<HTMLButtonElement>(".nl-co-ref-order")?.disabled).toBe(true);
    await click(dialog.querySelector('[aria-label="Change it · Basalt Rain Shell"]'));
    expect(useShop.getState().basket.find((l) => l.sku === "NL-BSH-EMB-M")?.qty).toBe(1);
    const order = $<HTMLButtonElement>(".nl-co-ref-order")!;
    expect(order.disabled).toBe(false);
    expect(order.textContent).toBe("Order at $217.00");
  });

  it("not enough left where the shop shows no number: 'Not enough left — try fewer'", async () => {
    await mount();
    await priyasBasket(2);
    await toPay("OR");
    port.setLeft("NL-BSH-EMB-M", 1);
    const quote = port.quote;
    port.quote = async (...args) => {
      const q = await quote(...args);
      return { ...q, postings: q.postings.map(({ left: _left, ...p }) => p) };
    };
    const stock = port.stock;
    port.stock = async (ids) => Object.fromEntries(Object.entries(await stock(ids)).map(([k, w]) => [k, w.state === "low" ? { state: "in" as const, left: null } : w]));
    await pay();
    expect($('[role="alertdialog"]')?.textContent).toContain("Not enough left — try fewer");
  });

  it("a code that no longer applies: the total without it, then the order goes without it", async () => {
    await mount();
    await act(async () => addToBasket(product("cascade-45"), variant("NL-CAS45-SLA-SM"), 1, "backpack"));
    await settle();
    await act(async () => useCode("TRAIL15"));
    await settle();
    await toPay("OR");
    expect($(".nl-co-pay")?.textContent).toBe("Pay $186.15 now");
    port.refuseNext({ code: "PUBLIC_WRITE_REFUSED", child: "order_codes", index: 0, column: "typed", reason: "ended" });
    await pay();
    const dialog = $('[role="alertdialog"]')!;
    expect(dialog.querySelector("h2")?.textContent).toBe("TRAIL15 no longer applies — the total is now $219.00");
    expect(dialog.textContent).toContain("This code can't be used");
    await click(byText("button", "Order at $219.00"));
    expect(places().at(-1)!.body.children.order_codes).toBeUndefined();
    expect(places().at(-1)!.expect).toBe("219.00");
  });

  it("too many tries: said in the dialog; Escape closes it and focus returns to the Pay button", async () => {
    await mount();
    await priyasBasket();
    await toPay("OR");
    port.refuseNext({ code: "PUBLIC_RATE_LIMITED", status: 429 });
    $(".nl-co-pay")!.focus();
    await pay();
    expect($('[role="alertdialog"]')?.textContent).toContain("Too many tries just now. Try again in a minute.");
    expect(document.activeElement?.textContent).toBe("Go back");
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await settle(1);
    expect($('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe($(".nl-co-pay"));
  });
});

describe("the retry key", () => {
  it("is kept for a retry of the same order, and new once the service or the basket changes", async () => {
    await mount();
    await priyasBasket();
    await toPay("OR");
    port.refuseNext({ code: "PUBLIC_RATE_LIMITED", status: 429 });
    await pay();
    await click(byText("button", "Go back"));
    port.refuseNext({ code: "PUBLIC_RATE_LIMITED", status: 429 });
    await pay();
    await click(byText("button", "Go back"));
    const [a, b] = places().map((c) => c.clientKey);
    expect(a).toBe(b);
    await click($('[aria-label="Change: Speed"]'));
    await click(byText(".nl-co-speed", /Express/)!.querySelector("input"));
    await next();
    port.refuseNext({ code: "PUBLIC_RATE_LIMITED", status: 429 });
    await pay();
    await click(byText("button", "Go back"));
    const c = places()[2]!.clientKey;
    expect(c).not.toBe(b);
    await act(async () => useCode("TRAIL15"));
    await settle();
    port.refuseNext({ code: "PUBLIC_RATE_LIMITED", status: 429 });
    await pay();
    expect(places()[3]!.clientKey).not.toBe(c);
  });

  it("asks again twice when Adminium says the slot is busy, with the same key", async () => {
    await mount();
    await priyasBasket();
    await toPay("OR");
    const place = port.place;
    let tries = 0;
    const busy: Refused = { code: "PUBLIC_SLOT_BUSY", status: 409, column: null, child: null, index: null, reason: null, changed: null, retryAfter: null, params: {} };
    port.place = (...args): Promise<Placed> => {
      tries += 1;
      return tries <= 2 ? Promise.reject(new ShopError(busy, "busy")) : place(...args);
    };
    await pay();
    expect(tries).toBe(3);
    expect(left).toEqual(["https://pay.example/1067"]);
  });
});

describe("payments off, and the shop closed", () => {
  it("a guest is asked to sign in to pay by bank transfer", async () => {
    port.offer = { online: false, test: false };
    await mount();
    await priyasBasket();
    await visit({ view: "checkout" });
    expect(text()).toContain("Sign in to pay by bank transfer");
    expect($("#co-email")).toBeNull();
    expect(byText("button", "Continue")).toBeNull();
  });

  it("signed in: her address filled in, no news tick, 'Place the order — pay by bank transfer', then the transfer details", async () => {
    port.offer = { online: false, test: false };
    port.signedIn = true;
    await mount();
    await act(async () => useShop.setState({ customer: { name: "Priya Raman", email: "priya.r@example.com", news: true, address: { shipName: "Priya Raman", line1: "3410 Fir Ave", line2: "", city: "Portland", zip: "97214", regionId: Number(regionId("OR")) } } }));
    await priyasBasket();
    await visit({ view: "checkout" });
    expect(text()).toContain("Priya Raman · priya.r@example.com");
    expect($(".nl-co-news")).toBeNull();
    await next();
    expect($<HTMLInputElement>("#co-line1")?.value).toBe("3410 Fir Ave");
    expect($<HTMLSelectElement>("#co-region")?.value).toBe(regionId("OR"));
    await next();
    expect($(".nl-co-pay")?.textContent).toBe("Place the order — pay by bank transfer");
    expect(text()).toContain("The next page shows the shop’s bank details.");
    await pay();
    expect(places()[0]!.pay).toBe("transfer");
    expect(places()[0]!.body.values["news"]).toBeUndefined();
    expect($("h1")?.textContent).toBe("Thank you, Priya — NL-1067");
    expect(text()).toContain("To pay: $217.00 by bank transfer");
    expect(text()).toContain("Pay by bank transfer");
    expect($(".nl-co-note .nl-mono")?.textContent).toBe("1067");
    expect(text()).toContain("Pay by Tue 25 Aug or the order is cancelled. We’ll hold your items until then.");
    expect(text()).not.toContain("Ships");
    expect(left).toEqual([]);
  });

  it("no way to pay: 'We can't take orders right now'", async () => {
    port.offer = { online: false, test: false };
    port.world.base.settings.transferOn = false;
    await mount();
    await priyasBasket();
    await visit({ view: "checkout" });
    expect(text()).toContain("We can't take orders right now");
    expect($(".nl-co-pay")).toBeNull();
  });

  it("a ledger Adminium cannot reach: 'We can't take orders right now'", async () => {
    const quote = port.quote;
    port.quote = async (...args) => ({ ...(await quote(...args)), postings: [{ ledger: "stock", state: "unavailable" }] });
    await mount();
    await priyasBasket();
    await visit({ view: "checkout" });
    expect(text()).toContain("We can't take orders right now");
  });
});

describe("gift cards", () => {
  it("a gift card paying all of it: straight to the confirmation, paid", async () => {
    await mount();
    await act(async () => addToBasket(product("wool-beanie"), variant("NL-BEA-MOS"), 1, "shirt"));
    await settle();
    await act(async () => void useCard("H8WD3RTM7Q2K"));
    await settle();
    await toPay("OR");
    expect($(".nl-co-pay")?.textContent).toBe("Place the order");
    expect(text()).toContain("Your gift card pays all of it.");
    await pay();
    expect(left).toEqual([]);
    expect($("h1")?.textContent).toBe("Thank you, Priya — NL-1067");
    expect(text()).toMatch(/Paid \$\d+\.\d\d/);
    expect(text()).toContain("Ships today, Tue 18 Aug");
    expect(text()).toContain("Gift card · 7Q2K");
  });

  it("gift cards alone: no delivery step, the shopper's name and e-mail only", async () => {
    await mount();
    await act(async () => (await import("./store.ts")).addGift({ amountId: 1, amount: "25.00", toName: "Sam", toEmail: "sam@example.com", message: "" }));
    await settle();
    await visit({ view: "checkout" });
    expect([...document.querySelectorAll(".nl-co-step")].map((b) => b.textContent)).toEqual(["1Contact", "2Pay"]);
    await type("#co-name", "Priya Raman");
    await type("#co-email", "priya.r@example.com");
    await next();
    await pay();
    expect(places()[0]!.kind).toBe("gift");
    expect(places()[0]!.body.values).toEqual({ language: "en-US", name: "Priya Raman", email: "priya.r@example.com", news: false });
  });
});

describe("back from the pay page", () => {
  /** Priya pays online, leaves for the pay page, and comes back to a fresh page. */
  async function paidAndBack(state: FakePort["payState"]): Promise<void> {
    await mount();
    await priyasBasket();
    await toPay("OR");
    await pay();
    unmount();
    resetCheckout();
    resetShop(port);
    port.payState = state;
    window.history.replaceState(null, "", "/o");
    await act(async () => loadShop());
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(
        <I18nProvider>
          <PayReturn />
        </I18nProvider>,
      );
    });
    await settle(2);
  }

  it("checks the payment, then thanks her: paid, ships today, arrives", async () => {
    await paidAndBack("open");
    expect(heldCheckout()).toBe(true);
    expect($("h1")?.textContent).toBe("Checking your payment…");
    port.payState = "paid";
    await settle(8);
    expect($("h1")?.textContent).toBe("Thank you, Priya — NL-1067");
    expect(text()).toContain("We’ve e-mailed you a link to follow your order.");
    expect(text()).toContain("Paid $217.00");
    expect(text()).toContain("Ships today, Tue 18 Aug");
    expect(text()).toContain(`Arrives ${dayRange("2026-08-21", "2026-08-25", "en-US")}`);
    expect(text()).toContain("Basalt Rain Shell");
    expect(text()).toContain("Total$217.00");
    expect(byText("a", "See your order")?.getAttribute("href")).toBe("/o#LINK1067CODE00000000");
    expect(keptHeld()).toBeNull();
  });

  it("says 'Ships Wed 19 Aug' when the ships-by is not today", async () => {
    setOrderReader(async () => ({ status: "paid", ships_by: "2026-08-19", paid: "217.00" }));
    await paidAndBack("paid");
    expect(text()).toContain("Ships Wed 19 Aug");
  });

  it("the bank confirming it: don't pay again", async () => {
    await paidAndBack("confirming");
    await settle(4);
    expect($("h1")?.textContent).toBe("Your bank is confirming the payment");
    expect(text()).toContain("Please don’t pay again. We’ll e-mail you when it’s done.");
    expect(byText("a", "See your order")).not.toBeNull();
  });

  it("did not finish: nothing taken, the items held until the order's pay-by, Pay now again on the same order", async () => {
    await paidAndBack("failed");
    await settle(4);
    expect($("h1")?.textContent).toBe("The payment didn’t finish. Nothing was taken.");
    expect(text()).toContain("We’re holding your items until 12:10");
    left = [];
    await click(byText("button", "Pay $217.00 now"));
    expect(port.starts).toEqual([{ via: "link", orderId: 1067 }]);
    expect(left).toEqual(["https://pay.example/1067"]);
  });

  it("a pay link Adminium will not give: 'We can't take the payment right now.'", async () => {
    await paidAndBack("failed");
    await settle(4);
    port.payments = () => ({ available: async () => ({ online: true, test: false }), state: async () => "failed", start: async () => Promise.reject(new Error("no")) });
    await click(byText("button", "Pay $217.00 now"));
    expect($("h1")?.textContent).toBe("We can't take the payment right now.");
  });

  it("not paid in time: cancelled, nothing taken", async () => {
    await paidAndBack("expired");
    await settle(4);
    expect($("h1")?.textContent).toBe("This order was cancelled because it wasn’t paid within 30 minutes. Nothing was taken.");
    expect(byText("a", "Back to the shop")).not.toBeNull();
  });

  it("paid after it was cancelled: a refund on its way", async () => {
    setOrderReader(async () => ({ status: "cancelled", cancel_reason: "unpaid" }));
    await paidAndBack("paid");
    await settle(4);
    expect($("h1")?.textContent).toBe("We took your payment after this order was cancelled. We'll refund it.");
  });

  it("says the gift card is held while a card pays part of it", async () => {
    const held: Held = {
      order: { id: 1067, number: "NL-1067", status: "paying", total: "217.00", due: "167.00", pay_by: "2026-08-18T19:10:00.000Z" },
      lines: [],
      gifts: [],
      applied: [],
      payment: { amount: "50.00", due: "167.00" },
      name: "Priya Raman",
      service: "Standard",
      online: true,
      token: "LINK",
      card: "7Q2K",
    };
    keepHeld(held);
    port.payState = "failed";
    await act(async () => loadShop());
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(
        <I18nProvider>
          <PayReturn />
        </I18nProvider>,
      );
    });
    await settle(4);
    expect(text()).toContain("Your gift card is held for this order.");
    expect(byText("button", "Pay $167.00 now")).not.toBeNull();
    expect(useCheckout.getState().back).toBe("failed");
  });

  it("is not the order page's when its address carries a link code", async () => {
    keepHeld({ order: { id: 1 }, lines: [], gifts: [], applied: [], payment: null, name: "", service: null, online: true, token: null, card: null });
    window.history.replaceState(null, "", "/o#ABC");
    expect(heldCheckout()).toBe(false);
    window.history.replaceState(null, "", "/o");
    expect(heldCheckout()).toBe(true);
  });
});
