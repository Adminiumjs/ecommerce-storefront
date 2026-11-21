/**
 * The shop's start: find the Adminium it talks to, open its door, and draw
 * the shop. A build with nowhere to reach says so and stops; it never shows
 * invented rows.
 *
 * The website's demo builds its own door over a Northline held in the page
 * and mounts `ShopApp` the same way (`../demo/`): the seam is `useShop`'s
 * `port`, which any `ShopPort` fills.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { I18nProvider } from "../i18n/index.tsx";
import { AdminiumShop } from "./door.ts";
import type { ShopPort } from "./port.ts";
import { resolveShop } from "./served.ts";
import ShopApp from "./ShopApp.tsx";
import { useShop } from "./store.ts";

function notConnected(mount: HTMLElement): void {
  mount.innerHTML = "";
  const box = document.createElement("div");
  box.setAttribute("role", "alert");
  box.className = "nl-unconnected";
  const h = document.createElement("h1");
  h.textContent = "This shop is not connected";
  const p = document.createElement("p");
  p.textContent = "It needs a key bound to it in Adminium (or VITE_ADMINIUM_PUBLISHABLE_KEY and VITE_ADMINIUM_API_BASE_URL baked into a build of its own).";
  box.append(h, p);
  mount.append(box);
}

/** Draw the shop over a door: Adminium's, or any other `ShopPort` (the demo's). */
export function mountShop(mount: HTMLElement, port: ShopPort): void {
  useShop.setState({ port });
  createRoot(mount).render(
    <StrictMode>
      <I18nProvider>
        <ShopApp />
      </I18nProvider>
    </StrictMode>,
  );
}

export async function bootShop(mount: HTMLElement): Promise<void> {
  const served = await resolveShop();
  if (served === null) {
    notConnected(mount);
    return;
  }
  mountShop(mount, new AdminiumShop(served));
}
