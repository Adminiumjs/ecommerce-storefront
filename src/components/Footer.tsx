// Footer: brand + newsletter block, three link columns, and the bottom bar with
// the Adminium credit + demo domain chip + payment chips.

import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";

const PAY_CHIPS = ["VISA", "MASTERCARD", "AMEX", "APPLE PAY"];

export function Footer() {
  const news = useStore((s) => s.news);
  const setNews = useStore((s) => s.setNews);
  const newsSubmit = useStore((s) => s.newsSubmit);
  const goCat = useStore((s) => s.goCat);
  const go = useStore((s) => s.go);
  const toast = useStore((s) => s.toast_);

  const cols: { title: string; links: { label: string; onClick: () => void }[] }[] =
    [
      {
        title: "Shop",
        links: [
          { label: "All products", onClick: () => goCat("all") },
          { label: "Gear", onClick: () => goCat("gear") },
          { label: "Apparel", onClick: () => goCat("apparel") },
          { label: "Home", onClick: () => goCat("home") },
          { label: "Accessories", onClick: () => goCat("accessories") },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About Northline", onClick: () => toast("Demo link") },
          { label: "Stores", onClick: () => toast("Demo link") },
          { label: "Careers", onClick: () => toast("Demo link") },
          { label: "Sustainability", onClick: () => toast("Demo link") },
        ],
      },
      {
        title: "Support",
        links: [
          { label: "Contact", onClick: () => toast("Demo link") },
          { label: "Shipping & returns", onClick: () => toast("Demo link") },
          { label: "Order status", onClick: () => go("account") },
          { label: "FAQ", onClick: () => toast("Demo link") },
        ],
      },
    ];

  return (
    <footer
      style={{
        marginTop: "clamp(40px,6vw,72px)",
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "clamp(30px,4vw,48px) clamp(16px,4vw,32px)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))",
            gap: "clamp(24px,4vw,48px)",
            alignItems: "start",
          }}
        >
          <div style={{ maxWidth: "340px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                marginBottom: "14px",
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
                }}
              >
                <Icon name="shopping-bag" size={18} />
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "18px",
                  letterSpacing: "-.02em",
                }}
              >
                Northline
              </span>
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 800,
                letterSpacing: "-.01em",
                marginBottom: "6px",
              }}
            >
              Get 10% off your first order
            </div>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "12.5px",
                color: "var(--fg-muted)",
                lineHeight: 1.5,
              }}
            >
              Product drops, restocks, and the occasional good idea. No spam.
            </p>
            <div style={{ display: "flex", gap: "8px", maxWidth: "340px" }}>
              <input
                className="jk-fld"
                value={news}
                onChange={(e) => setNews(e.target.value)}
                placeholder="you@email.com"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "11px 13px",
                  borderRadius: "11px",
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface-2)",
                  fontSize: "13.5px",
                  color: "var(--fg)",
                  outline: "none",
                }}
              />
              <button
                className="jk-btn"
                onClick={newsSubmit}
                style={{
                  padding: "11px 18px",
                  borderRadius: "11px",
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Subscribe
              </button>
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--fg-subtle)",
                  marginBottom: "14px",
                }}
              >
                {col.title}
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "10px" }}
              >
                {col.links.map((lk) => (
                  <button
                    key={lk.label}
                    className="jk-link"
                    onClick={lk.onClick}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--fg-muted)",
                      fontSize: "13.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "start",
                      padding: 0,
                    }}
                  >
                    {lk.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: "clamp(26px,4vw,40px)",
            paddingTop: "22px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--fg-subtle)" }}>
            © 2026 Northline. A demo store shipped with{" "}
            <span style={{ fontWeight: 700, color: "var(--fg-muted)" }}>
              Adminium
            </span>
            .
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "11.5px",
              color: "var(--fg-subtle)",
            }}
          >
            adminium.dev/demo/ecommerce-storefront
          </span>
          <div
            style={{
              marginInlineStart: "auto",
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            {PAY_CHIPS.map((pc) => (
              <span
                key={pc}
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "var(--fg-subtle)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  background: "var(--surface-2)",
                }}
              >
                {pc}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
