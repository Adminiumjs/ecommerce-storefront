// Write-a-review modal — tap-to-rate stars + title + body, posted live to the
// selected product's review list.

import { STAR_COLOR } from "../data/demo.ts";
import { useI18n, type MessageKey } from "../i18n";
import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";

/** Index 0 is the un-rated prompt; 1–5 are the words for each star count. */
const WORD_KEYS: MessageKey[] = [
  "chrome.review.rate0",
  "chrome.review.rate1",
  "chrome.review.rate2",
  "chrome.review.rate3",
  "chrome.review.rate4",
  "chrome.review.rate5",
];

export function ReviewModal() {
  const { t, number } = useI18n();
  const open = useStore((s) => s.reviewOpen);
  const selected = useStore((s) => s.selected);
  const index = useStore((s) => s.index);
  const rating = useStore((s) => s.reviewRating);
  const hover = useStore((s) => s.reviewHover);
  const title = useStore((s) => s.reviewTitle);
  const body = useStore((s) => s.reviewBody);
  const close = useStore((s) => s.closeReview);
  const setRating = useStore((s) => s.setReviewRating);
  const setHover = useStore((s) => s.setReviewHover);
  const setTitle = useStore((s) => s.setReviewTitle);
  const setBody = useStore((s) => s.setReviewBody);
  const submit = useStore((s) => s.submitReview);

  if (!open) return null;
  const p = index[selected];
  const rr = hover || rating;

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 260,
        background: "rgba(10,10,15,.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "520px",
          maxWidth: "96vw",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          boxShadow: "0 28px 70px rgba(10,10,20,.4)",
          overflow: "hidden",
          animation: "sf-pop .22s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "20px 22px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "-.02em" }}
            >
              {t("chrome.review.write")}
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--fg-subtle)" }}>
              {p?.title}
            </div>
          </div>
          <button
            className="sf-gi"
            onClick={close}
            aria-label={t("chrome.close")}
            style={{
              marginInlineStart: "auto",
              width: "34px",
              height: "34px",
              borderRadius: "9px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--fg-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Icon name="x" size={17} />
          </button>
        </div>
        <div
          style={{
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 600,
                marginBottom: "9px",
              }}
            >
              {t("chrome.review.yourRating")}
            </label>
            <div
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  aria-label={t(
                    "chrome.review.starAria",
                    { count: number(n) },
                    n,
                  )}
                  aria-pressed={n <= rating}
                  style={{
                    fontSize: "32px",
                    lineHeight: 1,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 2px",
                    color: n <= rr ? STAR_COLOR : "var(--border-strong)",
                  }}
                >
                  ★
                </button>
              ))}
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "var(--fg-muted)",
                  marginInlineStart: "10px",
                }}
              >
                {t(WORD_KEYS[rr] ?? WORD_KEYS[0])}
              </span>
            </div>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 600,
                marginBottom: "7px",
              }}
            >
              {t("chrome.review.titleLabel")}
            </label>
            <input
              className="sf-fld"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("chrome.review.titlePlaceholder")}
              aria-label={t("chrome.review.titleLabel")}
              style={{
                width: "100%",
                padding: "11px 13px",
                borderRadius: "11px",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-2)",
                fontSize: "14px",
                color: "var(--fg)",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 600,
                marginBottom: "7px",
              }}
            >
              {t("chrome.review.bodyLabel")}
            </label>
            <textarea
              className="sf-fld"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={t("chrome.review.bodyPlaceholder")}
              aria-label={t("chrome.review.bodyLabel")}
              style={{
                width: "100%",
                padding: "11px 13px",
                borderRadius: "11px",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-2)",
                fontSize: "14px",
                color: "var(--fg)",
                outline: "none",
                resize: "none",
                lineHeight: 1.55,
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            padding: "16px 22px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface-2)",
          }}
        >
          <button
            className="sf-gi"
            onClick={close}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "11px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--fg-muted)",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
            }}
          >
            {t("chrome.review.cancel")}
          </button>
          <button
            className="sf-btn"
            onClick={submit}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              padding: "12px",
              borderRadius: "11px",
              border: "none",
              background: "var(--accent)",
              color: "var(--accent-fg)",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
            }}
          >
            <Icon name="send" size={15} />
            {t("chrome.review.post")}
          </button>
        </div>
      </div>
    </div>
  );
}
