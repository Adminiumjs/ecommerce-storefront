/**
 * What a slot fill is handed, by slot id.
 *
 * A payload is a CONTRACT BETWEEN HOSTS, not a member of this app's seam: the
 * smallest shape every host of a surface can honestly produce, named for the
 * surface. So this studio does not restate the shapes; it takes them from the
 * vendored shared contract (`vendor/host/payloads.ts`, synced by
 * `scripts/sync-add-ons.sh`) and maps its own rows into them at the mount
 * site (`studio/outbound.ts`). That mapping is the host's job.
 *
 * The two assertions below hold the vendored map to this app's own slot list
 * (`./slots.ts`) in both directions, so a slot added to one and not the other
 * is a red build here.
 */
import type { SlotId } from "./slots.ts";
import type { SlotId as ContractSlotId } from "./vendor/host/slots.ts";
import type { SlotPayloads } from "./vendor/host/payloads.ts";

export type { DispatchPayload, OutboundOrder, PostalAddress, ShopClock, SlotItem, SlotPayloads } from "./vendor/host/payloads.ts";
export type { DeliveryChoice } from "./vendor/host/delivery.ts";

type Assert<T extends true> = T;
export type EveryIdHasAPayload = Assert<SlotId extends keyof SlotPayloads ? true : false>;
export type EveryPayloadHasAnId = Assert<keyof SlotPayloads extends SlotId ? true : false>;
export type SameRegistry = Assert<[SlotId] extends [ContractSlotId] ? ([ContractSlotId] extends [SlotId] ? true : false) : false>;

/** What a slot fill is handed, by id. */
export type PayloadFor<S extends SlotId> = SlotPayloads[S];
