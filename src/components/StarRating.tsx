// The clipped-overlay star technique from the comp: a grey five-star row with
// an amber five-star row absolutely positioned on top, clipped to avg%.

import { STAR_COLOR } from "../data/demo.ts";
import { useI18n } from "../i18n";

/** Stars are always out of five — the denominator of every rating in the app. */
const MAX = 5;

export interface StarRatingProps {
  avg: number;
  size: number;
  gap?: number;
}

export function StarRating({ avg, size, gap = 2 }: StarRatingProps) {
  const { t, number } = useI18n();
  const pct = Math.max(0, Math.min(100, (avg / MAX) * 100));
  return (
    /*
     * Two rows of ★ glyphs carry the whole rating visually and say nothing to a
     * screen reader. `role="img"` collapses them into one node with a spoken
     * label, so "4.7 out of 5" is announced instead of ten stars.
     */
    <span
      role="img"
      aria-label={t("chrome.rating.aria", {
        avg: number(avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        max: number(MAX),
      })}
      style={{
        position: "relative",
        display: "inline-block",
        fontSize: size + "px",
        lineHeight: 1,
        letterSpacing: gap + "px",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "var(--border-strong)" }}>★★★★★</span>
      <span
        style={{
          position: "absolute",
          insetInlineStart: 0,
          top: 0,
          width: pct + "%",
          overflow: "hidden",
          color: STAR_COLOR,
        }}
      >
        ★★★★★
      </span>
    </span>
  );
}
