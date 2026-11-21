/**
 * What the website's demo card offers for Northline — the shopper's fourteen
 * screens and the shop desk's eight (no Overview: R7), the shortcuts that do
 * something on them, the two people, the shop clock — and the card's words in
 * its eight languages. `vite.config.ts` writes `demo.json` from it in the
 * demo build; the bridge answers to its ids.
 *
 * The desk's screens are labelled with the desk's own section names (already
 * translated and reviewed); the shopper's with the comp's short names (the
 * shop's own headings are longer, and a chip is narrow). The card's own words
 * — a shortcut, the clock, a person — are below, one row a key.
 *
 * A SHORTCUT THAT NAMES A FIGURE READS IT FROM THE SAMPLE (N4-F7): "Ember, M —
 * only 3 left", "Slate, XL — sold out", "Ember, XS — not made", "Try
 * TRAIL15", "Fill NL-1053 and Priya's e-mail", "Count the Slate XL back in"
 * are each a phrase in eight languages filled with the sample world's own
 * values (`northline-data.json`, the file `figures.md` is written from), so
 * they cannot drift from the data; `card.test.ts` holds them to `figures.md`.
 *
 * DEMO ONLY — no surface bundle imports it.
 */
import WORLD from "../sample/northline-data.json";

import type { DemoEmitOptions } from "../../demo-emit.ts";
import { MESSAGES } from "../i18n/messages/index.ts";

type Locale = "en-US" | "de-DE" | "fr-FR" | "da-DK" | "cs-CZ" | "ar-EG" | "zh-CN" | "zh-TW";
export const LOCALES: Locale[] = ["en-US", "de-DE", "fr-FR", "da-DK", "cs-CZ", "ar-EG", "zh-CN", "zh-TW"];
type Eight<T> = [T, T, T, T, T, T, T, T];

// ── the sample's own values ─────────────────────────────────────────────────

/** The product the stock shortcuts open: the Basalt Rain Shell, the one with a hole in its grid. */
export const SHELL = "basalt-shell";

const shell = WORLD.PRODUCTS.find((p) => p.id === SHELL)!;
const colourOf = (code: string): string => (WORLD.COLOURS as Record<string, { label: string }>)[code]?.label ?? code;
const sizeOf = (code: string): string => shell.options.find((o) => o.key === "size")?.values.find((v) => v.id === code)?.label ?? code;

/** A variant of the shell as the sample has it at the clock: in stock, low (and how many are left), sold out, or not made. */
export function shellWord(colour: string, size: string): { colour: string; size: string; state: "in" | "low" | "out" | "none"; left: number | null; sku: string | null } {
  const v = WORLD.VARIANTS.find((x) => x.product === SHELL && x.colour === colour && x.size === size);
  if (v === undefined) return { colour: colourOf(colour), size: sizeOf(size), state: "none", left: null, sku: null };
  const state = v.available <= 0 ? "out" : v.available < WORLD.SHOP.showLeftBelow ? "low" : "in";
  return { colour: colourOf(colour), size: sizeOf(size), state, left: state === "low" ? v.available : null, sku: v.sku };
}

/** The code for packs and bags (TRAIL15), as Offers keeps it. */
export const PACK_CODE = Object.entries(WORLD.CODES).find(([, c]) => c.on === "packs")![0];
/** Priya's shipped order (NL-1053): the one "Find your order" and "Priya's shipped order" open. */
export const PRIYA = WORLD.CUSTOMERS.find((c) => c.id === WORLD.SHOPPER.customer)!;
export const PRIYA_SHIPPED = WORLD.ORDERS.find((o) => o.customer === PRIYA.id && o.state === "shipped")!.number;
/** Marcus's paid order (NL-1065), not yet packed, so it may still be cancelled: opened by its own link. */
export const MARCUS = WORLD.CUSTOMERS.find((c) => c.name.startsWith("Marcus"))!;
export const MARCUS_PAID = WORLD.ORDERS.find((o) => o.customer === MARCUS.id && o.state === "paid")!.number;

/** The three variants the product's shortcuts choose: low, sold out, and the hole in the grid. */
export const SHELL_PICKS = { low: ["ember", "m"], out: ["slate", "xl"], none: ["ember", "xs"] } as const;

// ── the card's words ────────────────────────────────────────────────────────

/** Each label in the eight languages, in the order of `LOCALES`. */
const WORDS: Record<string, Eight<string>> = {
  "screen.home": ["Home", "Start", "Accueil", "Forside", "Domů", "الرئيسية", "首页", "首頁"],
  "screen.shop": ["Shop", "Shop", "Boutique", "Butik", "Obchod", "المتجر", "商店", "商店"],
  "screen.product": ["Product", "Produkt", "Produit", "Produkt", "Produkt", "المنتج", "商品", "商品"],
  "screen.basket": ["Basket", "Warenkorb", "Panier", "Kurv", "Košík", "السلة", "购物篮", "購物籃"],
  "screen.checkout": ["Checkout", "Kasse", "Commande", "Kassen", "Pokladna", "إتمام الطلب", "结账", "結帳"],
  "screen.paying": ["Paying", "Bezahlen", "Paiement", "Betaling", "Platba", "الدفع", "付款", "付款"],
  "screen.confirmation": ["Confirmation", "Bestätigung", "Confirmation", "Bekræftelse", "Potvrzení", "التأكيد", "确认", "確認"],
  "screen.order": ["Your order", "Deine Bestellung", "Votre commande", "Din ordre", "Vaše objednávka", "طلبك", "你的订单", "你的訂單"],
  "screen.find": ["Find your order", "Bestellung finden", "Retrouver une commande", "Find din ordre", "Najít objednávku", "ابحث عن طلبك", "查找订单", "查詢訂單"],
  "screen.account": ["Your account", "Dein Konto", "Votre compte", "Din konto", "Váš účet", "حسابك", "你的账户", "你的帳戶"],
  "screen.sendback": ["Send back", "Zurücksenden", "Renvoyer", "Send retur", "Vrátit zboží", "الإرجاع", "退货", "退貨"],
  "screen.gift": ["Gift cards", "Geschenkkarten", "Cartes cadeaux", "Gavekort", "Dárkové karty", "بطاقات الهدايا", "礼品卡", "禮物卡"],
  "screen.help": ["Help", "Hilfe", "Aide", "Hjælp", "Nápověda", "المساعدة", "帮助", "說明"],
  "screen.404": ["404", "404", "404", "404", "404", "404", "404", "404"],

  "do.fill-basket": ["Fill Priya's basket", "Priyas Warenkorb füllen", "Remplir le panier de Priya", "Fyld Priyas kurv", "Naplnit košík pro Priyu", "املأ سلة Priya", "填入 Priya 的购物篮", "填入 Priya 的購物籃"],
  "do.one-fleece": ["One fleece — not free shipping yet", "Ein Fleece — noch kein Gratisversand", "Une polaire — livraison pas encore offerte", "Én fleece — endnu ikke gratis fragt", "Jedna mikina — zatím bez dopravy zdarma", "سترة صوف واحدة — الشحن ليس مجانيًا بعد", "一件抓绒衣 — 还不能免运费", "一件刷毛衣 — 還不能免運費"],
  "do.fill-details": ["Fill Priya's details", "Priyas Angaben eintragen", "Remplir les coordonnées de Priya", "Udfyld Priyas oplysninger", "Vyplnit údaje Priyi", "املأ بيانات Priya", "填入 Priya 的信息", "填入 Priya 的資料"],
  "do.ship-wa": ["Ship to Washington", "Nach Washington senden", "Livrer dans l'État de Washington", "Send til Washington", "Doručit do státu Washington", "الشحن إلى واشنطن", "寄往华盛顿州", "寄往華盛頓州"],
  "do.price-up": ["A price goes up", "Ein Preis steigt", "Un prix augmente", "En pris stiger", "Cena se zvýší", "يرتفع أحد الأسعار", "某件商品涨价", "某件商品漲價"],
  "do.sells-out": ["It sells out while you pay", "Ausverkauft beim Bezahlen", "Épuisé pendant le paiement", "Bliver udsolgt under betalingen", "Vyprodá se během platby", "تنفد الكمية أثناء الدفع", "付款时商品售罄", "付款時商品售完"],
  "do.paid": ["Paid", "Bezahlt", "Payé", "Betalt", "Zaplaceno", "تم الدفع", "已付款", "已付款"],
  "do.bank": ["Bank is confirming", "Die Bank bestätigt noch", "La banque confirme", "Banken bekræfter", "Banka platbu potvrzuje", "البنك يؤكد الدفع", "银行正在确认", "銀行正在確認"],
  "do.didnt": ["Didn't finish", "Nicht abgeschlossen", "Paiement non terminé", "Ikke gennemført", "Platba nebyla dokončena", "لم يكتمل الدفع", "付款未完成", "付款未完成"],
  "do.priya-shipped": ["Priya's shipped order", "Priyas versandte Bestellung", "La commande expédiée de Priya", "Priyas afsendte ordre", "Odeslaná objednávka Priyi", "طلب Priya المشحون", "Priya 已发货的订单", "Priya 已出貨的訂單"],
  "do.marcus-cancel": ["Marcus's order — cancel it", "Marcus' Bestellung — stornieren", "La commande de Marcus — l'annuler", "Marcus' ordre — annullér den", "Objednávka Marcuse — zrušit", "طلب Marcus — ألغِه", "Marcus 的订单 — 取消", "Marcus 的訂單 — 取消"],
  "do.fill-code": ["Fill the code", "Code eintragen", "Saisir le code", "Udfyld koden", "Vyplnit kód", "املأ الرمز", "填入验证码", "填入驗證碼"],
  "do.return-back": ["A return comes back", "Eine Rücksendung kommt an", "Un retour arrive", "En returnering kommer tilbage", "Přijde vratka", "يصل مرتجع", "退货寄回", "退貨寄回"],
  "do.dhl": ["Hand over to DHL", "An DHL übergeben", "Remettre à DHL", "Overdrag til DHL", "Předat DHL", "التسليم إلى DHL", "交给 DHL", "交給 DHL"],

  "persona.shopper": ["Shopper", "Kundschaft", "Client", "Kunde", "Zákazník", "المتسوق", "顾客", "顧客"],
  "persona.desk": ["Shop desk", "Shop-Team", "Équipe", "Butikken", "Obchod", "مكتب المتجر", "店铺后台", "商店後台"],
  "clock.day": ["+1 business day", "+1 Werktag", "+1 jour ouvré", "+1 hverdag", "+1 pracovní den", "+1 يوم عمل", "+1 个工作日", "+1 個工作天"],
  "clock.reset": ["Back to Tuesday morning", "Zurück zum Dienstagmorgen", "Retour à mardi matin", "Tilbage til tirsdag morgen", "Zpět na úterní ráno", "العودة إلى صباح الثلاثاء", "回到星期二上午", "回到星期二上午"],
};

/** The shortcuts whose words carry the sample's own values: a phrase each language fills. */
const PHRASES: Record<string, Eight<(v: Record<string, string>) => string>> = {
  // "Ember, M — only 3 left"
  "do.shell-low": [
    (v) => `${v["c"]!}, ${v["s"]!} — only ${v["n"]!} left`,
    (v) => `${v["c"]!}, ${v["s"]!} — nur noch ${v["n"]!} da`,
    (v) => `${v["c"]!}, ${v["s"]!} — plus que ${v["n"]!} en stock`,
    (v) => `${v["c"]!}, ${v["s"]!} — kun ${v["n"]!} tilbage`,
    (v) => `${v["c"]!}, ${v["s"]!} — zbývají jen ${v["n"]!} ks`,
    (v) => `${v["c"]!}، ${v["s"]!} — بقي ${v["n"]!} فقط`,
    (v) => `${v["c"]!}，${v["s"]!} — 仅剩 ${v["n"]!} 件`,
    (v) => `${v["c"]!}，${v["s"]!} — 僅剩 ${v["n"]!} 件`,
  ],
  "do.shell-out": [
    (v) => `${v["c"]!}, ${v["s"]!} — sold out`,
    (v) => `${v["c"]!}, ${v["s"]!} — ausverkauft`,
    (v) => `${v["c"]!}, ${v["s"]!} — épuisé`,
    (v) => `${v["c"]!}, ${v["s"]!} — udsolgt`,
    (v) => `${v["c"]!}, ${v["s"]!} — vyprodáno`,
    (v) => `${v["c"]!}، ${v["s"]!} — نفدت الكمية`,
    (v) => `${v["c"]!}，${v["s"]!} — 已售罄`,
    (v) => `${v["c"]!}，${v["s"]!} — 已售完`,
  ],
  "do.shell-none": [
    (v) => `${v["c"]!}, ${v["s"]!} — not made`,
    (v) => `${v["c"]!}, ${v["s"]!} — gibt es nicht`,
    (v) => `${v["c"]!}, ${v["s"]!} — non fabriqué`,
    (v) => `${v["c"]!}, ${v["s"]!} — laves ikke`,
    (v) => `${v["c"]!}, ${v["s"]!} — nevyrábí se`,
    (v) => `${v["c"]!}، ${v["s"]!} — غير متوفر بهذا المقاس`,
    (v) => `${v["c"]!}，${v["s"]!} — 不生产`,
    (v) => `${v["c"]!}，${v["s"]!} — 未生產`,
  ],
  "do.try-code": [
    (v) => `Try ${v["code"]!}`,
    (v) => `${v["code"]!} ausprobieren`,
    (v) => `Essayer ${v["code"]!}`,
    (v) => `Prøv ${v["code"]!}`,
    (v) => `Zkusit ${v["code"]!}`,
    (v) => `جرّب ${v["code"]!}`,
    (v) => `试用 ${v["code"]!}`,
    (v) => `試用 ${v["code"]!}`,
  ],
  "do.fill-find": [
    (v) => `Fill ${v["number"]!} and Priya's e-mail`,
    (v) => `${v["number"]!} und Priyas E-Mail eintragen`,
    (v) => `Saisir ${v["number"]!} et l'e-mail de Priya`,
    (v) => `Udfyld ${v["number"]!} og Priyas e-mail`,
    (v) => `Vyplnit ${v["number"]!} a e-mail Priyi`,
    (v) => `املأ ${v["number"]!} وبريد Priya`,
    (v) => `填入 ${v["number"]!} 和 Priya 的邮箱`,
    (v) => `填入 ${v["number"]!} 和 Priya 的電子郵件`,
  ],
  "do.count-back": [
    (v) => `Count the ${v["c"]!} ${v["s"]!} back in`,
    (v) => `${v["c"]!} ${v["s"]!} wieder einbuchen`,
    (v) => `Remettre ${v["c"]!} ${v["s"]!} en stock`,
    (v) => `Læg ${v["c"]!} ${v["s"]!} på lager igen`,
    (v) => `Naskladnit ${v["c"]!} ${v["s"]!} zpět`,
    (v) => `أعد ${v["c"]!} ${v["s"]!} إلى المخزون`,
    (v) => `将 ${v["c"]!} ${v["s"]!} 重新入库`,
    (v) => `將 ${v["c"]!} ${v["s"]!} 重新入庫`,
  ],
};

/** The values each phrase is filled with, from the sample world. */
function phraseValues(): Record<string, Record<string, string>> {
  const low = shellWord(...SHELL_PICKS.low);
  const out = shellWord(...SHELL_PICKS.out);
  const none = shellWord(...SHELL_PICKS.none);
  return {
    "do.shell-low": { c: low.colour, s: low.size, n: String(low.left ?? "") },
    "do.shell-out": { c: out.colour, s: out.size },
    "do.shell-none": { c: none.colour, s: none.size },
    "do.try-code": { code: PACK_CODE },
    "do.fill-find": { number: PRIYA_SHIPPED },
    "do.count-back": { c: out.colour, s: out.size },
  };
}

/** The desk's own section names the card borrows, by the app's keys. */
const APP_KEYS = ["desk.nav.today", "desk.nav.orders", "desk.nav.packing", "desk.nav.returns", "desk.nav.products", "desk.nav.reviews", "desk.nav.customers", "desk.nav.settings"] as const;

export const CARD_MESSAGES: Record<Locale, Record<string, string>> = Object.fromEntries(
  LOCALES.map((locale, i) => {
    const values = phraseValues();
    return [
      locale,
      {
        ...Object.fromEntries(APP_KEYS.map((key) => [key, MESSAGES[locale][key] ?? ""])),
        ...Object.fromEntries(Object.entries(WORDS).map(([key, words]) => [key, words[i]!])),
        ...Object.fromEntries(Object.entries(PHRASES).map(([key, fill]) => [key, fill[i]!(values[key] ?? {})])),
      },
    ];
  }),
) as Record<Locale, Record<string, string>>;

/** A card string in the page's language. */
export function cardWord(locale: string, key: string): string {
  return CARD_MESSAGES[(LOCALES as string[]).includes(locale) ? (locale as Locale) : "en-US"][key] ?? key;
}

// ── the declaration ─────────────────────────────────────────────────────────

type Screen = DemoEmitOptions["screens"][number];
type Shortcut = [id: string, icon: string, labelKey?: string];
const shortcutsOf = (list: Shortcut[] | undefined) => (list === undefined ? {} : { shortcuts: list.map(([id, icon, labelKey]) => ({ id, icon, labelKey: labelKey ?? `do.${id}` })) });
const shopper = (id: string, view: string, icon: string, shortcuts?: Shortcut[]): Screen => ({ id, view, icon, side: "customer", persona: "shopper", labelKey: `screen.${id}`, ...shortcutsOf(shortcuts) });
const desk = (id: string, icon: string, shortcuts?: Shortcut[]): Screen => ({ id, view: `desk:${id}`, icon, side: "staff", persona: "desk", labelKey: `desk.nav.${id}`, ...shortcutsOf(shortcuts) });

/** The card's declaration; `messages` is added where it is emitted. */
export const DEMO_CARD: Omit<DemoEmitOptions, "messages"> = {
  appKey: "ecommerce-shop",
  dir: "ecommerce-storefront",
  frames: ["desktop", "phone"],
  personas: [
    { id: "shopper", icon: "shopping-bag", labelKey: "persona.shopper" },
    { id: "desk", icon: "store", labelKey: "persona.desk" },
  ],
  screens: [
    shopper("home", "home", "house"),
    shopper("shop", "shop", "store"),
    shopper("product", "product", "shirt", [
      ["shell-low", "shirt"],
      ["shell-out", "bell"],
      ["shell-none", "ban"],
    ]),
    shopper("basket", "basket", "shopping-basket", [
      ["fill-basket", "wand-sparkles"],
      ["one-fleece", "truck"],
      ["try-code", "ticket"],
    ]),
    shopper("checkout", "checkout", "clipboard-check", [
      ["fill-details", "wand-sparkles"],
      ["ship-wa", "map-pin"],
      ["price-up", "trending-up"],
      ["sells-out", "package-x"],
    ]),
    shopper("paying", "checkout", "credit-card", [
      ["paid", "check"],
      ["bank", "hourglass"],
      ["didnt", "circle-x"],
    ]),
    shopper("confirmation", "checkout", "party-popper"),
    shopper("order", "order", "package-search", [
      ["priya-shipped", "truck"],
      ["marcus-cancel", "ban"],
    ]),
    shopper("find", "find", "search", [
      ["fill-find", "wand-sparkles"],
      ["fill-code", "key-round"],
    ]),
    shopper("account", "account", "user"),
    shopper("sendback", "orderReturn", "undo-2"),
    shopper("gift", "giftCards", "gift"),
    shopper("help", "helpShipping", "life-buoy"),
    shopper("404", "missing", "file-x"),
    desk("today", "sun", [
      ["return-back", "undo-2"],
      ["dhl", "package-check"],
    ]),
    desk("orders", "receipt-text"),
    desk("packing", "package"),
    desk("returns", "undo-2"),
    desk("products", "boxes", [["count-back", "plus"]]),
    desk("reviews", "star"),
    desk("customers", "users"),
    desk("settings", "settings"),
  ],
  clock: { advance: [{ id: "day", labelKey: "clock.day" }], reset: { labelKey: "clock.reset" } },
};
