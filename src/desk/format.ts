/**
 * How the desk writes money, days and times: in the reader's language, on
 * the shop's clock (the connection's zone, never the device's), money to the
 * cent in the shop's currency. Every value is one Adminium stored; this only
 * spells it.
 */
import { useMemo } from "react";

import { useI18n } from "../i18n/index.tsx";
import { useEnv } from "./env.tsx";
import { num, text } from "./wire.ts";

export interface Fmt {
  /** Money to the cent; "" for no value. */
  money(value: unknown): string;
  /** A day (`YYYY-MM-DD`, or a moment's day on the shop's clock) with its weekday: "Tue 18 Aug". */
  day(value: unknown): string;
  /** A moment on the shop's clock: "Tue 18 Aug 10:06". */
  dayTime(value: unknown): string;
  /** A moment's time on the shop's clock: "10:06". */
  time(value: unknown): string;
  /** A percentage as stored (6.5 → "6.5%"). */
  pct(value: unknown): string;
  number(value: number): string;
  /** Grams: "380 g". */
  grams(value: unknown): string;
}

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function makeFmt(locale: string, zone: string, currency: string): Fmt {
  const moneyF = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dayF = (timeZone: string) => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone });
  const timeF = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone });
  const pctF = new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 3 });
  const numF = new Intl.NumberFormat(locale);
  const spellDay = (date: Date, timeZone: string): string => {
    const f = dayF(timeZone);
    // English as the shop writes it, weekday first then day then month ("Tue 18 Aug"); other languages their own way.
    if (!locale.startsWith("en")) return f.format(date);
    const parts = f.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("weekday")} ${get("day")} ${get("month")}`;
  };
  const instant = (value: unknown): Date | null => {
    const t = text(value);
    if (t === null) return null;
    const at = Date.parse(t);
    return Number.isNaN(at) ? null : new Date(at);
  };
  return {
    money: (value) => {
      const n = num(value);
      return n === null ? "" : moneyF.format(n);
    },
    day: (value) => {
      const t = text(value);
      if (t === null) return "";
      if (DAY_ONLY.test(t)) return spellDay(new Date(`${t}T12:00:00Z`), "UTC");
      const at = instant(t);
      return at === null ? t : spellDay(at, zone);
    },
    dayTime: (value) => {
      const at = instant(value);
      return at === null ? "" : `${spellDay(at, zone)} ${timeF.format(at)}`;
    },
    time: (value) => {
      const at = instant(value);
      return at === null ? "" : timeF.format(at);
    },
    pct: (value) => {
      const n = num(value);
      return n === null ? "" : pctF.format(n / 100);
    },
    number: (value) => numF.format(value),
    grams: (value) => {
      const n = num(value);
      return n === null ? "" : `${numF.format(n)} g`;
    },
  };
}

export function useFmt(): Fmt {
  const { locale } = useI18n();
  const { door } = useEnv();
  const facts = door.facts();
  return useMemo(() => makeFmt(locale, facts.zone, facts.currency), [locale, facts.zone, facts.currency]);
}
