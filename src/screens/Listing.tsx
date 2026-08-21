// Listing / catalog: breadcrumb, filters sidebar (category / max price /
// availability / rating), sort dropdown, fake-latency skeletons, empty states,
// and load-more pagination.

import type { Product } from "../data/types.ts";
import { useI18n, type MessageKey } from "../i18n";
import { catName } from "../lib/catalog.ts";
import { money } from "../lib/format.ts";
import { ratingFor } from "../lib/ratings.ts";
import type { Sort } from "../state/store.ts";
import { useStore } from "../state/store.ts";
import { Icon } from "../components/Icon.tsx";
import { ProductCard } from "../components/ProductCard.tsx";

/* Keys, not copy: this table is built once at module load, so an English label
 * here would outlive every language switch. */
const SORTS: [Sort, MessageKey][] = [
  ["featured", "screens.listing.sortFeatured"],
  ["price-asc", "screens.listing.sortPriceAsc"],
  ["price-desc", "screens.listing.sortPriceDesc"],
  ["name", "screens.listing.sortName"],
];

/** The price slider's fixed bounds — shown as money, not as a bare "$200". */
const PRICE_MIN = 0;
const PRICE_MAX = 200;

function rowStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "8px 9px",
    borderRadius: "9px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "13.5px",
    fontWeight: active ? 700 : 600,
    color: active ? "var(--fg)" : "var(--fg-muted)",
  };
}

function radioStyle(active: boolean): React.CSSProperties {
  return {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    border: "2px solid " + (active ? "var(--accent)" : "var(--border-strong)"),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

function Radio({ active }: { active: boolean }) {
  return (
    <span style={radioStyle(active)}>
      {active && (
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "var(--accent)",
          }}
        />
      )}
    </span>
  );
}

export function Listing() {
  const { t, number } = useI18n();
  const s = useStore();
  const {
    cat,
    sort,
    avail,
    pmax,
    q,
    minRating,
    shown,
    products,
    cats,
    ratings,
    userReviews,
    loading,
    sortOpen,
    filtersOpen,
  } = s;

  const ql = (q || "").trim().toLowerCase();
  let list: Product[] = products.slice();
  if (ql)
    list = list.filter(
      (p) =>
        (p.title + " " + p.sku + " " + p.cat + " " + p.blurb)
          .toLowerCase()
          .indexOf(ql) >= 0,
    );
  else if (cat !== "all") list = list.filter((p) => p.cat === cat);
  if (avail === "in") list = list.filter((p) => p.status !== "out");
  if (minRating > 0)
    list = list.filter(
      (p) => ratingFor(p.id, ratings, userReviews).avg >= minRating,
    );
  list = list.filter((p) => p.price <= pmax);
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  else if (sort === "name") list.sort((a, b) => a.title.localeCompare(b.title));
  else list.sort((a, b) => (b.feat ? 1 : 0) - (a.feat ? 1 : 0));

  const total = list.length;
  const visible = list.slice(0, shown);
  const title = ql
    ? t("screens.listing.resultsFor", { q })
    : cat === "all"
      ? t("chrome.footer.allProducts")
      : catName(cats, cat);
  const crumb = ql
    ? t("screens.listing.search")
    : cat === "all"
      ? t("chrome.footer.allProducts")
      : catName(cats, cat);
  const sortLabel = t((SORTS.find((x) => x[0] === sort) || SORTS[0])[1]);

  const catRows = [
    { slug: "all", name: t("chrome.footer.allProducts"), count: products.length },
    ...cats.map((c) => ({
      slug: c.slug,
      name: c.name,
      count: products.filter((p) => p.cat === c.slug).length,
    })),
  ];

  const availRows: [typeof avail, string][] = [
    ["all", t("screens.listing.availAll")],
    ["in", t("screens.listing.availIn")],
  ];
  /* The threshold is a NUMBER, formatted per locale — "4.5 & up" hard-coded an
   * en-US decimal point, which reads wrong anywhere that writes 4,5. */
  const ratingRows: [number, string][] = [
    [0, t("screens.listing.ratingAll")],
    ...[4.5, 4, 3].map(
      (r): [number, string] => [
        r,
        t("screens.listing.ratingAndUp", {
          rating: number(r, { minimumFractionDigits: 1 }),
        }),
      ],
    ),
  ];

  const showClear =
    !!ql ||
    cat !== "all" ||
    avail !== "all" ||
    pmax < PRICE_MAX ||
    minRating > 0;
  const priceLabel =
    pmax >= PRICE_MAX
      ? t("screens.listing.priceAny")
      : t("screens.listing.priceUpTo", { amount: money(pmax) });

  return (
    <main
      className="sf-screen"
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "clamp(16px,2.6vw,26px) clamp(16px,4vw,32px) 20px",
      }}
    >
      <div
        style={{
          fontSize: "12.5px",
          color: "var(--fg-subtle)",
          marginBottom: "8px",
        }}
      >
        <button
          className="sf-link"
          onClick={() => s.go("home")}
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
          {t("screens.listing.home")}
        </button>
        <span style={{ margin: "0 7px" }}>/</span>
        {crumb}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "14px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px,3.4vw,32px)",
              fontWeight: 800,
              letterSpacing: "-.03em",
            }}
          >
            {title}
          </h1>
          <div
            style={{ fontSize: "13px", color: "var(--fg-muted)", marginTop: "5px" }}
          >
            {t("screens.home.catProducts", { count: number(total) }, total)}
          </div>
        </div>
        <div
          style={{
            marginInlineStart: "auto",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            className="sf-gi sf-filters-btn"
            onClick={s.toggleFilters}
            style={{
              alignItems: "center",
              gap: "7px",
              padding: "10px 14px",
              borderRadius: "11px",
              border: "1px solid var(--border-strong)",
              background: "var(--surface)",
              color: "var(--fg)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Icon name="sliders-horizontal" size={15} />
            {t("screens.listing.filters")}
          </button>
          <div style={{ position: "relative" }}>
            <button
              className="sf-gi"
              onClick={s.toggleSort}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "11px",
                border: "1px solid var(--border-strong)",
                background: "var(--surface)",
                color: "var(--fg)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Icon name="arrow-up-down" size={15} color="var(--fg-muted)" />
              {sortLabel}
              <Icon name="chevron-down" size={15} color="var(--fg-subtle)" />
            </button>
            {sortOpen && (
              <>
                <div
                  onClick={s.closeSort}
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                />
                <div
                  style={{
                    position: "absolute",
                    insetInlineEnd: 0,
                    top: "calc(100% + 6px)",
                    zIndex: 41,
                    width: "210px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    boxShadow: "0 16px 40px rgba(10,10,20,.2)",
                    padding: "6px",
                    animation: "sf-pop .16s ease",
                  }}
                >
                  {SORTS.map(([key, label]) => {
                    const active = sort === key;
                    return (
                      <button
                        key={key}
                        onClick={() => s.setSort(key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          width: "100%",
                          padding: "9px 10px",
                          borderRadius: "8px",
                          border: "none",
                          background: active ? "var(--accent-soft)" : "transparent",
                          color: active ? "var(--accent)" : "var(--fg)",
                          fontSize: "13px",
                          fontWeight: active ? 700 : 600,
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ flex: 1, textAlign: "start" }}>{t(label)}</span>
                        {active && (
                          <Icon name="check" size={15} color="var(--accent)" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "clamp(18px,2.4vw,30px)",
          alignItems: "flex-start",
        }}
      >
        <aside className="sf-sidebar" data-open={filtersOpen}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            {/* Category */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--fg-subtle)",
                  marginBottom: "10px",
                }}
              >
                {t("screens.listing.category")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                {catRows.map((c) => {
                  const active = !ql && cat === c.slug;
                  return (
                    <button
                      key={c.slug}
                      onClick={() => s.filterCat(c.slug)}
                      style={rowStyle(active)}
                    >
                      <Radio active={active} />
                      <span style={{ flex: 1, textAlign: "start" }}>{c.name}</span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: "12px",
                          color: "var(--fg-subtle)",
                        }}
                      >
                        {c.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ height: "1px", background: "var(--border)" }} />
            {/* Max price */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: "var(--fg-subtle)",
                  }}
                >
                  {t("screens.listing.maxPrice")}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--fg)",
                  }}
                >
                  {priceLabel}
                </span>
              </div>
              <input
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={5}
                value={pmax}
                onChange={(e) => s.setPmax(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "7px",
                  fontSize: "11px",
                  color: "var(--fg-subtle)",
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                <span>{money(PRICE_MIN)}</span>
                <span>{money(PRICE_MAX)}</span>
              </div>
            </div>
            <div style={{ height: "1px", background: "var(--border)" }} />
            {/* Availability */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--fg-subtle)",
                  marginBottom: "10px",
                }}
              >
                {t("screens.listing.availability")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                {availRows.map(([key, label]) => {
                  const active = avail === key;
                  return (
                    <button
                      key={key}
                      onClick={() => s.setAvail(key)}
                      style={rowStyle(active)}
                    >
                      <Radio active={active} />
                      <span style={{ flex: 1, textAlign: "start" }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ height: "1px", background: "var(--border)" }} />
            {/* Rating */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--fg-subtle)",
                  marginBottom: "10px",
                }}
              >
                {t("screens.listing.rating")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                {ratingRows.map(([r, label]) => {
                  const active = minRating === r;
                  return (
                    <button
                      key={r}
                      onClick={() => s.setMinRating(r)}
                      style={rowStyle(active)}
                    >
                      <Radio active={active} />
                      <span
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          textAlign: "start",
                        }}
                      >
                        {r > 0 && (
                          <span style={{ color: "#f5a623", fontSize: "13px" }}>★</span>
                        )}
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {showClear && (
              <button
                className="sf-link"
                onClick={s.clearFilters}
                style={{
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "none",
                  background: "transparent",
                  color: "var(--fg-muted)",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Icon name="x" size={14} />
                {t("screens.listing.clearAll")}
              </button>
            )}
          </div>
        </aside>

        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill,minmax(min(216px,100%),1fr))",
                gap: "clamp(12px,1.6vw,18px)",
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    overflow: "hidden",
                    background: "var(--surface)",
                  }}
                >
                  <div className="sf-skel" style={{ aspectRatio: "1 / 1" }} />
                  <div
                    style={{
                      padding: "14px 15px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "9px",
                    }}
                  >
                    <div
                      className="sf-skel"
                      style={{ height: "9px", width: "38%", borderRadius: "5px" }}
                    />
                    <div
                      className="sf-skel"
                      style={{ height: "14px", width: "82%", borderRadius: "5px" }}
                    />
                    <div
                      className="sf-skel"
                      style={{
                        height: "13px",
                        width: "46%",
                        borderRadius: "5px",
                        marginTop: "3px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : total === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "64px 30px",
                border: "1px dashed var(--border-strong)",
                borderRadius: "18px",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "16px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--fg-subtle)",
                  marginBottom: "14px",
                }}
              >
                <Icon name="search-x" size={26} />
              </div>
              <div
                style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "-.01em" }}
              >
                {ql
                  ? t("screens.listing.noResultsFor", { q })
                  : t("screens.listing.noMatches")}
              </div>
              <div
                style={{
                  fontSize: "13.5px",
                  color: "var(--fg-muted)",
                  marginTop: "6px",
                  maxWidth: "340px",
                  lineHeight: 1.5,
                }}
              >
                {t("screens.listing.noMatchesBody")}
              </div>
              <button
                className="sf-btn"
                onClick={s.clearFilters}
                style={{
                  marginTop: "18px",
                  padding: "11px 20px",
                  borderRadius: "11px",
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                {t("screens.listing.clearFilters")}
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill,minmax(min(216px,100%),1fr))",
                  gap: "clamp(12px,1.6vw,18px)",
                }}
              >
                {visible.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {total > shown && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "30px",
                  }}
                >
                  <div style={{ fontSize: "12.5px", color: "var(--fg-subtle)" }}>
                    {t("screens.listing.showingOf", {
                      shown: number(visible.length),
                      total: number(total),
                    })}
                  </div>
                  <button
                    className="sf-gi"
                    onClick={s.loadMore}
                    style={{
                      padding: "12px 26px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--fg)",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    {t("screens.listing.loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
