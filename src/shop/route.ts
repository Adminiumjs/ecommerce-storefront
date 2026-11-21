/**
 * The shop's address bar: which path shows which screen, both ways.
 *
 * Paths are relative to where the shop is served
 * (`/apps/ecommerce-shop/customer/` hosted, `/` on its own domain), so the
 * same bundle reads the same paths wherever it is placed. An order's own link
 * is `/o#<code>`: the code rides the fragment, never the path, and the page
 * exchanges it for a session and clears it.
 */

export type ShopView =
  | "home"
  | "shop"
  | "search"
  | "product"
  | "basket"
  | "checkout"
  | "order"
  | "orderReturn"
  | "find"
  | "signIn"
  | "account"
  | "giftCards"
  | "giftBalance"
  | "helpShipping"
  | "helpSizes"
  | "helpContact"
  | "about"
  | "privacy"
  | "terms"
  | "newsThanks"
  | "missing";

export interface Place {
  view: ShopView;
  /** A product's slug, or a category's on the shop. */
  slug?: string | null;
  /** A search's words. */
  q?: string | null;
}

/** The screens with a fixed path, by that path. */
export const PATHS = {
  basket: "basket",
  checkout: "checkout",
  order: "o",
  orderReturn: "o/return",
  find: "find",
  signIn: "sign-in",
  account: "account",
  giftCards: "gift-cards",
  giftBalance: "gift-cards/balance",
  helpShipping: "help/shipping",
  helpSizes: "help/sizes",
  helpContact: "help/contact",
  about: "about",
  privacy: "privacy",
  terms: "terms",
  newsThanks: "news/thanks",
} as const satisfies Partial<Record<ShopView, string>>;

/** The part of a page's path the shop reads: what follows its own mount. */
export function relativePath(pathname: string, base: string): string {
  const clean = (base.endsWith("/") ? base : `${base}/`).replace(/^\/*/, "/");
  if (pathname.startsWith(clean)) return pathname.slice(clean.length);
  // Mounted for one of several databases, a name before the side: `/apps/ecommerce-shop/<name>/customer/…`.
  const side = /^\/apps\/[^/]+\/(?:[^/]+\/)?customer\/(.*)$/.exec(pathname);
  if (side !== null) return side[1] ?? "";
  return pathname.replace(/^\/+/, "");
}

export function placeOf(relative: string, search = ""): Place {
  const parts = relative.split("/").filter((p) => p !== "").map((p) => decodeURIComponent(p));
  if (parts.length === 0) return { view: "home" };
  const [first, second] = parts;
  if (first === "shop" && parts.length <= 2) return { view: "shop", slug: second ?? null };
  if (first === "search" && parts.length === 1) return { view: "search", q: new URLSearchParams(search).get("q") ?? "" };
  if (first === "p" && second !== undefined && parts.length === 2) return { view: "product", slug: second };
  // The sign-in link Adminium e-mails lands on `/c#<code>`: the sign-in page continues it.
  if (first === "c" && parts.length === 1) return { view: "signIn" };
  const joined = parts.join("/");
  const fixed = (Object.entries(PATHS) as [ShopView, string][]).find(([, path]) => path === joined);
  if (fixed !== undefined) return { view: fixed[0] };
  return { view: "missing" };
}

/** The path a place is shown at, with its query when it has one. */
export function pathOf(place: Place): string {
  switch (place.view) {
    case "home":
    case "missing":
      return "";
    case "shop":
      return place.slug ? `shop/${encodeURIComponent(place.slug)}` : "shop";
    case "search":
      return `search?q=${encodeURIComponent(place.q ?? "")}`;
    case "product":
      return `p/${encodeURIComponent(place.slug ?? "")}`;
    default:
      return PATHS[place.view];
  }
}

/** The mount the shop is served at: Vite's base, as built. */
export function mountBase(): string {
  return import.meta.env.BASE_URL ?? "/";
}

/** The page's mount as the address bar shows it (a mount for one database keeps its name). */
function liveBase(pathname: string, base: string): string {
  const clean = base.endsWith("/") ? base : `${base}/`;
  if (pathname.startsWith(clean)) return clean;
  const side = /^(\/apps\/[^/]+\/(?:[^/]+\/)?customer\/)/.exec(pathname);
  return side?.[1] ?? clean;
}

/** An address for a link's `href`: the same path the shop pushes when it is followed. */
export function hrefOf(place: Place): string {
  const base = typeof window === "undefined" ? "/" : liveBase(window.location.pathname, mountBase());
  return `${base}${pathOf(place)}`;
}

/**
 * Keep the address and the screen together: a move writes the path, the
 * back button reads it. `go` opens the screen a path names.
 */
export function attachShopUrl(go: (place: Place) => void): { push: (place: Place) => void; current: () => Place; detach: () => void } {
  const current = () => placeOf(relativePath(window.location.pathname, mountBase()), window.location.search);
  const onPop = () => go(current());
  window.addEventListener("popstate", onPop);
  return {
    current,
    push(place) {
      const path = hrefOf(place);
      if (path === `${window.location.pathname}${window.location.search}`) return;
      window.history.pushState(window.history.state, "", path);
    },
    detach: () => window.removeEventListener("popstate", onPop),
  };
}
