/**
 * The app's screens, as data, for `surface.json`: the file each surface
 * build writes beside its `index.html`, which Adminium reads to list the
 * app's sections. Each side's entries come from that side's own module.
 *
 * Icons are lucide NAMES in kebab-case, never imported components: this
 * module is read by the Vite config.
 */
import type { MessageKey } from "./i18n/messages/index.ts";
import { DESK_NAV } from "./desk/nav.ts";
import { SHOP_NAV } from "./shop/nav.ts";

export const APP_KEY = "ecommerce-shop";

/** The app's name, as the sidebar heads its section. */
export const APP_LABEL_KEY: MessageKey = "brand.name";

export const SURFACE_NAV = [...SHOP_NAV, ...DESK_NAV] as const;
