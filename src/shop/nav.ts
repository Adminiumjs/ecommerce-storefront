/** The shop's sections, as Adminium lists them. */
import type { MessageKey } from "../i18n/messages/index.ts";
import type { SurfaceNavEntry } from "../surface-types.ts";

export type ShopNavEntry = SurfaceNavEntry<string> & { labelKey: MessageKey };

export const SHOP_NAV = [{ id: "home", path: "", view: "home", side: "customer", labelKey: "nav.shop" }] as const satisfies readonly ShopNavEntry[];
