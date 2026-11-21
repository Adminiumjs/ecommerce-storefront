/**
 * S1 Home: the hero, New this season, Featured, the categories with their
 * counts, and the shop's three promises as its owner typed them in Settings.
 * No code is ever printed here.
 */
import { ArrowRight, PackageCheck, RotateCcw, Truck } from "lucide-react";

import { useI18n } from "../../i18n/index.tsx";
import { count } from "../format.ts";
import { CategoryIcon, ProductCard, ShopLink } from "../parts.tsx";
import { NONE, useShop } from "../store.ts";

const PROMISE_ICONS = [Truck, PackageCheck, RotateCcw];

/** The shop's promises, each with its icon: the first is about shipping, the second packing, the third returns. */
export function Promises({ variant }: { variant: "tiles" | "inline" | "list" }) {
  const { t } = useI18n();
  const promises = useShop((s) => s.base?.settings.promises ?? NONE);
  if (promises.length === 0) return null;
  if (variant === "tiles") {
    return (
      <section aria-label={t("shop.home.promises")} className="nl-promises">
        {promises.map((p, i) => {
          const Icon = PROMISE_ICONS[i] ?? PackageCheck;
          return (
            <div key={i} className="nl-promise">
              <span className="nl-promise-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className="nl-promise-label">{p}</span>
            </div>
          );
        })}
      </section>
    );
  }
  const Tag = variant === "list" ? "ul" : "div";
  const Item = variant === "list" ? "li" : "span";
  return (
    <Tag className={variant === "list" ? "nl-promise-list" : "nl-promise-inline"}>
      {promises.map((p, i) => {
        const Icon = PROMISE_ICONS[i] ?? PackageCheck;
        return (
          <Item key={i} className="nl-promise-small">
            <Icon size={15} aria-hidden="true" />
            {p}
          </Item>
        );
      })}
    </Tag>
  );
}

export function HomeScreen() {
  const { t, locale } = useI18n();
  const home = useShop((s) => s.home);
  const categories = useShop((s) => s.base?.categories ?? NONE);
  return (
    <main id="main" className="nl-page nl-fade">
      <section className="nl-hero">
        <div className="nl-hero-text">
          <h1 className="nl-hero-title">{t("shop.home.title")}</h1>
          <p className="nl-hero-sub">{t("shop.home.sub")}</p>
          <div>
            <ShopLink to={{ view: "shop" }} className="nl-btn nl-btn--accent nl-btn--lg">
              {t("shop.nav.all")}
              <ArrowRight size={18} aria-hidden="true" className="nl-flip" />
            </ShopLink>
          </div>
        </div>
        <div className="nl-hero-pic" aria-hidden="true">
          <CategoryIcon name="mountain" size={96} />
        </div>
      </section>

      {home.fresh.length > 0 && (
        <section aria-labelledby="h-new" className="nl-section">
          <div className="nl-section-head">
            <h2 id="h-new" className="nl-h2">
              {t("shop.home.new")}
            </h2>
            <ShopLink to={{ view: "shop", slug: "new" }} className="nl-see-all">
              {t("shop.home.seeAll")}
              <ArrowRight size={15} aria-hidden="true" className="nl-flip" />
            </ShopLink>
          </div>
          <div className="nl-grid">
            {home.fresh.map((p) => (
              <ProductCard key={String(p.id)} product={p} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="h-feat" className="nl-section">
        <div className="nl-section-head">
          <h2 id="h-feat" className="nl-h2">
            {t("shop.home.featured")}
          </h2>
          <ShopLink to={{ view: "shop" }} className="nl-see-all">
            {t("shop.home.seeAll")}
            <ArrowRight size={15} aria-hidden="true" className="nl-flip" />
          </ShopLink>
        </div>
        {home.state === "busy" && home.featured.length === 0 ? (
          <div className="nl-grid" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="nl-skel nl-skel--card" />
            ))}
          </div>
        ) : (
          <div className="nl-grid">
            {home.featured.map((p) => (
              <ProductCard key={String(p.id)} product={p} showNew={false} />
            ))}
          </div>
        )}
      </section>

      <section id="home-cats" aria-labelledby="h-cats" className="nl-section">
        <h2 id="h-cats" className="nl-h2 nl-h2--alone">
          {t("shop.home.categories")}
        </h2>
        <div className="nl-cats">
          {categories.map((c) => (
            <ShopLink key={String(c.id)} to={{ view: "shop", slug: c.slug }} className="nl-cat">
              <span className="nl-cat-icon" aria-hidden="true">
                <CategoryIcon name={c.icon} size={30} />
              </span>
              <span className="nl-cat-text">
                <span className="nl-cat-name">{c.name}</span>
                <span className="nl-cat-count">{t("shop.home.products", { n: count(c.count, locale) }, c.count)}</span>
              </span>
            </ShopLink>
          ))}
        </div>
      </section>

      <Promises variant="tiles" />
    </main>
  );
}
