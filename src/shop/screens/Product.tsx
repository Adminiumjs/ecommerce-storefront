/**
 * S3 a product's page: its pictures for the chosen colour, the colours and
 * sizes it is made in (a size it is not made in, in that colour, is struck
 * through and said), the variant's own price and Inventory's words for it,
 * the quantity capped at what is left, Add to basket, the size guide, the
 * details and specs, its published reviews with Adminium's totals, "Goes well
 * with", and "Tell me when it's back" on a sold-out variant for a signed-in
 * customer.
 */
import { ArrowRight, Bell, CircleCheck, Info, Minus, Plus, Ruler, ShoppingBasket, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { useI18n } from "../../i18n/index.tsx";
import { count, dayShort, money, shopDay } from "../format.ts";
import { Picture, ProductCard, ShopLink, Spinner, Stars, StockPill, useDialog } from "../parts.tsx";
import type { OptionValue, SizeGuide } from "../port.ts";
import { addToBasket, askRestock, choose, chosenVariant, qtyCap, useShop, variantFor, wordOf } from "../store.ts";
import { Mono, rich } from "../words.tsx";
import { Promises } from "./Home.tsx";

function GuideDialog({ guide, productName, onClose }: { guide: SizeGuide; productName: string; onClose: () => void }) {
  const { t } = useI18n();
  const ref = useDialog(true, onClose);
  return (
    <div className="nl-scrim nl-scrim--center" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="guide-title" className="nl-dialog nl-dialog--guide" onClick={(e) => e.stopPropagation()}>
        <div className="nl-dialog-head">
          <Ruler size={18} aria-hidden="true" className="nl-accent" />
          <h2 id="guide-title" className="nl-dialog-title">
            {t("shop.product.guideTitle", { name: productName })}
          </h2>
          <button type="button" className="nl-icon-btn" aria-label={t("shop.close")} onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="nl-dialog-body">
          <table className="nl-table">
            <thead>
              <tr>
                {guide.columns.map((c, i) => (
                  <th key={i} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}><Mono>{cell}</Mono></td>))}
                </tr>
              ))}
            </tbody>
          </table>
          {guide.note !== null && (
            <p className="nl-note">
              <Info size={14} aria-hidden="true" />
              {guide.note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Restock() {
  const { t } = useI18n();
  const variant = useShop(() => chosenVariant());
  const customer = useShop((s) => s.customer);
  const said = useShop((s) => (variant === null ? undefined : s.restock[String(variant.id)]));
  if (variant === null) return null;
  return (
    <div className="nl-restock">
      <div className="nl-restock-title">
        <Bell size={16} aria-hidden="true" />
        {t("shop.product.tellMe")}
      </div>
      {said === "sent" ? (
        <div className="nl-ok-line">
          <CircleCheck size={16} aria-hidden="true" />
          {t("shop.product.tellDone")}
        </div>
      ) : customer === null ? (
        // Only a signed-in customer may ask: the e-mail goes to the address they proved.
        <div className="nl-restock-row">
          <span className="nl-muted nl-small">{t("shop.product.tellSignIn")}</span>
          <ShopLink to={{ view: "signIn" }} className="nl-btn nl-btn--ink nl-btn--sm">
            {t("shop.nav.signIn")}
          </ShopLink>
        </div>
      ) : (
        <div className="nl-restock-row">
          <span className="nl-muted nl-small">{rich(t, "shop.product.tellTo", { email: <span className="nl-ltr">{customer.email}</span> })}</span>
          <button type="button" className="nl-btn nl-btn--ink nl-btn--sm" disabled={said === "busy"} aria-busy={said === "busy"} onClick={() => void askRestock(variant)}>
            {said === "busy" ? <Spinner /> : null}
            {t("shop.product.emailMe")}
          </button>
          {said === "failed" && <div className="nl-error">{t("shop.failed.short")}</div>}
        </div>
      )}
    </div>
  );
}

function Reviews() {
  const { t, locale } = useI18n();
  const reviews = useShop((s) => s.product.reviews);
  const tz = useShop((s) => s.config.timezone);
  if (reviews === null) return null;
  const has = reviews.count > 0;
  // Adminium keeps the sum and the count; the average is the one division its own docs give, to one decimal.
  const avg = has ? new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(reviews.sum / reviews.count) : "";
  return (
    <section id="reviews" aria-labelledby="h-reviews" className="nl-section">
      <h2 id="h-reviews" className="nl-h2 nl-h2--alone">
        {t("shop.product.reviews")}
      </h2>
      {!has ? (
        <p className="nl-muted">{t("shop.product.noReviews")}</p>
      ) : (
        <div className="nl-reviews">
          <div className="nl-panel nl-rating">
            <div className="nl-rating-top">
              <Mono className="nl-rating-avg">{avg}</Mono>
              <Stars value={reviews.sum / reviews.count} />
            </div>
            <div className="nl-muted nl-small nl-strong">{t("shop.product.ratingSum", { avg, n: count(reviews.count, locale) }, reviews.count)}</div>
            <div className="nl-bars">
              {reviews.bars.map((n, i) => (
                <div key={i} className="nl-bar-row">
                  <Mono className="nl-bar-label">{`${5 - i}★`}</Mono>
                  <span className="nl-bar">
                    <span className="nl-bar-fill" style={{ inlineSize: `${reviews.count === 0 ? 0 : Math.round((n / reviews.count) * 100)}%` }} />
                  </span>
                  <Mono className="nl-bar-count">{count(n, locale)}</Mono>
                </div>
              ))}
            </div>
            <div className="nl-subtle nl-small">{t("shop.product.reviewsNote")}</div>
          </div>
          <div className="nl-review-list">
            {reviews.list.map((r) => (
              <article key={String(r.id)} className="nl-review">
                <div className="nl-review-head">
                  <Stars value={r.stars} label={t("shop.product.stars", { n: count(r.stars, locale) }, r.stars)} />
                  {r.title !== null && <span className="nl-strong">{r.title}</span>}
                </div>
                {r.body !== null && <p className="nl-review-body">{r.body}</p>}
                <div className="nl-review-foot">
                  <span className="nl-strong nl-fg">{r.name ?? t("shop.product.aCustomer")}</span>
                  <span aria-hidden="true">·</span>
                  <Mono>{dayShort(shopDay(r.at, tz), locale)}</Mono>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function ProductScreen() {
  const { t, locale } = useI18n();
  const page = useShop((s) => s.product);
  const choice = useShop((s) => s.choice);
  const stock = useShop((s) => s.stock);
  const currency = useShop((s) => s.config.currency);
  const base = useShop((s) => s.base);
  const guideOpen = useShop((s) => s.guideOpen);
  const guideButton = useRef<HTMLButtonElement>(null);
  const product = page.product;
  const detail = page.detail;
  useEffect(() => {
    if (!guideOpen) guideButton.current?.focus({ preventScroll: true });
  }, [guideOpen]);

  if (page.state === "missing") return <Missing />;
  if (product === null || detail === null) {
    return (
      <main id="main" className="nl-page" aria-busy={page.state === "busy"}>
        {page.state === "failed" ? (
          <div className="nl-empty">
            <h1 className="nl-empty-title">{t("shop.failed.title")}</h1>
          </div>
        ) : (
          <div className="nl-product">
            <div className="nl-skel nl-skel--square" />
            <div className="nl-skel-lines">
              <div className="nl-skel nl-skel--line nl-w38" />
              <div className="nl-skel nl-skel--line nl-w82" />
            </div>
          </div>
        )}
      </main>
    );
  }

  const category = base?.categories.find((c) => String(c.id) === String(product.categoryId)) ?? null;
  const colours = detail.options.filter((o) => o.kind === "colour");
  const sizes = detail.options.filter((o) => o.kind === "size");
  const colour = colours.find((c) => String(c.id) === String(choice.colourId)) ?? null;
  const size = sizes.find((z) => String(z.id) === String(choice.sizeId)) ?? null;
  const variant = chosenVariant();
  const needSize = sizes.length > 0 && size === null;
  const word = variant === null ? (useShop.getState().cardStock[String(product.id)] ?? null) : wordOf(variant, stock);
  const out = variant !== null && word?.state === "out";
  const cap = qtyCap(variant);
  const guide = product.sizeGuideId === null ? null : (base?.sizeGuides.find((g) => String(g.id) === String(product.sizeGuideId)) ?? null);
  // The colour's own pictures, else the product's.
  const own = detail.pictures.filter((p) => colour !== null && String(p.colourId) === String(colour.id));
  const pictures = own.length > 0 ? own : detail.pictures.filter((p) => p.colourId === null);
  const shots = pictures.length > 0 ? pictures : [null, null, null, null];
  const shown = shots[Math.min(choice.picture, shots.length - 1)] ?? null;
  const tint = colour?.hex ?? null;
  const notMade = (z: OptionValue) => variantFor(colour?.id ?? null, z.id) === null;
  const disabled = needSize || variant === null || out;
  const addLabel = needSize ? t("shop.product.chooseSize") : out ? t("shop.stock.out") : t("shop.product.add");

  return (
    <main id="main" className="nl-page nl-page--product nl-fade">
      <nav aria-label={t("shop.breadcrumb")} className="nl-crumbs">
        <ShopLink to={{ view: "home" }}>{t("shop.home")}</ShopLink>
        <span aria-hidden="true">/</span>
        {category !== null && (
          <>
            <ShopLink to={{ view: "shop", slug: category.slug }}>{category.name}</ShopLink>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span className="nl-muted">{product.name}</span>
      </nav>

      <div className="nl-product">
        <div>
          <Picture url={shown?.url} alt={shown?.alt ?? ""} tint={tint} icon={category?.icon ?? null} size="main" />
          <div className="nl-thumbs">
            {shots.map((p, i) => (
              <button key={i} type="button" className="nl-thumb" aria-pressed={i === choice.picture} aria-label={t("shop.product.picture", { n: count(i + 1, locale), name: product.name })} onClick={() => choose({ picture: i })}>
                <Picture url={p?.url} tint={tint} icon={category?.icon ?? null} size="thumb" />
              </button>
            ))}
          </div>
        </div>

        <div className="nl-buy">
          <div>
            <div className="nl-buy-meta">
              <span className="nl-buy-cat">{product.categoryName}</span>
              {variant !== null && <Mono className="nl-subtle nl-small">{variant.sku}</Mono>}
            </div>
            <h1 className="nl-product-title">{product.name}</h1>
          </div>
          <div className="nl-buy-price">
            <Mono className="nl-price-big">
              <span aria-live="polite">{money(variant?.price ?? product.price, currency, locale)}</span>
            </Mono>
            <span role="status">
              <StockPill word={word} />
            </span>
          </div>
          {page.reviews !== null && page.reviews.count > 0 && (
            <a href="#reviews" className="nl-rating-link">
              <Stars value={page.reviews.sum / page.reviews.count} />
              <span>{t("shop.product.ratingSum", { avg: new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(page.reviews.sum / page.reviews.count), n: count(page.reviews.count, locale) }, page.reviews.count)}</span>
            </a>
          )}
          {product.blurb !== null && (
            <p dir="auto" className="nl-blurb">
              {product.blurb}
            </p>
          )}

          {colours.length > 0 && (
            <fieldset className="nl-fieldset">
              <legend className="nl-legend">
                {t("shop.filter.colour")}: <span className="nl-muted">{colour?.label ?? "—"}</span>
              </legend>
              <div className="nl-swatches nl-swatches--big">
                {colours.map((c) => (
                  <button
                    key={String(c.id)}
                    type="button"
                    className="nl-swatch nl-swatch--big"
                    style={{ "--swatch": c.hex ?? "var(--surface-3)" } as React.CSSProperties}
                    aria-pressed={String(c.id) === String(choice.colourId)}
                    aria-label={c.label}
                    title={c.label}
                    onClick={() => {
                      // A size kept only where the new colour is made in it.
                      const keep = choice.sizeId !== null && variantFor(c.id, choice.sizeId) !== null;
                      choose({ colourId: c.id, sizeId: keep ? choice.sizeId : sizes.length === 1 ? sizes[0]!.id : null, qty: 1 });
                    }}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {sizes.length > 0 && (
            <fieldset className="nl-fieldset">
              <legend className="nl-legend">
                {product.sizeName ?? t("shop.filter.size")}: <span className="nl-muted">{size?.label ?? "—"}</span>
              </legend>
              {guide !== null && (
                <button ref={guideButton} type="button" className="nl-text-btn nl-accent" aria-haspopup="dialog" onClick={() => useShop.setState({ guideOpen: true })}>
                  <Ruler size={15} aria-hidden="true" />
                  {t("shop.product.sizeGuide")}
                </button>
              )}
              <div className="nl-sizes">
                {sizes.map((z) => {
                  const made = !notMade(z);
                  const v = made ? variantFor(colour?.id ?? null, z.id) : null;
                  const zOut = v !== null && wordOf(v, stock).state === "out";
                  const delta = v !== null && Number(v.priceDelta) > 0 ? `+${money(v.priceDelta, currency, locale)}` : "";
                  const aria = made ? [z.label, delta, zOut ? t("shop.stock.out") : ""].filter(Boolean).join(", ") : t("shop.product.notMade", { colour: colour?.label ?? "", size: z.label });
                  return (
                    <button key={String(z.id)} type="button" className={`nl-size ${made ? "" : "nl-size--none"}`} disabled={!made} aria-pressed={String(z.id) === String(choice.sizeId)} aria-label={aria} onClick={() => choose({ sizeId: z.id, qty: 1 })}>
                      <span className="nl-size-label">{z.label}</span>
                      {delta !== "" && <Mono className="nl-size-delta">{delta}</Mono>}
                      {zOut && <span className="nl-size-out">{t("shop.stock.out")}</span>}
                    </button>
                  );
                })}
              </div>
              {colour !== null &&
                sizes.filter(notMade).map((z) => (
                  <div key={String(z.id)} className="nl-note">
                    <Info size={14} aria-hidden="true" />
                    {t("shop.product.notMade", { colour: colour.label, size: z.label })}
                  </div>
                ))}
            </fieldset>
          )}

          {variant !== null && !out && (
            <div className="nl-qty-block">
              <div className="nl-qty-row">
                <div role="group" aria-label={t("shop.product.quantity")} className="nl-qty">
                  <button type="button" aria-label={t("shop.product.fewer")} disabled={choice.qty <= 1} onClick={() => choose({ qty: choice.qty - 1 })}>
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <Mono className="nl-qty-n">
                    <span aria-live="polite">{count(choice.qty, locale)}</span>
                  </Mono>
                  <button type="button" aria-label={t("shop.product.more")} disabled={choice.qty >= cap} onClick={() => choose({ qty: choice.qty + 1 })}>
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
                <span className="nl-subtle nl-small">{t("shop.product.quantity")}</span>
              </div>
              {word?.state === "low" && word.left !== null && <div className="nl-warn-line">{rich(t, "shop.product.upTo", { n: <Mono>{count(word.left, locale)}</Mono> }, word.left)}</div>}
            </div>
          )}
          <button type="button" className={`nl-btn nl-btn--add ${disabled ? "nl-btn--off" : "nl-btn--accent"}`} disabled={disabled} onClick={() => variant !== null && addToBasket(product, variant, choice.qty, category?.icon ?? null)}>
            <ShoppingBasket size={18} aria-hidden="true" />
            {addLabel}
          </button>

          {out && <Restock />}

          <div className="nl-buy-promises">
            <Promises variant="inline" />
          </div>
        </div>
      </div>

      <div id="details" className="nl-details">
        <section aria-labelledby="h-details">
          <h2 id="h-details" className="nl-h3">
            {t("shop.product.details")}
          </h2>
          <p className="nl-prose" dir="auto">
            {product.description ?? product.blurb}
          </p>
        </section>
        {product.specs.length > 0 && (
          <section aria-labelledby="h-specs">
            <h2 id="h-specs" className="nl-h3">
              {t("shop.product.specs")}
            </h2>
            <dl className="nl-specs">
              {product.specs.map(([k, v], i) => (
                <div key={i} className="nl-spec">
                  <dt>{k}</dt>
                  <dd>
                    <Mono>{v}</Mono>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <section aria-labelledby="h-ship">
          <h2 id="h-ship" className="nl-h3">
            {t("shop.footer.shipping")}
          </h2>
          <Promises variant="list" />
          <ShopLink to={{ view: "helpShipping" }} className="nl-text-link">
            {t("shop.footer.shipping")}
            <ArrowRight size={15} aria-hidden="true" className="nl-flip" />
          </ShopLink>
        </section>
      </div>

      <Reviews />

      {page.goes.length > 0 && (
        <section id="goes" aria-labelledby="h-goes" className="nl-section">
          <h2 id="h-goes" className="nl-h2 nl-h2--alone">
            {t("shop.product.goes")}
          </h2>
          <div className="nl-grid nl-grid--small">
            {page.goes.map((p) => (
              <ProductCard key={String(p.id)} product={p} compact showNew={false} />
            ))}
          </div>
        </section>
      )}

      {guideOpen && guide !== null && <GuideDialog guide={guide} productName={product.name} onClose={() => useShop.setState({ guideOpen: false })} />}
    </main>
  );
}

/** A product nobody sells (an old link, a typo): the shop's 404. */
function Missing() {
  const { t } = useI18n();
  return (
    <main id="main" className="nl-page">
      <div className="nl-empty">
        <Mono className="nl-big-404">404</Mono>
        <h1 className="nl-empty-title">{t("shop.missing.title")}</h1>
        <ShopLink to={{ view: "shop" }} className="nl-btn nl-btn--accent">
          {t("shop.nav.all")}
        </ShopLink>
      </div>
    </main>
  );
}
