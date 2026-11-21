/**
 * The desk's words for Adminium's states: an order's, a return's, how an
 * order's money stands, and how it was paid. One place, so a chip reads the
 * same on every screen.
 */
import type { TFunction } from "../i18n/index.tsx";
import type { DeskData } from "./door.ts";
import { isGift, payState, status, wayPaid, type PayState } from "./facts.ts";
import type { Fmt } from "./format.ts";
import type { Tone } from "./ui.tsx";
import { text, type Row } from "./wire.ts";

export function orderStatusWord(t: TFunction, order: Row): { label: string; tone: Tone } {
  switch (status(order)) {
    case "paying":
      return { label: t("desk.status.paying"), tone: "neutral" };
    case "awaiting_transfer":
      return { label: t("desk.status.transfer"), tone: "warn" };
    case "paid":
      return isGift(order) ? { label: t("desk.status.paid"), tone: "info" } : { label: t("desk.status.toPack"), tone: "info" };
    case "packed":
      return { label: t("desk.status.packed"), tone: "accent" };
    case "shipped":
      return { label: t("desk.status.shipped"), tone: "pos" };
    case "sent":
      return { label: t("desk.status.sent"), tone: "pos" };
    default:
      return { label: t("desk.status.cancelled"), tone: "danger" };
  }
}

export function payWord(t: TFunction, fmt: Fmt, order: Row): { label: string; tone: Tone; state: PayState } {
  const state = payState(order);
  switch (state) {
    case "paid":
      return { label: t("desk.pay.paid"), tone: "pos", state };
    case "part-refunded":
      return { label: t("desk.pay.partRefunded", { amount: fmt.money(order["refunded"]) }), tone: "warn", state };
    case "refunded":
      return { label: t("desk.pay.refunded"), tone: "neutral", state };
    case "owed":
      return { label: t("desk.pay.owed"), tone: "danger", state };
    default:
      return { label: t("desk.pay.notPaid"), tone: "neutral", state };
  }
}

/** How an order was paid, in words: "Online · Stripe", "Bank transfer", "Gift card"; null before any payment (N2-F3). */
export function wayWord(t: TFunction, data: DeskData, order: Row): string | null {
  const way = wayPaid(data, order);
  if (way === null) return null;
  if (way.method === "transfer") return t("desk.way.transfer");
  if (way.method === "gift_card") return t("desk.way.giftCard");
  return way.provider === null ? t("desk.way.online") : t("desk.way.onlineVia", { provider: way.provider });
}

export function returnStatusWord(t: TFunction, ret: Row): { label: string; tone: Tone } {
  switch (text(ret["status"])) {
    case "approved":
      return { label: t("desk.ret.status.approved"), tone: "accent" };
    case "declined":
      return { label: t("desk.ret.status.declined"), tone: "neutral" };
    case "received":
      return { label: t("desk.ret.status.received"), tone: "warn" };
    case "refunded":
      return { label: t("desk.ret.status.refunded"), tone: "pos" };
    default:
      return { label: t("desk.ret.status.asked"), tone: "info" };
  }
}

const REASONS: Record<string, "desk.ret.reason.fit" | "desk.ret.reason.expected" | "desk.ret.reason.faulty" | "desk.ret.reason.mind" | "desk.ret.reason.other"> = {
  fit: "desk.ret.reason.fit",
  expected: "desk.ret.reason.expected",
  faulty: "desk.ret.reason.faulty",
  mind: "desk.ret.reason.mind",
  other: "desk.ret.reason.other",
};
export const returnReasonWord = (t: TFunction, ret: Row): string => t(REASONS[text(ret["reason"]) ?? "other"] ?? "desk.ret.reason.other");

const SERVICE_FALLBACK = "—";
export const serviceWord = (data: DeskData, order: Row): string => text(data.services.find((s) => String(s.id) === String(order["service_id"]))?.["label"]) ?? SERVICE_FALLBACK;
