/**
 * The demo's pay step: where "Pay" goes instead of a payment service's page.
 * After the hand-off moment ("Taking you to the secure payment page…") the
 * order is settled in the page's own world — paid, by default — and the
 * shopper is back on the checkout's paying states, as from the real pay
 * page. No card field, no money moves, nothing leaves the page.
 *
 * The card's "Paying" shortcuts settle the same order another way: the bank
 * still confirming, or the payment not finished.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { reread } from "../shop/after.ts";
import { resumePay, useCheckout } from "../shop/checkout.ts";
import { demoAdminium } from "./adminium.ts";
import { DEMO_PAY } from "./shop.ts";

/** How long the demo shows the hand-off before the shopper is back. */
export const DEMO_PAY_MS = 1_400;

/** How a payment at the demo's pay step ends: paid, the bank confirming, not finished, or still open on the page. */
export type Outcome = "paid" | "confirming" | "failed" | "open";

/** An order at the pay step settled one way, then the page asks Adminium how it stands, as on the way back. */
export async function settle(orderId: string, outcome: Outcome): Promise<void> {
  const w = demoAdminium().world;
  if (outcome === "paid") w.pay(orderId);
  else {
    w.payStates.set(orderId, outcome);
    w.changed();
  }
  if (String(useCheckout.getState().held?.order["id"] ?? "") !== orderId) {
    await reread();
    return;
  }
  // Still open at the pay page: the way back keeps asking, and is not waited for.
  if (outcome === "open") void resumePay();
  else await resumePay();
}

/** The order a pay address names, or null for any other address. */
export const orderOfPay = (url: string): string | null => (url.startsWith(DEMO_PAY) ? url.slice(DEMO_PAY.length) : null);

export function payInDemo(url: string, after = DEMO_PAY_MS, outcome: Outcome = "paid"): void {
  const orderId = orderOfPay(url);
  if (orderId === null) return;
  setTimeout(() => void settle(orderId, outcome), after);
}
