/**
 * The slots this studio hosts.
 *
 * `SLOT_IDS` is the closed registry of `@adminium/add-on-contracts`, copied
 * rather than imported because this app is a standalone repo and cannot
 * depend on the monorepo. The ids are the contract: do not invent one here.
 *
 * The studio MOUNTS ONE of them: `order.dispatch.actions`, a delivery
 * company's dispatch flow, on the post office run, once a parcel. A fill for
 * any other slot (the DHL add-on also fills its checkout, tracking, settings
 * and return-label surfaces) is registered and never rendered, which is what
 * lets one add-on run in any host unchanged.
 *
 * The values below are in single quotes on purpose: the add-ons monorepo's
 * `host-mirror.test.ts` reads this file as text and its patterns expect them.
 */

/** The closed registry, all thirteen. */
export const SLOT_IDS = [
  'artwork.sources',
  'checkout.delivery.methods',
  'order.dispatch.panel',
  'order.dispatch.actions',
  'settings.add-on.panel',
  'nav.add-on.routes',
  'product.options.personalize',
  'cart.line.preview',
  'product.admin.panel',
  'order.line.actions',
  'record.editor.panel',
  'record.actions',
  'shell.overlay',
] as const;

export type SlotId = (typeof SLOT_IDS)[number];

/** The one this studio mounts. */
export const HOSTED_SLOTS = [
  'order.dispatch.actions',
] as const satisfies readonly SlotId[];

export type HostedSlotId = (typeof HOSTED_SLOTS)[number];

/**
 * What the post office run shows when nothing fills the slot: nothing. A
 * studio with no delivery company attached posts the parcel over the counter
 * and the run already says the service the shopper chose.
 */
export const SLOT_EMPTY_BEHAVIOUR: Readonly<Record<HostedSlotId, 'speaks' | 'silent'>> = {
  'order.dispatch.actions': 'silent',
};

/** `single` takes the lowest `order`; `multi` renders every fill; `per-add-on` the named add-on's. */
export const SLOT_FILL: Readonly<Record<SlotId, 'single' | 'multi' | 'per-add-on'>> = {
  'artwork.sources': 'multi',
  'checkout.delivery.methods': 'multi',
  'order.dispatch.panel': 'single',
  'order.dispatch.actions': 'multi',
  'settings.add-on.panel': 'per-add-on',
  'nav.add-on.routes': 'multi',
  'product.options.personalize': 'single',
  'cart.line.preview': 'multi',
  'product.admin.panel': 'multi',
  'order.line.actions': 'multi',
  'record.editor.panel': 'multi',
  'record.actions': 'multi',
  'shell.overlay': 'multi',
};
