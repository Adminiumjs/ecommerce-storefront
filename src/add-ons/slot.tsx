/**
 * THE SEAM, BOUND TO THIS APP — once, at module scope.
 *
 * ── WHY THE COMPONENT IS A FACTORY AND THIS FILE EXISTS AT ALL ─────────────
 *
 * The mount component reaches out of the seam twice on the way in: it writes a
 * class name that only this app's stylesheet knows, and it reads a store that
 * only this app has. Both hosts that carried this seam before the kit had those
 * two facts written INTO the component, which is why their copies could only be
 * installed by hand-editing them — and a copy that must be edited to be
 * installed is a fork from the first keystroke. They are arguments now, and
 * this file is where this app supplies them.
 *
 * ── CALL IT ONCE ───────────────────────────────────────────────────────────
 *
 * A second `createAddOnSlot` is not an error and is not free: it makes a second
 * component IDENTITY, so React unmounts and remounts every fill under it
 * whenever a screen happens to render the other one — an editor loses its
 * state, a quote is re-fetched, a panel flickers. Every screen imports
 * `AddOnSlot` from here.
 *
 * ── AND THE HOOK IS ONE HOOK, NOT TWO ──────────────────────────────────────
 *
 * `fills` is exactly what the registry answers and `settings` is exactly this
 * app's own settings document, with no mapping step between. That is the point:
 * a mapping step is where a host gets the chance to reorder, filter or re-key,
 * and the registry already made all three of those decisions on purpose.
 */

import { createAddOnSlot, type UseSlotFills } from "./kit/index.ts";
import { hostKit } from "./host-kit.config.ts";
import type { HostedSlotId } from "./slots.ts";
import { useStore } from "../state/store.ts";

/*
 * THREE SEPARATE SELECTORS, not one that builds an object.
 *
 * zustand compares what a selector returns with `Object.is`, so a selector
 * returning `{ fills, settings }` returns a NEW object every time anything in
 * the store changes and the component re-renders on every keystroke in the
 * checkout form. Reading the three fields separately means each subscription
 * compares a stable reference — a `Set`, a registry, a settings document — and
 * the fills are recomputed only here, in the hook body, where the result is not
 * a subscription.
 */
const useSlotFills: UseSlotFills<HostedSlotId> = (slot, forAddOn) => {
  const registry = useStore((s) => s.registry);
  const enabled = useStore((s) => s.enabled);
  const settings = useStore((s) => s.addOnSettings);
  return { fills: registry.fillsFor(slot, enabled, forAddOn), settings };
};

export const { AddOnSlot, SlotFill } = createAddOnSlot(hostKit, useSlotFills);
