/**
 * Northline's sample, as Adminium would hold it once added: the two bundles
 * an operator adds (`seeds/ecommerce-shop.sample.json`, then Inventory's rows
 * in `seeds/ecommerce-shop.inventory.sample.json`), every row given a key,
 * every `@ref` the key of the row it names, every `@day`/`@time` the date or
 * instant it means at the demo's moment.
 *
 * Both bundles are written from `src/sample/northline.ts`, which reads every
 * figure from `northline-data.json`; the demo reads the bundles rather than
 * that module, which reads its file from disk and so cannot run in a page.
 *
 * The sample is written for a Tuesday (`weekAnchor`), and the demo's clock
 * stands on that Tuesday, so a `@week` day counts from it exactly. A wall
 * time is the shop's own (America/Los_Angeles), turned into the instant it is.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import SHOP_BUNDLE from "../../seeds/ecommerce-shop.sample.json";
import STOCK_BUNDLE from "../../seeds/ecommerce-shop.inventory.sample.json";

import { addDays, momentOf } from "../desk/time.ts";

export type Row = Record<string, unknown> & { id: number };
export type Tables = Record<string, Row[]>;

interface BundleTable {
  ref: string;
  rows: Record<string, unknown>[];
}
interface Bundle {
  tables: BundleTable[];
}

/** The demo's day and moment: Tuesday 18 August 2026, 11:40 in Portland (the comps' clock). */
export const DEMO_DAY = "2026-08-18";
export const DEMO_TIME = "11:40";
export const DEMO_ZONE = "America/Los_Angeles";
export const DEMO_START = Date.parse("2026-08-18T18:40:00.000Z");

/** Inventory's tables, kept apart from the shop's own under this prefix. */
export const STOCK = "inventory.";

/** The shop's own name for a table of its own, as an Inventory link names it. */
export const realTable = (ref: string): string => `ecommerce_shop_${ref}`;

/** A wall time on a day in the shop's zone, as the instant it is. */
export function instantOf(day: string, time: string): string {
  return String(momentOf(`${day} ${time}`, DEMO_ZONE));
}

function resolveValue(value: unknown, labels: ReadonlyMap<string, number>, start: number, day: string): unknown {
  if (Array.isArray(value)) return value.map((v) => resolveValue(v, labels, start, day));
  if (typeof value !== "object" || value === null) return value;
  const record = value as Record<string, unknown>;
  if (typeof record["@ref"] === "string") {
    const id = labels.get(record["@ref"]);
    if (id === undefined) throw new Error(`the sample names "${record["@ref"]}" before any row is labelled so`);
    return id;
  }
  if (typeof record["@table"] === "string") return realTable(record["@table"]);
  // So long before the demo's moment (`PT1H20M`), or so long after it (`@in`).
  for (const [key, sign] of [["@ago", -1], ["@in", 1]] as const) {
    if (typeof record[key] !== "string") continue;
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(record[key]);
    if (m === null) throw new Error(`the sample's "${key}" ${record[key]} is not hours and minutes`);
    return new Date(start + sign * (Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) * 60_000).toISOString();
  }
  if (typeof record["@day"] === "number") {
    const on = addDays(day, record["@day"]);
    return typeof record["@time"] === "string" ? instantOf(on, record["@time"]) : on;
  }
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, resolveValue(v, labels, start, day)]));
}

/**
 * Every table of both bundles, its rows keyed from 1 in the order they are
 * added; Inventory's tables under `inventory.`. A row's `@label` is kept as
 * `_label`, so the demo can find "order:NL-1053" again without a number.
 */
export function sampleTables(start = DEMO_START, day = DEMO_DAY): Tables {
  const labels = new Map<string, number>();
  const tables: Tables = {};
  const bundles: [Bundle, string][] = [
    [SHOP_BUNDLE as unknown as Bundle, ""],
    [STOCK_BUNDLE as unknown as Bundle, STOCK],
  ];
  for (const [bundle, prefix] of bundles) {
    for (const table of bundle.tables) {
      const rows = (tables[`${prefix}${table.ref}`] ??= []);
      for (const raw of table.rows) {
        const id = rows.length + 1;
        const row: Row = { id };
        for (const [key, value] of Object.entries(raw)) {
          if (key === "@label") continue;
          row[key] = resolveValue(value, labels, start, day);
        }
        if (typeof raw["@label"] === "string") {
          labels.set(raw["@label"], id);
          row["_label"] = raw["@label"];
        }
        rows.push(row);
      }
    }
  }
  return tables;
}
