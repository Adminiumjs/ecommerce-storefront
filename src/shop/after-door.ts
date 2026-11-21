/**
 * The after-order door on a real Adminium: built on the shop's own clients
 * (`AdminiumShop.client` for the signed-in customer, `.linkClient` for an
 * order's own link). Written with those screens.
 */
import type { AdminiumShop } from "./door.ts";
import type { AfterPort } from "./after-port.ts";

export class AdminiumAfter implements AfterPort {
  readonly shop: AdminiumShop;
  constructor(shop: AdminiumShop) {
    this.shop = shop;
  }
}
