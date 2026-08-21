// Sticky header. On the checkout view it collapses to a minimal secure-checkout
// bar; everywhere else it's the full nav/search/theme/cart header. The
// hamburger / inline-nav / inline-search visibility is driven by CSS media
// queries (see base.css), not JS width state.

import { useI18n, useT } from "../i18n";
import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";
import { LocalePicker } from "./LocalePicker.tsx";

function navBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 13px",
    borderRadius: "10px",
    border: "none",
    background: active ? "var(--accent-soft)" : "transparent",
    color: active ? "var(--accent)" : "var(--fg-muted)",
    fontSize: "13.5px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function CheckoutHeader() {
  const go = useStore((s) => s.go);
  const t = useT();
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "0 clamp(16px,4vw,32px)",
          height: "62px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <button
          onClick={() => go("home")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "11px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--fg)",
          }}
        >
          <span
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "9px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 3px 10px var(--accent-soft)",
            }}
          >
            <Icon name="shopping-bag" size={17} />
          </span>
          <span
            style={{ fontWeight: 800, fontSize: "17px", letterSpacing: "-.02em" }}
          >
            Northline
          </span>
        </button>
        <button
          className="sf-link"
          onClick={() => go("cart")}
          style={{
            marginInlineStart: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            border: "none",
            background: "transparent",
            color: "var(--fg-muted)",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Icon name="arrow-left" size={15} />
          {t("chrome.header.backToCart")}
        </button>
        <LocalePicker size={34} />
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--pos)",
            paddingInlineStart: "14px",
            borderInlineStart: "1px solid var(--border)",
          }}
        >
          <Icon name="lock" size={14} />
          {t("chrome.header.secureCheckout")}
        </span>
      </div>
    </header>
  );
}

export function Header() {
  const { t, number } = useI18n();
  const view = useStore((s) => s.view);
  const cat = useStore((s) => s.cat);
  const q = useStore((s) => s.q);
  const cats = useStore((s) => s.cats);
  const theme = useStore((s) => s.theme);
  const qDraft = useStore((s) => s.qDraft);
  const cartCount = useStore((s) => s.getCount());

  const goHome = useStore((s) => s.go);
  const goCat = useStore((s) => s.goCat);
  const openMenu = useStore((s) => s.openMenu);
  const openDrawer = useStore((s) => s.openDrawer);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setQDraft = useStore((s) => s.setQDraft);
  const submitSearch = useStore((s) => s.submitSearch);

  if (view === "checkout") return <CheckoutHeader />;

  const isListing = view === "listing";
  const allActive = isListing && cat === "all" && !q;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--surface-header)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 clamp(16px,4vw,32px)",
          height: "64px",
          display: "flex",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <button
          className="sf-gi sf-hamburger"
          onClick={openMenu}
          aria-label={t("chrome.header.openMenu")}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "11px",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--fg)",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Icon name="menu" size={19} />
        </button>
        <button
          onClick={() => goHome("home")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "11px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--fg)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 3px 10px var(--accent-soft)",
            }}
          >
            <Icon name="shopping-bag" size={18} />
          </span>
          <span
            style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-.02em" }}
          >
            Northline
          </span>
        </button>

        <nav
          className="sf-inline-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginInlineStart: "8px",
          }}
        >
          <button onClick={() => goCat("all")} style={navBtnStyle(allActive)}>
            {t("chrome.header.shopAll")}
          </button>
          {cats.map((c) => (
            <button
              key={c.slug}
              className="sf-nav"
              onClick={() => goCat(c.slug)}
              style={navBtnStyle(isListing && cat === c.slug)}
            >
              {c.name}
            </button>
          ))}
        </nav>

        <div
          style={{
            marginInlineStart: "auto",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            className="sf-inline-search"
            style={{ position: "relative", width: "230px" }}
          >
            <Icon
              name="search"
              size={16}
              style={{
                position: "absolute",
                insetInlineStart: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--fg-subtle)",
              }}
            />
            <input
              className="sf-fld"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
              }}
              placeholder={t("chrome.header.searchPlaceholder")}
              aria-label={t("chrome.header.searchAria")}
              style={{
                width: "100%",
                paddingBlock: "9px",
                paddingInline: "36px 12px",
                borderRadius: "11px",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-2)",
                fontSize: "13.5px",
                color: "var(--fg)",
                outline: "none",
              }}
            />
          </div>
          <LocalePicker />
          <button
            className="sf-gi"
            onClick={toggleTheme}
            title={t("chrome.header.toggleTheme")}
            aria-label={t("chrome.header.toggleTheme")}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "11px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--fg-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
          <button
            className="sf-gi"
            onClick={openDrawer}
            title={t("chrome.header.cart")}
            aria-label={
              cartCount > 0
                ? t(
                    "chrome.header.cartWithCount",
                    { count: number(cartCount) },
                    cartCount,
                  )
                : t("chrome.header.cart")
            }
            style={{
              position: "relative",
              width: "40px",
              height: "40px",
              borderRadius: "11px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--fg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="shopping-bag" size={18} />
            {cartCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-5px",
                  insetInlineEnd: "-5px",
                  minWidth: "19px",
                  height: "19px",
                  padding: "0 5px",
                  borderRadius: "20px",
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono',monospace",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid var(--surface)",
                }}
                aria-hidden="true"
              >
                {number(cartCount)}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
