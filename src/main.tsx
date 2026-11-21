/*
 * Entry point: which of the app's starts this bundle runs.
 *
 *   the customer build   the shop, on the key Adminium binds to it;
 *   the staff build      the desk, on the signed-in person's session;
 *   the demo build       both, over one Northline held in the page, for the
 *                        website's demo card;
 *   a connected build    the shop on its own domain, on the address and key
 *                        baked in (`VITE_ADMINIUM_API_BASE_URL` and
 *                        `VITE_ADMINIUM_PUBLISHABLE_KEY`).
 *
 * Each start is a dynamic import behind a flag `surface.ts` folds at build
 * time, so a bundle carries only its own.
 */

import "./styles/tokens.css";
import "./styles/base.css";

import { DEMO, SURFACE_SIDE } from "./surface.ts";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root — check index.html");

async function boot(mount: HTMLElement): Promise<void> {
  if (SURFACE_SIDE === "staff") {
    const { bootDesk } = await import("./desk/boot.tsx");
    await bootDesk(mount);
    return;
  }
  if (SURFACE_SIDE === null && DEMO) {
    const { bootDemo } = await import("./demo/boot.tsx");
    await bootDemo(mount);
    return;
  }
  const { bootShop } = await import("./shop/boot.tsx");
  await bootShop(mount);
}

void boot(container);
