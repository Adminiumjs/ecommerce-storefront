/**
 * "DID THE FILL ACTUALLY PAINT ANYTHING?" — the rule, driven over the shapes
 * that broke it.
 *
 * @vitest-environment jsdom
 *
 * ── WHY THIS IS A SUITE AND NOT A COMMENT ──────────────────────────────────
 *
 * The seam's cascade rule pair has two negations, and the second one exists
 * because `:empty` is a question about CHILD NODES and this is a question about
 * PAINT. A fill returning a bare `<div/>`, or a wrapper whose only child is
 * `display: none`, is not empty and drew nothing — so the host's own content
 * was hidden on behalf of a fill that put nothing on the screen, and connecting
 * an add-on took a picture away.
 *
 * `SlotFill` asks this question after every mutation and writes the answer onto
 * the wrapper as `data-drew`. THE STYLESHEET CANNOT CHECK ITSELF: jsdom applies
 * no stylesheet, so no DOM assertion anywhere can see whether the rule pair is
 * right — `stylesGuard` reads the CSS as text for exactly that reason. What a
 * DOM CAN answer is whether the predicate the rule leans on is correct, which
 * is this file.
 *
 * The predicate is the kit's and is tested there too. It is driven again HERE
 * because the tier ratchet asks whether this host runs it, and because the
 * shapes below are the ones this app's own fills produce.
 */

import { describe, expect, it } from "vitest";

import { drewSomething } from "./kit/index.ts";

/** Build a detached-but-rooted element, so `getComputedStyle` has a view. */
function el(html: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild as HTMLElement;
}

describe("ecommerce-storefront · the paint rule the cascade pair leans on", () => {
  it("says yes to words", () => {
    expect(drewSomething(el("<div>Standard shipping</div>"))).toBe(true);
  });

  it("says NO to a bare wrapper, which is the whole defect", () => {
    /*
     * A rate panel that fetched, found nothing to offer and returned an empty
     * wrapper. `:empty` alone answers "not empty" here — the element has no
     * children, so actually `:empty` gets THIS one right; the case below is the
     * one it gets wrong. Both are asserted because the rule pair needs both
     * negations and a reader should be able to see which does what.
     */
    expect(drewSomething(el("<div></div>"))).toBe(false);
  });

  it("says NO to a wrapper whose only child is hidden — the case `:empty` misses", () => {
    expect(drewSomething(el('<div><span style="display:none">x</span></div>'))).toBe(false);
    expect(drewSomething(el("<div><span hidden>x</span></div>"))).toBe(false);
  });

  it("says NO to whitespace and to a comment", () => {
    expect(drewSomething(el("<div>   \n  </div>"))).toBe(false);
    expect(drewSomething(el("<div><!-- react fragment marker --></div>"))).toBe(false);
  });

  it("says yes to something that paints without text", () => {
    // A carrier's monogram tile is a bordered box with three letters; an icon
    // is an <svg> with none. A rule that needed words would hide the host's own
    // content behind a fill that drew a picture.
    expect(drewSomething(el('<div><svg viewBox="0 0 1 1"></svg></div>'))).toBe(true);
  });
});
