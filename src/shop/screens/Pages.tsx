/**
 * S15–S18: gift cards, the help pages, the newsletter box and the page that
 * is not there. Each is drawn in its own module (`PagesGift`, `PagesHelp`,
 * `PagesNews`); this one is the door the shop's frame imports them through,
 * and draws the 404.
 */
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import "../pages.css";

import { useI18n } from "../../i18n/index.tsx";
import { ShopLink } from "../parts.tsx";
import { go } from "../store.ts";

export { GiftBalanceScreen, GiftCardsScreen } from "./PagesGift.tsx";
export { AboutScreen, HelpContactScreen, HelpShippingScreen, HelpSizesScreen, PrivacyScreen, TermsScreen } from "./PagesHelp.tsx";
export { NewsBox, NewsThanksScreen } from "./PagesNews.tsx";

/** Any address the shop does not know: say so, and offer a search and the whole shop. */
export function MissingScreen() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  return (
    <main id="main" className="nl-page nl-missing nl-fade">
      <div className="nl-missing-code nl-mono" aria-hidden="true">
        404
      </div>
      <h1 className="nl-h1">{t("pages.missing.title")}</h1>
      <form
        role="search"
        aria-label={t("shop.search.placeholder")}
        className="nl-missing-search"
        onSubmit={(e) => {
          e.preventDefault();
          const words = q.trim();
          if (words !== "") go({ view: "search", q: words });
        }}
      >
        <input type="search" className="nl-input" aria-label={t("shop.search")} placeholder={t("shop.search.placeholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="nl-btn nl-btn--quiet">
          {t("shop.search")}
        </button>
      </form>
      <ShopLink to={{ view: "shop" }} className="nl-btn nl-btn--accent nl-btn--lg">
        {t("shop.nav.all")}
        <ArrowRight size={16} aria-hidden="true" className="nl-flip" />
      </ShopLink>
    </main>
  );
}
