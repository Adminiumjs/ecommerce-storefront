/**
 * The shop after an order: signing in with a code (the sign-in page, its
 * sheet over the checkout, and Find your order, which is the same sign-in
 * with an order number kept to land on), an order by its own link or from
 * the account, cancelling it, paying it, Order again, sending something
 * back, a review, and the account's own moves (news, sign out, delete my
 * details, a new link).
 *
 * Every figure and date shown is a column Adminium wrote; the page only says
 * it. Two things are the page's own: which actions an order offers (from its
 * status, as the manifest's own rules allow them) and the last day to send
 * something back (the day it shipped and the shop's return days, on
 * Adminium's clock).
 */
import { linkFromFragment, newClientKey } from "@adminiumjs/public-client";
import { create } from "zustand";

import type { AfterPort, CodeAnswer, Me, OrderRead, Receipt, ReviewState, Via } from "./after-port.ts";
import { heldCheckout } from "./checkout.ts";
import { documentLanguage } from "./door.ts";
import { shopDay } from "./format.ts";
import { isShopError, type Id, type Row } from "./port.ts";
import { go, MAX_QTY, onOpen, openSignIn, requoteBasket, setLineQty, toast, today, useShop, wordOf, type BasketLine, type Customer } from "./store.ts";

// ── the code: one component for Sign in, its sheet, Find your order and a fresh proof ──

/** The four places the e-mailed code is asked for: each keeps its own step. */
export type CodeKey = "find" | "signIn" | "sheet" | "confirm";

export type CodeError = "short" | "wrong" | "spent" | "locked" | "unreachable";
export type FlowError = "mismatch" | "unreachable" | "noMail";

export interface CodeFlow {
  step: "email" | "code";
  email: string;
  /** Find your order: the number, kept in the page to land on that order once signed in. */
  number: string;
  /** Whether "Send me a code" was pressed: the fields' own errors show from then. */
  tried: boolean;
  err: FlowError | null;
  digits: string;
  codeErr: CodeError | null;
  /** How many codes this place has asked for: each one starts the 30-second wait again. */
  sends: number;
  canResend: boolean;
  busy: boolean;
}

const NO_FLOW: CodeFlow = { step: "email", email: "", number: "", tried: false, err: null, digits: "", codeErr: null, sends: 0, canResend: false, busy: false };

/** The order open on Your order: by the customer's sign-in or the order's own link. */
export interface Opened {
  via: Via;
  state: "loading" | "ok" | "failed" | "gone";
  read: OrderRead | null;
}

export interface ReviewForm {
  open: boolean;
  lineId: string | null;
  stars: number;
  title: string;
  body: string;
  tried: boolean;
  busy: boolean;
  failed: "address" | "other" | null;
}

export interface ReturnForm {
  /** Pieces of each line, by the line's id. */
  pick: Record<string, number>;
  reason: string;
  note: string;
  tried: boolean;
  busy: boolean;
  failed: boolean;
  clientKey: string;
}

export interface AfterState {
  port: AfterPort | null;
  flows: Record<CodeKey, CodeFlow>;
  /** How the order's own link went: being opened, opening nothing, or stopped. */
  link: "opening" | "unknown" | "closed" | null;
  opened: Opened | null;
  /** The signed-in customer's order chosen on the account (kept for the tab). */
  chosen: string | null;
  account: { state: "idle" | "loading" | "ok" | "failed"; orders: Row[]; returns: Row[] };
  me: Me | null;
  news: { busy: boolean; failed: "stop" | "start" | null; confirm: boolean };
  /** Each line's review state; `off` once the route answered that reviews are off. */
  reviews: { off: boolean; byLine: Record<string, ReviewState> };
  receipt: Receipt | null;
  cancelSheet: boolean;
  cancel: "idle" | "busy" | "refused" | "failed";
  deleteSheet: { open: boolean; step: "ask" | "code"; busy: boolean; failed: boolean };
  review: ReviewForm;
  ret: ReturnForm;
  /** The return shown on its own page (`/o/return` once asked), and whether it was just sent. */
  returnShown: string | null;
  justSent: boolean;
  newLink: "idle" | "busy" | "sent" | "limit" | "failed";
  pay: "idle" | "busy" | "failed";
  /** The sign-in link from the e-mail (`/c#…`): the name it greets, and how opening it went. */
  signInLink: { token: string | null; name: string | null; state: "idle" | "peeking" | "ready" | "opening" | "used" };
}

const NO_REVIEW: ReviewForm = { open: false, lineId: null, stars: 0, title: "", body: "", tried: false, busy: false, failed: null };
const noReturn = (): ReturnForm => ({ pick: {}, reason: "", note: "", tried: false, busy: false, failed: false, clientKey: newClientKey() });

function initial(): Omit<AfterState, "port"> {
  return {
    flows: { find: NO_FLOW, signIn: NO_FLOW, sheet: NO_FLOW, confirm: NO_FLOW },
    link: null,
    opened: null,
    chosen: kept().order,
    account: { state: "idle", orders: [], returns: [] },
    me: null,
    news: { busy: false, failed: null, confirm: false },
    reviews: { off: false, byLine: {} },
    receipt: null,
    cancelSheet: false,
    cancel: "idle",
    deleteSheet: { open: false, step: "ask", busy: false, failed: false },
    review: NO_REVIEW,
    ret: noReturn(),
    returnShown: kept().ret,
    justSent: false,
    newLink: "idle",
    pay: "idle",
    signInLink: { token: null, name: null, state: "idle" },
  };
}

export const useAfter = create<AfterState>(() => ({ port: null, ...initial() }));

const get = () => useAfter.getState();
const set = (patch: Partial<AfterState>) => useAfter.setState(patch);

/** The after-order door: a test's own, or the shop's once it is open. */
function door(): AfterPort | null {
  const own = get().port;
  if (own !== null) return own;
  return useShop.getState().port?.after() ?? null;
}

/** For tests: back to a fresh page, with this door (or the shop's). */
export function resetAfter(next: AfterPort | null = null): void {
  keep({ order: null, ret: null });
  restored = false;
  useAfter.setState({ port: next, ...initial(), chosen: null, returnShown: null }, true);
}

// ── what the tab keeps: the order chosen, and the return shown ─────────────

const KEPT = "northline.after.chosen";

function kept(): { order: string | null; ret: string | null } {
  try {
    const raw = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(KEPT);
    const value = raw === null ? null : (JSON.parse(raw) as { order?: unknown; ret?: unknown });
    return { order: typeof value?.order === "string" ? value.order : null, ret: typeof value?.ret === "string" ? value.ret : null };
  } catch {
    return { order: null, ret: null };
  }
}

function keep(value: { order: string | null; ret: string | null }): void {
  try {
    if (value.order === null && value.ret === null) sessionStorage.removeItem(KEPT);
    else sessionStorage.setItem(KEPT, JSON.stringify(value));
  } catch {
    // not kept: a reload asks again
  }
}

function choose(order: string | null, ret: string | null = null): void {
  set({ chosen: order, returnShown: ret });
  keep({ order, ret });
}

// ── checking what was typed ────────────────────────────────────────────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normaliseNumber = (value: string): string => value.trim().toUpperCase();
export const normaliseEmail = (value: string): string => value.trim().toLowerCase();

/** What the page can say of the fields before anything is sent. */
export function flowErrors(key: CodeKey, flow: Pick<CodeFlow, "email" | "number">): { number?: "empty"; email?: "empty" | "shape" } {
  const email = normaliseEmail(flow.email);
  return {
    ...(key === "find" && normaliseNumber(flow.number) === "" ? { number: "empty" as const } : {}),
    ...(email === "" ? { email: "empty" as const } : !EMAIL.test(email) ? { email: "shape" as const } : {}),
  };
}

function setFlow(key: CodeKey, patch: Partial<CodeFlow>): void {
  set({ flows: { ...get().flows, [key]: { ...get().flows[key], ...patch } } });
}

export function typeFlow(key: CodeKey, patch: Partial<Pick<CodeFlow, "email" | "number" | "digits">>): void {
  const digits = patch.digits === undefined ? {} : { digits: patch.digits.replace(/\D/g, "").slice(0, 6), codeErr: null };
  setFlow(key, { ...patch, ...digits, ...(patch.digits === undefined ? { err: null } : {}) });
}

/** "Use another e-mail": back to the address, the code forgotten. */
export function backToEmail(key: CodeKey): void {
  setFlow(key, { step: "email", digits: "", codeErr: null, err: null });
}

/** A code went: another may be asked for in thirty seconds. */
function sent(key: CodeKey): void {
  const sends = get().flows[key].sends + 1;
  setFlow(key, { sends, canResend: false });
  setTimeout(() => {
    if (get().flows[key].sends === sends) setFlow(key, { canResend: true });
  }, 30_000);
}

/**
 * "Send me a code": checked here first; then Adminium e-mails a link and a
 * code to the address (the same answer whoever it is). Find your order says
 * the same sentence for any number and address; a number that is not theirs
 * is told only after the code.
 */
export async function sendCode(key: CodeKey): Promise<"code" | "fix" | "failed"> {
  const d = door();
  const flow = get().flows[key];
  if (d === null || flow.busy) return "failed";
  if (Object.keys(flowErrors(key, flow)).length > 0) {
    setFlow(key, { tried: true, err: null });
    return "fix";
  }
  setFlow(key, { tried: false, err: null, busy: true, email: flow.email.trim(), number: normaliseNumber(flow.number) });
  try {
    await d.requestCode(normaliseEmail(flow.email), documentLanguage());
    sent(key);
    setFlow(key, { step: "code", digits: "", codeErr: null, busy: false });
    return "code";
  } catch (error) {
    setFlow(key, { busy: false, err: isShopError(error) && error.refused.code === "PUBLIC_CODE_UNAVAILABLE" ? "noMail" : "unreachable" });
    return "failed";
  }
}

/** "Send a new code": not before thirty seconds have gone since the last. */
export async function resendCode(key: CodeKey): Promise<boolean> {
  const d = door();
  const flow = get().flows[key];
  if (d === null || flow.busy || !flow.canResend) return false;
  setFlow(key, { busy: true });
  try {
    await d.requestCode(normaliseEmail(flow.email), documentLanguage());
    sent(key);
    setFlow(key, { busy: false, digits: "", codeErr: null });
    return true;
  } catch {
    setFlow(key, { busy: false, codeErr: "unreachable" });
    return false;
  }
}

/** The code typed back: right, the customer is signed in, and the place it was asked from goes on. */
export async function checkCode(key: CodeKey): Promise<"done" | "fix" | "failed"> {
  const d = door();
  const flow = get().flows[key];
  if (d === null || flow.busy) return "failed";
  if (flow.digits.length < 6) {
    setFlow(key, { codeErr: "short" });
    return "fix";
  }
  setFlow(key, { busy: true, codeErr: null });
  let answered: CodeAnswer;
  try {
    answered = await d.verifyCode(normaliseEmail(flow.email), flow.digits);
  } catch {
    setFlow(key, { busy: false, codeErr: "unreachable" });
    return "failed";
  }
  if (!answered.ok) {
    setFlow(key, { busy: false, codeErr: answered.reason, digits: "" });
    return "fix";
  }
  try {
    await signedIn();
    return await afterCode(key);
  } catch {
    setFlow(key, { busy: false, codeErr: "unreachable" });
    return "failed";
  }
}

/** Signed in: where each place goes next. */
async function afterCode(key: CodeKey): Promise<"done" | "fix"> {
  const flow = get().flows[key];
  setFlow(key, { ...NO_FLOW, ...(key === "find" ? { number: flow.number, email: flow.email } : {}) });
  switch (key) {
    case "find": {
      // The order the number names, among their own: told only now, after the code.
      const found = get().account.orders.find((o) => normaliseNumber(String(o["number"] ?? "")) === flow.number);
      if (found === undefined) {
        setFlow(key, { err: "mismatch" });
        return "fix";
      }
      setFlow(key, { number: "", email: "" });
      openFromAccount(found["id"] as Id);
      return "done";
    }
    case "signIn":
      go({ view: "account" });
      return "done";
    case "sheet":
      openSignIn(false);
      void requoteBasket();
      return "done";
    case "confirm":
      await forget();
      return "done";
  }
}

// ── the signed-in customer ─────────────────────────────────────────────────

/** Where the customer's newest proved, not-cancelled order went: the checkout fills it in (ACC-7). */
export function lastAddress(orders: readonly Row[]): Customer["address"] {
  const proved = orders.filter((o) => o["customer_proved"] === true || o["customer_proved"] === 1 || o["customer_proved"] === "1");
  const last = proved.filter((o) => o["status"] !== "cancelled" && o["kind"] !== "gift" && o["address_line1"] != null).sort((a, b) => String(b["placed_at"] ?? "").localeCompare(String(a["placed_at"] ?? "")))[0];
  if (last === undefined) return null;
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return { shipName: s(last["ship_name"]), line1: s(last["address_line1"]), line2: s(last["address_line2"]), city: s(last["city"]), zip: s(last["zip"]), regionId: (last["region_id"] as Id | null) ?? null };
}

/** The customer's row and orders read after a sign-in: the header, the checkout and the account follow. */
async function signedIn(): Promise<void> {
  const d = door();
  if (d === null) return;
  const [me, orders, returns] = await Promise.all([d.me(), d.myOrders(), d.myReturns().catch(() => [] as Row[])]);
  set({ me, account: { state: "ok", orders, returns } });
  useShop.setState({ customer: me === null ? null : { name: me.name, email: me.email, news: me.news, address: lastAddress(orders) } });
}

let restored = false;

/**
 * A session the client kept from before a reload: the customer is shown as
 * signed in again. Called once the shop has loaded (the sign-in sheet, always
 * mounted, asks it).
 */
export async function restoreSignIn(): Promise<void> {
  const d = door();
  if (d === null || restored) return;
  restored = true;
  if (!d.signedIn() || useShop.getState().customer !== null) return;
  try {
    await signedIn();
  } catch {
    // Not read: the shop shows a guest, and signing in again works.
  }
}

export async function loadAccount(): Promise<void> {
  const d = door();
  if (d === null) return;
  if (!d.signedIn()) {
    set({ account: { state: "idle", orders: [], returns: [] } });
    return;
  }
  set({ account: { ...get().account, state: get().account.state === "ok" ? "ok" : "loading" } });
  try {
    await signedIn();
  } catch {
    set({ account: { ...get().account, state: "failed" } });
  }
}

/** "Sign out": home, and "You’re signed out." */
export async function signOut(): Promise<void> {
  const d = door();
  try {
    await d?.signOut();
  } catch {
    // The client drops its session whatever the server answered.
  }
  useShop.setState({ customer: null });
  choose(null);
  set({ me: null, account: { state: "idle", orders: [], returns: [] }, opened: get().opened?.via === "mine" ? null : get().opened });
  go({ view: "home" });
  toast("after.toast.signedOut");
  void requoteBasket();
}

export function openDelete(open: boolean): void {
  set({ deleteSheet: { open, step: "ask", busy: false, failed: false }, flows: { ...get().flows, confirm: NO_FLOW } });
}

/**
 * "Delete my details": Adminium empties the customer's own row, ends every
 * session and stops their orders' links. It asks for a mailbox proved in the
 * last ten minutes: otherwise the sheet sends a new code first.
 */
export async function forget(): Promise<"done" | "code" | "failed"> {
  const d = door();
  if (d === null) return "failed";
  set({ deleteSheet: { ...get().deleteSheet, busy: true, failed: false } });
  try {
    await d.forgetMe();
  } catch (error) {
    if (isShopError(error) && error.refused.code === "PUBLIC_CODE_STEP_UP") {
      const email = get().me?.email ?? useShop.getState().customer?.email ?? "";
      setFlow("confirm", { ...NO_FLOW, email });
      set({ deleteSheet: { ...get().deleteSheet, busy: false, step: "code" } });
      await sendCode("confirm");
      return "code";
    }
    set({ deleteSheet: { ...get().deleteSheet, busy: false, failed: true } });
    return "failed";
  }
  useShop.setState({ customer: null });
  choose(null);
  set({ me: null, account: { state: "idle", orders: [], returns: [] }, opened: null, deleteSheet: { open: false, step: "ask", busy: false, failed: false } });
  go({ view: "home" });
  toast("after.toast.removed");
  return "done";
}

/** "Stop news e-mails" and "Send me news e-mails". Turning news on goes through the newsletter's own door. */
export async function setNews(on: boolean): Promise<boolean> {
  const d = door();
  const shop = useShop.getState();
  const me = get().me;
  if (d === null || shop.port === null || me === null || get().news.busy) return false;
  set({ news: { busy: true, failed: null, confirm: false } });
  try {
    if (on) await shop.port.newsSignup(me.email, documentLanguage(), newClientKey());
    else await d.stopNews(me);
  } catch {
    set({ news: { busy: false, failed: on ? "start" : "stop", confirm: false } });
    return false;
  }
  const next = { ...me, news: on };
  set({ me: next, news: { busy: false, failed: null, confirm: on && shop.port.features().forms } });
  if (shop.customer !== null) useShop.setState({ customer: { ...shop.customer, news: on } });
  return true;
}

// ── the sign-in link from the e-mail (`/c#…`) ─────────────────────────────

/** The link's page: the name it greets, read without using it. */
export async function peekSignIn(token: string): Promise<void> {
  const d = door();
  if (d === null || get().signInLink.token === token) return;
  set({ signInLink: { token, name: null, state: "peeking" } });
  try {
    const name = await d.peekSignInLink(token);
    set({ signInLink: { token, name, state: name === null ? "used" : "ready" } });
  } catch {
    set({ signInLink: { token, name: null, state: "ready" } });
  }
}

/** "Continue": the link used once; the customer lands on their account. */
export async function continueSignIn(): Promise<boolean> {
  const d = door();
  const { token } = get().signInLink;
  if (d === null || token === null) return false;
  set({ signInLink: { ...get().signInLink, state: "opening" } });
  try {
    if (!(await d.openSignInLink(token))) {
      set({ signInLink: { ...get().signInLink, state: "used" } });
      return false;
    }
    set({ signInLink: { token: null, name: null, state: "idle" } });
    await signedIn();
    go({ view: "account" });
    return true;
  } catch {
    set({ signInLink: { ...get().signInLink, state: "used" } });
    return false;
  }
}

/** The token a sign-in link carries after `#` (43 characters), taken off the address once read. */
export function signInTokenInAddress(): string | null {
  if (typeof window === "undefined") return null;
  const link = linkFromFragment(window.location.hash);
  if (link === null || link.token.length < 40) return null;
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
  return link.token;
}

// ── an order open ──────────────────────────────────────────────────────────

/** Open one of the signed-in customer's orders from the account; a link that navigates itself passes `navigate` false. */
export function openFromAccount(orderId: Id, navigate = true): void {
  choose(String(orderId));
  set({ opened: null, link: null });
  if (navigate) go({ view: "order" });
}

/**
 * Your order opened (`/o`): a code in the address opens that order by its
 * own link, then leaves the address; without one, the order chosen on the
 * account, or the one this tab's link opened before.
 */
export async function openOrderPage(): Promise<void> {
  const d = door();
  if (d === null) return;
  const link = typeof window === "undefined" ? null : linkFromFragment(window.location.hash);
  if (link !== null && link.token.length < 40) {
    // The code never stays in the address: a link copied from the bar opens nothing for anyone else.
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    await openOrderLink(link.token);
    return;
  }
  // Back from the pay page with an order this tab just placed: the checkout's own screens show it.
  if (heldCheckout()) return;
  const chosen = get().chosen;
  if (chosen !== null && d.signedIn()) {
    await openMine(chosen);
    return;
  }
  if (d.sharedHeld()) {
    await readLinked();
    return;
  }
  set({ opened: null });
}

export async function openOrderLink(token: string): Promise<void> {
  const d = door();
  if (d === null) return;
  set({ link: "opening", opened: { via: "link", state: "loading", read: null }, ...fresh() });
  try {
    const opened = await d.openShared(token);
    if (opened !== "opened") {
      set({ link: opened, opened: null });
      return;
    }
    set({ link: null });
    await readLinked();
  } catch {
    set({ link: null, opened: { via: "link", state: "failed", read: null } });
  }
}

/** What an order's page forgets when another order opens. */
const fresh = (): Partial<AfterState> => ({ reviews: { off: false, byLine: {} }, receipt: null, cancel: "idle", cancelSheet: false, review: NO_REVIEW, newLink: "idle", pay: "idle" });

export async function readLinked(again = false): Promise<void> {
  const d = door();
  if (d === null) return;
  if (!again) set({ opened: { via: "link", state: "loading", read: null }, ...fresh() });
  try {
    const read = await d.readShared();
    set({ opened: read === null ? { via: "link", state: "gone", read: null } : { via: "link", state: "ok", read } });
    if (read !== null && !again) void loadExtras(read);
  } catch {
    if (!again) set({ opened: { via: "link", state: "failed", read: null } });
  }
}

export async function openMine(orderId: Id, again = false): Promise<void> {
  const d = door();
  if (d === null) return;
  if (!again) set({ opened: { via: "mine", state: "loading", read: null }, link: null, ...fresh() });
  try {
    const read = await d.readMine(orderId);
    set({ opened: read === null ? { via: "mine", state: "gone", read: null } : { via: "mine", state: "ok", read } });
    if (read !== null && !again) void loadExtras(read);
  } catch {
    if (!again) set({ opened: { via: "mine", state: "failed", read: null } });
  }
}

/** Read the open order again, after a change. */
export async function reread(): Promise<void> {
  const opened = get().opened;
  if (opened?.read == null) return;
  if (opened.via === "link") await readLinked(true);
  else await openMine(opened.read.order["id"] as Id, true);
}

/** Each line's review state, and the receipt, once the order is read. */
async function loadExtras(read: OrderRead): Promise<void> {
  const d = door();
  if (d === null) return;
  const status = String(read.order["status"] ?? "");
  const receipt = d.receipt(read.via, read.order["id"] as Id).catch(() => null);
  if (status === "shipped" && read.lines.length > 0) {
    const byLine: Record<string, ReviewState> = {};
    let off = false;
    for (const line of read.lines) {
      try {
        const state = await d.reviewState(read.via, line["id"] as Id);
        if (state === null) {
          off = true;
          break;
        }
        byLine[String(line["id"])] = state;
      } catch {
        // This line's state unknown: no review offered for it.
      }
    }
    if (get().opened?.read?.order["id"] === read.order["id"]) set({ reviews: { off, byLine: off ? {} : byLine } });
  }
  const doc = await receipt;
  if (get().opened?.read?.order["id"] === read.order["id"]) set({ receipt: doc });
}

// ── what an order offers ───────────────────────────────────────────────────

const PAID_STATES = ["paid", "packed", "shipped", "sent"];

export const isPaid = (order: Row): boolean => PAID_STATES.includes(String(order["status"] ?? ""));
/** Cancel while paid or waiting for a bank transfer; never while being paid online (R3), never once packed. */
export const canCancel = (order: Row): boolean => order["status"] === "paid" || order["status"] === "awaiting_transfer";

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

/** The last day to send something back: the day it shipped, on the shop's clock, and the shop's return days. */
export function returnsUntil(order: Row): string | null {
  const days = useShop.getState().base?.settings.returnDays ?? null;
  const shipped = shopDay(order["shipped_at"], useShop.getState().config.timezone);
  if (days === null || shipped === null || order["status"] !== "shipped") return null;
  return addDays(shipped, days);
}

/** [Send something back]: a shipped order, still in its return days, with a piece not already on its way back. */
export function canReturn(read: OrderRead): boolean {
  const until = returnsUntil(read.order);
  const day = today();
  if (until === null || (day !== null && day > until)) return false;
  return read.lines.some((l) => Number(l["returnable"] ?? 0) > 0);
}

/** The lines a review may still be written for. */
export function reviewable(read: OrderRead, reviews: AfterState["reviews"]): Row[] {
  if (reviews.off) return [];
  return read.lines.filter((l) => reviews.byLine[String(l["id"])]?.open === true && (l["reviewed_at"] === null || l["reviewed_at"] === undefined));
}

/** Where a carrier shows a parcel by its number, for "Track it". Only the carriers the shop names. */
export function trackingUrl(carrier: unknown, number: unknown): string | null {
  if (typeof number !== "string" || number === "" || typeof carrier !== "string") return null;
  const n = encodeURIComponent(number);
  const c = carrier.toLowerCase();
  if (c.includes("dhl")) return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${n}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  return null;
}

// ── cancelling, paying, a new link ─────────────────────────────────────────

export function openCancel(open: boolean): void {
  set({ cancelSheet: open, cancel: open ? "idle" : get().cancel });
}

/** "Cancel the order": the customer's own cancel, with their reason; the order is read again after. */
export async function cancelOrder(): Promise<"done" | "refused" | "failed"> {
  const d = door();
  const read = get().opened?.read;
  if (d === null || read == null || get().cancel === "busy") return "failed";
  set({ cancel: "busy" });
  try {
    await d.cancel(read.via, read.order["id"] as Id);
  } catch (error) {
    // Packed meanwhile, or no longer this session's: the order as Adminium has it now.
    const refused = isShopError(error) && [404, 409].includes(error.refused.status);
    set({ cancel: refused ? "refused" : "failed", cancelSheet: false });
    await reread();
    return refused ? "refused" : "failed";
  }
  set({ cancel: "idle", cancelSheet: false });
  await reread();
  const order = get().opened?.read?.order;
  toast(order !== undefined && (Number(order["paid"] ?? 0) > 0 || Number(order["refunded"] ?? 0) > 0) ? "after.order.cancelledRefund" : "after.order.cancelledNothing");
  return "done";
}

/** Where "Pay now" leaves for: the pay page. A seam, so a test stays on the page. */
let leave = (url: string): void => window.location.assign(url);
export function setLeave(next: (url: string) => void): void {
  leave = next;
}

/** "Pay $217.00 now": the order's own pay link, through the session that reads it; the amount is the order's. */
export async function payNow(): Promise<boolean> {
  const shop = useShop.getState().port;
  const read = get().opened?.read;
  if (shop === null || read == null || get().pay === "busy") return false;
  set({ pay: "busy" });
  try {
    const url = await shop.payments().start(read.via, read.order["id"] as Id);
    set({ pay: "idle" });
    leave(url);
    return true;
  } catch {
    set({ pay: "failed" });
    await reread();
    return false;
  }
}

/** "Make a new link": the old link stops, and the new one goes to the customer's e-mail. */
export async function makeNewLink(): Promise<boolean> {
  const d = door();
  const read = get().opened?.read;
  if (d === null || read == null || read.via !== "mine" || get().newLink === "busy") return false;
  set({ newLink: "busy" });
  try {
    await d.newLink(read.order["id"] as Id);
    set({ newLink: "sent" });
    return true;
  } catch (error) {
    set({ newLink: isShopError(error) && error.refused.code === "PUBLIC_LIMIT_REACHED" ? "limit" : "failed" });
    return false;
  }
}

// ── order again ────────────────────────────────────────────────────────────

/**
 * "Order again": each line's variant read again with Inventory's words; a
 * line sold out or no longer made is left out and named, the others go in
 * the basket capped at "Only N left", and the basket says what happened.
 */
export async function orderAgain(): Promise<boolean> {
  const d = door();
  const shop = useShop.getState();
  const read = get().opened?.read;
  if (d === null || shop.port === null || read == null) return false;
  const lines = read.lines;
  const number = String(read.order["number"] ?? "");
  try {
    const variants = await shop.port.variantsByIds(lines.map((l) => l["variant_id"] as Id));
    const words = await shop.port.stock(variants.map((v) => v.id)).catch(() => ({}));
    const products = await d.productsByIds(variants.map((v) => v.productId));
    const basket = [...useShop.getState().basket];
    const left: { name: string; why: "sold" | "gone" }[] = [];
    for (const line of lines) {
      const label = typeof line["variant_label"] === "string" && line["variant_label"] !== "" ? ` · ${line["variant_label"]}` : "";
      const name = `${String(line["product_name"] ?? line["sku"] ?? "")}${label}`;
      const variant = variants.find((v) => String(v.id) === String(line["variant_id"]));
      const product = variant === undefined ? undefined : products.find((p) => String(p.id) === String(variant.productId));
      if (variant === undefined || product === undefined) {
        left.push({ name, why: "gone" });
        continue;
      }
      const word = wordOf(variant, words);
      if (word.state === "out") {
        left.push({ name, why: "sold" });
        continue;
      }
      const cap = word.state === "low" && word.left !== null ? Math.min(MAX_QTY, word.left) : MAX_QTY;
      const qty = Number(line["qty"] ?? 1);
      const at = basket.findIndex((b) => String(b.variantId) === String(variant.id));
      if (at >= 0) basket[at] = { ...basket[at]!, qty: Math.min(cap, basket[at]!.qty + qty) };
      else {
        const icon = shop.base?.categories.find((c) => String(c.id) === String(product.categoryId))?.icon ?? null;
        const optionLabel = [variant.colourLabel, variant.sizeLabel].filter((x): x is string => x !== null && x !== "").join(" · ") || null;
        const added: BasketLine = { key: newClientKey().slice(0, 12), variantId: variant.id, productId: product.id, slug: product.slug, qty: Math.min(cap, qty), added: variant.price, name: product.name, label: optionLabel, sku: variant.sku, categoryIcon: icon };
        basket.push(added);
      }
    }
    useShop.setState({ basket, basketNote: { number, left } });
    // The store's own change: a new retry key, the basket kept, and its figures asked again.
    const first = basket[0];
    if (first !== undefined) setLineQty(first.key, first.qty);
    go({ view: "basket" });
    return true;
  } catch {
    toast("after.again.failed", undefined, "info");
    return false;
  }
}

// ── sending something back ─────────────────────────────────────────────────

/** "Send something back": the form for the open order. */
export function startReturn(): void {
  const read = get().opened?.read;
  if (read == null) return;
  choose(read.via === "mine" ? String(read.order["id"]) : get().chosen, null);
  set({ ret: noReturn(), justSent: false });
  go({ view: "orderReturn" });
}

/** Open a return on its own page, from the account or the order; its page reads the order it belongs to. */
export function showReturn(ret: Row, navigate = true): void {
  choose(String(ret["order_id"]), String(ret["id"]));
  set({ justSent: false });
  if (navigate) go({ view: "orderReturn" });
}

/** Back from a return to its order. */
export function backToOrder(): void {
  const read = get().opened?.read;
  choose(read?.via === "mine" ? String(read.order["id"]) : get().chosen, null);
  go({ view: "order" });
}

export function pickLine(lineId: string, qty: number): void {
  const ret = get().ret;
  const pick = { ...ret.pick };
  if (qty > 0) pick[lineId] = qty;
  else delete pick[lineId];
  set({ ret: { ...ret, pick } });
}

export function typeReturn(patch: Partial<Pick<ReturnForm, "reason" | "note">>): void {
  set({ ret: { ...get().ret, ...patch } });
}

export function returnErrors(ret: ReturnForm): { lines?: true; reason?: true } {
  return { ...(Object.keys(ret.pick).length === 0 ? { lines: true as const } : {}), ...(ret.reason === "" ? { reason: true as const } : {}) };
}

/** "Send": signed in, one write with its lines; through the link, the return and then each piece. */
export async function sendReturn(): Promise<"sent" | "fix" | "failed"> {
  const d = door();
  const read = get().opened?.read;
  const ret = get().ret;
  if (d === null || read == null || ret.busy) return "failed";
  if (Object.keys(returnErrors(ret)).length > 0) {
    set({ ret: { ...ret, tried: true } });
    return "fix";
  }
  set({ ret: { ...ret, tried: true, busy: true, failed: false } });
  try {
    const made = await d.askReturn(read.via, {
      orderId: read.order["id"] as Id,
      reason: ret.reason,
      note: ret.note,
      lines: read.lines.filter((l) => (ret.pick[String(l["id"])] ?? 0) > 0).map((l) => ({ lineId: l["id"] as Id, qty: ret.pick[String(l["id"])]! })),
      clientKey: ret.clientKey,
    });
    await reread();
    choose(read.via === "mine" ? String(read.order["id"]) : get().chosen, String(made["id"]));
    set({ ret: noReturn(), justSent: true });
    return "sent";
  } catch {
    set({ ret: { ...get().ret, busy: false, failed: true } });
    return "failed";
  }
}

// ── a review ───────────────────────────────────────────────────────────────

export function openReview(lineId: string | null): void {
  set({ review: { ...NO_REVIEW, open: true, lineId } });
}

export function closeReview(): void {
  set({ review: NO_REVIEW });
}

export function typeReview(patch: Partial<Pick<ReviewForm, "lineId" | "stars" | "title" | "body">>): void {
  set({ review: { ...get().review, ...patch, failed: null } });
}

export function reviewErrors(review: ReviewForm): { line?: true; stars?: true; body?: true } {
  return {
    ...(review.lineId === null ? { line: true as const } : {}),
    ...(review.stars < 1 || review.stars > 5 ? { stars: true as const } : {}),
    ...(review.body.trim() === "" ? { body: true as const } : {}),
  };
}

/** "Send": the review through the engine's route on the line; the line then reads "Your review: sent". */
export async function sendReview(): Promise<"sent" | "fix" | "failed"> {
  const d = door();
  const read = get().opened?.read;
  const review = get().review;
  if (d === null || read == null || review.busy) return "failed";
  if (Object.keys(reviewErrors(review)).length > 0) {
    set({ review: { ...review, tried: true } });
    return "fix";
  }
  set({ review: { ...review, tried: true, busy: true, failed: null } });
  const lineId = review.lineId!;
  try {
    const out = await d.sendReview(read.via, lineId, { stars: review.stars, title: review.title, body: review.body });
    markReviewed(lineId, out.reviewedAt ?? new Date(0).toISOString());
  } catch (error) {
    if (isShopError(error) && error.refused.code === "PUBLIC_REVIEW_DONE") {
      markReviewed(lineId, new Date(0).toISOString());
    } else {
      const address = isShopError(error) && (error.refused.code === "PUBLIC_WRITE_REJECTED" || error.refused.code === "PUBLIC_WRITE_REFUSED");
      set({ review: { ...get().review, busy: false, failed: address ? "address" : "other" } });
      return "failed";
    }
  }
  set({ review: NO_REVIEW });
  toast("after.review.thanks");
  return "sent";
}

/** The line's own stamp, as the page shows it until the order is read again. */
function markReviewed(lineId: string, at: string): void {
  const opened = get().opened;
  if (opened?.read == null) return;
  const lines = opened.read.lines.map((l) => (String(l["id"]) === lineId ? { ...l, reviewed_at: l["reviewed_at"] ?? at } : l));
  set({ opened: { ...opened, read: { ...opened.read, lines } }, reviews: { ...get().reviews, byLine: { ...get().reviews.byLine, [lineId]: { open: false, reviewedAt: at } } } });
}

// ── each screen, as it opens ───────────────────────────────────────────────

onOpen("order", () => void openOrderPage());
onOpen("account", () => void loadAccount());
onOpen("orderReturn", () => {
  // The order the return belongs to: the one open already, else read (from the account, or after a reload).
  const d = door();
  const chosen = get().chosen;
  const open = get().opened?.read?.order["id"];
  if (d === null || (open !== undefined && (chosen === null || String(open) === chosen))) return;
  if (chosen !== null && d.signedIn()) void openMine(chosen);
  else if (d.sharedHeld()) void readLinked();
});
