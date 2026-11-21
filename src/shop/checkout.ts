/**
 * The checkout's state: the shopper's details, the delivery, placing the
 * order once at the total shown, and the paying states after. Written with
 * those screens.
 */

/**
 * Whether this tab holds an order it just placed and sent to the pay page:
 * the order's page (`/o`, no code in its fragment) then shows the paying
 * states and the confirmation (`PayReturn` in `screens/Checkout.tsx`)
 * instead of asking for a link.
 */
export function heldCheckout(): boolean {
  return false;
}
