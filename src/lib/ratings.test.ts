/*
 * Rating aggregation and review sampling (ratings.ts).
 *
 * The rules worth guarding:
 *
 *   1. A shopper's own review is merged into the seeded aggregate as one more
 *      rating — the seed is a (average, count) pair, so the merge has to
 *      re-derive the weighted mean, not average an average with a rating.
 *   2. A seed with a count of zero must not divide by zero.
 *   3. The distribution buckets are chosen from the *unrounded* average while
 *      the headline number is rounded — the two can disagree at a tier edge.
 *   4. The sampled reviews are deterministic per product id: the same product
 *      always shows the same three.
 */

import { describe, expect, it } from "vitest";
import type { RatingSeed, Review, UserReview } from "../data/types.ts";
import { hashId } from "./format.ts";
import { distFor, ratingFor, reviewsFor } from "./ratings.ts";

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

function review(n: number, rating = 5): Review {
  return {
    name: `Reviewer ${n}`,
    initials: `R${n}`,
    /* An offset, not a rendered date — see `Ago` in data/types. */
    ago: [-(n + 1), "day"],
    verified: n % 2 === 0,
    rating,
    title: `Title ${n}`,
    body: `Body ${n}`,
  };
}

/** What the runtime should render for a seed's `ago`, in the test locale. */
const agoText = (r: Review): string =>
  new Intl.RelativeTimeFormat("en-US", { numeric: "auto" }).format(...r.ago);

/** Nine distinct reviews — enough that the 0/+3/+6 sampling offsets land on
 * three different entries whatever the hash. */
const POOL: Review[] = Array.from({ length: 9 }, (_, i) => review(i));

const mine = (rating: number, title = "Mine", body = "Words"): UserReview => ({
  rating,
  title,
  body,
});

const seeds = (s: Record<string, RatingSeed>) => s;
const posted = (u: Record<string, UserReview[]>) => u;

/* ------------------------------------------------------------------ *
 * The aggregate
 * ------------------------------------------------------------------ */

describe("the aggregate rating", () => {
  it("passes a seed straight through when nobody has posted", () => {
    const r = ratingFor("p1", seeds({ p1: [4.2, 18] }), posted({}));
    expect(r.avg).toBeCloseTo(4.2, 10);
    expect(r.count).toBe(18);
    expect(r.avgLabel).toBe("4.2");
  });

  it("re-derives the weighted mean when reviews are posted", () => {
    /* Seed 4.0 × 2 = 8 points, plus a 5 and a 3 = 16 over 4 ratings = 4.0.
     * Averaging the average with the ratings would give 4.0 here too, so the
     * next test uses figures where the two answers differ. */
    const r = ratingFor("p1", seeds({ p1: [4, 2] }), posted({ p1: [mine(5), mine(3)] }));
    expect(r.avg).toBe(4);
    expect(r.count).toBe(4);
  });

  it("weights the seed by its count, not equally with a new review", () => {
    /*
     * Seed 4.0 over 2 ratings, plus one 5-star: 13 points over 3 = 4.333…,
     * NOT (4.0 + 5) / 2 = 4.5. One new voice cannot swing a product with
     * history — that is the whole point of storing the count.
     */
    const r = ratingFor("p1", seeds({ p1: [4, 2] }), posted({ p1: [mine(5)] }));
    expect(r.avg).toBeCloseTo(4.333333333333333, 10);
    expect(r.avg).not.toBe(4.5);
    expect(r.count).toBe(3);
    expect(r.avgLabel).toBe("4.3");
  });

  it("falls back to a house average for a product with no seed", () => {
    /* 4.7 over 36 is ratings.ts's own literal — an unrated product is
     * presented as a well-reviewed one rather than as blank. */
    const r = ratingFor("unknown", seeds({}), posted({}));
    expect(r.avg).toBeCloseTo(4.7, 10);
    expect(r.count).toBe(36);
  });

  it("merges posted reviews into the fallback seed too", () => {
    const r = ratingFor("unknown", seeds({}), posted({ unknown: [mine(5)] }));
    expect(r.count).toBe(37);
    expect(r.avg).toBeCloseTo(4.708108108108108, 10);
  });

  it("never divides by zero on a seed with no ratings behind it", () => {
    /* count 0 → the seeded average is reported as-is. Dividing would give NaN
     * and print "NaN" in the star row. */
    const r = ratingFor("p1", seeds({ p1: [4.9, 0] }), posted({}));
    expect(r.avg).toBe(4.9);
    expect(r.count).toBe(0);
    expect(r.avgLabel).toBe("4.9");
  });

  it("discards a zero-count seed's average the moment a real rating arrives", () => {
    /* 0 points over 0 ratings, plus a 3 → exactly 3. The advertised 4.9 was
     * never backed by anything, so it carries no weight. */
    const r = ratingFor("p1", seeds({ p1: [4.9, 0] }), posted({ p1: [mine(3)] }));
    expect(r.avg).toBe(3);
    expect(r.count).toBe(1);
  });

  it("ignores reviews posted against a different product", () => {
    const r = ratingFor(
      "p1",
      seeds({ p1: [4, 10] }),
      posted({ p2: [mine(1), mine(1)] }),
    );
    expect(r.avg).toBe(4);
    expect(r.count).toBe(10);
  });

  it("accepts an empty posted-review list", () => {
    const r = ratingFor("p1", seeds({ p1: [4, 10] }), posted({ p1: [] }));
    expect(r.count).toBe(10);
  });

  it("does not mutate the seeds or the posted reviews", () => {
    const s = seeds({ p1: [4, 2] });
    const u = posted({ p1: [mine(5)] });
    ratingFor("p1", s, u);
    expect(s.p1).toEqual([4, 2]);
    expect(u.p1).toHaveLength(1);
  });
});

describe("the headline number", () => {
  it("always shows exactly one decimal place", () => {
    expect(ratingFor("p1", seeds({ p1: [4, 3] }), posted({})).avgLabel).toBe("4.0");
    expect(ratingFor("p1", seeds({ p1: [5, 3] }), posted({})).avgLabel).toBe("5.0");
    expect(ratingFor("p1", seeds({ p1: [4, 2] }), posted({ p1: [mine(5)] })).avgLabel).toBe("4.3");
  });

  it("rounds a half away from zero, on the decimal that was typed", () => {
    /*
     * These two expectations used to BOTH be "4.3", because `toFixed` rounds
     * the stored double rather than the decimal you typed: 4.25 is exactly
     * representable and its tie rounds up, but 4.35 is stored as
     * 4.3499999999999996 and so rounded DOWN — two products a tenth of a star
     * apart advertising the same number.
     *
     * `Intl.NumberFormat` (which now produces this label, so the separator
     * follows the reader's locale) rounds the shortest round-trip decimal
     * instead — it sees "4.35" and rounds half away from zero to 4.4. Same
     * precision, but the seed a merchant typed is the number a shopper reads.
     */
    expect(ratingFor("a", seeds({ a: [4.25, 1] }), posted({})).avgLabel).toBe("4.3");
    expect(ratingFor("b", seeds({ b: [4.35, 1] }), posted({})).avgLabel).toBe("4.4");
  });
});

/* ------------------------------------------------------------------ *
 * The distribution bars
 * ------------------------------------------------------------------ */

describe("the distribution", () => {
  it("returns five buckets, 5-star first, that always total 100%", () => {
    for (const avg of [5, 4.6, 4.3, 4.0, 3.9, 3.5, 1]) {
      const d = distFor(avg);
      expect(d).toHaveLength(5);
      expect(d.reduce((s, x) => s + x, 0)).toBe(100);
    }
  });

  it("never shows a lower star band with a larger share than a higher one", () => {
    for (const avg of [5, 4.6, 4.3, 4.0, 3.9, 3.5, 1]) {
      const d = distFor(avg);
      expect([...d].sort((a, b) => b - a)).toEqual(d);
    }
  });

  it("switches tier at exactly 4.6, 4.2 and 3.8", () => {
    /* `>=` at each edge — the boundary value belongs to the higher tier. */
    expect(distFor(4.6)).toEqual([78, 15, 4, 2, 1]);
    expect(distFor(4.2)).toEqual([62, 26, 7, 3, 2]);
    expect(distFor(3.8)).toEqual([46, 31, 14, 6, 3]);
  });

  it("drops to the tier below a hair under each edge", () => {
    expect(distFor(4.5999)).toEqual([62, 26, 7, 3, 2]);
    expect(distFor(4.1999)).toEqual([46, 31, 14, 6, 3]);
    expect(distFor(3.7999)).toEqual([34, 30, 21, 9, 6]);
  });

  it("covers the ends of the scale and anything nonsensical", () => {
    expect(distFor(5)).toEqual([78, 15, 4, 2, 1]);
    expect(distFor(0)).toEqual([34, 30, 21, 9, 6]);
    /* NaN fails every `>=`, so it lands in the bottom tier rather than
     * rendering five undefined bars. */
    expect(distFor(NaN)).toEqual([34, 30, 21, 9, 6]);
  });

  it("can disagree with the headline number at a tier edge", () => {
    /*
     * The tier is chosen from the raw average, the headline from the rounded
     * one. An average of 4.58 prints "4.6" beside a histogram whose top bar is
     * the 4.2-tier's 62%, not the 4.6-tier's 78%. Cosmetic, but it is why the
     * bars and the number can look out of step on a single product.
     */
    const r = ratingFor("p1", seeds({ p1: [4.58, 1] }), posted({}));
    expect(r.avgLabel).toBe("4.6");
    expect(distFor(r.avg)).toEqual([62, 26, 7, 3, 2]);
  });
});

/* ------------------------------------------------------------------ *
 * The review list
 * ------------------------------------------------------------------ */

describe("the review list", () => {
  it("samples exactly three from the pool when nobody has posted", () => {
    const rows = reviewsFor("p1", POOL, posted({}));
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.key)).toEqual(["p0", "p1", "p2"]);
    expect(rows.every((r) => r.mine === false)).toBe(true);
  });

  it("samples at the hash and then three and six along", () => {
    /* Asserted against `hashId` rather than a baked-in number, so the rule
     * survives a change of hash function. */
    const h = hashId("p1");
    const rows = reviewsFor("p1", POOL, posted({}));
    expect(rows.map((r) => r.title)).toEqual([
      POOL[h % POOL.length].title,
      POOL[(h + 3) % POOL.length].title,
      POOL[(h + 6) % POOL.length].title,
    ]);
  });

  it("shows the same three every time for the same product", () => {
    expect(reviewsFor("p1", POOL, posted({}))).toEqual(
      reviewsFor("p1", POOL, posted({})),
    );
  });

  it("carries the pool entry's own fields through untouched", () => {
    const rows = reviewsFor("p1", POOL, posted({}));
    const source = POOL.find((r) => r.title === rows[0].title)!;
    expect(rows[0]).toMatchObject({
      name: source.name,
      initials: source.initials,
      verified: source.verified,
      rating: source.rating,
      body: source.body,
    });
  });

  it("renders the pool entry's `ago` offset as a relative timestamp", () => {
    /* The seed stores [-n, "day"]; the row must carry a formatted string, so
     * the same data reads "2 weeks ago" in en-US and "منذ أسبوعين" in ar-EG
     * instead of shipping one language's sentence to every reader. */
    const rows = reviewsFor("p1", POOL, posted({}));
    const source = POOL.find((r) => r.title === rows[0].title)!;
    expect(rows[0].date).toBe(agoText(source));
    expect(rows[0]).not.toHaveProperty("ago");
  });

  it("puts the shopper's own reviews first, newest as given", () => {
    const rows = reviewsFor(
      "p1",
      POOL,
      posted({ p1: [mine(5, "Newest"), mine(4, "Older")] }),
    );
    expect(rows).toHaveLength(5);
    expect(rows.slice(0, 2).map((r) => r.title)).toEqual(["Newest", "Older"]);
    expect(rows.slice(0, 2).every((r) => r.mine)).toBe(true);
    expect(rows.slice(2).every((r) => !r.mine)).toBe(true);
  });

  it("marks the shopper's reviews verified and stamps them 'Just now'", () => {
    const rows = reviewsFor("p1", POOL, posted({ p1: [mine(2, "T", "B")] }));
    expect(rows[0]).toMatchObject({
      key: "u0",
      mine: true,
      verified: true,
      date: "Just now",
      rating: 2,
      title: "T",
      body: "B",
    });
  });

  it("gives every row a key that cannot collide", () => {
    const rows = reviewsFor("p1", POOL, posted({ p1: [mine(5), mine(4), mine(3)] }));
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });

  it("still shows three samples however many the shopper has posted", () => {
    /* The samples are not crowded out — the list grows instead. */
    const many = Array.from({ length: 6 }, (_, i) => mine(5, `M${i}`));
    expect(reviewsFor("p1", POOL, posted({ p1: many }))).toHaveLength(9);
  });

  it("does not mutate the pool", () => {
    const snapshot = JSON.stringify(POOL);
    reviewsFor("p1", POOL, posted({ p1: [mine(5)] }));
    expect(JSON.stringify(POOL)).toBe(snapshot);
  });

  it("repeats itself when the pool size divides the sampling offsets", () => {
    /*
     * The offsets are 0, +3 and +6 — all congruent modulo 3 — so a pool of
     * exactly 3 shows the SAME review three times, and a pool of 6 shows one
     * of them twice. The demo pool has 9 entries, where 0/3/6 land on three
     * distinct rows, so this is latent rather than live; it becomes visible
     * the moment a backend returns a short review pool.
     */
    const three = [review(0), review(1), review(2)];
    const picks = reviewsFor("p1", three, posted({})).map((r) => r.title);
    expect(new Set(picks).size).toBe(1);

    const six = Array.from({ length: 6 }, (_, i) => review(i));
    expect(new Set(reviewsFor("p1", six, posted({})).map((r) => r.title)).size).toBe(2);
  });

  it("BUG: invents three blank reviews when the pool is empty", () => {
    /*
     * (a) REAL BUG. `pool[h % pool.length]` is `pool[NaN]` for an empty pool,
     * which is `undefined`; spreading undefined yields `{}`, so the function
     * returns three rows carrying nothing but a key and `mine: false`.
     *
     * They are typed `ReviewRow extends Review`, so every consumer is entitled
     * to `rating`, `name` and `body` — ReviewsModule renders them straight
     * into the star row and the card, producing three empty review cards with
     * a broken star count. An empty pool should produce an empty list.
     *
     * Not reachable with the demo data (the seeded pool has nine entries) but
     * the pool arrives through the swappable DataSource contract, and "no
     * reviews yet" is the first state a real backend returns.
     */
    const rows = reviewsFor("p1", [], posted({}));
    expect(rows).toEqual([]);
  });

  it("BUG: pads the shopper's own review with three phantom rows on an empty pool", () => {
    /* The same defect as above from the other side: the posted review survives,
     * but it arrives with three blank rows for company. */
    const rows = reviewsFor("p1", [], posted({ p1: [mine(5, "Mine")] }));
    expect(rows[0]).toMatchObject({ title: "Mine", mine: true });
    expect(rows).toHaveLength(1);
  });
});
