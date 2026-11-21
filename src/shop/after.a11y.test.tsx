// @vitest-environment jsdom
/**
 * THE PAGES AFTER AN ORDER, IN EVERY STATE, UNDER AXE.
 *
 * The shop is mounted whole against the stand-ins for Adminium, driven into
 * one state, and swept by axe: WCAG 2.0, 2.1 and 2.2 A/AA and axe's best
 * practices, at every impact. Each state runs in English and in Arabic
 * (`dir="rtl"`). Every row first proves it reached its state.
 */
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { openFromAccount, resetAfter, setLeave } from "./after.ts";
import ShopApp from "./ShopApp.tsx";
import { openSignIn, resetShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Two rules are off, each because jsdom draws nothing: colours need a laid-out page, target size the boxes a layout gives. */
const AXE: axe.RunOptions = {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
  rules: {
    "color-contrast": { enabled: false },
    "target-size": { enabled: false },
  },
};

let port: FakePort;
let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function settle(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
  }
}

async function mount(path: string, locale: string): Promise<void> {
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

const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
const button = (words: string) => [...document.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === words) ?? null;
const press = async (el: HTMLElement | null) => {
  if (el === null) throw new Error("nothing to press");
  await act(async () => {
    el.focus();
    el.click();
  });
  await settle();
};
const submit = async (selector: string) => {
  await act(async () => {
    $(selector)!.closest("form")!.requestSubmit();
  });
  await settle();
};
const type = async (selector: string, value: string) => {
  const el = document.querySelector<HTMLInputElement>(selector)!;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(1);
};
const open = async (number: string) => {
  await act(async () => openFromAccount(port.afterFake.order(number)["id"] as number));
  await settle();
};
const priya = () => {
  port.afterFake.session = 1;
  port.signedIn = true;
};

interface Row {
  name: string;
  path: string;
  before?: () => void;
  drive?: () => Promise<void>;
  /** What proves the state was reached. */
  proof: string;
}

const ROWS: Row[] = [
  { name: "NL-1053 shipped, with tracking", path: "/", before: priya, drive: () => open("NL-1053"), proof: ".nl-after-track" },
  { name: "NL-1065 by its own link", path: "/o#Q7M2K9XW4R8TB3NV", proof: ".nl-after-bylink" },
  { name: "NL-1065's cancel sheet", path: "/o#Q7M2K9XW4R8TB3NV", drive: () => press(button("Cancel the order") ?? button("ألغِ الطلب")), proof: '[role="alertdialog"]' },
  { name: "NL-1066 being paid", path: "/", before: priya, drive: () => open("NL-1066"), proof: ".nl-after-paybtn" },
  {
    name: "NL-1066 by bank transfer",
    path: "/",
    before: () => {
      priya();
      port.offer = { online: false, test: false };
      port.afterFake.asTransfer("NL-1066");
    },
    drive: () => open("NL-1066"),
    proof: ".nl-after-transfer",
  },
  { name: "the review dialog", path: "/", before: priya, drive: async () => (await open("NL-1053"), await press(button("Review an item") ?? button("قيّم منتجًا"))), proof: '[aria-labelledby="nl-rv-title"]' },
  { name: "Find your order, both fields wrong", path: "/find", drive: () => submit(".nl-code-form button[type='submit']"), proof: "#nl-code-find-number-err" },
  {
    name: "Find your order, wrong code",
    path: "/find",
    drive: async () => {
      await type("#nl-code-find-number", "NL-1053");
      await type("#nl-code-find-email", "priya.r@example.com");
      await submit(".nl-code-form button[type='submit']");
      await type("#nl-code-find-box-0", "111111");
      await submit(".nl-code-form button[type='submit']");
    },
    proof: "#nl-code-find-code-err",
  },
  { name: "Sign in", path: "/sign-in", proof: "#nl-code-signIn-email" },
  { name: "the sign-in sheet", path: "/basket", drive: async () => (await act(async () => openSignIn(true)), await settle()), proof: '[aria-labelledby="nl-si-sheet-title"]' },
  { name: "Your account", path: "/account", before: priya, proof: ".nl-acc-news" },
  { name: "the delete sheet", path: "/account", before: priya, drive: () => press($(".nl-acc-delete")), proof: '[role="alertdialog"]' },
  { name: "the return form, errors shown", path: "/", before: priya, drive: async () => (await open("NL-1053"), await press($(".nl-after-actions button")), await submit(".nl-ret-form button[type='submit']")), proof: "#nl-ret-lines-err" },
  {
    name: "a return asked",
    path: "/",
    before: priya,
    drive: async () => {
      await open("NL-1053");
      await press($(".nl-after-actions button"));
      await press($(".nl-ret-pick input"));
      await press($(".nl-ret-reason input"));
      await submit(".nl-ret-form button[type='submit']");
    },
    proof: ".nl-after-sent",
  },
];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.scrollTo = () => {};
  sessionStorage.clear();
  port = fakePort();
  resetShop(port);
  resetAfter();
  setLeave(() => {});
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("the pages after an order under axe", () => {
  for (const locale of ["en-US", "ar-EG"]) {
    for (const row of ROWS) {
      it(`${row.name} (${locale})`, async () => {
        row.before?.();
        await mount(row.path, locale);
        await row.drive?.();
        expect($(row.proof), row.proof).not.toBeNull();
        expect(document.documentElement.getAttribute("dir")).toBe(locale === "ar-EG" ? "rtl" : "ltr");
        vi.useRealTimers();
        // The pages' own parts: the header and footer are the frame's, swept by its own suite.
        const parts = ["main", '[role="dialog"]', '[role="alertdialog"]'].filter((selector) => $(selector) !== null).map((selector) => [selector]);
        const result = await axe.run({ include: parts }, AXE);
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const found = result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
        expect(found).toEqual([]);
      });
    }
  }
});
