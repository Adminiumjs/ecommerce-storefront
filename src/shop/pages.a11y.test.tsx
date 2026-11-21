// @vitest-environment jsdom
/**
 * GIFT CARDS, THE HELP PAGES, THE NEWSLETTER BOX AND 404, UNDER AXE.
 *
 * The shop side is mounted whole (header, footer, drawer, toasts) against the
 * stand-in for Adminium, driven into one state of one page, and swept by axe:
 * WCAG 2.0, 2.1 and 2.2 A/AA and axe's best practices, at every impact. Each
 * state runs in English and in Arabic (`dir="rtl"`), and proves it reached
 * its state before axe looks.
 */
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import ShopApp from "./ShopApp.tsx";
import { resetShop, useShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Two rules are off because jsdom lays nothing out: colours over a layout, and the size of a box. */
const AXE: axe.RunOptions = {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
  rules: {
    "color-contrast": { enabled: false },
    "target-size": { enabled: false },
  },
};

/**
 * One finding belongs to the shop's frame, not to these pages: the header's
 * category nav and the footer's first column are both named "Shop", so the
 * two landmarks share a name. It is reported to the frame's owner; until it is
 * renamed, it is left out here so these pages' own findings still fail.
 */
const FRAME_KNOWN = new Set(["landmark-unique .nl-nav"]);

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

async function mount(path: string): Promise<void> {
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

const $ = (selector: string) => document.querySelector<HTMLElement>(selector);

async function type(selector: string, value: string): Promise<void> {
  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (el === null) throw new Error(`nothing to type into: ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Press a form's submit button: the words differ by language, the button does not. */
async function submit(form: string): Promise<void> {
  const button = document.querySelector<HTMLButtonElement>(`${form} button[type="submit"]`);
  if (button === null) throw new Error(`no submit in ${form}`);
  await act(async () => button.click());
  await settle();
}

async function click(selector: string): Promise<void> {
  const el = $(selector);
  if (el === null) throw new Error(`nothing to click: ${selector}`);
  await act(async () => el.click());
  await settle();
}

interface State {
  page: string;
  state: string;
  path: string;
  before?: () => void;
  go?: () => Promise<void>;
  /** An element only this state draws. */
  shows: string;
}

const STATES: State[] = [
  { page: "gift cards", state: "the form", path: "/gift-cards", shows: ".nl-amount[aria-pressed='true']" },
  { page: "gift cards", state: "its errors", path: "/gift-cards", go: () => submit(".nl-gift form"), shows: "#gb-name-err" },
  { page: "gift cards", state: "a message with a link", path: "/gift-cards", go: async () => (await type("#gb-msg", "www.example.com"), await submit(".nl-gift form")), shows: "#gb-msg-err" },
  {
    page: "gift cards",
    state: "five in the basket",
    path: "/gift-cards",
    before: () => useShop.setState({ gifts: Array.from({ length: 5 }, (_, i) => ({ key: `g${i}`, amountId: 1, amount: "25.00", toName: "Theo", toEmail: "theo.b@example.com", message: "" })) }),
    shows: "#gb-full",
  },
  { page: "gift cards", state: "without Offers", path: "/gift-cards", before: () => (port.featureSet.offers = false), shows: ".nl-gift .nl-empty" },
  { page: "gift card balance", state: "the form", path: "/gift-cards/balance", shows: "#gc-code" },
  { page: "gift card balance", state: "a short code", path: "/gift-cards/balance", go: async () => (await type("#gc-code", "H8WD"), await submit(".nl-balance form")), shows: "#gc-code-err" },
  { page: "gift card balance", state: "a card found", path: "/gift-cards/balance", go: async () => (await type("#gc-code", "H8WD3RTM7Q2K"), await submit(".nl-balance form")), shows: ".nl-done" },
  { page: "shipping & returns", state: "the page", path: "/help/shipping", shows: ".nl-ship-table" },
  { page: "size guides", state: "the page", path: "/help/sizes", shows: ".nl-guide" },
  { page: "contact us", state: "the form", path: "/help/contact", shows: "#ct-topic" },
  { page: "contact us", state: "its errors", path: "/help/contact", go: () => submit(".nl-help form"), shows: "#ct-topic-err" },
  {
    page: "contact us",
    state: "sent",
    path: "/help/contact",
    go: async () => {
      const select = document.querySelector<HTMLSelectElement>("#ct-topic")!;
      await act(async () => {
        select.value = "order";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await type("#ct-msg", "Where is it?");
      await type("#ct-name", "Priya Raman");
      await type("#ct-email", "priya.r@example.com");
      await submit(".nl-help form");
    },
    shows: ".nl-help .nl-done",
  },
  { page: "about", state: "the page", path: "/about", shows: ".nl-prose--text" },
  { page: "privacy", state: "the page", path: "/privacy", shows: ".nl-prose--text" },
  { page: "terms", state: "the page", path: "/terms", shows: ".nl-prose--text" },
  { page: "newsletter box", state: "its errors", path: "/", go: async () => (await type("#nl-news-email", "sam@"), await submit(".nl-news form")), shows: "#nl-news-tick-err" },
  {
    page: "newsletter box",
    state: "signed up",
    path: "/",
    go: async () => {
      await type("#nl-news-email", "new.walker@example.com");
      await click("#nl-news-tick");
      await submit(".nl-news form");
    },
    shows: ".nl-news .nl-done",
  },
  { page: "news thanks", state: "the page", path: "/news/thanks", shows: ".nl-plain" },
  { page: "404", state: "the page", path: "/no/such/page", shows: ".nl-missing-code" },
];

const LOCALES: [string, "ltr" | "rtl"][] = [
  ["en-US", "ltr"],
  ["ar-EG", "rtl"],
];

beforeEach(() => {
  vi.useFakeTimers();
  document.title = "Northline";
  localStorage.clear();
  window.scrollTo = () => {};
  port = fakePort();
  resetShop(port);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
});

describe.each(LOCALES)("gift cards, help, news and 404 in %s", (locale, dir) => {
  it.each(STATES.map((row) => [`${row.page} · ${row.state}`, row] as const))("%s", async (label, row) => {
    localStorage.setItem("northline-locale", locale);
    row.before?.();
    await mount(row.path);
    await row.go?.();
    expect(document.documentElement.getAttribute("dir"), label).toBe(dir);
    expect($(row.shows), `${label}: never reached (${row.shows})`).not.toBeNull();
    expect(document.querySelectorAll("main").length, `${label}: one main`).toBe(1);
    expect(document.querySelectorAll("h1").length, `${label}: one h1`).toBe(1);

    vi.useRealTimers();
    const result = await axe.run(document, AXE);
    vi.useFakeTimers();
    expect(result.passes.length, `${label}: axe examined nothing`).toBeGreaterThan(0);
    expect(
      result.violations
        .map((v) => ({ ...v, nodes: v.nodes.filter((n) => !FRAME_KNOWN.has(`${v.id} ${n.target.join(" ")}`)) }))
        .filter((v) => v.nodes.length > 0)
        .map((v) => `${v.id} (${v.impact ?? "?"}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
      `${locale} · ${label}`,
    ).toEqual([]);
  });
});
