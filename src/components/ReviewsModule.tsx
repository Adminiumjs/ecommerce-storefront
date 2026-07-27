// Ratings & reviews: average + distribution bars on the left, the review list
// on the right. User-submitted reviews appear first, tagged "mine".

import { STAR_COLOR } from "../data/demo.ts";
import type { Product } from "../data/types.ts";
import { distFor, ratingFor, reviewsFor } from "../lib/ratings.ts";
import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";
import { StarRating } from "./StarRating.tsx";

export interface ReviewsModuleProps {
  product: Product;
}

export function ReviewsModule({ product: p }: ReviewsModuleProps) {
  const ratings = useStore((s) => s.ratings);
  const reviewPool = useStore((s) => s.reviewPool);
  const userReviews = useStore((s) => s.userReviews);
  const openReview = useStore((s) => s.openReview);

  const rt = ratingFor(p.id, ratings, userReviews);
  const dist = distFor(rt.avg);
  const tiers = [5, 4, 3, 2, 1].map((star, i) => ({
    star,
    pct: dist[i],
  }));
  const reviews = reviewsFor(p.id, reviewPool, userReviews);

  return (
    <section style={{ marginTop: "clamp(34px,5vw,56px)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <Icon name="star" size={19} color={STAR_COLOR} />
        <h2
          style={{
            margin: 0,
            fontSize: "clamp(19px,2.4vw,23px)",
            fontWeight: 800,
            letterSpacing: "-.02em",
          }}
        >
          Ratings &amp; reviews
        </h2>
        <button
          className="sf-gi"
          onClick={openReview}
          style={{
            marginInlineStart: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "10px 16px",
            borderRadius: "11px",
            border: "1px solid var(--border-strong)",
            background: "var(--surface)",
            color: "var(--fg)",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          <Icon name="pencil-line" size={15} />
          Write a review
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: "clamp(24px,4vw,52px)",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "0 0 auto", width: "min(240px,100%)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span
              style={{
                fontSize: "48px",
                fontWeight: 800,
                letterSpacing: "-.03em",
                lineHeight: 1,
              }}
            >
              {rt.avgLabel}
            </span>
            <span style={{ fontSize: "14px", color: "var(--fg-muted)" }}>
              out of 5
            </span>
          </div>
          <div style={{ marginTop: "11px" }}>
            <StarRating avg={rt.avg} size={22} gap={3} />
          </div>
          <div
            style={{ fontSize: "13px", color: "var(--fg-muted)", marginTop: "9px" }}
          >
            Based on {rt.count} reviews
          </div>
          <div
            style={{
              marginTop: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {tiers.map((d) => (
              <div
                key={d.star}
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: "11.5px",
                    color: "var(--fg-muted)",
                    width: "24px",
                  }}
                >
                  {d.star}★
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "7px",
                    borderRadius: "20px",
                    background: "var(--surface-3)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: d.pct + "%",
                      height: "100%",
                      background: STAR_COLOR,
                      borderRadius: "20px",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: "11px",
                    color: "var(--fg-subtle)",
                    width: "34px",
                    textAlign: "end",
                  }}
                >
                  {d.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: "280px" }}>
          {reviews.map((r) => (
            <div
              key={r.key}
              style={{ padding: "18px 0", borderTop: "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 800,
                    background: r.mine ? "var(--accent)" : "var(--accent-soft)",
                    color: r.mine ? "#fff" : "var(--accent)",
                  }}
                >
                  {r.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "13.5px", fontWeight: 700 }}>
                      {r.name}
                    </span>
                    {r.verified && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: "var(--pos)",
                          background: "var(--pos-soft)",
                          padding: "2px 8px",
                          borderRadius: "20px",
                        }}
                      >
                        <Icon name="badge-check" size={11} />
                        Verified
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: "var(--fg-subtle)",
                      marginTop: "2px",
                    }}
                  >
                    {r.date}
                  </div>
                </div>
                <StarRating avg={r.rating} size={13} gap={2} />
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "11px" }}>
                {r.title}
              </div>
              <p
                style={{
                  margin: "5px 0 0",
                  fontSize: "13.5px",
                  color: "var(--fg-muted)",
                  lineHeight: 1.6,
                }}
              >
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
