// @vitest-environment jsdom
/**
 * GIFT CARDS, THE HELP PAGES, THE NEWSLETTER BOX AND 404, FROM THE SAMPLE WORLD.
 *
 * The whole shop side is mounted against the stand-in for Adminium
 * (`testing.ts`) and each page is opened as a shopper opens it. Every figure
 * asserted is the sample's own (`src/sample/northline-data.json`): $25.00 /
 * $50.00 / $100.00 gift cards, the card ending 7Q2K with $50.00 on it,
 * Standard free from $100.00, Labor Day on Mon 7 Sep, 30 days for returns.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { dayShort } from "./format.ts";
import { ShopError } from "./port.ts";
import ShopApp from "./ShopApp.tsx";
import { go, resetShop, useShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let port: FakePort;
let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function settle(times = 4): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
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

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const $$ = <T extends HTMLElement = HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];
const main = () => $("main")?.textContent ?? "";
const words = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const byText = (selector: string, text: string) => $$(selector).find((el) => words(el) === text) ?? null;

async function visit(place: Parameters<typeof go>[0]): Promise<void> {
  await act(async () => go(place));
  await settle();
}

async function type(selector: string, value: string): Promise<void> {
  const el = $<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (el === null) throw new Error(`nothing to type into: ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function choose(selector: string, value: string): Promise<void> {
  const el = $<HTMLSelectElement>(selector)!;
  await act(async () => {
    el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function click(el: Element | null): Promise<void> {
  if (el === null) throw new Error("nothing to click");
  await act(async () => (el as HTMLElement).click());
  await settle();
}

/** The message an input is tied to, as a screen reader is told it. */
const describedBy = (selector: string) =>
  ($(selector)?.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => words(document.getElementById(id)))
    .join(" | ");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.scrollTo = () => {};
  localStorage.clear();
  port = fakePort();
  resetShop(port);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
  localStorage.clear();
});

// ── S15 gift cards ────────────────────────────────────────────────────────

describe("buying a gift card", () => {
  it("offers the shop's amounts to the cent, $50.00 chosen, and says what a gift card is", async () => {
    await mount("/gift-cards");
    expect(words($("h1"))).toBe("Gift cards");
    expect(main()).toContain("An e-gift card for anything in the shop. No shipping, no tax and no codes on it.");
    expect($$(".nl-amount").map(words)).toEqual(["$25.00", "$50.00", "$100.00"]);
    expect($$(".nl-amount").map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "true", "false"]);
    expect(main()).toContain("We’ll e-mail it to them as soon as the order is paid.");
    expect(byText("label", "Their name")).not.toBeNull();
    expect(byText("label", "Their e-mail")).not.toBeNull();
    expect(byText("label", "A message (optional)")).not.toBeNull();
    expect($<HTMLTextAreaElement>("#gb-msg")!.maxLength).toBe(200);
    expect(words($(".nl-counter"))).toBe("0 / 200");
  });

  it("ties its errors to the fields, then puts the card in the basket like an item", async () => {
    await mount("/gift-cards");
    await click(byText("button", "Add to basket"));
    expect(describedBy("#gb-name")).toBe("Enter their name.");
    expect(describedBy("#gb-email")).toBe("Enter an e-mail address, like name@example.com.");
    expect(document.activeElement?.id).toBe("gb-name");
    expect(useShop.getState().gifts).toEqual([]);

    await click(byText(".nl-amount", "$100.00"));
    await type("#gb-name", "Theo Brandt");
    await type("#gb-email", "theo.b@example.com");
    await type("#gb-msg", "Happy hiking!");
    expect(words($(".nl-counter"))).toBe("13 / 200");
    await click(byText("button", "Add to basket"));
    expect(useShop.getState().gifts.map(({ key: _key, ...g }) => g)).toEqual([{ amountId: 3, amount: "100.00", toName: "Theo Brandt", toEmail: "theo.b@example.com", message: "Happy hiking!" }]);
    expect(useShop.getState().drawer).toBe(true);
    expect(useShop.getState().announce).toBe("Gift card $100.00 · to Theo Brandt");
    // The form is ready for the next card.
    expect($<HTMLInputElement>("#gb-name")!.value).toBe("");
  });

  it("keeps the message plain text: no links", async () => {
    await mount("/gift-cards");
    await type("#gb-name", "Theo Brandt");
    await type("#gb-email", "theo.b@example.com");
    await type("#gb-msg", "See www.example.com");
    await click(byText("button", "Add to basket"));
    expect(describedBy("#gb-msg")).toContain("Write the message without links.");
    expect(useShop.getState().gifts).toEqual([]);
  });

  it("says so when the basket already holds five gift cards, the most one order takes", async () => {
    useShop.setState({ gifts: Array.from({ length: 5 }, (_, i) => ({ key: `g${i}`, amountId: 1, amount: "25.00", toName: "Theo", toEmail: "theo.b@example.com", message: "" })) });
    await mount("/gift-cards");
    expect(main()).toContain("Your basket has 5 gift cards, the most one order takes.");
    expect($(".nl-notice .nl-mono")?.textContent).toBe("5");
    expect(byText("button", "Add to basket")?.hasAttribute("disabled")).toBe(true);
  });

  it("says the shop sells none without Offers", async () => {
    port.featureSet.offers = false;
    await mount("/gift-cards");
    expect(main()).toContain("This shop doesn’t sell gift cards.");
    expect($(".nl-amount")).toBeNull();
    await visit({ view: "giftBalance" });
    expect(main()).toContain("This shop doesn’t sell gift cards.");
    expect($("#gc-code")).toBeNull();
  });
});

describe("checking a gift card balance", () => {
  it("asks for the 12-character code, says what it does not know, and reads 7Q2K's $50.00", async () => {
    await mount("/gift-cards/balance");
    expect(words($("h1"))).toBe("Check a gift card balance");
    expect(byText("label", "The 12-character code from the e-mail")).not.toBeNull();

    await type("#gc-code", "H8WD3R");
    await click(byText("button", "Check"));
    expect(describedBy("#gc-code")).toBe("Enter the 12-character code from the e-mail.");

    await type("#gc-code", "AAAA-BBBB-CCCC");
    await click(byText("button", "Check"));
    expect(describedBy("#gc-code")).toBe("We don’t know that gift card.");

    await type("#gc-code", "h8wd 3rtm 7q2k");
    await click(byText("button", "Check"));
    expect(words($(".nl-done"))).toBe("Gift card ending 7Q2K · $50.00 left");
    expect($$(".nl-done .nl-mono").map(words)).toEqual(["7Q2K", "$50.00"]);
    expect(useShop.getState().announce).toBe("Gift card ending 7Q2K · $50.00 left");
    expect($("#gc-code")?.getAttribute("aria-invalid")).toBeNull();
  });

  it("says when a card has expired", async () => {
    port.giftCard = async () => ({ balance: "12.00", status: "expired", expiresOn: "2026-08-01" });
    await mount("/gift-cards/balance");
    await type("#gc-code", "H8WD3RTM7Q2K");
    await click(byText("button", "Check"));
    expect(words($(".nl-done"))).toBe("Gift card ending 7Q2K has expired.");
  });
});

// ── S16 the help pages ────────────────────────────────────────────────────

describe("the help pages", () => {
  it("draws shipping and returns from the shop's services, offers, closures, tax rates and return days", async () => {
    await mount("/help/shipping");
    expect(words($("h1"))).toBe("Shipping & returns");
    expect($$(".nl-help-nav a").map(words)).toEqual(["Shipping & returns", "Size guides", "Contact us", "About", "Privacy", "Terms"]);
    expect($(".nl-help-nav [aria-current='page']")?.textContent).toBe("Shipping & returns");
    expect($$(".nl-ship-table thead th").map(words)).toEqual(["Service", "After it ships", "Contiguous US", "Alaska & Hawaii"]);
    expect($$(".nl-ship-table tbody tr").map((tr) => [...tr.children].map(words))).toEqual([
      ["Standard", "3–5 business days", "Free from $100.00 · $7.00", "$16.00"],
      ["Express", "2 business days", "$18.00", "$34.00"],
      ["Overnight", "1 business day", "$35.00", "Not offered"],
    ]);
    const text = main().replace(/\s+/g, " ");
    expect(text).toContain("Free Standard shipping from $100.00 to Contiguous US.");
    expect(text).toContain("Labor Day · Mon 7 Sep");
    expect(text).toContain("We ship to the 50 states and DC.");
    expect(text).toContain("California 7.25% · New York 4% · Washington 6.5% · every other state 0%");
    expect(text).toContain("You have 30 days after we ship to send things back.");
    expect(text).toContain("Shipping is refunded only when an item is faulty.");
    // Every figure in a sentence is set in mono.
    expect($$(".nl-help-body .nl-mono").map(words)).toEqual(expect.arrayContaining(["$100.00", dayShort("2026-09-07", "en-US"), "7.25%", "30"]));
  });

  it("shows every size guide with the shop's own columns", async () => {
    await mount("/help/sizes");
    expect(words($("h1"))).toBe("Size guides");
    expect($$(".nl-guide h2").map(words)).toEqual(["Apparel", "Waist", "Shoes", "Packs", "Socks"]);
    const shoes = $$(".nl-guide")[2]!;
    expect([...shoes.querySelectorAll("thead th")].map(words)).toEqual(["US size", "Foot length (in)", "Foot length (cm)"]);
    expect([...shoes.querySelectorAll("tbody tr")][0]!.textContent).toBe("79.8525.0");
  });

  it("sends a message to the shop: errors tied to each field, then the thanks and the shop's address", async () => {
    await mount("/help/contact");
    expect(words($("h1"))).toBe("Contact us");
    expect($$("#ct-topic option").map((o) => [(o as HTMLOptionElement).value, words(o)])).toEqual([
      ["", "Choose a topic"],
      ["order", "An order"],
      ["returns", "A return"],
      ["product", "A product"],
      ["other", "Something else"],
    ]);
    expect(main()).toContain("Northline · 1400 NW Kearney St, Suite 210, Portland, OR 97209 · hello@northline.example");

    await click(byText("button", "Send"));
    expect(describedBy("#ct-topic")).toBe("Choose a topic.");
    expect(describedBy("#ct-msg")).toBe("Write your message.");
    expect(describedBy("#ct-name")).toBe("Enter your name.");
    expect(describedBy("#ct-email")).toBe("Enter an e-mail address, like name@example.com.");
    expect(document.activeElement?.id).toBe("ct-topic");
    expect(port.enquiries).toEqual([]);

    await choose("#ct-topic", "returns");
    await type("#ct-msg", "The shell is a size too big.");
    await type("#ct-order", "nl-1053");
    await type("#ct-name", "Priya Raman");
    await type("#ct-email", "priya.r@example.com");
    await click(byText("button", "Send"));
    expect(port.enquiries).toEqual([{ name: "Priya Raman", email: "priya.r@example.com", topic: "returns", message: "The shell is a size too big.", order_number: "NL-1053", language: "en-US" }]);
    expect(words($(".nl-done"))).toBe("Thanks — we’ll answer within one business day.");
    expect(useShop.getState().announce).toBe("Thanks — we’ll answer within one business day.");
    expect(main()).toContain("hello@northline.example");
  });

  it("keeps one retry key for a send that failed and is sent again", async () => {
    const keys: string[] = [];
    let fail = true;
    port.enquiry = async (_values, key) => {
      keys.push(key);
      if (fail) {
        fail = false;
        throw new Error("offline");
      }
    };
    await mount("/help/contact");
    await choose("#ct-topic", "other");
    await type("#ct-msg", "Hello");
    await type("#ct-name", "Priya Raman");
    await type("#ct-email", "priya.r@example.com");
    await click(byText("button", "Send"));
    expect(main()).toContain("That didn’t go through. Try again.");
    await click(byText("button", "Send"));
    expect(keys.length).toBe(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it.each([
    ["/about", "About", 2],
    ["/privacy", "Privacy", 3],
    ["/terms", "Terms", 3],
  ])("draws %s from the shop's own text, a paragraph per blank line", async (path, title, paragraphs) => {
    await mount(path);
    expect(words($("h1"))).toBe(title);
    expect($$(".nl-prose--text").length).toBe(paragraphs);
    expect(byText("a", "Back to the shop")).not.toBeNull();
  });

  it("opens a page from every footer link (S16)", async () => {
    await mount("/");
    const links = $$<HTMLAnchorElement>(".nl-footer a.nl-footer-link");
    expect(links.length).toBeGreaterThanOrEqual(12);
    for (let i = 0; i < links.length; i += 1) {
      const link = $$<HTMLAnchorElement>(".nl-footer a.nl-footer-link")[i]!;
      const label = words(link);
      await click(link);
      expect(useShop.getState().view, label).not.toBe("missing");
      expect($("main"), label).not.toBeNull();
    }
  });
});

// ── S17 the newsletter box ────────────────────────────────────────────────

describe("the newsletter box", () => {
  const box = () => $("section[aria-labelledby='nl-news-h']");

  it("starts unticked and says what the tick means", async () => {
    await mount("/");
    expect(words($("#nl-news-h"))).toBe("News from Northline");
    expect(box()?.textContent).toContain("New gear and trail notes, now and then.");
    const tick = $<HTMLInputElement>("#nl-news-tick")!;
    expect(tick.checked).toBe(false);
    expect(words(tick.closest("label"))).toBe("Send me Northline news now and then");
    expect(describedBy("#nl-news-tick")).toBe("You can say no at any time — every news e-mail has a link.");
  });

  it("asks for the tick and a real address before it signs anyone up", async () => {
    await mount("/");
    await type("#nl-news-email", "sam@example");
    await click(byText("button", "Sign me up"));
    expect(describedBy("#nl-news-email")).toBe("Enter an e-mail address, like name@example.com.");
    expect(describedBy("#nl-news-tick")).toBe("You can say no at any time — every news e-mail has a link. | Tick the box to say yes to news e-mails.");
    expect($("#nl-news-tick")?.getAttribute("aria-invalid")).toBe("true");
    expect(port.signups).toEqual([]);

    await type("#nl-news-email", "new.walker@example.com");
    await click(byText("button", "Sign me up"));
    expect(describedBy("#nl-news-tick")).toContain("Tick the box to say yes to news e-mails.");
    expect(document.activeElement?.id).toBe("nl-news-tick");
    expect(port.signups).toEqual([]);
  });

  it("signs up with the yes, and with Forms says to confirm from the inbox", async () => {
    await mount("/");
    await type("#nl-news-email", "new.walker@example.com");
    await click($("#nl-news-tick"));
    await click(byText("button", "Sign me up"));
    expect(port.signups).toEqual(["new.walker@example.com"]);
    expect(words(box()?.querySelector(".nl-done") ?? null)).toBe("You’re on the list — check your inbox to confirm");
    expect(useShop.getState().announce).toBe("You’re on the list — check your inbox to confirm");
    expect($("#nl-news-email")).toBeNull();
  });

  it("says only that they are on the list without Forms (C13)", async () => {
    port.featureSet.forms = false;
    await mount("/");
    await type("#nl-news-email", "new.walker@example.com");
    await click($("#nl-news-tick"));
    await click(byText("button", "Sign me up"));
    expect(words(box()?.querySelector(".nl-done") ?? null)).toBe("You’re on the list");
  });

  it("fills in a signed-in customer's address", async () => {
    await mount("/");
    await act(async () => useShop.setState({ customer: { name: "Priya Raman", email: "priya.r@example.com", news: false } }));
    await settle(1);
    expect($<HTMLInputElement>("#nl-news-email")!.value).toBe("priya.r@example.com");
  });

  it("keeps one retry key per attempt, and says when there were too many tries", async () => {
    const keys: string[] = [];
    let refusals = 2;
    port.newsSignup = async (email, _language, key) => {
      keys.push(key);
      if (refusals > 0) {
        refusals -= 1;
        throw new ShopError({ code: "PUBLIC_RATE_LIMITED", status: 429, column: null, child: null, index: null, reason: null, changed: null, retryAfter: 60, params: {} }, "slow down");
      }
      port.signups.push(email);
    };
    await mount("/");
    await type("#nl-news-email", "new.walker@example.com");
    await click($("#nl-news-tick"));
    await click(byText("button", "Sign me up"));
    expect(box()?.textContent).toContain("Too many tries just now. Try again in a minute.");
    await click(byText("button", "Sign me up"));
    // A new address is a new attempt.
    await type("#nl-news-email", "other.walker@example.com");
    await click(byText("button", "Sign me up"));
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
    expect(port.signups).toEqual(["other.walker@example.com"]);
  });

  it("has a page for the confirm link to land on", async () => {
    await mount("/news/thanks");
    expect(words($("h1"))).toBe("You’re on the list");
    expect(main()).toContain("every news e-mail has a link to stop it");
  });
});

// ── S18 404 ───────────────────────────────────────────────────────────────

describe("the page that is not there", () => {
  it("answers any unknown address with 404, a search and the whole shop", async () => {
    await mount("/no/such/page");
    expect(useShop.getState().view).toBe("missing");
    expect(words($(".nl-missing-code"))).toBe("404");
    expect(words($("h1"))).toBe("We can’t find that page");
    expect(byText("main a", "Shop all")?.getAttribute("href")).toBe("/shop");
    await type(".nl-missing-search input", "shell");
    await act(async () => $<HTMLFormElement>(".nl-missing-search")!.requestSubmit());
    await settle();
    expect(useShop.getState().place).toEqual({ view: "search", q: "shell" });
  });
});

describe("in Arabic", () => {
  it("words the shipping table in Arabic with the shop's own labels left as typed", async () => {
    await mount("/help/shipping", "ar-EG");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(words($("h1"))).not.toBe("Shipping & returns");
    expect($$(".nl-ship-table tbody th").map(words)).toEqual(["Standard", "Express", "Overnight"]);
    expect($$(".nl-ship-table thead th")[0]?.textContent).toBe("الخدمة");
  });
});
