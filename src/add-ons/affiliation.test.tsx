/**
 * WHEREVER A COMPANY IS NAMED, THE LINE IS ON THE SAME SCREEN (24 AC6) — and
 * the mount component's own render behaviour, driven.
 *
 * @vitest-environment jsdom
 *
 * ── TWO SUBJECTS IN ONE FILE, AND THEY SHARE A HARNESS ─────────────────────
 *
 * Both need the same thing: this app's surfaces rendered with the REAL
 * `AddOnSlot` and the real fills behind it, in every language. `slotRender`
 * mocks the component out because its question is about mount SITES; this one
 * cannot, because both of its questions are about what a reader actually sees.
 *
 * THE AFFILIATION WALK reads text nodes ONE AT A TIME rather than `textContent`
 * over a container, and the difference is not fussiness: `textContent` runs
 * adjacent elements together with no separator, so a heading ending in a
 * carrier's name followed by the shop's own name is the single run
 * "DHLNorthline" — and the word-boundary rule then reads the mark as part of a
 * longer word and says nothing. A planted naming passed a page-wide version of
 * this gate while sitting on 31 surfaces in one host.
 *
 * THE COMPONENT CASES are the other half of the `:empty` story. `slotContent`
 * proves the predicate; `stylesGuard` proves the stylesheet; neither can prove
 * that the component keeps the host's own content IN THE TREE so the stylesheet
 * has something to hide. Only rendering it can, and jsdom applies no
 * stylesheet — so what is asserted here is the structure the rule needs, not
 * the rule's effect.
 */

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it } from "vitest";

import { discoveredFacts, labelPairingRenderedGuard } from "../testing/kit/index.ts";
import { createAddOnSlot } from "./kit/index.ts";
import { hostKit } from "./host-kit.config.ts";
import { demoAddOns, DEMO_KEYS } from "./registry.ts";
import { AddOnsDrawer } from "../components/AddOnsDrawer.tsx";
import { Checkout } from "../screens/Checkout.tsx";
import { Confirm } from "../screens/Confirm.tsx";
import { defaultSel } from "../lib/pricing.ts";
import { I18nProvider } from "../i18n/index.tsx";
import { MESSAGES } from "../i18n/messages/index.ts";
import { LOCALE_TAGS, type LocaleTag } from "../i18n/locales";
import { useStore } from "../state/store.ts";

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.scrollTo = () => {};
  useStore.getState().registerAddOns(demoAddOns());
});

/**
 * Mount in one locale, look while it is still on the page, unmount.
 *
 * `inspect` runs against the LIVE tree because a question about rendered text
 * cannot be asked of a detached string, and because the walk needs siblings.
 */
async function renderIn(
  locale: LocaleTag,
  node: ReactNode,
  inspect: (host: HTMLElement) => void,
): Promise<void> {
  localStorage.setItem("storefront-locale", locale);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<I18nProvider>{node}</I18nProvider>);
  });
  /*
   * AND THEN LET THE PROMISES SETTLE, which is the difference between touring
   * this app and touring three blank pages.
   *
   * The rate rows arrive from an effect that asks the carrier and awaits it,
   * and the component returns `null` until they do. A synchronous `act` renders
   * exactly that `null` — so the delivery step would carry no company name, the
   * walk would find nothing, and this gate would report green over the one
   * surface in the app it most needs to read. An empty async `act` flushes the
   * microtask queue and the effects it schedules, which is all the demo
   * transport needs: it resolves in the page and makes no request.
   */
  await act(async () => {
    await Promise.resolve();
  });
  inspect(host);
  await act(async () => {
    root.unmount();
  });
  host.remove();
}

/** Drive the checkout to its delivery step, and place the order. */
function reachTheDeliveryStep(): void {
  const store = () => useStore.getState();
  const product = store().index["kb-k2"]!;
  store().add(product.id, 1, defaultSel(product));
  store().goCheckout();
  store().setField("email", "ava@example.com");
  store().coNext();
  store().setField("first", "Ava");
  store().setField("last", "Reyes");
  store().setField("addr", "118 Larkin St");
  store().setField("city", "San Francisco");
  store().setField("zip", "94102");
  store().setField("country", "US");
  store().coNext();
  expect(store().coStep, "the checkout never reached its delivery step").toBe(2);
}

function placeIt(): void {
  const store = () => useStore.getState();
  store().setField("card", "4242 4242 4242 4242");
  store().setField("exp", "04 / 29");
  store().setField("cvc", "123");
  store().setField("name", "Ava Reyes");
  store().placeOrder();
  expect(store().view).toBe("confirm");
}

/**
 * DID THE TOUR ACTUALLY MEET A COMPANY NAME? — the assertion the kit's own
 * guard-on-the-guard does not make.
 *
 * `labelPairingRenderedGuard` checks that it HAS marks to look for and that the
 * bundle HAS lines to satisfy the rule, both of which catch a discovery that
 * stopped discovering. What neither catches is a TOUR that stopped touring: a
 * fixture that rendered three surfaces on which nothing draws — an effect that
 * no longer resolves, a screen that quietly fell into its empty branch — finds
 * no marks, reports no offenders, and passes. That is this host's own tour to
 * prove, and this is the flag that proves it.
 */
const marks = discoveredFacts().marks.map((entry) => entry.mark);
let metMark = false;
const namesTheMark = (host: HTMLElement): boolean =>
  marks.some((mark) => (host.textContent ?? "").includes(mark));

labelPairingRenderedGuard(hostKit, {
  /*
   * EVERY SURFACE, WITH EVERYTHING CONNECTED. A tour with nothing connected
   * would name no company anywhere and pass by having nothing to find, which is
   * the way this gate goes blind rather than red.
   */
  tour: async (locale, read) => {
    for (const key of DEMO_KEYS) useStore.getState().connectAddOn(key);
    reachTheDeliveryStep();
    await renderIn(locale as LocaleTag, <Checkout />, (host) => {
      metMark ||= namesTheMark(host);
      read({ view: "checkout", surface: "delivery", host });
    });
    placeIt();
    await renderIn(locale as LocaleTag, <Confirm />, (host) => {
      metMark ||= namesTheMark(host);
      read({ view: "confirm", surface: "tracking", host });
    });
    useStore.getState().openAddOns();
    await renderIn(locale as LocaleTag, <AddOnsDrawer />, (host) => {
      metMark ||= namesTheMark(host);
      read({ view: "add-ons", surface: "drawer", host });
    });
    useStore.getState().closeAddOns();
  },
  /*
   * EVERY SPELLING OF THE LINE IN THIS LOCALE, which is more than one: this app
   * has its own sentence and the add-on carries its own, translated
   * independently in its own repository. Read out of the MERGED bundle rather
   * than listed, so an add-on that rewords its line does not silently stop
   * satisfying the rule.
   */
  disclaimers: (locale) =>
    Object.entries(MESSAGES[locale as LocaleTag] ?? {})
      .filter(([key]) => key.endsWith("notAffiliated"))
      .map(([, value]) => value),
});

describe("ecommerce-storefront · the tour reached the surfaces it claims to", () => {
  it("met a company name on at least one of them", () => {
    /*
     * Run after the guard above, because vitest collects every `describe` before
     * it runs any of them and the flag is set inside the tour. A green
     * affiliation gate over a tour that met nothing is the same shape of
     * nothing-to-find pass this file's other assertions exist to prevent.
     */
    expect(marks.length, "no COMPANY_MARKS were vendored at all").toBeGreaterThan(0);
    expect(
      metMark,
      "the tour rendered every surface and none of them named a company — either the " +
        "fills stopped drawing or the tour stopped reaching them, and the affiliation " +
        "gate above passed by having nothing to find",
    ).toBe(true);
  });
});

describe("ecommerce-storefront · the mount component keeps the host's own content", () => {
  /*
   * A SECOND BINDING, made here on purpose and used nowhere that ships.
   *
   * `slot.tsx` calls `createAddOnSlot` once, at module scope, because a second
   * component identity remounts every fill under it whenever a screen renders
   * the other one. That rule is about the APP; a suite that needs to drive the
   * factory over a registry of its own has no other way to do it, and nothing
   * here is ever rendered beside the real one.
   */
  const fills: { slot: string; render: () => ReactNode }[] = [];
  const { AddOnSlot } = createAddOnSlot(hostKit, ((slot: string) => ({
    fills: fills
      .filter((f) => f.slot === slot)
      .map((f) => ({ addOn: "fixture", fill: { slot, order: 10, render: f.render } })),
    settings: {},
  })) as never);

  function html(node: ReactNode): string {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(node);
    });
    const out = host.innerHTML;
    act(() => {
      root.unmount();
    });
    host.remove();
    return out;
  }

  it("draws the fallback, and only the fallback, when nothing fills it", () => {
    fills.length = 0;
    const out = html(
      <AddOnSlot slot="order.dispatch.panel" payload={{} as never} fallback={<p>own words</p>} />,
    );
    expect(out).toContain("own words");
    expect(out).not.toContain("slot-fill");
  });

  it("draws nothing at all when it is silent and nothing fills it", () => {
    fills.length = 0;
    expect(html(<AddOnSlot slot="order.dispatch.panel" payload={{} as never} />)).toBe("");
  });

  it("KEEPS the fallback in the tree beside a fill that drew, for the stylesheet", () => {
    /*
     * THE ONE THAT LOOKS WRONG AND IS THE WHOLE MECHANISM. Both are present:
     * the fill's wrapper AND the host's own content. A component that dropped
     * the fallback the moment a fill existed would be right about this render
     * and wrong about the next one, because an add-on may legitimately draw
     * NOTHING for a particular record — and then the host's own picture would
     * have been thrown away on behalf of a fill that painted nothing.
     *
     * Which of the two a person sees is the stylesheet's decision, keyed off
     * `data-drew` and `:empty`. jsdom applies no stylesheet, so this asserts
     * the structure the rule needs rather than the rule.
     */
    fills.length = 0;
    fills.push({ slot: "order.dispatch.panel", render: () => <em>the fill drew</em> });
    const out = html(
      <AddOnSlot slot="order.dispatch.panel" payload={{} as never} fallback={<p>own words</p>} />,
    );
    expect(out).toContain("the fill drew");
    expect(out).toContain("own words");
    expect(out).toContain(`${hostKit.classPrefix}-slot-fill`);
    expect(out).toContain(`${hostKit.classPrefix}-slot-spare`);
  });

  it("marks a fill that painted nothing, so the rule's second negation can fire", () => {
    fills.length = 0;
    fills.push({ slot: "order.dispatch.panel", render: () => <div /> });
    const out = html(
      <AddOnSlot slot="order.dispatch.panel" payload={{} as never} fallback={<p>own words</p>} />,
    );
    expect(out).toContain('data-drew="none"');
  });

  it("puts the spare LAST, because the rule reaches it with a sibling combinator", () => {
    fills.length = 0;
    fills.push({ slot: "order.dispatch.panel", render: () => <em>drew</em> });
    const out = html(
      <AddOnSlot slot="order.dispatch.panel" payload={{} as never} fallback={<p>own words</p>} />,
    );
    expect(out.indexOf(`${hostKit.classPrefix}-slot-fill`)).toBeLessThan(
      out.indexOf(`${hostKit.classPrefix}-slot-spare`),
    );
  });

  it("names the seam in the markup for a tour, without naming an add-on", () => {
    fills.length = 0;
    fills.push({ slot: "order.dispatch.panel", render: () => <em>drew</em> });
    const out = html(<AddOnSlot slot="order.dispatch.panel" payload={{} as never} />);
    expect(out).toContain('data-add-on-slot="order.dispatch.panel"');
  });

  it("renders every locale of every add-on string, in the drawer", () => {
    // The merged bundle is complete — `addOns.test.ts` asserts that — and this
    // is the other half: that what the drawer looks up is actually IN it. A key
    // that fell through renders verbatim, so a dotted key on the page is the
    // symptom and this is the check.
    for (const key of DEMO_KEYS) useStore.getState().connectAddOn(key);
    useStore.getState().openAddOns();
    for (const locale of LOCALE_TAGS) {
      renderIn(locale, <AddOnsDrawer />, (host) => {
        expect(host.textContent ?? "", `${locale} leaked a message key`).not.toMatch(
          /addon\.[a-z-]+\.[a-zA-Z.]+/,
        );
      });
    }
    useStore.getState().closeAddOns();
  });
});
