/**
 * THE SLOTS THIS STOREFRONT MOUNTS, and what it draws where nothing fills one.
 *
 * ── THREE OF TWELVE, AND THE BOUNDARY IS STRUCTURAL ────────────────────────
 *
 * `vendor/host/slots.ts` carries the CLOSED REGISTRY — twelve ids, every place
 * in any Adminium app an add-on may reach. This list is three of them, and the
 * three are not a preference about how much to do in one go. They are what a
 * CUSTOMER frontend can honestly host.
 *
 * `manifest.json` declares exactly one frontend and its `side` is `customer`.
 * There is no staff screen in this repo — the merchant's half of this app is
 * Adminium's generated dashboard, built from the same manifest, and it lives on
 * the other side of the API. So:
 *
 *   `checkout.delivery.methods`  the till. A shopper choosing how a parcel
 *                                comes to them. Customer surface; ours.
 *   `order.dispatch.panel`       the READING of a dispatch — where is it, what
 *                                reference can I quote. Customer surface; ours.
 *   `order.dispatch.actions`     the DOING of a dispatch — book the collection,
 *                                print the label. That is somebody standing in
 *                                the warehouse, and this app has no screen
 *                                where that person works. NOT OURS, and the
 *                                add-on that fills the two above fills this one
 *                                too: it simply never renders here.
 *
 * The pair is worth reading twice, because it is the clearest example in the
 * seam of why a slot id names a SURFACE rather than an app. Two ids, one
 * subject, one payload type — and a host can be entitled to one of them and not
 * the other. A host that mounted `order.dispatch.actions` because it already
 * had the panel would be putting a Book-collection button in front of a
 * shopper.
 *
 * `settings.add-on.panel` is the third, and it is the odd one: its surface is
 * `admin`, and this app has no admin. See `components/AddOnsDrawer.tsx` for
 * what was built to hold it and why that is not a contradiction.
 *
 * ── WHAT IS DELIBERATELY ABSENT ────────────────────────────────────────────
 *
 * `product.options.personalize` and `cart.line.preview` are both customer
 * surfaces this app has the screens for, and neither is here. Nothing fills
 * them from the one add-on this repo vendors, and a slot mounted with nothing
 * to put in it is a fallback rendered on every product page for ever — the
 * "speaks" empty state doing its job in a place where nobody has anything to be
 * told. They are two lines away when an add-on arrives that fills them.
 */

import { HOSTED_SLOTS as SLOT_REGISTRY, type SlotEmptyBehaviour, type SlotId } from "./vendor/host/index.ts";

/**
 * THIS host's list. Note the import above renames the registry on the way in.
 *
 * `vendor/host/slots.ts` exports the closed registry under the name
 * `HOSTED_SLOTS`, which is the same identifier this file uses for the three ids
 * the app actually mounts — and importing the wrong one silently widens every
 * check in the kit: the mounts guard would demand mounts for twelve ids, the
 * empty-behaviour table below would need twelve rows, and the payload generic
 * would accept ids no screen here draws. The rename is at the import so the
 * mistake cannot be made by autocomplete, and `guards/mounts.ts` asserts this
 * list is a strict subset of the registry so it is a named failure if it ever
 * is.
 */
export const HOSTED_SLOTS = [
  "checkout.delivery.methods",
  "order.dispatch.panel",
  "settings.add-on.panel",
] as const satisfies readonly SlotId[];

export type HostedSlotId = (typeof HOSTED_SLOTS)[number];

/** Proof the three are members of the closed registry, at compile time. */
export type EveryHostedSlotIsInTheRegistry = Extract<
  HostedSlotId,
  (typeof SLOT_REGISTRY)[number]
>;

/**
 * WHAT THIS APP DRAWS WHERE NOTHING FILLS EACH SLOT (24 D6, D19).
 *
 * `speaks` — a real empty state IN WORDS, where a reader has something to be
 * told. `silent` — nothing at all, not a dashed box and not a muted heading,
 * where a placeholder would make an unconnected shop look broken.
 *
 * THERE IS NO SHARED TABLE OF THESE ANYWHERE, and that is the ruling rather
 * than an omission: `vendor/host/slots.ts` records at length why empty
 * behaviour is a property of the SCREEN a host built and not of the slot id,
 * and the case that settled it was one host mounting one id twice and being
 * right to behave two ways. So this table is keyed by THIS app's union and
 * checked against THIS app's rendered screens.
 *
 * All three decisions below are decisions about a place on a page:
 */
export const SLOT_EMPTY_BEHAVIOUR: Readonly<Record<HostedSlotId, SlotEmptyBehaviour>> = {
  /*
   * SPEAKS. The delivery step of a checkout is a list of ways to get a parcel,
   * and this app already puts three of its own above the slot. A shopper who
   * reads three rows and then a gap is being shown a broken page; a shopper who
   * reads three rows and then one sentence saying live carrier rates are not
   * connected is being shown a finished one. The sentence is also the honest
   * answer to the question the screen invites — "are these all my options?".
   */
  "checkout.delivery.methods": "speaks",
  /*
   * SPEAKS, and this is the mount where D6 does the most work. With nothing
   * connected the confirmation page has always promised a tracking e-mail and
   * left it there, which is a finished screen — a real shop with no carrier
   * integration does exactly that. So the empty state is not an apology for a
   * missing add-on; it is that promise, kept where it always was, under a
   * heading the panel would otherwise occupy. Silence here would leave a
   * labelled card with a hole in it.
   */
  "order.dispatch.panel": "speaks",
  /*
   * SPEAKS, for the reason the print works' drawer speaks and the maker
   * studio's inline rows do not: this app's manage drawer puts the panel under
   * its OWN heading. A heading with a gap under it is a hole, so an add-on that
   * offers nothing to set says so in a sentence. The alternative was to drop
   * the heading and inline the panel, which would have made the drawer's rows
   * ambiguous about which add-on each control belongs to.
   */
  "settings.add-on.panel": "speaks",
};
