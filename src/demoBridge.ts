/**
 * The demo build's side of the website's demo card: the card says which
 * screen, person, language and theme to show, presses shortcuts and moves
 * the clock; the page says where it is. DEMO BUILD ONLY — `main.tsx` reaches
 * it only behind the build-time `DEMO` flag, through the demo's own start, so
 * no surface bundle carries the protocol.
 *
 * Both ends speak only to their own origin: the card's page frames this one
 * from the same site, so a message from anywhere else, or from any window but
 * the one framing this page, is ignored, and nothing is ever posted to `*`.
 */
import { DEMO_MESSAGE_PREFIX, isDemoMessage, type DemoMessage } from "./demo-types.ts";
import { demoAdminium, useDemo } from "./demo/adminium.ts";
import { advanceDay, currentScreen, goScreen, resetWorld, runShortcut, setPersona, SCREEN_IDS, SHORTCUT_IDS } from "./demo/shortcuts.ts";
import { useDesk } from "./desk/store.ts";
import { useAfter } from "./shop/after.ts";
import { useCheckout } from "./shop/checkout.ts";
import { useShop } from "./shop/store.ts";

export { SCREEN_IDS, SHORTCUT_IDS };

const APP_KEY = "ecommerce-shop";

/** What the shop keeps for the tab and the browser: a new demo page starts without the last one's basket, order or sign-in. */
const LOCAL_SLOTS = ["northline.basket"];
const TAB_SLOTS = ["northline.shop.checkout", "northline.after.chosen"];
const TAB_PREFIX = "northline.shop.session.";

const locale = (): string => document.documentElement.lang || "en-US";

function post(message: DemoMessage): void {
  if (window.parent === window) return;
  window.parent.postMessage(message, window.location.origin);
}

/** The shop clock as the card prints it, in the page's language: "Tue 18 Aug · 11:40". */
export function clockLabel(): string {
  const w = demoAdminium().world;
  const tag = locale() === "en-US" ? "en-GB" : locale();
  const at = new Date(w.now);
  const day = new Intl.DateTimeFormat(tag, { timeZone: w.zone, weekday: "short", day: "numeric", month: "short" }).format(at);
  const time = new Intl.DateTimeFormat(tag, { timeZone: w.zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
  return `${day} · ${time}`;
}

/** Whether the page shows a dialog, a sheet or a panel over the screen: the card steps aside while it does. */
function overlay(): boolean {
  if (useDemo.getState().persona === "desk") {
    const s = useDesk.getState();
    return s.overlay !== null || s.navOpen;
  }
  const s = useShop.getState();
  const a = useAfter.getState();
  return s.drawer || s.signInSheet || s.filterSheet || s.guideOpen || useCheckout.getState().refusal !== null || a.cancelSheet || a.deleteSheet.open || a.review.open;
}

let queued = false;

/** Where the page is, for the card — once per burst of changes. */
export function reportState(): void {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    post({
      type: `${DEMO_MESSAGE_PREFIX}state` as "adminium:demo:state",
      dv: 1,
      screen: currentScreen(),
      persona: useDemo.getState().persona,
      mode: null,
      online: true,
      toggles: {},
      locale: locale(),
      theme: useDemo.getState().theme,
      clockLabel: clockLabel(),
      overlay: overlay(),
    });
  });
}

export function clearTab(): void {
  try {
    for (const slot of LOCAL_SLOTS) localStorage.removeItem(slot);
  } catch {
    // no storage: nothing kept to clear
  }
  try {
    for (const slot of TAB_SLOTS) sessionStorage.removeItem(slot);
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key !== null && key.startsWith(TAB_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // no storage: nothing kept to clear
  }
}

export async function applyDemoMessage(message: DemoMessage): Promise<void> {
  switch (message.type) {
    case "adminium:demo:init":
    case "adminium:demo:set": {
      if (message.theme !== undefined) useDemo.setState({ theme: message.theme });
      if (message.locale !== undefined) useDemo.setState({ locale: message.locale });
      if (message.persona === "shopper" || message.persona === "desk") {
        const was = useDemo.getState().persona;
        await setPersona(message.persona);
        // The card names only the person: the page opens that person's first screen (N4-F11).
        if (message.type === "adminium:demo:set" && was !== message.persona) await goScreen(message.persona === "desk" ? "today" : "home");
      }
      if (message.type === "adminium:demo:init" && message.screen !== undefined) await goScreen(message.screen);
      break;
    }
    case "adminium:demo:go":
      await goScreen(message.screen);
      break;
    case "adminium:demo:do":
      await runShortcut(message.shortcut);
      break;
    case "adminium:demo:clock":
      if (message.advance === "day") await advanceDay();
      break;
    case "adminium:demo:reset":
      clearTab();
      await resetWorld();
      break;
    default:
      break;
  }
  reportState();
}

export function attachDemoBridge(): void {
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window.parent || event.origin !== window.location.origin || !isDemoMessage(event.data)) return;
    void applyDemoMessage(event.data);
  });
  for (const store of [useDemo, useShop, useDesk, useAfter, useCheckout]) (store as { subscribe: (f: () => void) => unknown }).subscribe(reportState);
  demoAdminium().world.onChange(reportState);
  new MutationObserver(reportState).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  post({ type: `${DEMO_MESSAGE_PREFIX}hello` as "adminium:demo:hello", dv: 1, appKey: APP_KEY });
}
