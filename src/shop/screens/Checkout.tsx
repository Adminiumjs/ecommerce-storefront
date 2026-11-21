/** S6–S8 the checkout, its paying states and the confirmation: built in its own module. */
export function CheckoutScreen() {
  return <main id="main" className="nl-page" />;
}

/** Back from the pay page on the order's address: the paying states, then the confirmation. Shown when `heldCheckout()`. */
export function PayReturn() {
  return null;
}
