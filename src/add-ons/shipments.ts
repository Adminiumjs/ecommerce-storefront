/**
 * The carrier kit's two list parts the desk draws itself, re-exported so the
 * desk reaches them by one dynamic import and no other screen loads the kit.
 */
export { configureShippingKit, connectEngineCarrier, NeedsAttentionList, OpenParcelsRefresh } from "./vendor/shipping-kit/index.ts";
