/*
 * VENDORED from add-ons/packages/shipping-kit/src/index.ts — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * The shared carrier kit's client entry: the screens every carrier add-on
 * fills its slots with. Bundled into each add-on, never published.
 *
 * NO TRANSPORT IS REACHABLE FROM HERE. This code runs in a browser, so it holds
 * no credential and names no way of sending anything. A server half imports
 * the React-free modules by path (`@adminium/add-on-shipping-kit/demo-carrier.ts`)
 * and never this file, because this one pulls in React.
 */

import { strings, type LocaleTag } from "./i18n/strings.ts";

export { configureShippingKit, kitBrand, type CarrierBrand } from "./brand.ts";
export { applySettings, DEFAULT_SETTINGS, type PublicSettings } from "./settings.ts";
export { connectEngineCarrier, engineCarrier, useConnectedCarrier } from "./runtime.ts";
export { DeliveryMethods } from "./ui/DeliveryMethods.tsx";
export { DispatchAction } from "./ui/DispatchAction.tsx";
export { NeedsAttentionList, type NeedsAttentionListProps } from "./ui/NeedsAttentionList.tsx";
export { OpenParcelsRefresh, type OpenParcelsRefreshProps } from "./ui/OpenParcelsRefresh.tsx";
export { ReturnLabel } from "./ui/ReturnLabel.tsx";
export { EngineReturnLabel } from "./ui/EngineReturnLabel.tsx";
export { clearPaidLabel, isPaidLabelStopped, PAID_LABEL_HEADER, PaidLabelHost, withPaidLabel } from "./ui/PaidLabelDialog.tsx";
export { SettingsPanel } from "./ui/SettingsPanel.tsx";
export { TrackingPanel } from "./ui/TrackingPanel.tsx";

/**
 * The kit's copy with the company's name written in, for the host's bundle.
 * The screens read their own copy; this is what a host's parity checks and any
 * host surface see, where nothing would fill in a `{carrier}`.
 */
export function kitMessages(carrierName: string): Record<LocaleTag, Record<string, string>> {
  const named = {} as Record<LocaleTag, Record<string, string>>;
  for (const locale of Object.keys(strings) as LocaleTag[]) {
    named[locale] = Object.fromEntries(
      Object.entries(strings[locale]).map(([key, value]) => [key, value.replaceAll("{carrier}", carrierName)]),
    );
  }
  return named;
}
