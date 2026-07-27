// Product detail: image gallery (color swatches re-tint the art, or 4 angle
// shots), price + variant status, option matrix, personalization accordion,
// qty + add/buy, details/specs, bundle, reviews, and related products.

import { catName, statusMeta } from "../lib/catalog.ts";
import { money } from "../lib/format.ts";
import { hexToRgba } from "../lib/placeholders.ts";
import {
  defaultSel,
  unitPrice,
  variantExists,
  variantStatus,
} from "../lib/pricing.ts";
import { ratingFor } from "../lib/ratings.ts";
import { useStore } from "../state/store.ts";
import { Checkbox } from "../components/Checkbox.tsx";
import { Icon } from "../components/Icon.tsx";
import { OptionPicker } from "../components/OptionPicker.tsx";
import { ProductCard } from "../components/ProductCard.tsx";
import { ProductImage } from "../components/ProductImage.tsx";
import { ReviewsModule } from "../components/ReviewsModule.tsx";
import { StarRating } from "../components/StarRating.tsx";

const ANGLES = ["158deg", "32deg", "108deg", "205deg"];
const ROTS = [0, -8, 7, -4];

const TRUST = [
  { icon: "truck", label: "Free 2-day shipping" },
  { icon: "refresh-ccw", label: "30-day returns" },
  { icon: "shield-check", label: "2-year warranty" },
];

export function Product() {
  const index = useStore((s) => s.index);
  const products = useStore((s) => s.products);
  const cats = useStore((s) => s.cats);
  const ratings = useStore((s) => s.ratings);
  const userReviews = useStore((s) => s.userReviews);
  const selected = useStore((s) => s.selected);
  const sel = useStore((s) => s.sel);
  const gIdx = useStore((s) => s.gIdx);
  const qty = useStore((s) => s.qty);
  const customOn = useStore((s) => s.customOn);
  const customText = useStore((s) => s.customText);
  const customLogo = useStore((s) => s.customLogo);

  const setSel = useStore((s) => s.setSel);
  const setGIdx = useStore((s) => s.setGIdx);
  const qtyInc = useStore((s) => s.qtyInc);
  const qtyDec = useStore((s) => s.qtyDec);
  const toggleCustom = useStore((s) => s.toggleCustom);
  const setCustomText = useStore((s) => s.setCustomText);
  const toggleLogo = useStore((s) => s.toggleLogo);
  const addToCartPDP = useStore((s) => s.addToCartPDP);
  const buyNow = useStore((s) => s.buyNow);
  const notify = useStore((s) => s.notify);
  const add = useStore((s) => s.add);
  const openDrawer = useStore((s) => s.openDrawer);
  const toast = useStore((s) => s.toast_);
  const goCat = useStore((s) => s.goCat);

  const p = index[selected] || products[0];
  const exists = variantExists(p, sel);
  const vstat = exists ? variantStatus(p, sel) : "na";
  const out = vstat === "out" || vstat === "na" || p.status === "out";
  const low = vstat === "low";
  const customObj =
    p.custom && customOn && customText.trim()
      ? { text: customText.trim(), logo: customLogo }
      : null;
  const unit = unitPrice(p, sel, customObj);

  const sm =
    vstat === "na"
      ? { label: "Unavailable", col: "var(--fg-subtle)" }
      : out
        ? { label: "Sold out", col: "var(--fg-subtle)" }
        : statusMeta(vstat);
  const stockNote =
    vstat === "na"
      ? "That combination isn’t available — try another option."
      : out
        ? "This option is currently out of stock."
        : low
          ? "Only a few left — order soon."
          : "In stock, ready to ship today.";
  const stockIcon = out ? "x-circle" : low ? "alert-circle" : "check-circle-2";

  // gallery
  const gi = Math.min(gIdx || 0, 3);
  const colorOpt = (p.options || []).find((o) => o.type === "swatch");
  let mainTint: string;
  let shotLabel: string;
  let thumbs: {
    id: string;
    active: boolean;
    ex: boolean;
    ang: string;
    tint: string;
    rot: number;
    onClick: () => void;
  }[];
  if (colorOpt) {
    const selId = sel[colorOpt.key];
    const selColor = colorOpt.values.find((v) => v.id === selId);
    mainTint = (selColor || colorOpt.values[0]).hex || p.tint;
    shotLabel = selColor?.label || "";
    thumbs = colorOpt.values.map((v) => {
      const ex = variantExists(p, { ...sel, [colorOpt.key]: v.id });
      return {
        id: v.id,
        active: selId === v.id,
        ex,
        ang: "158deg",
        tint: v.hex || p.tint,
        rot: 0,
        onClick: () => {
          if (ex) setSel(colorOpt.key, v.id);
        },
      };
    });
  } else {
    mainTint = p.tint;
    shotLabel = gi + 1 + " / 4";
    thumbs = ANGLES.map((ang, i) => ({
      id: String(i),
      active: i === gi,
      ex: true,
      ang,
      tint: p.tint,
      rot: ROTS[i],
      onClick: () => setGIdx(i),
    }));
  }

  // related + bundle
  let related = products.filter((x) => x.cat === p.cat && x.id !== p.id);
  if (related.length < 4) {
    const extra = products.filter((x) => x.id !== p.id && x.cat !== p.cat);
    related = related.concat(extra).slice(0, 4);
  } else related = related.slice(0, 4);

  const inStockRel = related.filter((x) => x.status !== "out");
  const bundleItems =
    p.status !== "out" && inStockRel.length >= 1
      ? [p, ...inStockRel.slice(0, 2)]
      : null;
  const bundleRegular = bundleItems
    ? bundleItems.reduce((a, x) => a + x.price, 0)
    : 0;
  const bundlePrice = bundleRegular * 0.85;
  const bundleSave = bundleRegular - bundlePrice;

  const rt = ratingFor(p.id, ratings, userReviews);

  const hasOptions = !!(p.options && p.options.length);

  return (
    <main
      className="sf-screen"
      style={{
        maxWidth: "1160px",
        margin: "0 auto",
        padding: "clamp(16px,2.6vw,26px) clamp(16px,4vw,32px) 20px",
      }}
    >
      <div
        style={{
          fontSize: "12.5px",
          color: "var(--fg-subtle)",
          marginBottom: "18px",
        }}
      >
        <button
          className="sf-link"
          onClick={() => useStore.getState().go("home")}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--fg-subtle)",
            fontSize: "12.5px",
            cursor: "pointer",
            padding: 0,
            fontWeight: 600,
          }}
        >
          Home
        </button>
        <span style={{ margin: "0 7px" }}>/</span>
        <button
          className="sf-link"
          onClick={() => goCat(p.cat)}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--fg-subtle)",
            fontSize: "12.5px",
            cursor: "pointer",
            padding: 0,
            fontWeight: 600,
          }}
        >
          {catName(cats, p.cat)}
        </button>
        <span style={{ margin: "0 7px" }}>/</span>
        <span style={{ color: "var(--fg-muted)" }}>{p.title}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(330px,100%),1fr))",
          gap: "clamp(22px,3.5vw,48px)",
          alignItems: "start",
        }}
      >
        {/* gallery */}
        <div>
          <div
            style={{
              position: "relative",
              aspectRatio: "1 / 1",
              borderRadius: "20px",
              overflow: "hidden",
              border: "1px solid var(--border)",
              background: hexToRgba(mainTint, 0.15),
              boxShadow: "var(--shadow)",
            }}
          >
            <ProductImage src={p.image} alt={p.title} tint={mainTint} dim={out} />
            <span
              style={{
                position: "absolute",
                bottom: "16px",
                insetInlineStart: "16px",
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--on-tint)",
                background: "var(--tint-chip)",
                padding: "5px 10px",
                borderRadius: "8px",
                backdropFilter: "blur(4px)",
              }}
            >
              {shotLabel}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "10px",
              marginTop: "12px",
            }}
          >
            {thumbs.map((t) => (
              <button
                key={t.id}
                className="sf-thumb"
                onClick={t.onClick}
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: t.ex ? "pointer" : "not-allowed",
                  background: hexToRgba(t.tint, 0.15),
                  border: "2px solid " + (t.active ? "var(--accent)" : "transparent"),
                  opacity: t.ex ? (t.active ? 1 : 0.72) : 0.32,
                  padding: 0,
                }}
              >
                <ProductImage src={p.image} alt={p.title} tint={t.tint} />
              </button>
            ))}
          </div>
        </div>

        {/* info column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "7px",
              }}
            >
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                  color: "var(--accent)",
                }}
              >
                {catName(cats, p.cat)}
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "11.5px",
                  color: "var(--fg-subtle)",
                }}
              >
                {p.sku}
              </span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(26px,3.6vw,36px)",
                fontWeight: 800,
                letterSpacing: "-.03em",
                lineHeight: 1.06,
              }}
            >
              {p.title}
            </h1>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontWeight: 600,
                fontSize: "clamp(24px,3vw,30px)",
                letterSpacing: "-.02em",
              }}
            >
              {money(unit)}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13.5px",
                fontWeight: 700,
                color: sm.col,
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: sm.col,
                }}
              />
              {sm.label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <StarRating avg={rt.avg} size={16} gap={2} />
            <span style={{ fontSize: "13.5px", fontWeight: 700 }}>{rt.avgLabel}</span>
            <span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>
              · {rt.count} reviews
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              color: "var(--fg-muted)",
              lineHeight: 1.6,
            }}
          >
            {p.blurb}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--fg-muted)",
            }}
          >
            <Icon name={stockIcon} size={16} color={sm.col} />
            {stockNote}
          </div>

          {hasOptions && <OptionPicker product={p} />}

          {p.custom && (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              <button
                onClick={toggleCustom}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: "100%",
                  padding: "14px 16px",
                  border: "none",
                  background: "var(--surface-2)",
                  cursor: "pointer",
                  textAlign: "start",
                }}
              >
                <Checkbox on={customOn} />
                <span
                  style={{
                    flex: 1,
                    fontSize: "13.5px",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Icon name="sparkles" size={15} color="var(--accent)" />
                  {p.custom.label}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  +{money(p.custom.fee)}
                </span>
              </button>
              {customOn && (
                <div
                  style={{
                    padding: "15px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "13px",
                    borderTop: "1px solid var(--border)",
                    animation: "sf-fade .2s ease",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "7px",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--fg-muted)",
                        }}
                      >
                        {p.custom.verb} text
                      </label>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: "11px",
                          color: "var(--fg-subtle)",
                        }}
                      >
                        {customText.length} / {p.custom.max}
                      </span>
                    </div>
                    <input
                      className="sf-fld"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder={p.custom.ph}
                      style={{
                        width: "100%",
                        padding: "11px 13px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-strong)",
                        background: "var(--surface)",
                        fontSize: "14px",
                        color: "var(--fg)",
                        outline: "none",
                        fontFamily: "'JetBrains Mono',monospace",
                        letterSpacing: ".04em",
                      }}
                    />
                  </div>
                  {customText.trim() && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "11px 13px",
                        borderRadius: "10px",
                        background: "var(--accent-soft)",
                      }}
                    >
                      <Icon name="eye" size={15} color="var(--accent)" />
                      <span style={{ fontSize: "12px", color: "var(--fg-muted)" }}>
                        Preview
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          fontWeight: 700,
                          letterSpacing: ".08em",
                          color: "var(--fg)",
                        }}
                      >
                        {customText.trim()}
                      </span>
                    </div>
                  )}
                  {p.custom.logo && (
                    <button
                      onClick={toggleLogo}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "11px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        padding: 0,
                        textAlign: "start",
                      }}
                    >
                      <Checkbox on={customLogo} />
                      <span style={{ fontSize: "12.5px", color: "var(--fg-muted)" }}>
                        Add my logo — we’ll email a proof before printing
                      </span>
                    </button>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      fontSize: "11.5px",
                      color: "var(--fg-subtle)",
                      lineHeight: 1.5,
                    }}
                  >
                    <Icon
                      name="info"
                      size={13}
                      style={{ flexShrink: 0, marginTop: "2px" }}
                    />
                    Personalized items are made to order and aren’t eligible for
                    return.
                  </div>
                </div>
              )}
            </div>
          )}

          {!out ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  flexWrap: "wrap",
                  marginTop: "4px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "11px",
                    overflow: "hidden",
                  }}
                >
                  <button
                    className="sf-gi"
                    onClick={qtyDec}
                    style={{
                      width: "44px",
                      height: "46px",
                      border: "none",
                      background: "var(--surface)",
                      color: "var(--fg-muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="minus" size={16} />
                  </button>
                  <span
                    style={{
                      minWidth: "44px",
                      textAlign: "center",
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: "15px",
                      fontWeight: 600,
                    }}
                  >
                    {qty}
                  </span>
                  <button
                    className="sf-gi"
                    onClick={qtyInc}
                    style={{
                      width: "44px",
                      height: "46px",
                      border: "none",
                      background: "var(--surface)",
                      color: "var(--fg-muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </div>
                <span style={{ fontSize: "12.5px", color: "var(--fg-subtle)" }}>
                  Qty
                </span>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  className="sf-btn"
                  onClick={addToCartPDP}
                  style={{
                    flex: 1,
                    minWidth: "150px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    padding: "15px",
                    borderRadius: "13px",
                    border: "none",
                    background: "var(--accent)",
                    color: "var(--accent-fg)",
                    fontWeight: 700,
                    fontSize: "15px",
                    cursor: "pointer",
                  }}
                >
                  <Icon name="shopping-bag" size={18} />
                  Add to cart
                </button>
                <button
                  className="sf-gi"
                  onClick={buyNow}
                  style={{
                    flex: 1,
                    minWidth: "150px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    padding: "15px",
                    borderRadius: "13px",
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface)",
                    color: "var(--fg)",
                    fontWeight: 700,
                    fontSize: "15px",
                    cursor: "pointer",
                  }}
                >
                  <Icon name="zap" size={18} />
                  Buy now
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "4px",
              }}
            >
              <button
                disabled
                style={{
                  flex: 1,
                  minWidth: "150px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "9px",
                  padding: "15px",
                  borderRadius: "13px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--fg-subtle)",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: "not-allowed",
                }}
              >
                <Icon name="ban" size={18} />
                Sold out
              </button>
              <button
                className="sf-gi"
                onClick={notify}
                style={{
                  flex: 1,
                  minWidth: "150px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "9px",
                  padding: "15px",
                  borderRadius: "13px",
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)",
                  color: "var(--fg)",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                <Icon name="bell" size={18} />
                Notify me when back
              </button>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px 20px",
              marginTop: "8px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border)",
            }}
          >
            {TRUST.map((tr) => (
              <span
                key={tr.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "var(--fg-muted)",
                }}
              >
                <Icon name={tr.icon} size={16} color="var(--pos)" />
                {tr.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* details + specs */}
      <div
        style={{
          marginTop: "clamp(32px,5vw,54px)",
          display: "flex",
          gap: "clamp(22px,3vw,48px)",
          flexWrap: "wrap",
          alignItems: "start",
        }}
      >
        <div style={{ flex: 1.5, minWidth: "280px" }}>
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "clamp(18px,2.2vw,21px)",
              fontWeight: 800,
              letterSpacing: "-.02em",
            }}
          >
            Details
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "14.5px",
              color: "var(--fg-muted)",
              lineHeight: 1.7,
              maxWidth: "560px",
            }}
          >
            {p.desc}
          </p>
        </div>
        <div style={{ flex: 1, minWidth: "250px" }}>
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "clamp(18px,2.2vw,21px)",
              fontWeight: 800,
              letterSpacing: "-.02em",
            }}
          >
            Specifications
          </h2>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "14px",
              overflow: "hidden",
              background: "var(--surface)",
              boxShadow: "var(--shadow)",
            }}
          >
            {p.specs.map((sp, i) => (
              <div
                key={sp[0]}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "12px 15px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>
                  {sp[0]}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--fg)",
                    textAlign: "end",
                  }}
                >
                  {sp[1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* bundle */}
      {bundleItems && (
        <section style={{ marginTop: "clamp(34px,5vw,56px)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
            }}
          >
            <Icon name="package-plus" size={19} color="var(--accent)" />
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(19px,2.4vw,23px)",
                fontWeight: 800,
                letterSpacing: "-.02em",
              }}
            >
              Buy the bundle &amp; save
            </h2>
          </div>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "18px",
              background: "var(--surface)",
              boxShadow: "var(--shadow)",
              padding: "clamp(18px,3vw,26px)",
              display: "flex",
              gap: "clamp(20px,3vw,36px)",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                flex: 1,
                minWidth: "250px",
              }}
            >
              {bundleItems.map((b, i) => (
                <div
                  key={b.id}
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <button
                    onClick={() => useStore.getState().openProduct(b.id)}
                    style={{
                      position: "relative",
                      width: "82px",
                      height: "82px",
                      borderRadius: "14px",
                      overflow: "hidden",
                      background: hexToRgba(b.tint, 0.15),
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <ProductImage src={b.image} alt={b.title} tint={b.tint} />
                  </button>
                  {i < bundleItems.length - 1 && (
                    <Icon
                      name="plus"
                      size={18}
                      color="var(--fg-subtle)"
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                minWidth: "190px",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: "15px",
                    color: "var(--fg-subtle)",
                    textDecoration: "line-through",
                  }}
                >
                  {money(bundleRegular)}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 700,
                    fontSize: "24px",
                    letterSpacing: "-.02em",
                  }}
                >
                  {money(bundlePrice)}
                </span>
              </div>
              <span
                style={{
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--pos)",
                  background: "var(--pos-soft)",
                  padding: "5px 11px",
                  borderRadius: "20px",
                }}
              >
                <Icon name="tag" size={13} />
                Save {money(bundleSave)} · 15% off
              </span>
              <button
                className="sf-btn"
                onClick={() => {
                  bundleItems.forEach((x) =>
                    add(x.id, 1, defaultSel(x), null, 0.15),
                  );
                  openDrawer();
                  toast("Bundle added — you saved " + money(bundleSave));
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "13px 20px",
                  borderRadius: "12px",
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                <Icon name="shopping-bag" size={16} />
                Add {bundleItems.length} to cart
              </button>
            </div>
          </div>
        </section>
      )}

      <ReviewsModule product={p} />

      {/* related */}
      <section style={{ marginTop: "clamp(34px,5vw,56px)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "18px",
          }}
        >
          <Icon name="heart" size={19} color="var(--accent)" />
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(19px,2.4vw,23px)",
              fontWeight: 800,
              letterSpacing: "-.02em",
            }}
          >
            You might also like
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(min(216px,100%),1fr))",
            gap: "clamp(12px,1.6vw,18px)",
          }}
        >
          {related.map((x) => (
            <ProductCard key={x.id} product={x} />
          ))}
        </div>
      </section>
    </main>
  );
}
