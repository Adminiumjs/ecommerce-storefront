// Catalog lookups shared across screens: product-by-id, category names/counts,
// and the status pill metadata.
//
// The two labels produced here — the "All" catch-all and the stock pill — are
// chrome, not catalogue data, so they are resolved through `i18n/ambient`: the
// provider's own `t`, republished by `<App>` on every render. These functions
// are called from screen render paths, so the label is looked up in whatever
// locale is being painted, and the screens keep reading a plain string.

import type { Category, Product, Stock } from "../data/types.ts";
import { t } from "../i18n/ambient";

export function indexBy(products: Product[]): Record<string, Product> {
  const idx: Record<string, Product> = {};
  for (const p of products) idx[p.id] = p;
  return idx;
}

export function catName(cats: Category[], slug: string): string {
  const c = cats.find((x) => x.slug === slug);
  /* A category's own name is merchant-entered catalogue data and ships as the
   * merchant typed it; "All" is the store's word for "no filter" and is ours to
   * translate. */
  return c ? c.name : t("chrome.category.all");
}

export function catCount(products: Product[], slug: string): number {
  return products.filter((p) => p.cat === slug).length;
}

export interface StatusMeta {
  label: string;
  col: string;
  soft: string;
}

export function statusMeta(s: Stock | "na"): StatusMeta {
  if (s === "in")
    return {
      label: t("chrome.status.in"),
      col: "var(--pos)",
      soft: "var(--pos-soft)",
    };
  if (s === "low")
    return {
      label: t("chrome.status.low"),
      col: "var(--warn)",
      soft: "var(--warn-soft)",
    };
  return {
    label: t("chrome.status.out"),
    col: "var(--fg-subtle)",
    soft: "var(--surface-3)",
  };
}
