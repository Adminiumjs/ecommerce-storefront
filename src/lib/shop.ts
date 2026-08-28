// The merchant's own settings, read once through the seam.
//
// Every constant here used to be imported straight from `data/demo.ts` by the
// pricing engine, the store and five screens. That is §5.1's caveat (a): rows
// behind the seam do nothing for code that reaches around it. A connected
// storefront kept the demo's 8.5% tax, the demo's promo code, the demo's
// shipping prices and the demo's name while every product on the page came from
// the merchant's own database — and none of that looks wrong on screen.
//
// Read at module scope, which is why `main.tsx` imports `App` dynamically. The
// seam's `setDataSource` throws if that ordering is ever broken.
import { source } from "../data/source.ts";

export const SHOP = source.getShop();

export const BRAND = SHOP.brand;
export const HERO_IMAGE = SHOP.heroImage;
export const FREE_SHIP = SHOP.freeShip;
export const PROMO_CODE = SHOP.promoCode;
export const PROMO_RATE = SHOP.promoRate;
export const BUNDLE_OFF = SHOP.bundleOff;
export const TAX_RATE = SHOP.taxRate;
export const SHIP_STANDARD = SHOP.ship.standard;
export const SHIP_EXPRESS = SHOP.ship.express;
export const SHIP_OVERNIGHT = SHOP.ship.overnight;
