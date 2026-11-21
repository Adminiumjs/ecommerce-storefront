/**
 * The demo build's start: the shop and the shop desk, both, over the one
 * Northline held in the page (`adminium.ts`), with no server anywhere.
 * Whoever the card says is using it — the shopper or the shop desk — has
 * their side drawn; an order placed on one side is on the other the moment it
 * is placed.
 *
 * The page answers the website's demo card (`demoBridge.ts`) and keeps no
 * card of its own: no word of "demo" is drawn on the shop or the desk. DEMO
 * BUILD ONLY — `main.tsx` reaches it behind the build-time `DEMO` flag.
 */
import { StrictMode, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";

import "../desk/desk.css";

import { I18nProvider, useI18n } from "../i18n/index.tsx";
import { resolveLocale } from "../i18n/locales.ts";
import { DeskApp } from "../desk/DeskApp.tsx";
import { DeskProvider, type DeskEnv } from "../desk/env.tsx";
import { useDesk } from "../desk/store.ts";
import { setLeave as setAfterLeave } from "../shop/after.ts";
import { setLeave, setOrderReader } from "../shop/pay.ts";
import ShopApp from "../shop/ShopApp.tsx";
import { useShop } from "../shop/store.ts";
import { attachDemoBridge, clearTab } from "../demoBridge.ts";
import { demoAdminium, useDemo } from "./adminium.ts";
import { payInDemo } from "./pay.ts";

export { DEMO_PAY_MS } from "./pay.ts";

/** The card's language, once it has said one. */
function CardLocale() {
  const { setLocale } = useI18n();
  const asked = useDemo((s) => s.locale);
  useEffect(() => {
    if (asked !== null) setLocale(resolveLocale([asked]));
  }, [asked, setLocale]);
  return null;
}

/** The card's theme on the page, for the shop and the desk alike (the desk keeps its own in step). */
function CardTheme() {
  const theme = useDemo((s) => s.theme);
  const persona = useDemo((s) => s.persona);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (useDesk.getState().theme !== theme) useDesk.setState({ theme });
  }, [theme, persona]);
  return null;
}

export function DemoRoot() {
  const persona = useDemo((s) => s.persona);
  const generation = useDemo((s) => s.generation);
  const env = useMemo<DeskEnv>(
    () => ({ door: demoAdminium().desk }),
    // A fresh world is a new door.
    [generation],
  );
  return (
    <>
      <CardLocale />
      <CardTheme />
      {persona === "shopper" ? (
        <ShopApp />
      ) : (
        <DeskProvider env={env}>
          <DeskApp />
        </DeskProvider>
      )}
    </>
  );
}

export async function bootDemo(mount: HTMLElement): Promise<void> {
  // A new demo page is a new Northline: nothing of the last one's basket, order or sign-in.
  clearTab();
  setLeave((url) => payInDemo(url));
  setAfterLeave((url) => payInDemo(url));
  // The order as the page's Adminium has it now, as its own link would read it.
  setOrderReader(async (_port, id) => {
    const row = demoAdminium().world.get("orders", id);
    if (row === undefined) return null;
    const { link_token: _t, staff_note: _n, client_key: _k, _label, ...rest } = row;
    return structuredClone(rest);
  });
  useShop.setState({ port: demoAdminium().shop });
  createRoot(mount).render(
    <StrictMode>
      <I18nProvider>
        <DemoRoot />
      </I18nProvider>
    </StrictMode>,
  );
  attachDemoBridge();
}
