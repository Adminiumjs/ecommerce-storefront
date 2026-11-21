/**
 * What the smaller pages share: the help pages' frame with its side nav, the
 * shop's own name and address as its settings give them, and the words for a
 * refusal that is not about one field.
 */
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import "../pages.css";

import { useI18n, type MessageKey, type TFunction } from "../../i18n/index.tsx";
import { ShopLink } from "../parts.tsx";
import { isShopError } from "../port.ts";
import type { ShopView } from "../route.ts";
import { useShop } from "../store.ts";

/** The shop's name as its owner typed it; the brand's own words only until the settings arrive. */
export function useShopName(): string {
  const { t } = useI18n();
  const name = useShop((s) => s.base?.settings.name ?? "");
  return name.trim() === "" ? t("brand.name") : name;
}

/** The shop's address on one line, as its settings give it ("1400 NW Kearney St, Suite 210, Portland, OR 97209"). */
export function useShopAddress(): { address: string; email: string | null } {
  const settings = useShop((s) => s.base?.settings ?? null);
  if (settings === null) return { address: "", email: null };
  const street = [settings.addressLine1, settings.addressLine2].filter(Boolean).join(", ");
  const state = [settings.stateCode, settings.zip].filter(Boolean).join(" ");
  return { address: [street, settings.city, state].filter(Boolean).join(", "), email: settings.email };
}

/**
 * A refusal that is not one field's: too many tries (Adminium's rate limit,
 * which says when to come back), or anything else, which is worth one more go.
 */
export function refusalWords(t: TFunction, error: unknown): string {
  if (isShopError(error) && (error.refused.status === 429 || error.refused.retryAfter !== null)) return t("pages.tooMany");
  return t("pages.failed");
}

/** Whether Adminium refused the value of this one column. */
export function refusedColumn(error: unknown, column: string): boolean {
  return isShopError(error) && error.refused.status !== 429 && error.refused.column === column;
}

/** The help pages, in the order the side nav lists them (the comp's six). */
const HELP: [ShopView, MessageKey][] = [
  ["helpShipping", "shop.footer.shipping"],
  ["helpSizes", "shop.footer.sizes"],
  ["helpContact", "shop.footer.contact"],
  ["about", "shop.footer.about"],
  ["privacy", "shop.footer.privacy"],
  ["terms", "shop.footer.terms"],
];

export function helpTitle(view: ShopView): MessageKey {
  return HELP.find(([v]) => v === view)?.[1] ?? "shop.footer.shipping";
}

/** A help page: the side nav beside it, its title, and what it says. */
export function HelpFrame({ view, children }: { view: ShopView; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <main id="main" className="nl-page nl-help nl-fade">
      <nav aria-label={t("pages.help.nav")} className="nl-help-nav">
        {HELP.map(([to, key]) => (
          <ShopLink key={to} to={{ view: to }} className="nl-help-link" aria-current={to === view ? "page" : undefined}>
            {t(key)}
          </ShopLink>
        ))}
      </nav>
      <div className="nl-help-body">
        <h1 className="nl-h1">{t(helpTitle(view))}</h1>
        {children}
      </div>
    </main>
  );
}

/** "Back to the shop", and the like: a link with its arrow, which turns round in Arabic. */
export function ArrowLink({ to, className = "nl-pages-link", children }: { to: Parameters<typeof ShopLink>[0]["to"]; className?: string; children: ReactNode }) {
  return (
    <ShopLink to={to} className={className}>
      {children}
      <ArrowRight size={15} aria-hidden="true" className="nl-flip" />
    </ShopLink>
  );
}
