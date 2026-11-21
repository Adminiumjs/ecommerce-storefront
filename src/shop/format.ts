/**
 * Money, days and times as the shop shows them: formatting only. Every figure
 * comes from Adminium as it is (a price as decimal text, a ships-by as a day,
 * a moment as an instant); this file only writes it in the reader's language
 * and numerals, on the shop's own clock.
 */
import { formatTenantMoney, toTenantDay, toTenantMinutes } from "@adminiumjs/public-client";

/** The shop's English writes its days the way the designs do ("Tue 18 Aug"). */
const dateLocale = (locale: string) => (locale === "en-US" ? "en-GB" : locale);

/** A decimal from the server ("189.00", or 189), in the shop's currency, to the cent. */
export function money(value: unknown, currency: string | null, locale: string): string {
  if (value === null || value === undefined || value === "") return "";
  return formatTenantMoney(String(value), currency ?? "USD", locale);
}

/** Money taken off ("−$32.85"), or nothing when nothing is. */
export function minus(value: unknown, currency: string | null, locale: string): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return "";
  return `−${money(String(value).replace(/^-/, ""), currency, locale)}`;
}

/** True when Adminium's figure is zero (free shipping, nothing off). */
export const isZero = (value: unknown): boolean => value === null || value === undefined || value === "" || Number(value) === 0;

/** A whole number in the reader's numerals. */
export function count(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** A tax rate the shop set ("6.5"), as "6.5%". */
export function percent(value: unknown, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 3 }).format(Number(value ?? 0) / 100);
}

function asDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match === null ? null : new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** The shop's own day of an instant, or the day itself when it is one already. */
export function shopDay(value: unknown, timezone: string): string | null {
  if (typeof value !== "string" || value === "") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  try {
    return toTenantDay(value, timezone);
  } catch {
    return value.slice(0, 10);
  }
}

/** "Tue 18 Aug". */
export function dayShort(day: unknown, locale: string): string {
  const date = typeof day === "string" ? asDate(day) : null;
  return date === null ? "" : new Intl.DateTimeFormat(dateLocale(locale), { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(date);
}

/** "Tuesday 18 August". */
export function dayLong(day: unknown, locale: string): string {
  const date = typeof day === "string" ? asDate(day) : null;
  return date === null ? "" : new Intl.DateTimeFormat(dateLocale(locale), { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(date);
}

/** Two days as one window: "Fri 21 – Tue 25 Aug", or one day when they are the same. */
export function dayRange(from: unknown, to: unknown, locale: string): string {
  const a = typeof from === "string" ? asDate(from) : null;
  const b = typeof to === "string" ? asDate(to) : null;
  if (a === null) return b === null ? "" : dayShort(to, locale);
  if (b === null || a.getTime() === b.getTime()) return dayShort(from, locale);
  const f = new Intl.DateTimeFormat(dateLocale(locale), { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
  try {
    return f.formatRange(a, b);
  } catch {
    return `${f.format(a)} – ${f.format(b)}`;
  }
}

/** The time of an instant on the shop's clock ("12:01"). */
export function shopTime(value: unknown, timezone: string, locale: string): string {
  if (typeof value !== "string" || value === "") return "";
  let minutes: number;
  try {
    minutes = toTenantMinutes(value, timezone);
  } catch {
    return "";
  }
  return new Intl.DateTimeFormat(dateLocale(locale), { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 1, Math.floor(minutes / 60), minutes % 60)));
}

/** "Fri 14 Aug · 19:07": a moment on the shop's clock. */
export function shopMoment(value: unknown, timezone: string, locale: string): string {
  const day = shopDay(value, timezone);
  return day === null ? "" : `${dayShort(day, locale)} · ${shopTime(value, timezone, locale)}`;
}

/** A gift card's or an order's code shown by its last four characters. */
export const last4 = (code: string): string => code.trim().slice(-4).toUpperCase();
