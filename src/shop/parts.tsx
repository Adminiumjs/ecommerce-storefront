/**
 * The shop's small drawn parts: a link that is a real address, an overlay's
 * focus and Escape, a category's icon, a product's picture (or the shop's
 * tinted stand-in when it has none), its card, a stock pill, stars and a
 * field with its message tied to it.
 */
import {
  Backpack,
  BedDouble,
  CircleAlert,
  CloudRain,
  Coffee,
  CupSoda,
  Droplets,
  Flame,
  Flashlight,
  Footprints,
  LoaderCircle,
  Lock,
  Luggage,
  Mountain,
  Package,
  Shirt,
  Snowflake,
  Store,
  Tent,
  type LucideProps,
} from "lucide-react";
import { useEffect, useRef, type AnchorHTMLAttributes, type ComponentType, type InputHTMLAttributes, type ReactNode, type RefObject } from "react";

import { useI18n } from "../i18n/index.tsx";
import { money } from "./format.ts";
import type { Product } from "./port.ts";
import { hrefOf, type Place } from "./route.ts";
import { go, isNew, useShop, type CardStock } from "./store.ts";
import { Mono } from "./words.tsx";

/** A link inside the shop: a real address for a new tab, a screen change for a plain click. */
export function ShopLink({ to, className, children, onClick, ...rest }: { to: Place; className?: string; children: ReactNode; onClick?: () => void } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  return (
    <a
      {...rest}
      href={hrefOf(to)}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * An overlay's manners: focus moves in (to `[data-autofocus]` or the first
 * control), Tab stays inside, Escape closes it, and focus goes back to what
 * opened it.
 */
export function useDialog<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const box = ref.current;
    const first = box?.querySelector<HTMLElement>("[data-autofocus]") ?? box?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close.current();
        return;
      }
      if (e.key !== "Tab" || box === null) return;
      const all = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (all.length === 0) return;
      const [head, tail] = [all[0]!, all.at(-1)!];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener !== null && document.contains(opener)) opener.focus();
    };
  }, [open]);
  return ref;
}

/** Named imports only: the icon set's dynamic map would pull every icon into the bundle. */
const ICONS: Readonly<Record<string, ComponentType<LucideProps>>> = {
  backpack: Backpack,
  "bed-double": BedDouble,
  "cloud-rain": CloudRain,
  coffee: Coffee,
  "cup-soda": CupSoda,
  droplets: Droplets,
  flame: Flame,
  flashlight: Flashlight,
  footprints: Footprints,
  luggage: Luggage,
  mountain: Mountain,
  package: Package,
  shirt: Shirt,
  snowflake: Snowflake,
  store: Store,
  tent: Tent,
};

export function CategoryIcon({ name, size = 18 }: { name: string | null; size?: number }) {
  const Icon = (name === null ? undefined : ICONS[name]) ?? Package;
  return <Icon size={size} aria-hidden="true" />;
}

export function LockIcon({ size = 14 }: { size?: number }) {
  return <Lock size={size} aria-hidden="true" />;
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <LoaderCircle size={size} aria-hidden="true" className="nl-spin" />;
}

/**
 * A product's picture: the shop's own photo, or its tinted stand-in with the
 * category's icon. The tint is the chosen colour's, as the shop typed it.
 */
export function Picture({ url, alt = "", tint = null, icon, size = "card", className = "" }: { url?: string | null; alt?: string; tint?: string | null; icon: string | null; size?: "card" | "main" | "thumb" | "line"; className?: string }) {
  if (url !== null && url !== undefined) {
    return (
      <span className={`nl-pic nl-pic--${size} ${className}`}>
        <img src={url} alt={alt} className="nl-pic-img" />
      </span>
    );
  }
  const style = tint === null ? undefined : ({ "--tint": tint } as React.CSSProperties);
  const iconSize = size === "main" ? 72 : size === "card" ? 44 : size === "thumb" ? 22 : 24;
  return (
    <span className={`nl-pic nl-pic--${size} nl-pic--stand ${tint === null ? "" : "nl-pic--tinted"} ${className}`} style={style}>
      <CategoryIcon name={icon} size={iconSize} />
    </span>
  );
}

/** Inventory's words as a pill: "In stock", "Only 2 left", "Sold out". */
export function StockPill({ word, small = false }: { word: CardStock | null | undefined; small?: boolean }) {
  const { t, locale } = useI18n();
  if (word === null || word === undefined) return null;
  const tone = word.state === "out" ? "out" : word.state === "low" ? "low" : "in";
  const label = word.state === "out" ? t("shop.stock.out") : word.state === "low" && word.left !== null ? t("shop.stock.left", { n: new Intl.NumberFormat(locale).format(word.left) }, word.left) : word.state === "low" ? t("shop.stock.low") : t("shop.stock.in");
  return (
    <span className={`nl-pill nl-pill--${tone} ${small ? "nl-pill--sm" : ""}`}>
      <span className="nl-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/** A product's card on a list: its picture, category, name, price and stock words. */
export function ProductCard({ product, showNew = true, compact = false }: { product: Product; showNew?: boolean; compact?: boolean }) {
  const { t, locale } = useI18n();
  const currency = useShop((s) => s.config.currency);
  const word = useShop((s) => s.cardStock[String(product.id)]);
  const icon = useShop((s) => s.base?.categories.find((c) => String(c.id) === String(product.categoryId))?.icon ?? null);
  const fresh = showNew && isNew(product);
  return (
    <ShopLink to={{ view: "product", slug: product.slug }} className={`nl-card ${compact ? "nl-card--compact" : ""}`}>
      <span className="nl-card-pic">
        <Picture icon={icon} />
        {fresh && <span className="nl-tag">{t("shop.card.new")}</span>}
      </span>
      <span className="nl-card-body">
        {!compact && <span className="nl-card-cat">{product.categoryName}</span>}
        <span className="nl-card-name">{product.name}</span>
        <span className="nl-card-foot">
          <Mono className="nl-card-price">{money(product.price, currency, locale)}</Mono>
          <StockPill word={word} small />
        </span>
      </span>
    </ShopLink>
  );
}

/** Stars as text, filled to the number given; the words beside them say the figure. */
export function Stars({ value, label }: { value: number; label?: string }) {
  const full = Math.round(value);
  return (
    <span className="nl-stars" {...(label === undefined ? { "aria-hidden": true } : { role: "img", "aria-label": label })}>
      {"★★★★★".slice(0, full)}
      <span className="nl-stars-off">{"★★★★★".slice(full)}</span>
    </span>
  );
}

/** A field with its label, and its message tied to it while there is one. */
export function Field({ id, label, error, hint, className = "", ...input }: { id: string; label: string; error?: string | null; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const described = [hint === undefined ? null : `${id}-hint`, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`nl-field ${className}`}>
      <label htmlFor={id} className="nl-label">
        {label}
      </label>
      <input id={id} className="nl-input" aria-invalid={error ? true : undefined} aria-describedby={described} {...input} />
      {hint !== undefined && (
        <div id={`${id}-hint`} className="nl-hint">
          {hint}
        </div>
      )}
      {error ? <FieldError id={`${id}-err`}>{error}</FieldError> : null}
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="nl-error">
      <CircleAlert size={14} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/** The ordinary shape of an e-mail address: something, an @, a dot after it. Adminium checks it again. */
export const looksLikeEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
