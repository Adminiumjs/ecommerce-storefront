// Footer: brand + newsletter block, three link columns, and the bottom bar with
// the Adminium credit + demo domain chip + payment chips.

import { BRAND, PROMO_RATE } from "../lib/shop.ts";
import { useI18n } from "../i18n";
import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";

/** Card schemes are proper nouns; they read the same in every language. */
const PAY_CHIPS = ["VISA", "MASTERCARD", "AMEX", "APPLE PAY"];

/** The platform's name. Never translated. `BRAND` lives in `data/demo` because
 * the screens need it too. */
const ADMINIUM = "Adminium";

/** The comp's fixed copyright year, formatted through `Intl` so ar-EG reads
 * ٢٠٢٦ rather than Latin digits in an otherwise Arabic line. */
const CREDIT_YEAR = new Date(2026, 0, 1);

/**
 * A marker for the one word inside the credit line that has to be its own
 * styled node. The translator writes the whole sentence with `{adminium}` where
 * it belongs; the renderer splits on the marker and drops the bolded brand in.
 * Splitting a finished sentence is not the same as gluing two half-sentences
 * together — word order stays entirely with the translator.
 */
const SLOT = "\u0000";

export function Footer() {
  const { t, number, date } = useI18n();
  const news = useStore((s) => s.news);
  const setNews = useStore((s) => s.setNews);
  const newsSubmit = useStore((s) => s.newsSubmit);
  const cats = useStore((s) => s.cats);
  const goCat = useStore((s) => s.goCat);
  const go = useStore((s) => s.go);
  const toast = useStore((s) => s.toast_);

  const demo = () => toast("chrome.toast.demoLink");

  /*
   * `id` is the React key, and it is deliberately not the label: a translated
   * label changes on every language switch, which would remount the whole
   * footer, and two labels that happen to collide in one language would be
   * duplicate keys in that language only.
   */
  const cols: {
    id: string;
    title: string;
    links: { id: string; label: string; onClick: () => void }[];
  }[] = [
    {
      id: "shop",
      title: t("chrome.footer.colShop"),
      links: [
        {
          id: "all",
          label: t("chrome.footer.allProducts"),
          onClick: () => goCat("all"),
        },
        /* The category rows were a hand-typed copy of the same four names the
         * header renders from the catalogue. Reading the list makes the two
         * navs agree by construction, and keeps merchant-entered names out of
         * the message table, where they do not belong. */
        ...cats.map((c) => ({
          id: c.slug,
          label: c.name,
          onClick: () => goCat(c.slug),
        })),
      ],
    },
    {
      id: "company",
      title: t("chrome.footer.colCompany"),
      links: [
        {
          id: "about",
          label: t("chrome.footer.about", { brand: BRAND }),
          onClick: demo,
        },
        { id: "stores", label: t("chrome.footer.stores"), onClick: demo },
        { id: "careers", label: t("chrome.footer.careers"), onClick: demo },
        {
          id: "sustainability",
          label: t("chrome.footer.sustainability"),
          onClick: demo,
        },
      ],
    },
    {
      id: "support",
      title: t("chrome.footer.colSupport"),
      links: [
        { id: "contact", label: t("chrome.footer.contact"), onClick: demo },
        {
          id: "shipping",
          label: t("chrome.footer.shippingReturns"),
          onClick: demo,
        },
        {
          id: "orders",
          label: t("chrome.footer.orderStatus"),
          onClick: () => go("account"),
        },
        { id: "faq", label: t("chrome.footer.faq"), onClick: demo },
      ],
    },
  ];

  const [creditBefore, creditAfter = ""] = t("chrome.footer.credit", {
    year: date(CREDIT_YEAR, { year: "numeric" }),
    brand: BRAND,
    adminium: SLOT,
  }).split(SLOT);

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
                {BRAND}
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
              {/* The same rate the WELCOME10 code applies — read from the one
                  constant so the promise and the discount cannot drift. */}
              {t("chrome.footer.newsletterTitle", {
                pct: number(PROMO_RATE, { style: "percent" }),
              })}
            </div>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "12.5px",
                color: "var(--fg-muted)",
                lineHeight: 1.5,
              }}
            >
              {t("chrome.footer.newsletterBody")}
            </p>
            <div style={{ display: "flex", gap: "8px", maxWidth: "340px" }}>
              {/* The placeholder is a specimen address, not a sentence — the
                  same string in every locale — so the accessible name carries
                  the translated label instead. */}
              <input
                className="sf-fld"
                value={news}
                onChange={(e) => setNews(e.target.value)}
                placeholder={t("chrome.footer.emailPlaceholder")}
                aria-label={t("chrome.footer.emailAria")}
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
                className="sf-btn"
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
                {t("chrome.footer.subscribe")}
              </button>
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.id}>
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
                    key={lk.id}
                    className="sf-link"
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
            {creditBefore}
            <span style={{ fontWeight: 700, color: "var(--fg-muted)" }}>
              {ADMINIUM}
            </span>
            {creditAfter}
          </span>
          <span
            dir="ltr"
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "11.5px",
              color: "var(--fg-subtle)",
            }}
          >
            {/* A URL is a machine token: it reads left-to-right even on an
                Arabic page, where bidi would otherwise reorder the slashes. */}
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
