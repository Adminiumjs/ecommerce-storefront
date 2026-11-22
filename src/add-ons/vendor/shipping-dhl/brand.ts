/*
 * VENDORED from add-ons/packages/shipping-dhl/src/brand.ts — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The add-on key is `shipping-dhl`; its manifest, tests and README live in the monorepo.
 */
import type { CarrierBrand } from "../shipping-kit/brand.ts";

import { ADD_ON_KEY } from "./add-on-key.ts";

/** Who the shared screens are drawing for. The company is named only to say what is connected to. */
export const DHL_BRAND: CarrierBrand = {
  addOnKey: ADD_ON_KEY,
  name: "DHL",
  monogram: "DHL",
  idPrefix: "dhl",
};
