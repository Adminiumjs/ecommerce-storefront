/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/engine/flow.ts — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * THE RULES OF THE REAL BOOKING FLOW, with no React in them (T12a).
 *
 * Everything here is a pure answer about what the engine said: which booking
 * holds a parcel, whether a service keeps what the customer paid for, whether a
 * typed weight is a number at all. The screens only draw the answers, so the
 * rules that decide whether a second paid label is one press away can be read
 * and tested on their own.
 *
 * There is no clock in this file and none may be added. The time a person may
 * release an unanswered purchase is judged from the server's own stamps.
 */

import type { DispatchPayload } from "../../../host/index.ts";
import type { CarrierRefusal } from "../../../host/contracts/index.ts";
import type { EngineBooking, EngineMode, EngineQuote } from "../../../host/engine-carrier.ts";

export type EngineRate = EngineQuote["rates"][number];

/** What the customer paid for, in the shop's own words. */
export type CustomerSpeed = NonNullable<DispatchPayload["order"]["deliveryPromise"]>;

/** The engine's own limits on a parcel: a figure past them is refused there, so it is refused here first. */
export const MAX_WEIGHT_KG = 1000;
export const MAX_SIDE_CM = 400;
export const MAX_PARCELS = 99;
const CONTENTS_WIDTH = 200;

// ── what a person typed ─────────────────────────────────────────────────────

export function decimalMarkOf(locale: string): string {
  return new Intl.NumberFormat(locale).formatToParts(1.5).find((part) => part.type === "decimal")?.value ?? ".";
}

/**
 * A figure typed in the reader's own digits, or null. Nothing is guessed: the
 * lenient reader the demo uses turns "3kg" into 3 and "0,5" into 0, and a wrong
 * weight is what a carrier later charges extra for.
 *
 * Where the decimal mark is a comma, a point is refused: "1.500" there means
 * fifteen hundred to the person typing it.
 */
export function readFigure(text: string, mark: string): number | null {
  const folded = text.trim().replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.codePointAt(0)!;
    return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
  });
  if (mark === "," && folded.includes(".")) return null;
  const pointed = mark === "." ? folded : folded.replace(mark, ".");
  return /^\d+(\.\d+)?$/.test(pointed) ? Number(pointed) : null;
}

export type FigureFault = "format" | "range";

export function readWeight(text: string, mark: string): { ok: true; weightKg: number } | { ok: false; fault: FigureFault } {
  const value = readFigure(text, mark);
  if (value === null) return { ok: false, fault: "format" };
  if (value <= 0 || value > MAX_WEIGHT_KG) return { ok: false, fault: "range" };
  return { ok: true, weightKg: value };
}

export function readSize(
  text: string,
  mark: string,
): { ok: true; lengthCm: number; widthCm: number; heightCm: number } | { ok: false; fault: FigureFault } {
  const parts = text.split(/[×xX*]/).map((part) => readFigure(part, mark));
  if (parts.length !== 3 || parts.some((part) => part === null)) return { ok: false, fault: "format" };
  const [lengthCm, widthCm, heightCm] = parts as [number, number, number];
  if ([lengthCm, widthCm, heightCm].some((side) => side <= 0 || side > MAX_SIDE_CM)) return { ok: false, fault: "range" };
  return { ok: true, lengthCm, widthCm, heightCm };
}

/** The contents line as the engine accepts it, never empty. */
export function contentsFor(line: string, reference: string): string {
  const trimmed = line.trim();
  return [...(trimmed === "" ? reference : trimmed)].slice(0, CONTENTS_WIDTH).join("");
}

// ── does this service keep what the customer paid for? ──────────────────────

export type SpeedFit = "keeps" | "slower" | "untracked" | "unstated";

/**
 * Speed AND tracking (S2-F22). Null when the order states nothing to keep.
 * "Unstated" is never read as "keeps": a service that says nothing about its
 * speed cannot be said to meet one.
 */
export function speedFit(
  rate: Pick<EngineRate, "estimatedDays" | "tracked">,
  speed: CustomerSpeed | undefined,
): SpeedFit | null {
  if (speed === undefined) return null;
  const days = rate.estimatedDays;
  if (days !== undefined && speed.maxDays !== undefined && days > speed.maxDays) return "slower";
  if (speed.tracked === true && rate.tracked === false) return "untracked";
  if (days === undefined) return "unstated";
  if (speed.tracked === true && rate.tracked === undefined) return "unstated";
  return "keeps";
}

/** A service that may lose what the customer paid for is chosen on purpose, never by one press (S2-F6). */
export const needsConfirm = (fit: SpeedFit | null): boolean => fit !== null && fit !== "keeps";

/**
 * The service to start on. Never one above the limit and never one that needs a
 * deliberate confirm: a default is a choice nobody made.
 */
export function firstPick(rates: readonly EngineRate[], speed: CustomerSpeed | undefined, chosenCode: string | null): string | null {
  const usable = rates.filter((rate) => rate.withinLimit && !needsConfirm(speedFit(rate, speed)));
  const wanted = chosenCode === null ? undefined : usable.find((rate) => rate.code === chosenCode);
  return (wanted ?? usable[0])?.rateId ?? null;
}

/** Whether the whole panel belongs to the owner (S13): every service, or every one that keeps the customer's. */
export function ownerBooksAll(rates: readonly EngineRate[], speed: CustomerSpeed | undefined): "all" | "keepers" | null {
  if (rates.length === 0) return null;
  if (rates.every((rate) => !rate.withinLimit)) return "all";
  if (speed === undefined) return null;
  const keepers = rates.filter((rate) => speedFit(rate, speed) === "keeps");
  return keepers.length > 0 && keepers.every((rate) => !rate.withinLimit) ? "keepers" : null;
}

// ── which booking holds a parcel ────────────────────────────────────────────

const HOLDS: ReadonlySet<EngineBooking["state"]> = new Set(["reserved", "calling", "unknown", "booked", "voiding"]);

/** This order's outbound bookings under the key in use. A test label has no bearing on a live parcel. */
export function outboundIn(list: readonly EngineBooking[], mode: EngineMode): EngineBooking[] {
  return list.filter((one) => one.purpose === "outbound" && one.test === (mode === "test"));
}

const newest = (list: readonly EngineBooking[]): EngineBooking | null =>
  list.reduce<EngineBooking | null>((best, one) => (best === null || one.createdAt >= best.createdAt ? one : best), null);

/** The booking standing on this parcel, if any. */
export const holderOf = (list: readonly EngineBooking[], parcelNumber: number): EngineBooking | null =>
  newest(list.filter((one) => one.parcelNumber === parcelNumber && HOLDS.has(one.state)));

export const latestOf = (list: readonly EngineBooking[], parcelNumber: number): EngineBooking | null =>
  newest(list.filter((one) => one.parcelNumber === parcelNumber));

/**
 * What stands on this parcel for someone deciding whether anything was bought:
 * the holder under the key in use, or failing that a live one under the other
 * key. A test booking under a live key is left out, because it cannot be a
 * real label.
 */
export const standingOn = (list: readonly EngineBooking[], mode: EngineMode, parcelNumber: number): EngineBooking | null =>
  holderOf(outboundIn(list, mode), parcelNumber) ?? (mode === "test" ? holderOf(outboundIn(list, "live"), parcelNumber) : null);

/**
 * A booking's newer copy. Not every route's reply carries `track`: absent means
 * "this reply does not say", so what is held stays. A null or a value is an answer.
 */
export const mergedBooking = (held: EngineBooking, fresh: EngineBooking): EngineBooking =>
  fresh.track === undefined && held.track !== undefined ? { ...fresh, track: held.track } : fresh;

/** Every booking standing on a parcel of this order, in parcel order. */
export function holdersIn(list: readonly EngineBooking[]): EngineBooking[] {
  const numbers = [...new Set(list.map((one) => one.parcelNumber))].sort((a, b) => a - b);
  return numbers.flatMap((number) => holderOf(list, number) ?? []);
}

/** The first parcel number nothing stands on. */
export function nextParcel(list: readonly EngineBooking[]): number | null {
  for (let number = 1; number <= MAX_PARCELS; number += 1) {
    if (holderOf(list, number) === null) return number;
  }
  return null;
}

/**
 * Whether the quiet period has passed, by the SERVER's clock: its stamp on a
 * look-up made after `releaseAfter`. The engine still refuses a release that
 * comes too early, so this only decides what is offered.
 */
export function quietPassed(booking: Pick<EngineBooking, "releaseAfter" | "checkedAt">): boolean {
  return booking.releaseAfter !== null && booking.checkedAt !== null && booking.checkedAt >= booking.releaseAfter;
}

// ── what went wrong ─────────────────────────────────────────────────────────

export interface EngineFailure {
  code: string;
  status: number | null;
  message: string;
  reason?: CarrierRefusal;
  /** The engine's own word for why, such as `daily-limit`. */
  detail?: string;
}

/** Read by shape: each bundle inlines its own copy of the error class, so `instanceof` cannot tell. */
export function readFailure(err: unknown): EngineFailure {
  const fields = (typeof err === "object" && err !== null ? err : {}) as Record<string, unknown>;
  return {
    code: typeof fields.code === "string" ? fields.code : "ENGINE_NO_ANSWER",
    status: typeof fields.status === "number" ? fields.status : null,
    message: typeof fields.carrierMessage === "string" ? fields.carrierMessage : "",
    ...(typeof fields.reason === "string" ? { reason: fields.reason as CarrierRefusal } : {}),
    ...(typeof fields.refusalDetail === "string" ? { detail: fields.refusalDetail } : {}),
  };
}

export type RefusalCard =
  | "csrf"
  | "session"
  | "no-right"
  | "read-only"
  | "slow"
  | "app-update"
  | "not-ready"
  | "ship-from"
  | "address-gap"
  | "country"
  | "abroad"
  | "no-answer"
  | "address"
  | "customs"
  | "payment"
  | "key"
  | "rate-old"
  | "unavailable"
  | "over-limit"
  | "other";

const CARD_OF_CODE: Readonly<Record<string, RefusalCard>> = {
  CSRF_FAILED: "csrf",
  UNAUTHENTICATED: "session",
  SESSION_EXPIRED: "session",
  FORBIDDEN: "no-right",
  TABLE_FORBIDDEN: "no-right",
  APP_SCREENS_ONLY: "no-right",
  READ_ONLY_MODE: "read-only",
  RATE_LIMITED: "slow",
  QUOTES_TOO_FAST: "slow",
  APP_NOT_UPDATED: "app-update",
  NOT_A_SHIPPING_TABLE: "app-update",
  APP_INSTALL_AMBIGUOUS: "app-update",
  NO_ACTIVE_CARRIER: "not-ready",
  CARRIER_LOCKED: "not-ready",
  CARRIER_NOT_INSTALLED: "not-ready",
  CARRIER_SWITCHED_OFF: "not-ready",
  CARRIER_NOT_LOADED: "not-ready",
  CARRIER_NO_FACTORY: "not-ready",
  CARRIER_SERVER_WIDE: "not-ready",
  ENGINE_OTHER_CARRIER: "not-ready",
  SHIP_FROM_INCOMPLETE: "ship-from",
  ADDRESS_INCOMPLETE: "address-gap",
  COUNTRY_NOT_RECORDED: "country",
  OUTSIDE_OWN_COUNTRY: "abroad",
  ENGINE_NO_ANSWER: "no-answer",
  ENGINE_BAD_ANSWER: "no-answer",
  CARRIER_BAD_ANSWER: "no-answer",
  CARRIER_UNAVAILABLE: "unavailable",
};

/** The card for a refusal: the engine's own code first, then what the carrier's no was about. */
export function refusalCardOf(code: string, reason: CarrierRefusal | undefined): RefusalCard {
  const byCode = CARD_OF_CODE[code];
  if (byCode !== undefined) return byCode;
  switch (reason) {
    case undefined:
      return "other";
    case "address":
      return "address";
    case "customs":
      return "customs";
    case "payment":
      return "payment";
    case "rate-expired":
      return "rate-old";
    case "unavailable":
      return "unavailable";
    default:
      // The sixth reason: the carrier did not accept the shop's key.
      return "key";
  }
}

/** The cards a fresh quote can get past. The rest need someone to change something first. */
export const NEW_RATES_HELP: ReadonlySet<RefusalCard> = new Set<RefusalCard>([
  "slow",
  "no-answer",
  "address",
  "address-gap",
  "country",
  "ship-from",
  "payment",
  "key",
  "rate-old",
  "unavailable",
  "over-limit",
  "other",
]);

/** Fixed only by someone who manages the shop's carrier: anyone else reads "Ask the owner". */
export const OWNER_FIXES: ReadonlySet<RefusalCard> = new Set<RefusalCard>(["payment", "key", "ship-from", "not-ready", "customs"]);

// ── how a figure is written ─────────────────────────────────────────────────

/**
 * An exact decimal from the carrier, as money. Every digit it was quoted to is
 * kept, so 3.575 is never shown as 3.58. An unreadable currency shows as written.
 */
export function moneyText(amount: string, currency: string, locale: string): string {
  const places = amount.split(".")[1]?.length ?? 0;
  try {
    const base = new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().minimumFractionDigits ?? 2;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: base,
      maximumFractionDigits: Math.max(base, places),
    }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

export const stampOf = (at: number, locale: string): string =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(at));

export const timeOf = (at: number, locale: string): string =>
  new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(at));

export function labelFileName(reference: string, parcelNumber: number, mediaType: string): string {
  const safe = reference.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return `label-${safe}-${parcelNumber}.${mediaType === "image/png" ? "png" : "pdf"}`;
}
