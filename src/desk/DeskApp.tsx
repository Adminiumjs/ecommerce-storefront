/**
 * The desk's shell (comp N2 179–734): the sidebar with the shop's sections
 * and the person signed in, the top bar with search, the screen, the sheets
 * over it, the toasts and the polite live region. Below 1000 px the sidebar
 * is a rail of icons (N2-D3); below 640 px it opens as a drawer.
 *
 * A section shows only to a person whose roles reach it: Reviews, Customers
 * and Settings to the owner. A typed address to one they may not open says
 * so ("Only the owner can open this."). What their roles cannot do, Adminium
 * refuses anyway.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ClipboardList, LayoutGrid, LogOut, Menu, Mountain, PackageCheck, ReceiptText, Search, Settings, Shirt, Star, Undo2, Users, X, Lock } from "lucide-react";

import { useData, useEnv } from "./env.tsx";
import { isOwner, returnsIn, reviewsIn, search, toPack } from "./facts.ts";
import { DESK_NAV, sectionOf } from "./nav.ts";
import { go, useDesk, type View } from "./store.ts";
import type { DeskData, Person } from "./door.ts";
import { Fig } from "./ui.tsx";
import { text, type Row } from "./wire.ts";
import { useT } from "../i18n/index.tsx";
import { TodayScreen } from "./screens/Today.tsx";
import { OrderScreen, OrdersScreen } from "./screens/Orders.tsx";
import { PackingScreen } from "./screens/Packing.tsx";
import { ReturnsScreen } from "./screens/Returns.tsx";
import { ProductScreen, ProductsScreen } from "./screens/Products.tsx";
import { ReviewsScreen } from "./screens/Reviews.tsx";
import { CustomerScreen, CustomersScreen } from "./screens/Customers.tsx";
import { SettingsScreen } from "./screens/Settings.tsx";
import { Sheets } from "./screens/Sheets.tsx";

const ICON: Record<string, ReactNode> = {
  "layout-grid": <LayoutGrid size={18} aria-hidden="true" />,
  "receipt-text": <ReceiptText size={18} aria-hidden="true" />,
  "package-check": <PackageCheck size={18} aria-hidden="true" />,
  "undo-2": <Undo2 size={18} aria-hidden="true" />,
  shirt: <Shirt size={18} aria-hidden="true" />,
  star: <Star size={18} aria-hidden="true" />,
  users: <Users size={18} aria-hidden="true" />,
  settings: <Settings size={18} aria-hidden="true" />,
};

/** The sections a person's roles reach, by nav id. */
export function sectionsFor(who: Person, data: DeskData): string[] {
  return DESK_NAV.filter((entry) => {
    switch (entry.id) {
      case "reviews":
        return isOwner(who) && data.reviews !== null;
      case "customers":
        return who.can("customers", "read") && isOwner(who);
      case "settings":
        return isOwner(who);
      default:
        return who.can("orders", "read");
    }
  }).map((e) => e.id);
}

/** The count beside a section: the length of the list it opens. */
function countFor(id: string, data: DeskData, who: Person): number | null {
  switch (id) {
    case "packing":
      return toPack(data).length;
    case "returns":
      return isOwner(who) ? returnsIn(data, "asked", "received").length : returnsIn(data, "approved").length;
    case "reviews":
      return reviewsIn(data, "waiting").length;
    default:
      return null;
  }
}

export function DeskApp() {
  const t = useT();
  const data = useDesk((s) => s.data);
  const failure = useDesk((s) => s.failure);
  const theme = useDesk((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === null) root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  if (data === null) {
    return (
      <div className="dk-app">
        <main className="dk-main" id="main">
          {failure === null ? (
            <div role="status" aria-busy="true" className="dk-loading">
              <span className="br-sr-only">{t("desk.loading")}</span>
              <div className="dk-skel dk-skel--title" />
              <div className="dk-tiles">
                <div className="dk-skel dk-skel--tile" />
                <div className="dk-skel dk-skel--tile" />
                <div className="dk-skel dk-skel--tile" />
              </div>
              <div className="dk-skel dk-skel--card" />
            </div>
          ) : (
            <div className="dk-failed" role="alert">
              <span>{t("desk.failed", { why: failure })}</span>
              <button type="button" className="dk-btn" onClick={() => window.location.reload()}>
                {t("desk.retry")}
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }
  return <Shell />;
}

function Shell() {
  const t = useT();
  const data = useData();
  const { door, leave } = useEnv();
  const view = useDesk((s) => s.view);
  const navOpen = useDesk((s) => s.navOpen);
  const toasts = useDesk((s) => s.toasts);
  const said = useDesk((s) => s.said);
  const who = door.who();
  const reach = sectionsFor(who, data);
  const section = sectionOf(view);
  const denied = DESK_NAV.some((e) => e.id === section) && !reach.includes(section);
  const initials = who.name.split(/\s+/).filter((p) => p !== "").map((p) => p.charAt(0).toUpperCase()).slice(0, 2).join("");
  const roleWord = isOwner(who) ? t("desk.role.owner") : t("desk.role.packer");

  return (
    <div className="dk-app">
      <div className="br-sr-only" role="status" aria-live="polite">
        {said}
      </div>
      {navOpen && <div className="dk-drawer-scrim" onClick={() => useDesk.setState({ navOpen: false })} />}
      <aside className={`dk-side${navOpen ? " dk-side--open" : ""}`} aria-label={t("desk.nav.label")}>
        <a
          href="#main"
          className="dk-brand"
          onClick={(e) => {
            e.preventDefault();
            go("today");
          }}
        >
          <span className="dk-brand-mark" aria-hidden="true">
            <Mountain size={18} />
          </span>
          <span className="dk-brand-words">
            <span className="dk-brand-name">{text(data.settings?.["shop_name"]) ?? t("brand.name")}</span>
            <span className="dk-brand-sub">{t("desk.brandSub")}</span>
          </span>
        </a>
        <nav className="dk-nav">
          {DESK_NAV.filter((e) => reach.includes(e.id)).map((entry) => {
            const count = countFor(entry.id, data, who);
            const label = t(entry.labelKey);
            return (
              <a
                key={entry.id}
                href={`#${entry.path}`}
                className="dk-nav-link"
                aria-current={section === entry.id ? "page" : undefined}
                title={label}
                onClick={(e) => {
                  e.preventDefault();
                  go(entry.view as View);
                }}
              >
                <span className="dk-nav-ico">{ICON[entry.icon]}</span>
                <span className="dk-nav-label">{label}</span>
                {count !== null && count > 0 && (
                  <span className="dk-nav-count">
                    <Fig>{count}</Fig>
                  </span>
                )}
              </a>
            );
          })}
        </nav>
        <div className="dk-side-foot">
          <span className="dk-avatar" aria-hidden="true">
            {initials}
          </span>
          <span className="dk-side-person">
            <span className="dk-side-name">{who.name}</span>
            <span className="dk-side-role">{roleWord}</span>
          </span>
          {door.signOut !== undefined && (
            <button
              type="button"
              className="dk-iconbtn"
              aria-label={t("desk.signOut")}
              title={t("desk.signOut")}
              onClick={() =>
                void door.signOut?.().then(() => leave?.())
              }
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>
      <div className="dk-column">
        <header className="dk-top">
          <button type="button" className="dk-iconbtn dk-menu-btn" aria-label={t(navOpen ? "desk.menuClose" : "desk.menu")} aria-expanded={navOpen} onClick={() => useDesk.setState({ navOpen: !navOpen })}>
            {navOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
          <SearchBox />
          <span className="dk-person">
            <span className="dk-avatar dk-avatar--solid" aria-hidden="true">
              {initials}
            </span>
            <span className="dk-person-name">
              {who.name}
              <span className="dk-person-role"> · {roleWord}</span>
            </span>
          </span>
        </header>
        <main className="dk-main" id="main">
          {denied ? <Denied /> : <Screen view={view} />}
        </main>
      </div>
      <Sheets />
      <div className="dk-toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className={`dk-toast dk-toast--${toast.tone}`}>
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function Screen({ view }: { view: View }) {
  switch (view) {
    case "orders":
      return <OrdersScreen />;
    case "order":
      return <OrderScreen />;
    case "packing":
      return <PackingScreen />;
    case "returns":
      return <ReturnsScreen />;
    case "products":
      return <ProductsScreen />;
    case "product":
      return <ProductScreen />;
    case "reviews":
      return <ReviewsScreen />;
    case "customers":
      return <CustomersScreen />;
    case "customer":
      return <CustomerScreen />;
    case "settings":
      return <SettingsScreen />;
    case "denied":
      return <Denied />;
    default:
      return <TodayScreen />;
  }
}

function Denied() {
  const t = useT();
  return (
    <div className="dk-denied">
      <Lock size={28} aria-hidden="true" />
      <h1 className="dk-h1">{t("desk.ownerOnly")}</h1>
      <button type="button" className="dk-btn" onClick={() => go("today")}>
        {t("desk.backToday")}
      </button>
    </div>
  );
}

/** The top bar's search: orders by number, name or e-mail; customers; SKUs. Enter opens the first; Escape closes it and stays in the field. */
function SearchBox() {
  const t = useT();
  const data = useData();
  const query = useDesk((s) => s.query);
  const [open, setOpen] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const hits = search(data, query);
  const groups: { key: string; label: string; rows: { key: string; label: string; sub: string; open: () => void; icon: ReactNode }[] }[] = [
    {
      key: "orders",
      label: t("desk.search.orders"),
      rows: hits.orders.map((o) => ({ key: `o${String(o.id)}`, label: text(o["number"]) ?? "", sub: text(o["name"]) ?? "", open: () => go("order", { orderId: o.id }), icon: <ReceiptText size={16} /> })),
    },
    {
      key: "customers",
      label: t("desk.search.customers"),
      rows: hits.customers.map((c) => ({ key: `c${String(c.id)}`, label: text(c["name"]) ?? text(c["email"]) ?? "", sub: text(c["email"]) ?? "", open: () => go("customer", { customerId: c.id }), icon: <Users size={16} /> })),
    },
    {
      key: "skus",
      label: t("desk.search.skus"),
      rows: hits.variants.map((v: Row) => ({ key: `v${String(v.id)}`, label: text(v["sku"]) ?? "", sub: [text(v["product_name"]), text(v["colour_label"]), text(v["size_label"])].filter((x) => x !== null).join(" · "), open: () => go("product", { productId: v["product_id"] as string }), icon: <ClipboardList size={16} /> })),
    },
  ].filter((g) => g.rows.length > 0);
  const first = groups[0]?.rows[0];
  const shown = open && query.trim().length >= 2;
  return (
    <form
      role="search"
      className="dk-search"
      onSubmit={(e) => {
        e.preventDefault();
        first?.open();
        setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <label htmlFor="desk-search" className="br-sr-only">
        {t("desk.search.label")}
      </label>
      <Search size={16} aria-hidden="true" className="dk-search-ico" />
      <input
        ref={field}
        id="desk-search"
        type="search"
        autoComplete="off"
        value={query}
        placeholder={t("desk.search.placeholder")}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={shown ? "desk-search-res" : undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          useDesk.setState({ query: e.target.value });
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            field.current?.focus();
          }
        }}
      />
      {shown && (
        <div id="desk-search-res" className="dk-search-res">
          {groups.length === 0 && <div className="dk-search-none">{t("desk.search.none")}</div>}
          {groups.map((g) => (
            <div key={g.key}>
              <div className="dk-search-group">{g.label}</div>
              {g.rows.map((r) => (
                <a
                  key={r.key}
                  href="#main"
                  className="dk-search-hit"
                  onClick={(e) => {
                    e.preventDefault();
                    r.open();
                    setOpen(false);
                  }}
                >
                  <span aria-hidden="true" className="dk-search-hit-ico">
                    {r.icon}
                  </span>
                  <span className="dk-search-hit-words">
                    <span className="dk-search-hit-label">{g.key === "customers" ? r.label : <Fig strong>{r.label}</Fig>}</span>
                    <span className="dk-search-hit-sub">{r.sub}</span>
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}

