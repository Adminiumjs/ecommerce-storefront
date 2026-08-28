/**
 * THE THREE SLOTS THIS APP HOSTS, ASSERTED BY RENDERING THE APP.
 *
 * @vitest-environment jsdom
 *
 * ── WHY THIS REPLACES A GREP, AND IS NOT A STRICTER VERSION OF ONE ─────────
 *
 * A search over the sources for `slot="…"` is satisfied by a mount inside a
 * JSX comment, by a mount behind a condition that is never true, and by a mount
 * in a file nothing renders. One of the two hosts that had this seam first
 * shipped `nav.add-on.routes` in its hosted list for a release with a real fill
 * behind it and no screen at all: the add-on's whole page existed, was
 * registered, was enabled, and was on nobody's screen.
 *
 * A slot is recorded here only when REACT CALLS THE COMPONENT. That is a
 * different question from the grep's, not a sharper one.
 *
 * ── AND THE OTHER HALF: D6, PROVED BY RENDERING TWICE ──────────────────────
 *
 * `renderEverySurface` runs the whole app twice — once with NOTHING connected
 * and once with everything — and both passes matter for different reasons. The
 * second reaches a slot that only exists once an add-on is switched on (the
 * settings panel lives inside a card in the manage drawer, and a drawer with no
 * connected add-on correctly has no card). The FIRST is the D6 claim itself:
 * with an empty `enabled` set every mount still happens and every one of them
 * is handed the host's own words, so the app a shopper meets is the app that
 * shipped before this seam existed.
 *
 * WHY A DOM AND NOT `renderToStaticMarkup`: zustand v5 serves
 * `getInitialState()` as its server snapshot, so a server render shows the
 * state the store was BORN in and no amount of driving it has any effect.
 * `jsdom` is a devDependency and ships in nothing (25 D11 is about runtime
 * dependencies — see `host-kit.config.ts`).
 */

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { mountsGuard, type SlotMountRecord } from "../testing/kit/index.ts";
import { hostKit } from "./host-kit.config.ts";
import { HOSTED_SLOTS, SLOT_EMPTY_BEHAVIOUR } from "./slots.ts";
import { demoAddOns, DEMO_KEYS } from "./registry.ts";
import { defaultSel } from "../lib/pricing.ts";
import { I18nProvider } from "../i18n/index.tsx";
import { AddOnsDrawer } from "../components/AddOnsDrawer.tsx";
import { Checkout } from "../screens/Checkout.tsx";
import { Confirm } from "../screens/Confirm.tsx";
import { useStore } from "../state/store.ts";

/** The recorder, hoisted so `vi.mock` — which runs first — can close over it. */
const { mounts } = vi.hoisted(() => ({ mounts: [] as SlotMountRecord[] }));

/**
 * The one component every fill reaches the page through, replaced by a spy.
 *
 * It draws a MARKER rather than the fill, and the marker is `hidden` so it can
 * never be mistaken for paint. This suite is about the mount sites a screen
 * offers and the empty states it hands them, not about what an add-on draws:
 * the fills have their own suites in their own package, and letting them render
 * here would make this app's D6 behaviour depend on which add-ons happened to
 * be vendored on the day.
 */
vi.mock("./slot.tsx", () => ({
  AddOnSlot: (props: { slot: string; fallback?: ReactNode }) => {
    mounts.push({ slot: props.slot, fallback: props.fallback });
    return <div hidden data-slot-mount={props.slot} />;
  },
  SlotFill: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // Pinned, so the suite reads one language rather than the machine's.
  localStorage.setItem("storefront-locale", "en-US");
  // `go()` and `toTop()` scroll a real window; jsdom has none and says so,
  // loudly, on every view change.
  window.scrollTo = () => {};
  /*
   * The store is born with an EMPTY registry — `main.tsx` registers at
   * bootstrap, because in connected mode the list arrives from the server. A
   * suite that skipped this would render every surface against nothing and pass
   * by having no add-ons to get wrong.
   */
  useStore.getState().registerAddOns(demoAddOns());
});

/** Mount, unmount. Nothing here reads the markup; the spy is the instrument. */
function render(node: ReactNode): void {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<I18nProvider>{node}</I18nProvider>);
  });
  act(() => {
    root.unmount();
  });
  host.remove();
}

/**
 * Every surface in this app that mounts a slot, with whatever state it takes to
 * reach the mount.
 *
 * Each is driven through the store's OWN actions rather than by writing state
 * in by hand, so a screen that quietly started rendering its "nothing here yet"
 * branch instead would stop recording and fail. The checkout in particular is
 * only at its delivery step after a basket exists and two steps have been
 * validated — a suite that set `coStep` directly would keep passing after the
 * step stopped being reachable.
 */
function renderEverySurface(): void {
  const store = () => useStore.getState();

  /*
   * `defaultSel` and not `{}`. This product has a variant matrix, and `add`
   * refuses a combination that does not exist — quietly, with a toast — so an
   * empty selection leaves the basket empty, `goCheckout` bails, and the
   * checkout renders a step that mounts nothing. That failure looks exactly
   * like "the slot is not mounted", which is why every step below is asserted
   * rather than assumed.
   */
  const product = store().index["kb-k2"]!;
  store().add(product.id, 1, defaultSel(product));
  expect(store().getCount(), "the basket is empty, so there is no checkout").toBeGreaterThan(0);

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
  render(<Checkout />);

  /*
   * A REAL PLACED ORDER, through the app's own validation, because `Confirm`
   * renders `lastOrder` and the store leaves the seeded one in place when
   * `placeOrder` refuses. A suite that skipped the card fields would render the
   * confirmation of an order nobody placed and never notice that the checkout
   * had stopped being completable.
   */
  store().setField("card", "4242 4242 4242 4242");
  store().setField("exp", "04 / 29");
  store().setField("cvc", "123");
  store().setField("name", "Ava Reyes");
  store().placeOrder();
  expect(store().view, "the order was refused, so this is not a confirmation").toBe("confirm");
  render(<Confirm />);

  /*
   * The third slot lives inside the CARD of a connected add-on in the manage
   * drawer, so it is only reachable once something is switched on. A shop with
   * nothing connected never draws it, and is right not to — which is why the
   * caller runs this function twice rather than this function demanding a mount
   * the app is correct to withhold.
   */
  store().openAddOns();
  render(<AddOnsDrawer />);
  store().closeAddOns();
}

mountsGuard(hostKit, {
  reset: () => {
    mounts.length = 0;
  },
  renderEverySurface: () => {
    // Pass one: NOTHING CONNECTED. This is the D6 state and the state every
    // shopper meets in a shipped demo.
    for (const key of DEMO_KEYS) useStore.getState().disconnectAddOn(key);
    renderEverySurface();
    // Pass two: everything connected, which is the only way to reach a slot
    // that lives inside a connected add-on's own card.
    for (const key of DEMO_KEYS) useStore.getState().connectAddOn(key);
    renderEverySurface();
  },
  recorded: () => mounts,
});

describe("ecommerce-storefront · what each mount promises when it is empty", () => {
  beforeAll(() => {
    mounts.length = 0;
    for (const key of DEMO_KEYS) useStore.getState().connectAddOn(key);
    renderEverySurface();
  });

  it("hands real words to every slot it declared speaks", () => {
    /*
     * THE DECLARATION, CHECKED AGAINST THE SCREEN. `SLOT_EMPTY_BEHAVIOUR` is
     * one half of a decision recorded twice on purpose; the presence of a
     * `fallback` prop at the mount site is the other. A slot declared `speaks`
     * with no fallback renders NOTHING when nothing fills it — a labelled place
     * on a page with a hole in it — and neither the type checker nor the grep
     * can see the difference.
     */
    for (const slot of HOSTED_SLOTS) {
      const seen = mounts.filter((m) => m.slot === slot);
      expect(seen.length, `${slot} was never mounted`).toBeGreaterThan(0);
      if (SLOT_EMPTY_BEHAVIOUR[slot] === "speaks") {
        expect(
          seen.every((m) => m.fallback !== undefined),
          `${slot} is declared to speak and at least one mount hands over no fallback`,
        ).toBe(true);
      } else {
        expect(
          seen.every((m) => m.fallback === undefined),
          `${slot} is declared silent and a mount hands over a fallback`,
        ).toBe(true);
      }
    }
  });
});
