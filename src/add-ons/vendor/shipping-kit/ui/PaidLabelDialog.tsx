/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/PaidLabelDialog.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * The paid-label question (plan 79, S39).
 *
 * Adminium refuses to move an order back or cancel it while it holds a live
 * paid label (`ORDER_HAS_PAID_LABEL`), because the move does not refund the
 * label. A shop wraps its order move in `withPaidLabel` and mounts one
 * `PaidLabelHost`: the refusal becomes this question, and the move is sent
 * again with the labels the person chose to keep named in a header.
 *
 * First focus is on "Go back": the press that opened this must not answer it.
 */
import { Fragment, useEffect, useId, useState, useSyncExternalStore } from "react";
import type { EngineBooking } from "../../host/engine-carrier.ts";

import { useLocale, useT } from "../i18n/t.ts";
import { engineCarrier } from "../runtime.ts";
import { moneyText } from "./engine/flow.ts";
import { Dialog, FlowButton } from "./engine/parts.tsx";
import { dayOf } from "./engine/RefundBlock.tsx";

/** Names the labels a person was told about and chose to keep. */
export const PAID_LABEL_HEADER = "x-adminium-paid-label";

export interface PaidLabel {
  booking: string;
  carrier: string;
  parcel: number;
  scanned: boolean;
  claimBy: number;
  /** By the server's clock: a browser's may be wrong, and the kit reads none. */
  tooLate: boolean;
  canRequest: boolean;
}

export interface PaidLabelRefusal {
  to: string;
  mayKeep: boolean;
  labels: readonly PaidLabel[];
}

export interface PaidLabelSource {
  table: string;
  id: string;
}

function readLabel(value: unknown): PaidLabel | null {
  if (typeof value !== "object" || value === null) return null;
  const one = value as Record<string, unknown>;
  if (typeof one["booking"] !== "string" || typeof one["carrier"] !== "string" || typeof one["claimBy"] !== "number") return null;
  return {
    booking: one["booking"],
    carrier: one["carrier"],
    parcel: typeof one["parcel"] === "number" ? one["parcel"] : 1,
    scanned: one["scanned"] === true,
    claimBy: one["claimBy"],
    tooLate: one["tooLate"] === true,
    canRequest: one["canRequest"] === true,
  };
}

/** The refusal, read field by field. A customer's copy names no labels, so it is not a question for anyone here. */
export function readPaidLabelRefusal(error: unknown): PaidLabelRefusal | null {
  if (typeof error !== "object" || error === null) return null;
  const { code, params } = error as { code?: unknown; params?: unknown };
  if (code !== "ORDER_HAS_PAID_LABEL" || typeof params !== "object" || params === null) return null;
  const details = params as Record<string, unknown>;
  if (typeof details["to"] !== "string" || !Array.isArray(details["labels"]) || details["labels"].length === 0) return null;
  const labels = details["labels"].map(readLabel);
  if (labels.some((one) => one === null)) return null;
  return { to: details["to"], mayKeep: details["mayKeep"] === true, labels: labels as PaidLabel[] };
}

/** The person went back: nothing moved, and there is nothing to report. */
export class PaidLabelStopped extends Error {
  override readonly name = "PaidLabelStopped";
  constructor() {
    super("The order was not moved.");
  }
}

export const isPaidLabelStopped = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { name?: unknown }).name === "PaidLabelStopped";

interface Ask {
  refusal: PaidLabelRefusal;
  source: PaidLabelSource;
  settle: (keep: readonly string[] | null) => void;
}

let asking: Ask | null = null;
let hosts = 0;
const listeners = new Set<() => void>();

function show(next: Ask | null): void {
  asking = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const current = (): Ask | null => asking;

function ask(refusal: PaidLabelRefusal, source: PaidLabelSource): Promise<readonly string[] | null> {
  asking?.settle(null);
  return new Promise((resolve) => {
    const one: Ask = {
      refusal,
      source,
      settle: (keep) => {
        if (asking === one) show(null);
        resolve(keep);
      },
    };
    show(one);
  });
}

/**
 * Runs a move, and on a paid-label refusal asks the person what to do. With no
 * host on the page the refusal stays what it is, so a move can never hang.
 */
export async function withPaidLabel<T>(source: PaidLabelSource, attempt: (keep: readonly string[]) => Promise<T>): Promise<T> {
  try {
    return await attempt([]);
  } catch (error) {
    const refusal = readPaidLabelRefusal(error);
    if (refusal === null || hosts === 0) throw error;
    const keep = await ask(refusal, source);
    if (keep === null) throw new PaidLabelStopped();
    return attempt(keep);
  }
}

/**
 * For a move with other work to do before it: asks the question first, so
 * that work never happens on an order that then stays where it is. `moved`
 * says the label had gone by the time of asking and the move simply went.
 */
export async function clearPaidLabel(source: PaidLabelSource, attempt: (keep: readonly string[]) => Promise<unknown>): Promise<{ keep: readonly string[]; moved: boolean }> {
  const client = engineCarrier();
  if (client === null) return { keep: [], moved: false };
  const { bookings } = await client.bookings({ table: source.table, id: source.id });
  if (!bookings.some((one) => one.state === "booked" && !one.test)) return { keep: [], moved: false };
  let asked = false;
  let moved = false;
  const keep = await withPaidLabel<readonly string[]>(source, async (chosen) => {
    if (asked) return chosen;
    asked = true;
    await attempt([]);
    moved = true;
    return [];
  });
  return { keep, moved };
}

function LabelLine({ label, booking }: { label: PaidLabel; booking: EngineBooking | undefined }) {
  const t = useT();
  const locale = useLocale();
  const price = booking?.amount !== undefined && booking.currency !== undefined ? moneyText(booking.amount, booking.currency, locale) : null;
  const named = [booking?.carrierName ?? label.carrier, booking?.service, price].filter((part): part is string => part !== undefined && part !== null);
  const claim = label.scanned
    ? t("addon.shipping-kit.engine.refund.scanned")
    : label.tooLate
      ? t("addon.shipping-kit.engine.refund.tooLateTitle")
      : t("addon.shipping-kit.engine.refund.lastDay", { d: dayOf(label.claimBy, locale) });
  return (
    <li data-testid="paid-label-line">
      {/* Each part keeps its own direction: a Latin name beside an Arabic price otherwise reads out of order. */}
      <div style={{ fontWeight: 700 }}>
        {named.map((part, index) => (
          <Fragment key={part}>
            {index > 0 && " · "}
            <bdi>{part}</bdi>
          </Fragment>
        ))}
      </div>
      <div>{claim}</div>
    </li>
  );
}

function PaidLabelQuestion({ question }: { question: Ask }) {
  const t = useT();
  const titleId = useId();
  const { refusal, source, settle } = question;
  const client = engineCarrier();
  const [bookings, setBookings] = useState<ReadonlyMap<string, EngineBooking>>(new Map());
  const [busy, setBusy] = useState(false);
  const [fault, setFault] = useState(false);
  const cancelling = /^cancell?ed$/i.test(refusal.to);
  const canRefund = client !== null && refusal.mayKeep && refusal.labels.some((label) => label.canRequest);

  // What the person may see of each label: the engine leaves the price out for someone it is hidden from.
  useEffect(() => {
    if (client === null) return undefined;
    let live = true;
    client
      .bookings({ table: source.table, id: source.id })
      .then((answer) => {
        if (live) setBookings(new Map(answer.bookings.map((one) => [one.id, one])));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [client, source.table, source.id]);

  const refundThenMove = async () => {
    if (client === null) return;
    setBusy(true);
    setFault(false);
    const keep: string[] = [];
    try {
      for (const label of refusal.labels) {
        if (!label.canRequest) {
          keep.push(label.booking);
          continue;
        }
        // Still `booked` after asking means no refund is under way, so the move must not go ahead on it.
        const answer = await client.requestRefund(label.booking);
        if (answer.booking.state === "booked") throw new Error(answer.outcome);
      }
    } catch {
      setFault(true);
      setBusy(false);
      return;
    }
    settle(keep);
  };

  return (
    <Dialog labelledBy={titleId} onClose={() => { if (!busy) settle(null); }}>
      <h3 id={titleId} style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
        {t("addon.shipping-kit.engine.paidLabel.title")}
      </h3>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
        {t(cancelling ? "addon.shipping-kit.engine.paidLabel.leadCancel" : "addon.shipping-kit.engine.paidLabel.leadBack")}
      </p>
      <ul style={{ margin: 0, paddingInlineStart: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        {refusal.labels.map((label) => (
          <LabelLine key={label.booking} label={label} booking={bookings.get(label.booking)} />
        ))}
        {canRefund && <li>{t("addon.shipping-kit.engine.refund.days")}</li>}
        {canRefund && <li>{t("addon.shipping-kit.engine.refund.scanRisk")}</li>}
        {canRefund && <li>{t("addon.shipping-kit.engine.paidLabel.noUse")}</li>}
      </ul>
      {!refusal.mayKeep && <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{t("addon.shipping-kit.engine.refund.askOwner")}</p>}
      {fault && (
        <p role="alert" data-testid="paid-label-fault" style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>
          {t("addon.shipping-kit.engine.paidLabel.stopped")}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {canRefund && (
          <FlowButton variant="accent" busy={busy} onClick={() => void refundThenMove()} testId="paid-label-refund">
            {t(cancelling ? "addon.shipping-kit.engine.paidLabel.refundCancel" : "addon.shipping-kit.engine.paidLabel.refundBack")}
          </FlowButton>
        )}
        {refusal.mayKeep && (
          <FlowButton disabled={busy} onClick={() => settle(refusal.labels.map((label) => label.booking))} testId="paid-label-keep">
            {t(cancelling ? "addon.shipping-kit.engine.paidLabel.keepCancel" : "addon.shipping-kit.engine.paidLabel.keepBack")}
          </FlowButton>
        )}
        <FlowButton firstFocus disabled={busy} onClick={() => settle(null)} testId="paid-label-back">
          {t("addon.shipping-kit.engine.paidLabel.goBack")}
        </FlowButton>
      </div>
    </Dialog>
  );
}

/** Mount once, anywhere under the shop's root. */
export function PaidLabelHost() {
  const question = useSyncExternalStore(subscribe, current, current);
  useEffect(() => {
    hosts += 1;
    return () => {
      hosts -= 1;
      if (hosts === 0) asking?.settle(null);
    };
  }, []);
  return question === null ? null : <PaidLabelQuestion key={question.refusal.labels.map((one) => one.booking).join()} question={question} />;
}
