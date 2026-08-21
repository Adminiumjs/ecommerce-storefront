// Size guide modal — a shoe or apparel measurement table, derived from the
// selected product's `size` option.

import type { Product } from "../data/types.ts";
import { useT, type TFunction } from "../i18n";
import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";

interface SizeGuide {
  title: string;
  cols: string[];
  rows: string[][];
}

/**
 * Takes `t` rather than reaching for one: this is a plain function, and the
 * only caller is a component that already holds the hook.
 *
 * The shoe table's headers are sizing SYSTEMS — US, EU, CM — and are the same
 * tokens in every language, the way a shoe box prints them. The apparel table's
 * headers name body measurements, which is ordinary prose, so those translate.
 */
export function sizeGuideVM(p: Product, t: TFunction): SizeGuide | null {
  const o = (p.options || []).find((x) => x.key === "size");
  if (!o) return null;
  const shoe = /US|shoe/i.test(o.name);
  return shoe
    ? {
        title: t("chrome.sizeGuide.shoe"),
        cols: ["US", "EU", "CM"],
        rows: [
          ["8", "41", "26.0"],
          ["9", "42.5", "27.0"],
          ["10", "44", "28.0"],
          ["11", "45", "29.0"],
          ["12", "46", "30.0"],
        ],
      }
    : {
        title: t("chrome.sizeGuide.apparel"),
        cols: [
          t("chrome.sizeGuide.colSize"),
          t("chrome.sizeGuide.colChest"),
          t("chrome.sizeGuide.colLength"),
        ],
        rows: [
          ["S", '36"', '27"'],
          ["M", '39"', '28"'],
          ["L", '42"', '29"'],
          ["XL", '45"', '30"'],
        ],
      };
}

export function SizeGuideModal() {
  const t = useT();
  const open = useStore((s) => s.sizeGuideOpen);
  const selected = useStore((s) => s.selected);
  const index = useStore((s) => s.index);
  const close = useStore((s) => s.closeSizeGuide);

  if (!open) return null;
  const p = index[selected];
  const guide = p ? sizeGuideVM(p, t) : null;
  if (!guide) return null;

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
          width: "460px",
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
          <Icon name="ruler" size={18} color="var(--accent)" />
          <div
            style={{
              fontSize: "16.5px",
              fontWeight: 800,
              letterSpacing: "-.02em",
              flex: 1,
            }}
          >
            {guide.title}
          </div>
          <button
            className="sf-gi"
            onClick={close}
            aria-label={t("chrome.close")}
            style={{
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
            }}
          >
            <Icon name="x" size={17} />
          </button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                background: "var(--surface-2)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {guide.cols.map((c) => (
                <div
                  key={c}
                  style={{
                    flex: 1,
                    padding: "11px 14px",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                    color: "var(--fg-subtle)",
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
            {guide.rows.map((row, ri) => (
              <div
                key={ri}
                style={{
                  display: "flex",
                  borderTop: ri === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                {row.map((v, ci) => (
                  <div
                    key={ci}
                    style={{
                      flex: 1,
                      padding: "11px 14px",
                      fontSize: "13px",
                      fontWeight: ci === 0 ? 700 : 500,
                      fontFamily:
                        ci === 0
                          ? "'Manrope',system-ui,sans-serif"
                          : "'JetBrains Mono',monospace",
                      color: ci === 0 ? "var(--fg)" : "var(--fg-muted)",
                    }}
                  >
                    {v}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              marginTop: "14px",
              fontSize: "12px",
              color: "var(--fg-muted)",
              lineHeight: 1.5,
            }}
          >
            <Icon
              name="info"
              size={14}
              style={{ flexShrink: 0, marginTop: "1px" }}
            />
            {t("chrome.sizeGuide.note")}
          </div>
        </div>
      </div>
    </div>
  );
}
