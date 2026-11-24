/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/customsSettings.ts — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * What the two shop settings panels share: a save never drops the part of the
 * shop's setup the other panel owns, and a refusal is read by its code.
 */
import type { EngineInternational, EngineInternationalBody } from "../../host/engine-carrier.ts";

import type { StringKey } from "../i18n/strings.ts";

/**
 * The whole setup as the engine keeps it, with this panel's changes on top.
 * The engine replaces the record on a save, so `view` must be read just before
 * saving: a copy from when a panel opened would undo what the other panel saved.
 * `first` is used only while nothing is saved, so adding a country never moves
 * an origin the owner chose. Export numbers left out stay as they are.
 *
 * The currency is always the shop's own as the engine reads it now, never a
 * remembered or assumed one: a declaration in the wrong currency is a false one.
 */
export function savedBody(
  view: EngineInternational,
  first: Pick<EngineInternationalBody, "originCountry">,
  change: Partial<EngineInternationalBody> = {},
): EngineInternationalBody {
  const held = view.settings;
  // The panels stop before this for a shop with none. Should it go in between, nothing is saved.
  if (view.shopCurrency === null) throw new Error("This shop has no currency set.");
  return {
    countries: held?.countries ?? [],
    currency: view.shopCurrency,
    originCountry: held?.originCountry ?? first.originCountry,
    ...(held?.description === undefined ? {} : { description: held.description }),
    ...(held?.hsCode === undefined ? {} : { hsCode: held.hsCode }),
    ...(held === null ? {} : { signerId: held.signerId, products: held.products }),
    ...change,
  };
}

export function refusalWords(code: string): StringKey {
  switch (code) {
    case "CUSTOMS_NOT_DECLARED":
      return "addon.shipping-kit.customs.refused.app.next";
    case "CUSTOMS_SIGNER":
      return "addon.shipping-kit.customs.noSigner.manage";
    case "CSRF_FAILED":
      return "addon.shipping-kit.engine.refused.csrf.next";
    case "FORBIDDEN":
      return "addon.shipping-kit.settings.noRight";
    default:
      return "addon.shipping-kit.settings.saveFailed";
  }
}
