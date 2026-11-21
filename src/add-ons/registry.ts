/**
 * The add-ons the DEMO desk compiles in: DHL Shipping's client half, and
 * nothing else. A real install never loads this: its desk draws the client
 * half Adminium serves for the app (`connected.ts`), and this round a real
 * shop types its carrier and tracking number itself (C4).
 *
 * THIS IS THE ONE PLACE THIS APP'S SOURCE NAMES AN ADD-ON'S CODE. The demo's
 * door reaches it only by a dynamic `import()` (`demo/desk.ts`), and only
 * once a screen needs DHL's flow, so the desk's other screens load none of it
 * and no surface build reaches it at all.
 *
 * `./vendor/shipping-dhl/` is a SYNCED COPY of the add-ons monorepo's
 * package, not a fork: edit the package and re-run `scripts/sync-add-ons.sh
 * sync`; `status` is the drift check. The object `register()` returns is
 * typed by the vendored contract and assigned here into `readonly AddOn[]`
 * typed by our own `./host.ts`, so `tsc` is the check that the two agree.
 *
 * The client half makes no third-party call of its own: with no carrier
 * injected it answers from its demo carrier, in the page, and marks its
 * booking as the demo's, which is why only the demo may mount it.
 */
import { createRegistry, type AddOn, type AddOnRegistry } from "./host.ts";
import { register as shippingDhl } from "./vendor/shipping-dhl/index.ts";

const REGISTERED: readonly AddOn[] = [shippingDhl()];

/** The registry the demo desk's slots read. */
export const DESK_REGISTRY: AddOnRegistry = createRegistry(REGISTERED);
