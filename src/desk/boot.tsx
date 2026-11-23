/**
 * The staff build's start: the desk served by Adminium at
 * `/apps/ecommerce-shop/staff/`, riding the signed-in person's session.
 *
 * It reads the staff `surface-config.json` (who is signed in, the tables'
 * real names, the shop's zone and money and settings, the add-ons on), opens
 * the door over the session, reads the rows, and draws the desk. Nobody
 * signed in goes to Adminium's sign-in and comes back. A server that does not
 * answer the config is a hard stop, said plainly: the desk never guesses a
 * database. Every screen's address is kept in step with the URL, and, inside
 * the dashboard, with the host's sidebar, theme and language.
 */
import { PaidLabelSlot } from "../add-ons/paid-label.tsx";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";

import "../styles/tokens.css";
import "../styles/base.css";
import "./desk.css";

import { I18nProvider, useI18n } from "../i18n/index.tsx";
import { resolveLocale } from "../i18n/locales.ts";
import { APP_KEY } from "../surface-nav.ts";
import { AdminiumDesk } from "./adminiumDesk.ts";
import { DeskApp } from "./DeskApp.tsx";
import { DeskProvider, reload, type DeskEnv } from "./env.tsx";
import { DESK_NAV } from "./nav.ts";
import { currentView, go, useDesk, type View } from "./store.ts";
import { createSessionTransport } from "./transport/sessionSource.ts";
import { loadStaffConfig } from "./transport/staffConnection.ts";

/** The host's language, as the dashboard last said it; null until it says. */
let hostLocale: string | null = null;
const localeListeners = new Set<() => void>();

function HostLocale() {
  const { setLocale } = useI18n();
  useEffect(() => {
    const apply = () => {
      if (hostLocale !== null) setLocale(resolveLocale([hostLocale]));
    };
    apply();
    localeListeners.add(apply);
    return () => void localeListeners.delete(apply);
  }, [setLocale]);
  return null;
}

/** A failure before anything could be drawn: said plainly, in a box that needs nothing else to work. */
function fail(mount: HTMLElement, message: string): void {
  const box = document.createElement("div");
  box.setAttribute("role", "alert");
  box.className = "dk-failed";
  box.textContent = message;
  mount.replaceChildren(box);
}

export async function bootDesk(mount: HTMLElement): Promise<void> {
  const cfg = await loadStaffConfig();
  if (cfg === null) {
    fail(mount, "This Adminium did not answer the desk's configuration. It may be older than this app, or the app is not installed.");
    return;
  }
  if (cfg.user === null || cfg.csrfToken === null) {
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    return;
  }
  if (cfg.appName !== null) document.title = cfg.appName;
  const transport = createSessionTransport({
    tableOfRef: cfg.tables,
    connectionId: cfg.connectionId ?? undefined,
    installId: cfg.installId,
    staff: { csrfToken: cfg.csrfToken, timezone: cfg.timezone, timezoneSource: cfg.timezoneSource, serverTimezone: cfg.serverTimezone, currency: cfg.currency },
    refreshToken: async () => (await loadStaffConfig())?.csrfToken ?? null,
  });
  const said = cfg.now === undefined || cfg.now === null ? Number.NaN : Date.parse(cfg.now);
  const door = new AdminiumDesk(transport, cfg, { skew: Number.isNaN(said) ? 0 : said - Date.now() });

  const { attachUrlSync, surfaceBase } = await import("../urlSync.ts");
  const env: DeskEnv = {
    door,
    // Signed out, the next person signs in to the desk's own address, never to the screen this person was on.
    leave: () => window.location.assign(`/login?next=${encodeURIComponent(surfaceBase(window.location.pathname, import.meta.env.BASE_URL))}`),
  };
  let bridge: { navigated: (path: string) => void } | null = null;
  const sync = attachUrlSync({ nav: DESK_NAV, side: "staff", go: (view) => go(view as View), current: currentView, onPath: (path) => bridge?.navigated(path) });
  const { connectToHost } = await import("../embed.ts");
  bridge = await connectToHost(APP_KEY, "staff", sync.path(), {
    onTheme: (theme) => useDesk.setState({ theme }),
    onLocale: (locale) => {
      hostLocale = locale;
      for (const listener of localeListeners) listener();
    },
    onPath: (path) => sync.applyPath(path),
  });
  useDesk.subscribe(sync.reflect);

  createRoot(mount).render(
    <StrictMode>
      <I18nProvider>
        <HostLocale />
        <PaidLabelSlot />
        <DeskProvider env={env}>
          <DeskApp />
        </DeskProvider>
      </I18nProvider>
    </StrictMode>,
  );
  await reload(door);
}
