/**
 * S2 the shop: everything, a category, or a search. Every filter but one is
 * a read Adminium answers: the category and the price on the products, the
 * colour and the size through their variants (one variant must be both), the
 * search over the names and the categories' names, the sort, the count and
 * the pages. "In stock only" hides the sold-out cards among those loaded, and
 * "Load more" keeps loading until the page fills; the count line is not shown
 * while it is on.
 */
import { SearchX, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "../../i18n/index.tsx";
import { count, money } from "../format.ts";
import { CategoryIcon, ProductCard, ShopLink, useDialog } from "../parts.tsx";
import type { OptionValue, SortKey } from "../port.ts";
import { categoryBySlug, clearFilters, filterCount, LIST_PAGE, loadList, NONE, setListing, useShop } from "../store.ts";
import { Mono } from "../words.tsx";

const SORTS: [SortKey, "shop.sort.featured" | "shop.sort.newest" | "shop.sort.low" | "shop.sort.high" | "shop.sort.name"][] = [
  ["featured", "shop.sort.featured"],
  ["newest", "shop.sort.newest"],
  ["low", "shop.sort.low"],
  ["high", "shop.sort.high"],
  ["name", "shop.sort.name"],
];

/** Below 900 px the filters are a sheet behind a button; above, a column beside the cards. */
export function useNarrow(width = 900): boolean {
  const query = `(max-width: ${width - 0.02}px)`;
  const [narrow, setNarrow] = useState(() => typeof matchMedia === "function" && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return narrow;
}

/** One of each colour or size the shop makes, in the shop's order. */
function distinct(values: readonly OptionValue[]): OptionValue[] {
  const seen = new Map<string, OptionValue>();
  for (const v of values) if (!seen.has(v.code)) seen.set(v.code, v);
  return [...seen.values()];
}

function Filters({ narrow }: { narrow: boolean }) {
  const { t, locale } = useI18n();
  const listing = useShop((s) => s.listing);
  const base = useShop((s) => s.base);
  const list = useShop((s) => s.list);
  const bounds = useShop((s) => s.priceBounds);
  const currency = useShop((s) => s.config.currency);
  const open = useShop((s) => s.filterSheet);
  const close = () => useShop.setState({ filterSheet: false });
  const ref = useDialog<HTMLElement>(narrow && open, close);
  if (base === null) return null;
  const total = base.categories.reduce((n, c) => n + c.count, 0);
  const colours = distinct(base.facets.filter((f) => f.kind === "colour"));
  // Sizes in view: a category's or a search's are those its loaded products are made in; everything's, every size.
  const inView = listing.categorySlug !== null || listing.q.trim() !== "" ? new Set(list.products.map((p) => String(p.id))) : null;
  const sizes = distinct(base.facets.filter((f) => f.kind === "size" && (inView === null || inView.has(String(f.productId)) || f.code === listing.size)));
  const chosenColour = colours.find((c) => c.code === listing.colour);
  const priceLabel = listing.priceMax === null ? t("shop.filter.anyPrice") : money(listing.priceMax, currency, locale);
  const shown = listing.inStock ? null : list.count;
  if (narrow && !open) return null;
  return (
    <>
      {narrow && <div className="nl-scrim" onClick={close} />}
      <aside ref={ref} className={narrow ? "nl-filters nl-filters--sheet" : "nl-filters"} aria-label={t("shop.filter.title")} {...(narrow ? { role: "dialog", "aria-modal": true } : {})}>
        {narrow && (
          <div className="nl-sheet-head">
            <span className="nl-sheet-title">{t("shop.filter.title")}</span>
            <button type="button" className="nl-icon-btn" aria-label={t("shop.close")} onClick={close}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="nl-filter-stack">
          {listing.q.trim() === "" && (
            <fieldset className="nl-fieldset">
              <legend className="nl-eyebrow">{t("shop.filter.category")}</legend>
              <div className="nl-radio-list">
                <ShopLink to={{ view: "shop" }} className="nl-radio-row" aria-current={listing.categorySlug === null ? "true" : undefined}>
                  <span className="nl-radio" aria-hidden="true" />
                  <span className="nl-grow">{t("shop.filter.all")}</span>
                  <Mono className="nl-subtle">{count(total, locale)}</Mono>
                </ShopLink>
                {base.categories.map((c) => (
                  <ShopLink key={String(c.id)} to={{ view: "shop", slug: c.slug }} className="nl-radio-row" aria-current={listing.categorySlug === c.slug ? "true" : undefined}>
                    <span className="nl-radio" aria-hidden="true" />
                    <span className="nl-grow">{c.name}</span>
                    <Mono className="nl-subtle">{count(c.count, locale)}</Mono>
                  </ShopLink>
                ))}
              </div>
            </fieldset>
          )}
          {colours.length > 0 && (
            <fieldset className="nl-fieldset">
              <legend className="nl-eyebrow">{t("shop.filter.colour")}</legend>
              <div className="nl-swatches">
                <button type="button" className="nl-swatch nl-swatch--any" aria-pressed={listing.colour === null} aria-label={t("shop.filter.anyColour")} title={t("shop.filter.anyColour")} onClick={() => setListing({ colour: null })} />
                {colours.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    className="nl-swatch"
                    style={{ "--swatch": c.hex ?? "var(--surface-3)" } as React.CSSProperties}
                    aria-pressed={listing.colour === c.code}
                    aria-label={c.label}
                    title={c.label}
                    onClick={() => setListing({ colour: listing.colour === c.code ? null : c.code })}
                  />
                ))}
              </div>
              <div className="nl-hint">{chosenColour?.label ?? t("shop.filter.anyColour")}</div>
            </fieldset>
          )}
          {sizes.length > 0 && (
            <fieldset className="nl-fieldset">
              <legend className="nl-eyebrow">{t("shop.filter.size")}</legend>
              <div className="nl-chips">
                {sizes.map((z) => (
                  <button key={z.code} type="button" className="nl-chip" aria-pressed={listing.size === z.code} onClick={() => setListing({ size: listing.size === z.code ? null : z.code })}>
                    {z.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {bounds !== null && (
            <div className="nl-fieldset">
              <div className="nl-range-head">
                <label htmlFor="f-price" className="nl-eyebrow">
                  {t("shop.filter.priceUpTo")}
                </label>
                <Mono className="nl-range-value">{priceLabel}</Mono>
              </div>
              <input
                id="f-price"
                type="range"
                className="nl-range"
                min={bounds.min}
                max={bounds.max}
                step={10}
                value={listing.priceMax ?? bounds.max}
                aria-valuetext={priceLabel}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setListing({ priceMax: v >= bounds.max ? null : v }, true);
                }}
              />
            </div>
          )}
          <label className="nl-check">
            <input type="checkbox" checked={listing.inStock} onChange={(e) => setListing({ inStock: e.target.checked })} />
            {t("shop.filter.inStock")}
          </label>
          {filterCount(listing) > 0 && (
            <button type="button" className="nl-text-btn" onClick={clearFilters}>
              <X size={14} aria-hidden="true" />
              {t("shop.filter.clear")}
            </button>
          )}
          {narrow && (
            <button type="button" className="nl-btn nl-btn--accent nl-btn--block nl-btn--lg" onClick={close}>
              {shown === null ? t("shop.filter.show") : t("shop.filter.showN", { n: shown.atLeast ? `${count(shown.rows, locale)}+` : count(shown.rows, locale) }, shown.rows)}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

function CardsSkeleton() {
  return (
    <div className="nl-grid nl-grid--list" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="nl-skel-card">
          <div className="nl-skel nl-skel--square" />
          <div className="nl-skel-lines">
            <div className="nl-skel nl-skel--line nl-w38" />
            <div className="nl-skel nl-skel--line nl-w82" />
            <div className="nl-skel nl-skel--line nl-w46" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShopScreen() {
  const { t, locale } = useI18n();
  const view = useShop((s) => s.view);
  const listing = useShop((s) => s.listing);
  const list = useShop((s) => s.list);
  const categories = useShop((s) => s.base?.categories ?? NONE);
  const stock = useShop((s) => s.cardStock);
  const place = useShop((s) => s.place);
  const cards = listing.inStock ? list.products.filter((p) => stock[String(p.id)]?.state !== "out") : list.products;
  const narrow = useNarrow();
  const filtersButton = useRef<HTMLButtonElement>(null);
  const category = categoryBySlug(listing.categorySlug);
  const searching = view === "search";
  const q = listing.q.trim();
  const title = searching ? t("shop.list.resultsFor", { q }) : category === null && place.slug === "new" ? t("shop.home.new") : (category?.name ?? t("shop.nav.all"));
  const n = filterCount(listing);
  const total = list.count === null ? null : list.count.atLeast ? `${count(list.count.rows, locale)}+` : count(list.count.rows, locale);
  const showing = listing.inStock || total === null || list.state === "busy" ? "" : t("shop.list.showing", { a: count(list.products.length, locale), b: total });
  const busy = list.state === "busy" || list.state === "idle";

  // Back from the sheet, focus returns to the Filters button.
  const sheetOpen = useShop((s) => s.filterSheet);
  useEffect(() => {
    if (!sheetOpen) filtersButton.current?.focus({ preventScroll: true });
  }, [sheetOpen]);

  return (
    <main id="main" className="nl-page nl-fade">
      <nav aria-label={t("shop.breadcrumb")} className="nl-crumbs">
        <ShopLink to={{ view: "home" }}>{t("shop.home")}</ShopLink>
        <span aria-hidden="true">/</span>
        <span>{title}</span>
      </nav>
      <div className="nl-list-head">
        <div className="nl-min0">
          <h1 className="nl-h1">{title}</h1>
          <div className="nl-muted nl-small" aria-live="polite">
            {showing}
          </div>
        </div>
        <div className="nl-list-tools">
          {narrow && (
            <button ref={filtersButton} type="button" className="nl-btn nl-btn--quiet" aria-haspopup="dialog" onClick={() => useShop.setState({ filterSheet: true })}>
              <SlidersHorizontal size={16} aria-hidden="true" />
              {t("shop.filter.title")}
              {n > 0 && <span className="nl-count-badge">{count(n, locale)}</span>}
            </button>
          )}
          <label className="nl-sort">
            {t("shop.sort.label")}
            <select className="nl-select" value={listing.sort} onChange={(e) => setListing({ sort: e.target.value as SortKey })}>
              {SORTS.map(([value, key]) => (
                <option key={value} value={value}>
                  {t(key)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="nl-list-body">
        <Filters narrow={narrow} />
        <div className="nl-grow nl-min0">
          {busy ? (
            <CardsSkeleton />
          ) : list.state === "failed" ? (
            <div className="nl-empty">
              <h2 className="nl-empty-title">{t("shop.failed.title")}</h2>
              <button type="button" className="nl-btn nl-btn--accent" onClick={() => void loadList()}>
                {t("shop.retry")}
              </button>
            </div>
          ) : cards.length === 0 && (searching || q !== "") && n === 0 ? (
            <div className="nl-empty">
              <div className="nl-empty-icon">
                <SearchX size={26} aria-hidden="true" />
              </div>
              <h2 className="nl-empty-title">{t("shop.list.nothingCalled")}</h2>
              <p className="nl-muted">{t("shop.list.nothingSub")}</p>
              <div className="nl-empty-chips">
                {categories.map((c) => (
                  <ShopLink key={String(c.id)} to={{ view: "shop", slug: c.slug }} className="nl-pill-link">
                    <CategoryIcon name={c.icon} size={16} />
                    {c.name}
                  </ShopLink>
                ))}
              </div>
            </div>
          ) : cards.length === 0 && list.next === null ? (
            <div className="nl-empty">
              <h2 className="nl-empty-title">{t("shop.list.noMatch")}</h2>
              <button type="button" className="nl-btn nl-btn--accent" onClick={clearFilters}>
                {t("shop.filter.clear")}
              </button>
            </div>
          ) : (
            <>
              <div className="nl-grid nl-grid--list">
                {cards.map((p) => (
                  <ProductCard key={String(p.id)} product={p} />
                ))}
              </div>
              {list.next !== null && (
                <div className="nl-more">
                  {showing !== "" && <div className="nl-subtle nl-small">{showing}</div>}
                  <button type="button" className="nl-btn nl-btn--quiet nl-btn--lg" aria-busy={list.state === "more"} disabled={list.state === "more"} onClick={() => void loadList(true)}>
                    {t("shop.list.loadMore")}
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

export { LIST_PAGE };
