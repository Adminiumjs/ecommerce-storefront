/**
 * The Overview page's layout: the shop at a glance, drawn by Adminium's own
 * widgets from the app's tables. Nothing on it is typed in — every figure is
 * a stored row, counted or summed where Adminium runs the query, on the
 * shop's clock.
 *
 * Read top to bottom:
 *   - the last 4 weeks' sales, what is to ship today, the returns still open,
 *     what was refunded;
 *   - what needs a person: orders waiting for their payment, returns to
 *     decide or to refund;
 *   - sales week by week, and the best sellers by units;
 *   - the codes used, the gift cards sold.
 *
 * What the words mean, once:
 *   - "sales" are the goods after reductions (`net`) of every order paid,
 *     packed or shipped, placed in the last 28 days; never shipping, never
 *     tax, never a gift card sold (the shop owes that money to the card's
 *     holder: it is no sale until it is spent);
 *   - "the last 4 weeks" are the 28 days up to now;
 *   - "to ship today" is a paid order of goods whose ships-by is today or
 *     earlier, not packed yet.
 *
 * A card's title, subtitle and empty words are written in every language the
 * app speaks; money is shown in the connection's currency. The packer never
 * sees this page (they hold no console page).
 */
import { l, titles as others } from "./labels.ts";

type Json = Record<string, unknown>;

const query = (table: string, rest: Json): Json => ({ kind: "table-query", source: { name: table, type: "table" }, ...rest });
const metric = (table: string, aggregation: Json, rest: Json): Json => query(table, { shape: "metric+delta", aggregations: [aggregation], ...rest });
const list = (table: string, rest: Json): Json => query(table, { shape: "record-list", ...rest });

const count = (alias: string): Json => ({ fn: "count", alias });
const sum = (column: string, alias: string): Json => ({ fn: "sum", column, alias });
const eq = (column: string, value: unknown): Json => ({ column, op: "eq", value });
const oneOf = (column: string, value: string[]): Json => ({ column, op: "in", value });
const day = (column: string, op: string, when: string): Json => ({ column, op, day: when });

/** The 28 days up to now. */
const fourWeeks = (column: string): Json => ({ column, last: 28, unit: "day" });

const COUNT = { metricFormat: "plain", deltaMode: "none", showSparkline: false };
const MONEY = { metricFormat: "currency", deltaMode: "none", showSparkline: false };

/** An order that is a sale: paid, and never a gift card's alone (those are `sent`). */
const SOLD = ["paid", "packed", "shipped"];
const OPEN_RETURNS = ["asked", "approved", "received"];

const page = (ref: string, ...filters: string[]) => `/p/${ref}${filters.length === 0 ? "" : `?${filters.join("&")}`}`;
const FOUR_WEEKS_LINK = "f.placed_at=gte:today-27";

type Place = [x: number, y: number, w: number, h: number];

interface Words {
  subtitle?: string;
  empty?: string;
}

function card(i: string, widget: string, [x, y, w, h]: Place, en: string, config: Json, words: Words = {}): Json {
  return {
    i,
    widget,
    x,
    y,
    w,
    h,
    config: {
      title: en,
      titles: l(en),
      ...(words.subtitle === undefined ? {} : { subtitle: words.subtitle, subtitles: others(words.subtitle) }),
      ...(words.empty === undefined ? {} : { emptyState: { titleKey: words.empty, titles: others(words.empty) } }),
      ...config,
    },
  };
}

export const OVERVIEW_LAYOUT = {
  version: 1,
  toolbar: {
    link: { label: "Open the desk", labels: others("Open the desk"), href: "@staff", icon: "external-link" },
  },
  items: [
    // ── the four figures ─────────────────────────────────────────────────────
    card("sales", "kpi-stat-card", [0, 0, 3, 3], "Sales, last 4 weeks", {
      ...MONEY,
      iconName: "banknote",
      href: page("ecommerce-orders", FOUR_WEEKS_LINK, `f.status=in:${SOLD.join(",")}`),
      binding: metric("orders", sum("net", "sales"), { filters: [oneOf("status", SOLD)], window: fourWeeks("placed_at") }),
    }),
    card("to-ship", "kpi-stat-card", [3, 0, 3, 3], "To ship today", {
      ...COUNT,
      iconName: "package",
      href: page("ecommerce-orders", "f.status=eq:paid", "f.kind=eq:goods", "f.ships_by=lte:today"),
      binding: metric("orders", count("orders"), { filters: [eq("status", "paid"), eq("kind", "goods"), day("ships_by", "lte", "today")] }),
    }),
    card("returns-open", "kpi-stat-card", [6, 0, 3, 3], "Returns open", {
      ...COUNT,
      iconName: "undo-2",
      href: page("ecommerce-returns", `f.status=in:${OPEN_RETURNS.join(",")}`),
      binding: metric("returns", count("returns"), { filters: [oneOf("status", OPEN_RETURNS)] }),
    }),
    card("refunded", "kpi-stat-card", [9, 0, 3, 3], "Refunded, last 4 weeks", {
      ...MONEY,
      iconName: "rotate-ccw",
      iconTone: "warn",
      binding: metric("payment_refunds", sum("counted", "refunded"), { window: fourWeeks("made_at") }),
    }),

    // ── what needs a person ──────────────────────────────────────────────────
    card(
      "waiting-payment",
      "mini-table",
      [0, 3, 6, 6],
      "Waiting for payment",
      {
        limit: 4,
        columns: [
          { name: "number", label: "Order", format: "mono" },
          { name: "pay_by", label: "Cancels at", logicalType: "timestamptz" },
          { name: "total", label: "Total", logicalType: "decimal", semantic: "money" },
        ],
        viewAllHref: page("ecommerce-orders", "f.status=in:paying,awaiting_transfer"),
        binding: list("orders", {
          select: ["id", "number", "pay_by", "total", "status"],
          filters: [oneOf("status", ["paying", "awaiting_transfer"])],
          orderBy: [{ column: "placed_at", dir: "asc" }],
          limit: 4,
        }),
      },
      { subtitle: "Cancelled by themselves if the money never comes", empty: "Nothing waiting for a payment" },
    ),
    card(
      "returns-to-act",
      "mini-table",
      [6, 3, 6, 6],
      "Returns to act on",
      {
        limit: 4,
        columns: [
          { name: "number", label: "Return", format: "mono" },
          { name: "status", label: "Step", logicalType: "enum" },
          { name: "refund_amount", label: "Refund", logicalType: "decimal", semantic: "money" },
        ],
        secondary: ["order_number"],
        viewAllHref: page("ecommerce-returns", "f.status=in:asked,received"),
        binding: list("returns", {
          select: ["id", "number", "order_number", "status", "refund_amount"],
          filters: [oneOf("status", ["asked", "received"])],
          orderBy: [{ column: "asked_at", dir: "asc" }],
          limit: 4,
        }),
      },
      { subtitle: "To decide, or received and still to refund", empty: "No return needs you" },
    ),

    // ── week by week, and what sold ──────────────────────────────────────────
    card(
      "sales-by-week",
      "chart-bar",
      [0, 9, 8, 7],
      "Sales by week",
      {
        highlight: "current",
        series: [{ label: "Sales", labels: others("Sales") }],
        binding: query("orders", {
          shape: "timeseries",
          aggregations: [sum("net", "sales")],
          bucket: { column: "placed_at", unit: "week" },
          filters: [oneOf("status", SOLD)],
          window: fourWeeks("placed_at"),
        }),
      },
      { subtitle: "Goods after reductions, last 4 weeks", empty: "No sales in the last 4 weeks" },
    ),
    card(
      "best-sellers",
      "chart-ranking-bars",
      [8, 9, 4, 7],
      "Best sellers, last 4 weeks",
      {
        n: 5,
        metricFormat: "plain",
        href: page("ecommerce-products"),
        // Counted through each line's order: when it was placed, and only an order that is a sale. Ties go by name.
        binding: query("order_lines", {
          shape: "categorical",
          groupBy: ["product_id"],
          groupLabel: "product_id.name",
          aggregations: [sum("qty", "units")],
          filters: [{ column: "order_id.status", op: "in", value: SOLD }],
          window: fourWeeks("order_id.placed_at"),
          limit: 5,
        }),
      },
      { subtitle: "Units sold", empty: "Nothing sold in the last 4 weeks" },
    ),

    // ── codes and gift cards ─────────────────────────────────────────────────
    card(
      "codes-used",
      "chart-ranking-bars",
      [0, 16, 6, 6],
      "Codes used, last 4 weeks",
      {
        n: 5,
        metricFormat: "plain",
        binding: query("order_codes", {
          shape: "categorical",
          groupBy: ["typed"],
          aggregations: [count("orders")],
          filters: [{ column: "order_id.status", op: "in", value: [...SOLD, "sent"] }, { column: "removed_at", op: "is_null" }],
          window: fourWeeks("order_id.placed_at"),
          limit: 5,
        }),
      },
      { subtitle: "Orders that used each code", empty: "No codes used in the last 4 weeks" },
    ),
    card("gift-cards-sold", "kpi-stat-card", [6, 16, 6, 3], "Gift cards sold, last 4 weeks", {
      ...MONEY,
      iconName: "gift",
      subtitle: "Money the shop owes to the holders. Not counted in sales.",
      subtitles: others("Money the shop owes to the holders. Not counted in sales."),
      binding: metric("gift_lines", sum("amount", "sold"), { filters: [{ column: "order_id.status", op: "in", value: ["sent"] }], window: fourWeeks("order_id.placed_at") }),
    }),
  ],
};
