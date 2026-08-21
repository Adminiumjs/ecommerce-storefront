// Rating aggregation + deterministic review sampling, ported from the comp.
// User-submitted reviews are merged into the seeded aggregate live.

import type { RatingSeed, Review, UserReview } from "../data/types.ts";
import { number as fmtNumber, relative, t } from "../i18n/ambient";
import { hashId } from "./format.ts";

export interface RatingInfo {
  avg: number;
  count: number;
  avgLabel: string;
}

export function ratingFor(
  id: string,
  ratings: Record<string, RatingSeed>,
  userReviews: Record<string, UserReview[]>,
): RatingInfo {
  const b = ratings[id] || [4.7, 36];
  let sum = b[0] * b[1];
  let cnt = b[1];
  (userReviews[id] || []).forEach((r) => {
    sum += r.rating;
    cnt++;
  });
  const avg = cnt ? sum / cnt : b[0];
  /*
   * `toFixed(1)` always emits a `.` — an en-US decimal separator baked into a
   * number the whole store reads ("4.7" beside the stars, on every card, in the
   * reviews module). Half the supported locales write it `4,7`. `Intl` picks
   * the separator; the one-decimal precision (and its half-away-from-zero
   * rounding, which is what `toFixed` did) is preserved exactly.
   */
  return {
    avg,
    count: cnt,
    avgLabel: fmtNumber(avg, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
  };
}

/** Distribution buckets (5→1 star) as percentages, keyed off the avg tier. */
export function distFor(avg: number): number[] {
  if (avg >= 4.6) return [78, 15, 4, 2, 1];
  if (avg >= 4.2) return [62, 26, 7, 3, 2];
  if (avg >= 3.8) return [46, 31, 14, 6, 3];
  return [34, 30, 21, 9, 6];
}

export interface ReviewRow extends Omit<Review, "ago"> {
  key: string;
  mine: boolean;
  /** Already rendered for the active locale — the seed's `ago` offset formatted
   * through `Intl.RelativeTimeFormat`, or "Just now" for the shopper's own. */
  date: string;
}

export function reviewsFor(
  id: string,
  pool: Review[],
  userReviews: Record<string, UserReview[]>,
): ReviewRow[] {
  const ur: ReviewRow[] = (userReviews[id] || []).map((r, i) => ({
    key: "u" + i,
    /* The demo shopper's name and initials are seeded persona data and stay
     * as written; the timestamp beside them is chrome. */
    name: "Ava Reyes",
    initials: "AR",
    date: t("chrome.review.justNow"),
    verified: true,
    mine: true,
    rating: r.rating,
    title: r.title,
    body: r.body,
  }));
  /*
   * An empty pool yields no rows, not three blank ones.
   *
   * `h % 0` is NaN, so `pool[NaN]` was undefined and spreading it produced
   * three review cards with no name, no rating and no body. The seeded pool is
   * never empty, but this is a template people fork — a shop whose first
   * product has no reviews yet would have shipped three ghosts.
   */
  if (pool.length === 0) return ur;

  const h = hashId(id);
  const picks = [
    pool[h % pool.length],
    pool[(h + 3) % pool.length],
    pool[(h + 6) % pool.length],
  ];
  /* The seed stores an offset, not a sentence: the timestamp is rendered here
   * through `Intl.RelativeTimeFormat`, so a pooled review reads "2 weeks ago"
   * in en-US and "منذ أسبوعين" in ar-EG from the same data. */
  return ur.concat(
    picks.map(({ ago, ...r }, i) => ({
      ...r,
      key: "p" + i,
      mine: false,
      date: relative(...ago),
    })),
  );
}
