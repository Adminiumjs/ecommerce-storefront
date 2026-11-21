/** S9–S14 after the order: built in its own module. */
export function OrderScreen() {
  return <main id="main" className="nl-page" />;
}
export const OrderReturnScreen = OrderScreen;
export const FindScreen = OrderScreen;
export const SignInScreen = OrderScreen;
export const AccountScreen = OrderScreen;
/** The sign-in as a sheet over another screen (from the checkout): opened by `openSignIn()`. */
export function SignInSheet() {
  return null;
}
