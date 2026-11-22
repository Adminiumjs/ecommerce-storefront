/*
 * VENDORED from add-ons/packages/shipping-kit/src/brand.ts — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * WHICH CARRIER THESE SCREENS ARE DRAWING FOR. Plan 79, S2-F10 and U26.
 *
 * The screens, their copy and the demo are shared by every carrier add-on, so
 * no carrier's name is written in them. The add-on says who it is from its
 * `register()`, and that is the only place the name comes from.
 *
 * ONE CARRIER PER COPY OF THIS MODULE. Each add-on's built bundle inlines its
 * own copy, so two carriers on one page never share this state. A host that
 * vendored two carriers onto ONE copy would show one company's name on the
 * other's screens, so a second, different carrier is refused rather than
 * quietly taking over.
 */

export interface CarrierBrand {
  /** The add-on's manifest key: written on a delivery choice and read back from one. */
  addOnKey: string;
  /** The company's name, as written in every language. */
  name: string;
  /** Letters on a neutral tile. Never a mark, drawn or traced. */
  monogram: string;
  /** What the demo starts its made-up shipment and label ids with. */
  idPrefix: string;
}

let brand: CarrierBrand | null = null;

export function configureShippingKit(next: CarrierBrand): void {
  if (brand !== null && brand.addOnKey !== next.addOnKey) {
    throw new Error(`This copy of the shipping kit already draws for ${brand.addOnKey}, so it cannot also draw for ${next.addOnKey}.`);
  }
  brand = next;
}

export function kitBrand(): CarrierBrand {
  if (brand === null) throw new Error("The shipping kit was used before its add-on's register() named the carrier.");
  return brand;
}

/** Test seam, reachable from nothing a shopper loads. */
export function resetShippingKit(): void {
  brand = null;
}
