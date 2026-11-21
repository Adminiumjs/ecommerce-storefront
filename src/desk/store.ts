/**
 * The desk's screen state: which screen is open and on what, the sheet over
 * it, the filters, the toasts, and the rows last read. The rows are
 * Adminium's, read again after every write; nothing here keeps a figure of
 * its own.
 */
import { create } from "zustand";

import type { DeskData } from "./door.ts";
import type { Id } from "./wire.ts";

export type View = "today" | "orders" | "order" | "packing" | "returns" | "products" | "product" | "reviews" | "customers" | "customer" | "settings" | "denied";

export type Overlay =
  | { kind: "ship"; orderId: Id }
  | { kind: "cancel"; orderId: Id }
  /** Giving money back, in two steps: for an order, or for a return of one. */
  | { kind: "refund"; orderId: Id; returnId: Id | null }
  | { kind: "markPaid"; orderId: Id }
  | { kind: "decline"; returnId: Id }
  | { kind: "receive"; returnId: Id }
  | { kind: "hide"; reviewId: Id }
  /** DHL's dispatch flow, each ticked order's in turn. */
  | { kind: "dispatch"; orderIds: Id[]; at: number }
  | null;

export interface OrderFilter {
  status: string;
  service: string;
  /** `all`, `paid`, `unpaid`, or `owed` (money to give back on a cancelled order). */
  paid: string;
}

export type ProductTab = "all" | "low" | "out";
export type ReviewTab = "waiting" | "published" | "hidden";

export interface Toast {
  id: number;
  tone: "pos" | "warn" | "danger";
  text: string;
}

export interface DeskState {
  view: View;
  orderId: Id | null;
  productId: Id | null;
  customerId: Id | null;
  orderFilter: OrderFilter;
  productTab: ProductTab;
  reviewTab: ReviewTab;
  query: string;
  navOpen: boolean;
  overlay: Overlay;
  toasts: Toast[];
  /** The last thing a polite live region says. */
  said: string;
  data: DeskData | null;
  failure: string | null;
  theme: "light" | "dark" | null;
}

export const NO_FILTER: OrderFilter = { status: "all", service: "all", paid: "all" };

export const useDesk = create<DeskState>(() => ({
  view: "today",
  orderId: null,
  productId: null,
  customerId: null,
  orderFilter: NO_FILTER,
  productTab: "all",
  reviewTab: "waiting",
  query: "",
  navOpen: false,
  overlay: null,
  toasts: [],
  said: "",
  data: null,
  failure: null,
  theme: null,
}));

/** Open a screen, closing whatever lay over the last one. */
export function go(view: View, more: Partial<Pick<DeskState, "orderId" | "productId" | "customerId" | "orderFilter" | "productTab" | "reviewTab">> = {}): void {
  useDesk.setState({ view, ...more, overlay: null, navOpen: false, query: "" });
}

export const currentView = (): View => useDesk.getState().view;

export const openSheet = (overlay: Overlay): void => useDesk.setState({ overlay });
export const closeSheet = (): void => useDesk.setState({ overlay: null });

let toastId = 0;

/** A toast that goes by itself after a few seconds; it is said in the live region too. */
export function toast(text: string, tone: Toast["tone"] = "pos"): void {
  toastId += 1;
  const id = toastId;
  useDesk.setState((s) => ({ toasts: [...s.toasts, { id, tone, text }], said: text }));
  setTimeout(() => useDesk.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4_500);
}
