// Home: hero, new-arrivals banner, featured grid, shop-by-category tiles,
// value-props strip, and the promo banner.

import { BRAND, FREE_SHIP, HERO_IMAGE, PROMO_CODE, PROMO_RATE } from "../lib/shop.ts";
import { useI18n } from "../i18n";
import { catCount } from "../lib/catalog.ts";
import { money } from "../lib/format.ts";
import { hexToRgba, phBg, phIconCol } from "../lib/placeholders.ts";
import { useStore } from "../state/store.ts";
import { Icon } from "../components/Icon.tsx";
import { ProductCard } from "../components/ProductCard.tsx";
import { ProductImage } from "../components/ProductImage.tsx";
import { forwardArrow, rich } from "./shared.tsx";

const CAT_TINTS = ["#6f74c4", "#7d9166", "#b0836a", "#869162"];

export function Home() {
  const { t, number, dir } = useI18n();
  const theme = useStore((s) => s.theme);
  const products = useStore((s) => s.products);
  const cats = useStore((s) => s.cats);
  const goCat = useStore((s) => s.goCat);

  const featured = products.filter((p) => p.feat);
  const fwd = forwardArrow(dir);

  /* Built per render, not at module load. As a module-level const this array
   * called `money()` once, before <I18nProvider> had mounted — so the amount
   * froze as "$75.00" and stayed that way through every language switch. */
  const VALUE_PROPS = [
    {
      icon: "truck",
      title: t("screens.home.freeShipping"),
      sub: t("screens.home.vpShipSub", { amount: money(FREE_SHIP) }),
    },
    {
      icon: "shield-check",
      title: t("screens.home.vpWarranty"),
      sub: t("screens.home.vpWarrantySub"),
    },
    {
      icon: "refresh-ccw",
      title: t("screens.home.returns"),
      sub: t("screens.home.vpReturnsSub"),
    },
  ];

  return (
    <main
      className="sf-screen"
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "clamp(18px,3.5vw,30px) clamp(16px,4vw,32px) 20px",
      }}
    >
      {/* hero */}
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "22px",
          overflow: "hidden",
          background: "var(--surface)",
          boxShadow: "var(--shadow)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))",
        }}
      >
        <div
          style={{
            padding: "clamp(28px,4vw,52px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "18px",
          }}
        >
          <span
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "11.5px",
              fontWeight: 700,
              letterSpacing: ".02em",
              padding: "6px 12px",
              borderRadius: "20px",
              background: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            <Icon name="sparkles" size={13} />
            {t("screens.home.heroBadge")}
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(32px,4.6vw,50px)",
              fontWeight: 800,
              letterSpacing: "-.035em",
              lineHeight: 1.02,
            }}
          >
            {rich(t("screens.home.heroTitle"), { br: <br /> })}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(15px,1.7vw,17px)",
              color: "var(--fg-muted)",
              lineHeight: 1.55,
              maxWidth: "440px",
            }}
          >
            {t("screens.home.heroBody", { amount: money(FREE_SHIP) })}
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "11px",
              marginTop: "6px",
            }}
          >
            <button
              className="sf-btn"
              onClick={() => goCat("all")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 24px",
                borderRadius: "12px",
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-fg)",
                fontWeight: 700,
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              {t("screens.home.shopNewArrivals")}
              <Icon name={fwd} size={17} />
            </button>
            <button
              className="sf-gi"
              onClick={() => goCat("gear")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 22px",
                borderRadius: "12px",
                border: "1px solid var(--border-strong)",
                background: "var(--surface)",
                color: "var(--fg)",
                fontWeight: 700,
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              {t("screens.home.browseGear")}
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "18px",
              marginTop: "10px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                fontSize: "12.5px",
                color: "var(--fg-muted)",
                fontWeight: 600,
              }}
            >
              <Icon name="truck" size={15} color="var(--pos)" />
              {t("screens.home.freeShipping")}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                fontSize: "12.5px",
                color: "var(--fg-muted)",
                fontWeight: 600,
              }}
            >
              <Icon name="refresh-ccw" size={15} color="var(--pos)" />
              {t("screens.home.returns")}
            </span>
          </div>
        </div>
        <div
          style={{
            position: "relative",
            minHeight: "300px",
            overflow: "hidden",
            background: hexToRgba("#6f74c4", 0.15),
          }}
        >
          <ProductImage
            src={HERO_IMAGE}
            alt={t("screens.home.heroAlt", { brand: BRAND })}
            tint="#6f74c4"
          />
        </div>
      </section>

      {/* new arrivals banner */}
      <section style={{ marginTop: "clamp(18px,2.5vw,24px)" }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "20px",
            border: "1px solid var(--border)",
            background: phBg("#5f9a94", theme),
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "18px",
            padding: "clamp(22px,3.5vw,38px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingInlineEnd: "clamp(20px,5vw,60px)",
              color: phIconCol("#5f9a94", theme),
            }}
          >
            <Icon name="sparkles" size="clamp(70px,12vw,120px)" />
          </div>
          <div style={{ flex: 1, minWidth: "240px", position: "relative", zIndex: 1 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                padding: "5px 11px",
                borderRadius: "20px",
                background: "var(--surface)",
                color: "var(--fg)",
                boxShadow: "var(--shadow)",
              }}
            >
              <Icon name="star" size={12} color="var(--accent)" />
              {t("screens.home.justLanded")}
            </span>
            <h3
              style={{
                margin: "12px 0 0",
                fontSize: "clamp(22px,3vw,30px)",
                fontWeight: 800,
                letterSpacing: "-.025em",
                lineHeight: 1.08,
              }}
            >
              {t("screens.home.arrivalsTitle")}
            </h3>
            <p
              style={{
                margin: "9px 0 0",
                fontSize: "14px",
                color: "var(--fg-muted)",
                lineHeight: 1.5,
                maxWidth: "440px",
              }}
            >
              {t("screens.home.arrivalsBody", { brand: BRAND })}
            </p>
            <button
              className="sf-btn"
              onClick={() => goCat("all")}
              style={{
                marginTop: "16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "13px 22px",
                borderRadius: "12px",
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-fg)",
                fontWeight: 700,
                fontSize: "14.5px",
                cursor: "pointer",
              }}
            >
              {t("screens.home.shopNewArrivals")}
              <Icon name={fwd} size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* featured */}
      <section style={{ marginTop: "clamp(34px,5vw,52px)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "18px",
          }}
        >
          <Icon name="sparkles" size={19} color="var(--accent)" />
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(19px,2.4vw,23px)",
              fontWeight: 800,
              letterSpacing: "-.02em",
            }}
          >
            {t("screens.home.featured")}
          </h2>
          <button
            className="sf-link"
            onClick={() => goCat("all")}
            style={{
              marginInlineStart: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              border: "none",
              background: "transparent",
              color: "var(--fg-muted)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("screens.home.viewAll")}
            <Icon name={fwd} size={15} />
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(min(224px,100%),1fr))",
            gap: "clamp(12px,1.6vw,18px)",
          }}
        >
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* shop by category */}
      <section style={{ marginTop: "clamp(34px,5vw,52px)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "18px",
          }}
        >
          <Icon name="layout-grid" size={19} color="var(--accent)" />
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(19px,2.4vw,23px)",
              fontWeight: 800,
              letterSpacing: "-.02em",
            }}
          >
            {t("screens.home.shopByCategory")}
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(228px,100%),1fr))",
            gap: "clamp(12px,1.6vw,18px)",
          }}
        >
          {cats.map((c, i) => {
            const tint = CAT_TINTS[i % CAT_TINTS.length];
            return (
              <button
                key={c.slug}
                className="sf-tile"
                onClick={() => goCat(c.slug)}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "170px",
                  padding: "20px",
                  borderRadius: "18px",
                  border: "1px solid var(--border)",
                  background: phBg(tint, theme),
                  cursor: "pointer",
                  overflow: "hidden",
                  textAlign: "start",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "14px",
                    insetInlineStart: "18px",
                    color: phIconCol(tint, theme),
                    opacity: 0.9,
                  }}
                >
                  <Icon name={c.icon} size={32} />
                </div>
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    textAlign: "start",
                    marginTop: "auto",
                  }}
                >
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      letterSpacing: "-.02em",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12.5px",
                      color: "var(--fg-muted)",
                      fontWeight: 600,
                      marginTop: "2px",
                    }}
                  >
                    {t(
                      "screens.home.catProducts",
                      { count: number(catCount(products, c.slug)) },
                      catCount(products, c.slug),
                    )}
                  </div>
                </div>
                <span
                  style={{
                    position: "absolute",
                    top: "16px",
                    insetInlineEnd: "16px",
                    width: "34px",
                    height: "34px",
                    borderRadius: "10px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--fg)",
                    zIndex: 1,
                  }}
                >
                  <Icon name="arrow-up-right" size={17} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* value props */}
      <section
        style={{
          marginTop: "clamp(34px,5vw,52px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))",
          gap: "14px",
        }}
      >
        {VALUE_PROPS.map((v) => (
          <div
            key={v.title}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "20px 22px",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              background: "var(--surface)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name={v.icon} size={21} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "14.5px",
                  fontWeight: 800,
                  letterSpacing: "-.01em",
                }}
              >
                {v.title}
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  color: "var(--fg-muted)",
                  lineHeight: 1.5,
                  marginTop: "3px",
                }}
              >
                {v.sub}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* promo banner */}
      <section style={{ marginTop: "clamp(20px,3vw,26px)" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            justifyContent: "space-between",
            padding: "clamp(26px,4vw,44px)",
            borderRadius: "20px",
            overflow: "hidden",
            background:
              "linear-gradient(120deg, var(--accent), color-mix(in srgb, var(--accent) 62%, #000))",
          }}
        >
          <div style={{ position: "relative", zIndex: 1, maxWidth: "560px" }}>
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "var(--accent-fg)",
                opacity: 0.8,
              }}
            >
              {t("screens.home.limitedTime")}
            </div>
            <h3
              style={{
                margin: "8px 0 0",
                fontSize: "clamp(22px,3vw,30px)",
                fontWeight: 800,
                letterSpacing: "-.025em",
                color: "var(--accent-fg)",
                lineHeight: 1.1,
              }}
            >
              {t("screens.home.promoTitle", {
                pct: number(PROMO_RATE, { style: "percent" }),
              })}
            </h3>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: "14px",
                color: "var(--accent-fg)",
                opacity: 0.85,
                lineHeight: 1.5,
              }}
            >
              {rich(t("screens.home.promoBody", { brand: BRAND }), {
                code: (
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontWeight: 700,
                      background: "rgba(255,255,255,.18)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {PROMO_CODE}
                  </span>
                ),
              })}
            </p>
          </div>
          <button
            className="sf-btn"
            onClick={() => goCat("all")}
            style={{
              position: "relative",
              zIndex: 1,
              alignSelf: "center",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 24px",
              borderRadius: "12px",
              border: "none",
              background: "#fff",
              color: "var(--accent)",
              fontWeight: 800,
              fontSize: "15px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {t("screens.home.shopTheSale")}
            <Icon name={fwd} size={17} />
          </button>
        </div>
      </section>
    </main>
  );
}
