/**
 * The desk's sections, as Adminium lists them in its sidebar (`surface.json`)
 * and as the desk's own sidebar draws them. A detail screen (one order, one
 * product, one customer) has no entry: the address keeps its section's path.
 *
 * Icons are lucide NAMES in kebab-case, never imported components: this
 * module is read by the Vite config.
 */
import type { MessageKey } from "../i18n/messages/index.ts";
import type { SurfaceNavEntry } from "../surface-types.ts";

export type DeskNavEntry = SurfaceNavEntry<string> & { labelKey: MessageKey; icon: string };

export const DESK_NAV = [
  { id: "today", path: "", view: "today", side: "staff", icon: "layout-grid", labelKey: "desk.nav.today" },
  { id: "orders", path: "orders", view: "orders", side: "staff", icon: "receipt-text", labelKey: "desk.nav.orders" },
  { id: "packing", path: "packing", view: "packing", side: "staff", icon: "package-check", labelKey: "desk.nav.packing" },
  { id: "returns", path: "returns", view: "returns", side: "staff", icon: "undo-2", labelKey: "desk.nav.returns" },
  { id: "products", path: "products", view: "products", side: "staff", icon: "shirt", labelKey: "desk.nav.products" },
  { id: "reviews", path: "reviews", view: "reviews", side: "staff", icon: "star", labelKey: "desk.nav.reviews" },
  { id: "customers", path: "customers", view: "customers", side: "staff", icon: "users", labelKey: "desk.nav.customers" },
  { id: "settings", path: "settings", view: "settings", side: "staff", icon: "settings", labelKey: "desk.nav.settings" },
] as const satisfies readonly DeskNavEntry[];

/** The section a screen belongs to, for the sidebar's lit entry. */
export function sectionOf(view: string): string {
  switch (view) {
    case "order":
      return "orders";
    case "product":
      return "products";
    case "customer":
      return "customers";
    default:
      return view;
  }
}
