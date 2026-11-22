/*
 * VENDORED from add-ons/packages/shipping-dhl/src/demo-carrier.ts — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The add-on key is `shipping-dhl`; its manifest, tests and README live in the monorepo.
 */
/**
 * The shared demo transport, answering as DHL Shipping. It holds no credential
 * and makes no call, so both halves may carry it.
 */
import {
  createDemoCarrier as createKitDemoCarrier,
  type DemoCarrier,
  type DemoCarrierOptions,
} from "../shipping-kit/demo-carrier.ts";

import { DHL_BRAND } from "./brand.ts";

export { POSTCODE_REFUSAL, postcodeFits, SENDER_POSTCODE_REFUSAL, type DemoCarrier } from "../shipping-kit/demo-carrier.ts";

export function createDemoCarrier(options: Omit<DemoCarrierOptions, "brand">): DemoCarrier {
  return createKitDemoCarrier({ ...options, brand: DHL_BRAND });
}
