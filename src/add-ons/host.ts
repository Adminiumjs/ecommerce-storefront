/**
 * The seam add-ons plug into: what an add-on is, as this studio reads one,
 * and the registry that hands a screen the fills for a slot.
 *
 * THE HOST NAMES NO ADD-ON AND NONE OF ITS FIELDS. Everything an add-on is
 * particular about (its settings and their defaults, its strings in eight
 * locales, its demo switch) arrives in the object its `register()` returns.
 *
 * This is the smallest host the studio needs: it mounts one slot (see
 * `./slots.ts`) and registers one add-on (see `./registry.ts`). The `AddOn`
 * interface is the whole of the shared contract's nonetheless, because the
 * add-on's object is assigned into it and `tsc` is the check that the two
 * still agree (the add-ons monorepo's `host-mirror.test.ts` reads this file
 * from the other side).
 */
import type { ReactNode } from "react";

import type { PayloadFor } from "./payloads.ts";
import { SLOT_FILL, type SlotId } from "./slots.ts";

export type AddOnCategory = 'artwork' | 'delivery' | 'payments' | 'email' | 'data';

export type ConnectKind = 'none' | 'api-key' | 'oauth2';

/** One ticked row in a connect dialog's permission list. */
export interface Permission {
  key: string;
}

/** A setting an add-on's own panel draws, under its own machine key. */
export interface AddOnSetting {
  key: string;
  kind: 'boolean' | 'time' | 'text' | 'multi';
  options?: readonly string[];
}

/** One add-on's saved values, under its own machine keys. Opaque to the host. */
export type AddOnSettingValues = Readonly<Record<string, unknown>>;

/** A seeded line of what the add-on last did: relative to the host's clock, naming the host's own references. */
export interface SeededActivityEntry {
  minutesAgo: number;
  refIndex?: number;
  messageKey: string;
}

/** The setting that means "do not reach the third party", and the words for its switch. */
export interface DemoSwitch {
  key: string;
  labelKey: string;
  noteOnKey: string;
  noteOffKey: string;
}

/** One registered fill; its payload is decided by the slot it names. */
export interface AddOnFill<S extends SlotId = SlotId> {
  slot: S;
  order: number;
  render: (payload: PayloadFor<S>) => ReactNode;
}

/** A fill for some slot: the union over the registry, each slot paired with its own payload. */
export type AnyAddOnFill = { [S in SlotId]: AddOnFill<S> }[SlotId];

export interface AddOn {
  key: string;
  /** The product's name, a proper noun: never translated. */
  name: string;
  nameKey?: string;
  shortName: string;
  lineKey: string;
  whatKey: string;
  monogram: string;
  category: AddOnCategory;
  connect: ConnectKind;
  permissions: readonly Permission[];
  settings: readonly AddOnSetting[];
  defaultSettings?: AddOnSettingValues;
  /** Push saved values into the add-on's own engines, for one that keeps a copy. */
  applySettings?: (values: AddOnSettingValues) => void;
  messages?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  disconnect?: { goesKey: string; staysKey: string };
  activity?: readonly SeededActivityEntry[];
  demoSwitch?: DemoSwitch;
  account?: string;
  proofsArtwork?: (settings: AddOnSettingValues) => boolean;
  namesCompany: boolean;
  noCompanyKeys?: readonly string[];
  inDemo?: boolean;
  fills: readonly AnyAddOnFill[];
}

/** A fill with the key of the add-on that supplied it. */
export interface ResolvedFill<S extends SlotId = SlotId> {
  addOn: string;
  fill: AddOnFill<S>;
}

export interface AddOnRegistry {
  all: readonly AddOn[];
  byKey: (key: string) => AddOn | undefined;
  /** Every fill for a slot from the add-ons in `enabled`, ordered; empty when none is. */
  fillsFor: <S extends SlotId>(slot: S, enabled: ReadonlySet<string>, forAddOn?: string) => ResolvedFill<S>[];
}

/** A registry over a list, sorted by key so every multi-fill slot has a stable order. */
export function createRegistry(addOns: readonly AddOn[]): AddOnRegistry {
  const all = [...addOns].sort((a, b) => a.key.localeCompare(b.key));
  const index = new Map(all.map((a) => [a.key, a]));
  return {
    all,
    byKey: (key) => index.get(key),
    fillsFor<S extends SlotId>(slot: S, enabled: ReadonlySet<string>, forAddOn?: string) {
      const fills = all
        .filter((addOn) => enabled.has(addOn.key) && (forAddOn === undefined || addOn.key === forAddOn))
        .flatMap((addOn) =>
          addOn.fills
            .filter((f) => f.slot === slot)
            // The one cast in the seam: the filter above is the check a generic `S` cannot narrow by.
            .map((f) => ({ addOn: addOn.key, fill: f as unknown as AddOnFill<S> })),
        )
        .sort((a, b) => a.fill.order - b.fill.order || a.addOn.localeCompare(b.addOn));
      return SLOT_FILL[slot] === 'single' ? fills.slice(0, 1) : fills;
    },
  };
}
