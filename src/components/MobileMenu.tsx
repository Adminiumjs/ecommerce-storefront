// Mobile menu — a top sheet with search + category nav. Opened by the header
// hamburger below the 900px breakpoint.

import { useI18n } from "../i18n";
import { catCount } from "../lib/catalog.ts";
import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";

export function MobileMenu() {
  const { t, number } = useI18n();
  const menu = useStore((s) => s.menu);
  const cats = useStore((s) => s.cats);
  const products = useStore((s) => s.products);
  const qDraft = useStore((s) => s.qDraft);
  const closeMenu = useStore((s) => s.closeMenu);
  const setQDraft = useStore((s) => s.setQDraft);
  const submitSearch = useStore((s) => s.submitSearch);
  const goCat = useStore((s) => s.goCat);

  if (!menu) return null;

  return (
    <div
      onClick={closeMenu}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 180,
        background: "rgba(10,10,15,.5)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "16px clamp(16px,5vw,24px) 22px",
          animation: "sf-sheet .22s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "14px",
          }}
        >
          <span
            style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "-.01em" }}
          >
            {t("chrome.menu.title")}
          </span>
          <button
            className="sf-gi"
            onClick={closeMenu}
            aria-label={t("chrome.menu.close")}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--fg-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <Icon
            name="search"
            size={17}
            style={{
              position: "absolute",
              insetInlineStart: "13px",
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
            placeholder={t("chrome.menu.searchPlaceholder")}
            aria-label={t("chrome.header.searchAria")}
            style={{
              width: "100%",
              paddingBlock: "12px",
              paddingInline: "40px 14px",
              borderRadius: "12px",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              fontSize: "14px",
              color: "var(--fg)",
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <button
            onClick={() => goCat("all")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 10px",
              border: "none",
              background: "transparent",
              color: "var(--fg)",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "start",
              borderRadius: "10px",
            }}
          >
            <Icon name="store" size={18} color="var(--accent)" />
            {t("chrome.header.shopAll")}
          </button>
          {cats.map((c) => (
            <button
              key={c.slug}
              onClick={() => goCat(c.slug)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 10px",
                border: "none",
                background: "transparent",
                color: "var(--fg)",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "start",
                borderRadius: "10px",
              }}
            >
              <Icon name={c.icon} size={18} color="var(--fg-muted)" />
              {c.name}
              <span
                style={{
                  marginInlineStart: "auto",
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "12px",
                  color: "var(--fg-subtle)",
                }}
              >
                {number(catCount(products, c.slug))}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
