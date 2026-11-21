// @vitest-environment jsdom
/**
 * THE PAGES AFTER AN ORDER, DRAWN FROM THE SAMPLE WORLD.
 *
 * The whole shop is mounted (header, footer, toasts, the sign-in sheet)
 * against the stand-ins for Adminium (`testing.ts` and its after-order door
 * `after-testing.ts`), and walked as a customer walks it: Priya's NL-1053
 * shipped with its tracking, her NL-1066 being paid (and its bank-transfer
 * twin), Marcus Hale's NL-1065 by its own link, cancelled; Find your order
 * and the sign-in with the code; the account; sending something back and
 * every step of a return; a review. Every figure asserted is the sample's
 * (`src/sample/figures.md`) as the door answered it.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { openFromAccount, reread, resetAfter, setLeave, useAfter } from "./after.ts";
import ShopApp from "./ShopApp.tsx";
import { openSignIn, resetShop, useShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let port: FakePort;
let root: Root | null = null;
let host: HTMLDivElement;
let left: string[] = [];

async function settle(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
  }
}

async function mount(path = "/", locale = "en-US"): Promise<void> {
  localStorage.setItem("northline-locale", locale);
  window.history.replaceState(null, "", path);
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

const text = () => (document.body.textContent ?? "").replace(/\s+/g, " ");
const main = () => (document.querySelector("main")?.textContent ?? "").replace(/\s+/g, " ");
const byText = (tag: string, words: string | RegExp) => [...document.querySelectorAll<HTMLElement>(tag)].find((el) => (typeof words === "string" ? el.textContent?.replace(/\s+/g, " ").trim() === words : words.test(el.textContent ?? ""))) ?? null;
const click = async (el: Element | null) => {
  expect(el).not.toBeNull();
  await act(async () => {
    // A press focuses what it presses, as a browser does: an overlay gives focus back to it.
    (el as HTMLElement).focus();
    (el as HTMLElement).click();
  });
  await settle();
};
const type = async (selector: string, value: string) => {
  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  expect(el, selector).not.toBeNull();
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el!.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(1);
};
const paste = async (selector: string, value: string) => {
  const el = document.querySelector<HTMLInputElement>(selector)!;
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => value } });
  await act(async () => {
    el.dispatchEvent(event);
  });
  await settle(1);
};
const press = async (key: string) => {
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
  await settle(1);
};
const submit = async (selector: string) => {
  const form = document.querySelector<HTMLFormElement>(selector);
  expect(form, selector).not.toBeNull();
  await act(async () => {
    form!.requestSubmit();
  });
  await settle();
};
const open = async (number: string) => {
  await act(async () => openFromAccount(port.afterFake.order(number)["id"] as number));
  await settle();
};
const signedInAsPriya = () => {
  port.afterFake.session = 1;
  port.signedIn = true;
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.scrollTo = () => {};
  sessionStorage.clear();
  port = fakePort();
  resetShop(port);
  resetAfter();
  left = [];
  setLeave((url) => left.push(url));
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  host?.remove();
  vi.useRealTimers();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("your order", () => {
  it("shows NL-1053 shipped: its steps, the arrival window, the tracking and what it offers", async () => {
    signedInAsPriya();
    await mount();
    await open("NL-1053");
    expect(document.querySelector("h1")?.textContent).toBe("Order NL-1053");
    expect(document.querySelector(".nl-after-number")?.className).toContain("nl-mono");
    expect(main()).toContain("Placed Fri 14 Aug · 19:07");
    expect(document.querySelector(".nl-after-head .nl-pill")?.textContent).toBe("Shipped");
    const steps = [...document.querySelectorAll(".nl-step-label")].map((s) => s.childNodes[0]?.textContent);
    expect(steps).toEqual(["Paid", "Packed", "Shipped"]);
    expect(main()).not.toContain("Delivered");
    expect(document.querySelector('[aria-current="step"] .nl-step-label')?.childNodes[0]?.textContent).toBe("Shipped");
    expect(main()).toMatch(/Arrives Thu 20( Aug)? – Mon 24 Aug/);
    expect(main()).toContain("Tracking number");
    expect(main()).toContain("JD0146083586063425");
    const track = byText("a", /Track it/)!;
    expect(track.getAttribute("target")).toBe("_blank");
    expect(track.getAttribute("rel")).toContain("noopener");
    expect(track.getAttribute("href")).toContain("JD0146083586063425");
    for (const action of ["Send something back", "Review an item", "Order again", "Receipt"]) expect(byText("button, a", action), action).not.toBeNull();
    expect(byText("button", "Cancel the order")).toBeNull();
    expect(main()).toMatch(/You can send things back until Wed 16 Sept?\./);
    expect(main()).toContain("Ridge Mid Hiking Boot");
    expect(main()).toContain("$189.00");
    expect(main()).toContain("$28.00");
    expect(main()).toContain("Free");
    expect(byText(".nl-total-row--strong", /Total/)?.textContent).toContain("$217.00");
    expect(main()).toContain("3410 Fir Ave");
    expect(main()).not.toContain("Opened from the private link");
    expect(main()).toContain("Make a new link");
  });

  it("opens NL-1065 by its own link, clears the code from the address, and cancels it with the customer's reason", async () => {
    await mount(`/o#${port.afterFake.linkToken}`);
    expect(window.location.hash).toBe("");
    expect(port.afterFake.calls.find((c) => c.call === "openShared")?.args).toEqual([port.afterFake.linkToken]);
    expect(main()).toContain("Opened from the private link in your e-mail.");
    expect(main()).toContain("This link is just for you — don’t forward it.");
    expect(document.querySelector("h1")?.textContent).toBe("Order NL-1065");
    expect(document.querySelector(".nl-after-head .nl-pill")?.textContent).toBe("Paid");
    expect(main()).toContain("Not packed yet");
    expect(main()).toContain("Ships Tue 18 Aug");
    expect(main()).toContain("Arrives Thu 20 Aug");
    expect(main()).toContain("$32.85 off");
    expect(byText(".nl-total-row--strong", /Total/)?.textContent).toContain("$216.25");
    expect(main()).not.toContain("Make a new link");

    const cancel = byText("button", "Cancel the order")!;
    await click(cancel);
    const sheet = document.querySelector('[role="alertdialog"]')!;
    expect(sheet.textContent).toContain("Cancel this order?");
    expect(sheet.textContent).toContain("We’ll refund $216.25 to your card. This can’t be undone.");
    expect(document.activeElement?.textContent).toBe("Keep the order");
    await press("Escape");
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(cancel);

    await click(byText("button", "Cancel the order"));
    await click(byText('[role="alertdialog"] button', "Cancel the order"));
    expect(port.afterFake.calls.find((c) => c.call === "cancel")?.args).toEqual(["link", 1065, { status: "cancelled", cancel_reason: "customer" }]);
    expect(document.querySelector(".nl-after-head .nl-pill")?.textContent).toBe("Cancelled");
    expect(main()).toContain("Cancelled — your refund is on its way.");
    expect(byText(".nl-after-refund", /Refund on its way/)?.textContent).toContain("$216.25");
    expect(byText("button", "Cancel the order")).toBeNull();
    expect(text()).toContain("Cancelled — your refund is on its way.");
  });

  it("says a link that opens nothing", async () => {
    await mount("/o#WRONGCODE0000000");
    expect(main()).toContain("This link doesn’t open an order.");
    expect(byText("a", "Find your order")).not.toBeNull();
  });

  it("shows NL-1066 while it is being paid: held until 12:01, Pay $217.00 now, and no cancel", async () => {
    signedInAsPriya();
    await mount();
    await open("NL-1066");
    expect(document.querySelector(".nl-after-head .nl-pill")?.textContent).toBe("Not paid yet");
    expect(document.querySelector(".nl-steps")).toBeNull();
    expect(main()).toContain("We’re holding your items until 12:01");
    expect(main()).toContain("You’ll pay on the Stripe or PayPal page.");
    expect(byText("button", "Cancel the order")).toBeNull();
    const pay = byText("button", "Pay $217.00 now")!;
    expect(pay.querySelector(".nl-mono")?.textContent).toBe("$217.00");
    await click(pay);
    expect(port.starts).toEqual([{ via: "mine", orderId: 1066 }]);
    expect(left).toEqual(["https://pay.example/1066"]);
  });

  it("shows NL-1066's bank-transfer twin with its own transfer details, and nothing to refund on a cancel", async () => {
    signedInAsPriya();
    port.offer = { online: false, test: false };
    port.afterFake.asTransfer("NL-1066");
    await mount();
    await open("NL-1066");
    expect(main()).toContain("To pay by bank transfer: $217.00");
    expect(document.querySelector(".nl-after-transfer")?.textContent).toContain("Reference NL-1066");
    expect(main()).toContain("Pay by Tue 25 Aug or the order is cancelled. We’ll hold your items until then.");
    expect(byText("button", "Pay $217.00 now")).toBeNull();
    await click(byText("button", "Cancel the order"));
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("Nothing has been paid yet, so there’s nothing to refund.");
    await click(byText('[role="alertdialog"] button', "Cancel the order"));
    expect(main()).toContain("Cancelled. Nothing was taken.");
  });

  it("puts NL-1053 back in the basket, leaving out a line that sold out since", async () => {
    signedInAsPriya();
    port.setLeft("NL-RMB-9", 0);
    await mount();
    await open("NL-1053");
    await click(byText("button", "Order again"));
    expect(useShop.getState().view).toBe("basket");
    expect(useShop.getState().basket.map((l) => l.sku)).toEqual(["NL-BEA-SLA"]);
    expect(useShop.getState().basketNote?.number).toBe("NL-1053");
    expect(useShop.getState().basketNote?.left).toEqual([{ name: expect.stringMatching(/^Ridge Mid Hiking Boot · /), why: "sold" }]);
  });

  it("offers no review once reviews are off, and no receipt when the key offers none", async () => {
    signedInAsPriya();
    port.afterFake.reviewsOn = false;
    port.afterFake.receipts = false;
    await mount();
    await open("NL-1053");
    expect(byText("button", "Review an item")).toBeNull();
    expect(byText("a", "Receipt")).toBeNull();
  });
});

describe("find your order and sign in, one code", () => {
  it("asks the number and the e-mail, says the same for any pair, counts down to a new code", async () => {
    await mount("/find");
    expect(document.querySelector("h1")?.textContent).toBe("Find your order");
    await submit(".nl-code-form");
    expect(main()).toContain("Enter the order number from your e-mail.");
    expect(main()).toContain("Enter the e-mail on the order.");
    expect(port.afterFake.calls.some((c) => c.call === "requestCode")).toBe(false);
    await type("#nl-code-find-number", "nl-1053");
    await type("#nl-code-find-email", "nobody@example.com");
    await submit(".nl-code-form");
    expect(main()).toContain("If that order is yours, we’ve sent a 6-digit code to the e-mail on that order.");
    expect(port.afterFake.calls.find((c) => c.call === "requestCode")?.args[0]).toBe("nobody@example.com");
    const boxes = [...document.querySelectorAll<HTMLInputElement>(".nl-code-box")];
    expect(boxes).toHaveLength(6);
    expect(boxes.every((b) => b.inputMode === "numeric" && b.getAttribute("autocomplete") === "one-time-code")).toBe(true);
    expect(document.querySelector(".nl-code-boxes")?.getAttribute("dir")).toBe("ltr");
    expect(byText("button", /Send a new code in/)?.textContent).toBe("Send a new code in 0:30");
    expect(byText("button", /Send a new code in/)?.hasAttribute("disabled")).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });
    await settle();
    expect(byText("button", "Send a new code")?.hasAttribute("disabled")).toBe(false);
  });

  it("says a wrong code, and a code that has run out", async () => {
    await mount("/find");
    await type("#nl-code-find-number", "NL-1053");
    await type("#nl-code-find-email", "priya.r@example.com");
    await submit(".nl-code-form");
    await paste("#nl-code-find-box-0", "111111");
    expect([...document.querySelectorAll<HTMLInputElement>(".nl-code-box")].map((b) => b.value).join("")).toBe("111111");
    await submit(".nl-code-form");
    expect(main()).toContain("Wrong code");
    expect(document.querySelector("#nl-code-find-box-0")?.getAttribute("aria-invalid")).toBe("true");
    port.afterFake.codeSpent = true;
    await paste("#nl-code-find-box-0", "482913");
    await submit(".nl-code-form");
    expect(main()).toContain("That code has run out");
  });

  it("tells a number that is not theirs only after the code", async () => {
    await mount("/find");
    await type("#nl-code-find-number", "NL-1065");
    await type("#nl-code-find-email", "priya.r@example.com");
    await submit(".nl-code-form");
    expect(main()).toContain("If that order is yours");
    await paste("#nl-code-find-box-0", port.afterFake.code);
    await submit(".nl-code-form");
    expect(main()).toContain("We can’t find that order with this e-mail.");
    expect(useShop.getState().customer?.name).toBe("Priya Raman");
  });

  it("signs in and lands on that order from the customer's own orders", async () => {
    await mount("/find");
    await type("#nl-code-find-number", "NL-1053");
    await type("#nl-code-find-email", "priya.r@example.com");
    await submit(".nl-code-form");
    await paste("#nl-code-find-box-0", port.afterFake.code);
    await submit(".nl-code-form");
    expect(useShop.getState().view).toBe("order");
    expect(document.querySelector("h1")?.textContent).toBe("Order NL-1053");
    expect(port.afterFake.calls.some((c) => c.call === "readMine")).toBe(true);
  });

  it("signs in on its own page and opens the account, with the checkout's address from the newest proved order", async () => {
    await mount("/sign-in");
    expect(main()).toContain("We’ll e-mail you a 6-digit code. There’s no password.");
    await type("#nl-code-signIn-email", "priya.r@example.com");
    await submit(".nl-code-form");
    expect(main()).toContain("We’ve sent a 6-digit code to priya.r@example.com.");
    await paste("#nl-code-signIn-box-0", port.afterFake.code);
    await submit(".nl-code-form");
    expect(useShop.getState().view).toBe("account");
    expect(document.querySelector("h1")?.textContent).toBe("Hello, Priya");
    expect(useShop.getState().customer).toEqual({ name: "Priya Raman", email: "priya.r@example.com", news: true, address: { shipName: "Priya Raman", line1: "3410 Fir Ave", line2: "", city: "Portland", zip: "97214", regionId: expect.anything() } });
  });

  it("signs in from the sheet and stays on the screen it was opened from", async () => {
    await mount("/basket");
    await act(async () => openSignIn(true));
    await settle();
    const dialog = document.querySelector('[role="dialog"][aria-labelledby="nl-si-sheet-title"]');
    expect(dialog?.textContent).toContain("Sign in");
    await type("#nl-code-sheet-email", "priya.r@example.com");
    await submit('[role="dialog"] .nl-code-form');
    await paste("#nl-code-sheet-box-0", port.afterFake.code);
    await submit('[role="dialog"] .nl-code-form');
    expect(useShop.getState().signInSheet).toBe(false);
    expect(useShop.getState().view).toBe("basket");
    expect(useShop.getState().customer?.email).toBe("priya.r@example.com");
  });

  it("shows a customer signed in again after a reload, from the session the client kept", async () => {
    signedInAsPriya();
    await mount();
    expect(useShop.getState().customer?.name).toBe("Priya Raman");
  });
});

describe("your account", () => {
  it("lists the orders newest first, those ordered with the e-mail apart, and no returns yet", async () => {
    signedInAsPriya();
    port.afterFake.rows.orders.push({ ...port.afterFake.order("NL-1053"), id: 1031, number: "NL-1031", placed_at: "2026-08-01T17:00:00.000Z", customer_proved: false });
    await mount("/account");
    expect(document.querySelector("h1")?.textContent).toBe("Hello, Priya");
    const sections = [...document.querySelectorAll(".nl-acc-section")];
    const rows = [...sections[0]!.querySelectorAll(".nl-acc-row")].map((r) => r.textContent?.replace(/\s+/g, " "));
    expect(rows[0]).toContain("NL-1066");
    expect(rows[0]).toContain("Tue 18 Aug · 2 items");
    expect(rows[0]).toContain("Not paid yet");
    expect(rows[0]).toContain("$217.00");
    expect(rows[1]).toContain("NL-1053");
    expect(rows[1]).toContain("Fri 14 Aug · 2 items");
    expect(rows[1]).toContain("Shipped");
    expect(sections[1]?.textContent).toContain("Ordered with your e-mail");
    expect(sections[1]?.textContent).toContain("NL-1031");
    expect(main()).toContain("No returns yet.");
    // Checkout never fills an address from an order only typed with the e-mail.
    expect(useShop.getState().customer?.address?.line1).toBe("3410 Fir Ave");
  });

  it("stops news e-mails and sends them again through the newsletter's door, said politely", async () => {
    signedInAsPriya();
    await mount("/account");
    expect(document.querySelector(".nl-acc-news-state")?.getAttribute("role")).toBe("status");
    expect(document.querySelector(".nl-acc-news-state")?.textContent).toBe("News e-mails: On");
    await click(byText("button", "Stop news e-mails"));
    expect(port.afterFake.calls.find((c) => c.call === "stopNews")?.args).toEqual([1]);
    expect(document.querySelector(".nl-acc-news-state")?.textContent).toBe("News e-mails: Off");
    expect(main()).toContain("You can say no at any time");
    await click(byText("button", "Send me news e-mails"));
    expect(port.signups).toEqual(["priya.r@example.com"]);
    expect(document.querySelector(".nl-acc-news-state")?.textContent).toBe("News e-mails: On");
    expect(main()).toContain("You’re on the list — check your inbox to confirm.");
  });

  it("says what stays before deleting the details, asks a fresh code when Adminium wants one, and goes home", async () => {
    signedInAsPriya();
    await mount("/account");
    const button = byText("button", "Delete my details")!;
    await click(button);
    const sheet = document.querySelector('[role="alertdialog"]')!;
    expect(sheet.textContent).toContain("Delete your details?");
    expect(sheet.textContent).toContain("Your orders stay, as tax law asks. Your name leaves your account.");
    await press("Escape");
    expect(document.activeElement).toBe(button);
    port.afterFake.stepUp = true;
    await click(button);
    await click(byText('[role="alertdialog"] button', "Delete my details"));
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("type the code we’ve just e-mailed you");
    expect(port.afterFake.calls.filter((c) => c.call === "requestCode").map((c) => c.args[0])).toEqual(["priya.r@example.com"]);
    await paste("#nl-code-confirm-box-0", port.afterFake.code);
    await submit('[role="alertdialog"] .nl-code-form');
    expect(port.afterFake.calls.filter((c) => c.call === "forgetMe")).toHaveLength(2);
    expect(useShop.getState().customer).toBeNull();
    expect(useShop.getState().view).toBe("home");
    expect(text()).toContain("Your details are removed.");
  });

  it("signs out to home", async () => {
    signedInAsPriya();
    await mount("/account");
    await click(byText("button", "Sign out"));
    expect(useShop.getState().view).toBe("home");
    expect(useShop.getState().customer).toBeNull();
    expect(text()).toContain("You’re signed out.");
  });
});

describe("sending something back", () => {
  it("asks which pieces and why, sends one write with its lines, then shows the return by its own number", async () => {
    signedInAsPriya();
    await mount();
    await open("NL-1053");
    await click(byText("button", "Send something back"));
    expect(useShop.getState().view).toBe("orderReturn");
    expect(document.querySelector("h1")?.textContent).toBe("Send something back");
    expect(main()).toContain("From order NL-1053");
    expect(main()).toContain("bought 1");
    for (const reason of ["Doesn’t fit", "Not what I expected", "Faulty", "Changed my mind"]) expect(main()).toContain(reason);
    await submit(".nl-ret-form");
    expect(main()).toContain("Pick at least one item.");
    expect(main()).toContain("Choose a reason.");
    const beanie = [...document.querySelectorAll<HTMLInputElement>('.nl-ret-pick input[type="checkbox"]')][1]!;
    await click(beanie);
    // Bought one, nothing back yet: one at most.
    expect(document.querySelector<HTMLButtonElement>('[aria-label="More · Wool Beanie"]')?.disabled).toBe(true);
    await click(byText(".nl-ret-reason", "Faulty")!.querySelector("input"));
    await type("#nl-ret-note", "A seam came apart.");
    await submit(".nl-ret-form");
    const ask = port.afterFake.calls.find((c) => c.call === "askReturn")!.args;
    expect(ask[0]).toBe("mine");
    expect(ask[1]).toMatchObject({ orderId: 1053, reason: "faulty", note: "A seam came apart.", lines: [{ lineId: 10532, qty: 1 }] });
    expect(document.querySelector("h1")?.textContent).toBe("Your return RT-1005");
    expect(main()).toContain("We’ll look at it within one business day.");
    expect(document.querySelector('[aria-current="step"] .nl-step-label')?.childNodes[0]?.textContent).toBe("Asked");
    expect(byText(".nl-ret-refund", /Refund when we get it back/)?.textContent).toContain("$28.00");
    expect(main()).toContain("Reason: Faulty");
    expect(main()).not.toContain("Send it to");
    // The account lists it by its own number, with its step and Adminium's refund, and opens it.
    await click(byText("button", "Back to the order"));
    expect(document.querySelector("h1")?.textContent).toBe("Order NL-1053");
    expect(byText(".nl-after-row", /RT-1005/)?.textContent).toContain("Asked");
    await click(byText("a", "Your account"));
    const row = byText(".nl-acc-row--return", /RT-1005/)!;
    expect(row.textContent?.replace(/\s+/g, " ")).toMatch(/RT-1005From NL-1053Asked\$28\.00/);
    await click(row);
    expect(useShop.getState().view).toBe("orderReturn");
    expect(document.querySelector("h1")?.textContent).toBe("Your return RT-1005");
  });

  it("draws every step of a return, the address while approved, and a decline with the shop's reason", async () => {
    signedInAsPriya();
    await mount();
    await open("NL-1053");
    await click(byText("button", "Send something back"));
    await click(document.querySelector('.nl-ret-pick input[type="checkbox"]'));
    await click(byText(".nl-ret-reason", "Doesn’t fit")!.querySelector("input"));
    await submit(".nl-ret-form");
    const ret = port.afterFake.rows.returns[0]!;
    const current = () => document.querySelector('[aria-current="step"] .nl-step-label')?.childNodes[0]?.textContent;
    const step = async (patch: Record<string, unknown>) => {
      Object.assign(ret, patch);
      await act(async () => reread());
      await settle();
    };
    await step({ status: "approved" });
    expect(current()).toBe("Approved");
    expect(main()).toContain("Send it to");
    expect(main()).toContain("1400 NW Kearney St, Suite 210");
    expect(main()).toContain("Post it with any carrier and tell us the tracking number.");
    expect(main()).not.toMatch(/label/i);
    await step({ tracking: "1Z999AA10123456784" });
    expect(current()).toBe("On its way back");
    await step({ status: "received" });
    expect(current()).toBe("Received");
    expect(main()).not.toContain("Send it to");
    await step({ status: "refunded", refunded_total: "189.00" });
    expect(current()).toBe("Refunded");
    expect(byText(".nl-ret-refund", /Refunded/)?.textContent).toContain("$189.00");
    await step({ status: "declined", staff_reason: "The boot has been worn outdoors, so we can’t sell it again." });
    expect(document.querySelector(".nl-steps")).toBeNull();
    expect(main()).toContain("Declined");
    expect(main()).toContain("The shop’s reason: The boot has been worn outdoors, so we can’t sell it again.");
  });

  it("asks a return through the order's own link", async () => {
    Object.assign(port.afterFake.order("NL-1065"), { status: "shipped", shipped_at: "2026-08-18T22:00:00.000Z", packed_at: "2026-08-18T17:00:00.000Z" });
    await mount(`/o#${port.afterFake.linkToken}`);
    await click(byText("button", "Send something back"));
    await click(document.querySelector('.nl-ret-pick input[type="checkbox"]'));
    await click(byText(".nl-ret-reason", "Changed my mind")!.querySelector("input"));
    await submit(".nl-ret-form");
    const ask = port.afterFake.calls.find((c) => c.call === "askReturn")!.args;
    expect(ask[0]).toBe("link");
    expect(ask[1]).toMatchObject({ orderId: 1065, reason: "mind", lines: [{ lineId: 10651, qty: 1 }] });
    expect(document.querySelector("h1")?.textContent).toBe("Your return RT-1005");
  });
});

describe("a review", () => {
  it("asks which item, the stars and a few lines, then says the line's review was sent", async () => {
    signedInAsPriya();
    await mount();
    await open("NL-1053");
    const button = byText("button", "Review an item")!;
    await click(button);
    const dialog = document.querySelector('[role="dialog"][aria-labelledby="nl-rv-title"]')!;
    expect(dialog.textContent).toContain("Write a review");
    expect(dialog.textContent).toContain("Which item?");
    expect(dialog.querySelector('input[name="name"], input[type="checkbox"]')).toBeNull();
    expect(dialog.querySelector<HTMLInputElement>("#nl-rv-titlein")?.maxLength).toBe(80);
    expect(dialog.querySelector<HTMLTextAreaElement>("#nl-rv-body")?.maxLength).toBe(2000);
    await submit('[role="dialog"] form');
    expect(dialog.textContent).toContain("Choose the item.");
    expect(dialog.textContent).toContain("Choose 1 to 5 stars.");
    expect(dialog.textContent).toContain("Write a few lines.");
    await click(byText('[role="dialog"] .nl-chip', /Ridge Mid/));
    await click(document.querySelector('[aria-label="4 out of 5 stars"]'));
    expect(document.querySelector(".nl-after-star-word")?.textContent).toBe("Very good");
    await type("#nl-rv-titlein", "Dry feet");
    await type("#nl-rv-body", "Three wet days on the Timberline Trail, dry feet the whole way.");
    await submit('[role="dialog"] form');
    const sent = port.afterFake.calls.find((c) => c.call === "sendReview")!.args;
    expect(sent).toEqual(["mine", "10531", { stars: 4, title: "Dry feet", body: "Three wet days on the Timberline Trail, dry feet the whole way." }]);
    expect(document.querySelector('[role="dialog"][aria-labelledby="nl-rv-title"]')).toBeNull();
    expect(text()).toContain("Thanks — we’ll publish it once we’ve read it.");
    expect(byText(".nl-after-line", /Ridge Mid/)?.textContent).toContain("Your review: sent");
    // The beanie is still open: the button stays, and opens straight on it.
    await click(byText("button", "Review an item"));
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain("Which item?");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Wool Beanie");
    await press("Escape");
    expect(document.querySelector('[role="dialog"][aria-labelledby="nl-rv-title"]')).toBeNull();
    expect(useAfter.getState().review.open).toBe(false);
  });
});
