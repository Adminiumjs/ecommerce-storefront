/**
 * The shop's side: its header and footer, the phone's menu sheet, the basket
 * drawer, the toasts and the one live region, and the screen the address
 * names. Each screen is drawn by its own module under `screens/`.
 */
import { CircleCheck, Info, Menu, Mountain, Search, ShoppingBasket, User, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import "./shop.css";

import { useI18n, type MessageKey } from "../i18n/index.tsx";
import { count } from "./format.ts";
import { CategoryIcon, LockIcon, ShopLink, useDialog } from "./parts.tsx";
import { attachShopUrl, type Place } from "./route.ts";
import { basketPieces, go, goView, loadShop, onShopNavigate, NONE, openDrawer, useShop, type ShopView } from "./store.ts";
import { Mono } from "./words.tsx";
import { BasketDrawer, BasketScreen } from "./screens/Basket.tsx";
import { HomeScreen } from "./screens/Home.tsx";
import { ProductScreen } from "./screens/Product.tsx";
import { ShopScreen, useNarrow } from "./screens/Shop.tsx";
import { CheckoutScreen } from "./screens/Checkout.tsx";
import { AccountScreen, FindScreen, OrderReturnScreen, OrderScreen, SignInScreen, SignInSheet } from "./screens/After.tsx";
import { AboutScreen, GiftBalanceScreen, GiftCardsScreen, HelpContactScreen, HelpShippingScreen, HelpSizesScreen, MissingScreen, NewsBox, NewsThanksScreen, PrivacyScreen, TermsScreen } from "./screens/Pages.tsx";

function Screen({ view }: { view: ShopView }): ReactNode {
  switch (view) {
    case "home":
      return <HomeScreen />;
    case "shop":
    case "search":
      return <ShopScreen />;
    case "product":
      return <ProductScreen />;
    case "basket":
      return <BasketScreen />;
    case "checkout":
      return <CheckoutScreen />;
    case "order":
      return <OrderScreen />;
    case "orderReturn":
      return <OrderReturnScreen />;
    case "find":
      return <FindScreen />;
    case "signIn":
      return <SignInScreen />;
    case "account":
      return <AccountScreen />;
    case "giftCards":
      return <GiftCardsScreen />;
    case "giftBalance":
      return <GiftBalanceScreen />;
    case "helpShipping":
      return <HelpShippingScreen />;
    case "helpSizes":
      return <HelpSizesScreen />;
    case "helpContact":
      return <HelpContactScreen />;
    case "about":
      return <AboutScreen />;
    case "privacy":
      return <PrivacyScreen />;
    case "terms":
      return <TermsScreen />;
    case "newsThanks":
      return <NewsThanksScreen />;
    case "missing":
      return <MissingScreen />;
  }
}

function Loading() {
  const { t } = useI18n();
  return (
    <div className="nl-page nl-skeleton" aria-busy="true">
      <span className="nl-sr">{t("shop.loading")}</span>
      <div className="nl-skel nl-skel--bar" />
      <div className="nl-skel nl-skel--hero" />
    </div>
  );
}

function Failed() {
  const { t } = useI18n();
  return (
    <main id="main" className="nl-page">
      <section className="nl-empty" aria-labelledby="nl-failed">
        <h1 id="nl-failed" className="nl-empty-title">
          {t("shop.failed.title")}
        </h1>
        <p className="nl-muted">{t("shop.failed.body")}</p>
        <button type="button" className="nl-btn nl-btn--accent" onClick={() => void loadShop()}>
          {t("shop.retry")}
        </button>
      </section>
    </main>
  );
}

function Toasts() {
  const { t } = useI18n();
  const toasts = useShop((s) => s.toasts);
  const last = toasts.at(-1);
  return (
    <div className="nl-toasts" aria-hidden={last === undefined}>
      {last !== undefined && (
        <div key={last.id} className="nl-toast">
          {last.tone === "ok" ? <CircleCheck size={16} aria-hidden="true" /> : <Info size={16} aria-hidden="true" />}
          <span>{t(last.key, last.params)}</span>
        </div>
      )}
    </div>
  );
}

/** The one polite live region: toasts and the screens' announcements are read from here. */
function LiveRegion() {
  const { t } = useI18n();
  const said = useShop((s) => s.announce);
  const last = useShop((s) => s.toasts.at(-1));
  return (
    <div className="nl-sr" role="status" aria-live="polite">
      {said !== "" ? said : last === undefined ? "" : t(last.key, last.params)}
    </div>
  );
}

const MENU_EXTRAS: [ShopView, MessageKey][] = [
  ["giftCards", "shop.nav.giftCards"],
  ["helpShipping", "shop.nav.help"],
];

function MenuSheet({ open, onClose, query, setQuery, onSearch }: { open: boolean; onClose: () => void; query: string; setQuery: (q: string) => void; onSearch: () => void }) {
  const { t, locale } = useI18n();
  const categories = useShop((s) => s.base?.categories ?? NONE);
  const signedIn = useShop((s) => s.customer !== null);
  const total = categories.reduce((n, c) => n + c.count, 0);
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div className="nl-scrim nl-scrim--top" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={t("shop.nav.menu")} className="nl-menu" onClick={(e) => e.stopPropagation()}>
        <div className="nl-sheet-head">
          <span className="nl-sheet-title">{t("shop.nav.menu")}</span>
          <button type="button" className="nl-icon-btn" aria-label={t("shop.close")} onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <form
          role="search"
          className="nl-search nl-search--menu"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
        >
          <Search size={17} aria-hidden="true" className="nl-search-icon" />
          <input type="search" className="nl-search-input" aria-label={t("shop.search")} placeholder={t("shop.search.placeholder")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>
        <nav aria-label={t("shop.nav.menu")} className="nl-menu-nav">
          <ShopLink to={{ view: "shop" }} className="nl-menu-item">
            <CategoryIcon name="store" size={18} />
            {t("shop.nav.all")}
            <Mono className="nl-menu-count">{count(total, locale)}</Mono>
          </ShopLink>
          {categories.map((c) => (
            <ShopLink key={String(c.id)} to={{ view: "shop", slug: c.slug }} className="nl-menu-item">
              <CategoryIcon name={c.icon} size={18} />
              {c.name}
              <Mono className="nl-menu-count">{count(c.count, locale)}</Mono>
            </ShopLink>
          ))}
          <div className="nl-rule" />
          {MENU_EXTRAS.map(([view, key]) => (
            <ShopLink key={view} to={{ view }} className="nl-menu-item nl-menu-item--extra">
              {t(key)}
            </ShopLink>
          ))}
          <ShopLink to={{ view: signedIn ? "account" : "signIn" }} className="nl-menu-item nl-menu-item--extra">
            {signedIn ? t("shop.nav.account") : t("shop.nav.signIn")}
          </ShopLink>
        </nav>
      </div>
    </div>
  );
}

/** Two letters for the account button: the customer's initials, as their name gives them. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

function Header({ checkout }: { checkout: boolean }) {
  const { t, locale } = useI18n();
  const view = useShop((s) => s.view);
  const place = useShop((s) => s.place);
  const categories = useShop((s) => s.base?.categories ?? NONE);
  const customer = useShop((s) => s.customer);
  const pieces = useShop((s) => basketPieces(s));
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const menuButton = useRef<HTMLButtonElement>(null);
  // Below 1024 px the categories and the search live in the menu sheet: drawn once, so a reader meets one of each.
  const narrow = useNarrow(1024);
  const onSearch = () => {
    const q = query.trim();
    if (q === "") return;
    setMenu(false);
    go({ view: "search", q });
  };
  const current = (slug: string | null) => (view === "shop" && (place.slug ?? null) === slug ? "page" : undefined);
  return (
    <>
      <a href="#main" className="nl-skip">
        {t("shop.skip")}
      </a>
      <header className="nl-header">
        <div className="nl-header-row">
          {!checkout && narrow && (
            <button ref={menuButton} type="button" className="nl-icon-btn nl-narrow" aria-label={t("shop.nav.openMenu")} aria-haspopup="dialog" onClick={() => setMenu(true)}>
              <Menu size={18} aria-hidden="true" />
            </button>
          )}
          <ShopLink to={{ view: "home" }} className="nl-brand">
            <span className="nl-brand-mark">
              <Mountain size={18} aria-hidden="true" />
            </span>
            <span className="nl-brand-name">{t("brand.name")}</span>
          </ShopLink>
          {checkout ? (
            <CheckoutHeaderTools />
          ) : (
            <>
              {!narrow && (
                <nav aria-label={t("shop.home.categories")} className="nl-nav nl-wide">
                  <ShopLink to={{ view: "shop" }} className="nl-nav-item" aria-current={current(null)}>
                    {t("shop.nav.all")}
                  </ShopLink>
                  {categories.map((c) => (
                    <ShopLink key={String(c.id)} to={{ view: "shop", slug: c.slug }} className="nl-nav-item" aria-current={current(c.slug)}>
                      {c.name}
                    </ShopLink>
                  ))}
                </nav>
              )}
              <div className="nl-header-tools">
                {!narrow && (
                  <form
                    role="search"
                    className="nl-search nl-wide"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSearch();
                    }}
                  >
                    <Search size={15} aria-hidden="true" className="nl-search-icon" />
                    <input type="search" className="nl-search-input" aria-label={t("shop.search")} placeholder={t("shop.search.placeholder")} value={query} onChange={(e) => setQuery(e.target.value)} />
                  </form>
                )}
                {customer === null ? (
                  <ShopLink to={{ view: "signIn" }} className="nl-btn nl-btn--quiet nl-btn--sm">
                    <User size={16} aria-hidden="true" />
                    {t("shop.nav.signIn")}
                  </ShopLink>
                ) : (
                  <ShopLink to={{ view: "account" }} className="nl-avatar" aria-label={t("shop.nav.account")}>
                    {initials(customer.name || customer.email)}
                  </ShopLink>
                )}
                <button type="button" className="nl-icon-btn nl-basket-btn" aria-label={t("shop.nav.basketAria", { count: count(pieces, locale) }, pieces)} aria-haspopup="dialog" onClick={() => openDrawer(true)}>
                  <ShoppingBasket size={18} aria-hidden="true" />
                  {pieces > 0 && (
                    <span className="nl-badge" aria-hidden="true">
                      {count(pieces, locale)}
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      <MenuSheet
        open={menu}
        onClose={() => {
          setMenu(false);
          menuButton.current?.focus();
        }}
        query={query}
        setQuery={setQuery}
        onSearch={onSearch}
      />
    </>
  );
}

/** The checkout's header: "Secure checkout", and "Back to basket" while there is a basket to go back to. */
function CheckoutHeaderTools() {
  const { t } = useI18n();
  const hasBasket = useShop((s) => s.basket.length + s.gifts.length > 0);
  const paying = useShop((s) => s.view !== "checkout");
  return (
    <div className="nl-header-tools">
      <span className="nl-secure">
        <LockIcon />
        {t("shop.checkout.secure")}
      </span>
      {hasBasket && !paying && (
        <ShopLink to={{ view: "basket" }} className="nl-back">
          {t("shop.checkout.backToBasket")}
        </ShopLink>
      )}
    </div>
  );
}

const FOOTER_SHOP: [Place, MessageKey | null][] = [[{ view: "shop" }, "shop.nav.all"]];
const FOOTER_HELP: [ShopView, MessageKey][] = [
  ["helpShipping", "shop.footer.shipping"],
  ["helpSizes", "shop.footer.sizes"],
  ["helpContact", "shop.footer.contact"],
  ["find", "shop.footer.find"],
];
const FOOTER_SHOP_TAIL: [ShopView, MessageKey][] = [
  ["giftCards", "shop.nav.giftCards"],
  ["giftBalance", "shop.footer.balance"],
];
const FOOTER_NL: [ShopView, MessageKey][] = [
  ["about", "shop.footer.about"],
  ["privacy", "shop.footer.privacy"],
  ["terms", "shop.footer.terms"],
];

function Footer() {
  const { t } = useI18n();
  const settings = useShop((s) => s.base?.settings ?? null);
  const categories = useShop((s) => s.base?.categories ?? NONE);
  const address = settings === null ? "" : [[settings.addressLine1, settings.addressLine2].filter(Boolean).join(", "), settings.city, [settings.stateCode, settings.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return (
    <footer id="footer" className="nl-footer">
      <div className="nl-footer-row">
        <NewsBox />
        <nav aria-label={t("shop.footer.shop")} className="nl-footer-col">
          <h2 className="nl-eyebrow">{t("shop.footer.shop")}</h2>
          {FOOTER_SHOP.map(([to, key]) => (
            <ShopLink key="all" to={to} className="nl-footer-link">
              {key === null ? "" : t(key)}
            </ShopLink>
          ))}
          {categories.map((c) => (
            <ShopLink key={String(c.id)} to={{ view: "shop", slug: c.slug }} className="nl-footer-link">
              {c.name}
            </ShopLink>
          ))}
          {FOOTER_SHOP_TAIL.map(([view, key]) => (
            <ShopLink key={view} to={{ view }} className="nl-footer-link">
              {t(key)}
            </ShopLink>
          ))}
        </nav>
        <nav aria-label={t("shop.footer.help")} className="nl-footer-col">
          <h2 className="nl-eyebrow">{t("shop.footer.help")}</h2>
          {FOOTER_HELP.map(([view, key]) => (
            <ShopLink key={view} to={{ view }} className="nl-footer-link">
              {t(key)}
            </ShopLink>
          ))}
        </nav>
        <nav aria-label={settings?.name || t("brand.name")} className="nl-footer-col">
          <h2 className="nl-eyebrow">{settings?.name || t("brand.name")}</h2>
          {FOOTER_NL.map(([view, key]) => (
            <ShopLink key={view} to={{ view }} className="nl-footer-link">
              {t(key)}
            </ShopLink>
          ))}
        </nav>
      </div>
      <div className="nl-footer-base">
        <div className="nl-footer-base-row">
          <span className="nl-footer-brand">
            <span className="nl-brand-mark nl-brand-mark--xs">
              <Mountain size={13} aria-hidden="true" />
            </span>
            {settings?.name || t("brand.name")}
          </span>
          {settings !== null && (
            <span>
              {address}
              {settings.email !== null && (
                <>
                  {" · "}
                  <a href={`mailto:${settings.email}`} className="nl-footer-mail">
                    {settings.email}
                  </a>
                </>
              )}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}

/** Open the screen a place names, from the address bar or the back button. */
export function openFromAddress(place: Place): void {
  go(place, false);
}

/** The checkout's own header shows on the checkout and on its paying states. */
const CHECKOUT_VIEWS: readonly ShopView[] = ["checkout"];

export default function ShopApp() {
  const view = useShop((s) => s.view);
  const loading = useShop((s) => s.loading);

  useEffect(() => {
    const url = attachShopUrl(openFromAddress);
    useShop.setState({ place: url.current(), view: url.current().view });
    onShopNavigate((next) => url.push(next));
    void loadShop();
    return () => {
      onShopNavigate(null);
      url.detach();
    };
  }, []);

  // The tab's title is the shop's own name.
  const name = useShop((s) => s.base?.settings.name ?? "");
  useEffect(() => {
    document.title = name || "Northline";
  }, [name]);

  // A new screen starts at its top.
  useEffect(() => {
    // jsdom has no layout to scroll: the tests' window says so in its user agent.
    if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) return;
    window.scrollTo?.(0, 0);
  }, [view]);

  const checkout = CHECKOUT_VIEWS.includes(view);
  return (
    <div className="nl-app">
      <LiveRegion />
      <Header checkout={checkout} />
      {loading === "loading" ? <Loading /> : loading === "failed" ? <Failed /> : <Screen view={view} />}
      {!checkout && <Footer />}
      <BasketDrawer />
      <SignInSheet />
      <Toasts />
    </div>
  );
}

export { goView };
