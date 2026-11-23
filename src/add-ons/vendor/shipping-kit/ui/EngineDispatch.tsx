/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/EngineDispatch.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * THE REAL BOOKING FLOW, on the engine's routes (T12a, states S08–S26).
 *
 * THE ENGINE IS THE ONLY RECORD. This screen remembers nothing about a purchase
 * that it did not just read: on every load, and after every purchase that did
 * not end in a clear answer, it asks `bookings()` what is true. What it draws
 * follows from that one answer:
 *
 *   a booked parcel        its label card
 *   a purchase unanswered  the unknown card, and no Book anywhere
 *   a purchase under way   a wait card, and no Book anywhere
 *   nothing, and bookable  the parcel form, rates and Book
 *   nothing, not bookable  a card saying why
 *
 * BOOK IS DRAWN ONLY ON A POSITIVE "NO BOOKING". There is no path from a bought
 * or unknown parcel back to a live Book for that parcel: "Add another parcel"
 * opens a NEW parcel number, with its own read of `bookable`.
 *
 * THE KEY CAN CHANGE WHILE THIS SCREEN IS OPEN. An owner can replace a test key
 * with a live one while a packer has an order up, so the first `access` read is
 * only a starting point. A quote, a purchase and a list each carry the mode the
 * engine really used. When one disagrees with the screen, `access` is read again
 * before anything is filtered by mode, the banner is redrawn, and rates are
 * fetched afresh. "Nothing was bought" is only ever said after that read, and
 * never while a live booking stands on the parcel under either key.
 *
 * THE HOST IS NOT TOLD OF A BOOKING. `onBooked` is the demo's hand-off, and a
 * host may move its order on it. Buying a real label moves no order (D4): the
 * engine records the number, and the order moves when staff press "Handed over".
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, CircleSlash, CircleX, LoaderCircle, Lock, Plus, RefreshCw, Truck } from "lucide-react";
import type { DispatchPayload } from "../../host/index.ts";
import type { HandoverKind } from "../../host/contracts/index.ts";
import type { EngineAccess, EngineBooking, EngineBookings, EngineCarrier, EngineLookUpOutcome, EngineMode } from "../../host/engine-carrier.ts";

import { kitBrand } from "../brand.ts";
import { useT } from "../i18n/t.ts";
import { NotAffiliated } from "./atoms.tsx";
import { holderOf, holdersIn, latestOf, mergedBooking, nextParcel, outboundIn, standingOn, type EngineRate } from "./engine/flow.ts";
import { LabelCard } from "./engine/LabelCard.tsx";
import { RefundedCard } from "./engine/RefundBlock.tsx";
import { AddressBlock, ParcelBooking } from "./engine/ParcelBooking.tsx";
import { FlowButton, LiveRegion, StatusCard, TestBanner, useSay } from "./engine/parts.tsx";
import { UnknownCard } from "./engine/UnknownCard.tsx";

/** What a purchase with no clear answer turned out to be, once the list was read. */
type Aftermath = "checking" | "found" | "safe" | "no-record" | "read-failed" | null;

/** With no key of this add-on in use, live is the mode whose labels could be real, so live ones stay in view. */
const modeIn = (access: EngineAccess): EngineMode => (access.carrier === kitBrand().addOnKey ? (access.mode ?? "live") : "live");

export function EngineDispatch({
  client,
  access: firstAccess,
  payload,
  source,
}: {
  client: EngineCarrier;
  /** The gate's read. This screen re-reads it whenever the engine's replies disagree with it. */
  access: EngineAccess;
  payload: DispatchPayload;
  source: { table: string; id: string };
}) {
  const t = useT();
  const { order, chosen } = payload;
  const { said, say } = useSay();
  const [access, setAccess] = useState(firstAccess);
  const mode = modeIn(access);
  const test = mode === "test";
  const carrierHere = access.carrier === kitBrand().addOnKey && access.mode !== null;

  const [all, setAll] = useState<EngineBooking[]>([]);
  const [slot, setSlot] = useState<Pick<EngineBookings, "bookable" | "blockedBy"> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [parcelNumber, setParcelNumber] = useState(1);
  const [adding, setAdding] = useState(false);
  /** The label with a refund pending that a person chose to replace (S33). */
  const [replacing, setReplacing] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [aftermath, setAftermath] = useState<Aftermath>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [keyChanged, setKeyChanged] = useState(false);
  /** Live bookings under another key that were found on a parcel in question: a possible paid label stays drawn. */
  const [kept, setKept] = useState<readonly string[]>([]);
  /** How each service leaves, as the rate said. A booking does not record it, so it lasts as long as this page. */
  const handovers = useRef(new Map<string, HandoverKind>());
  /** The one read whose answer still counts: a slower, older reply must not overwrite a newer one. */
  const readCount = useRef(0);
  /** The mode on screen, for replies that land between renders. */
  const modeNow = useRef(modeIn(firstAccess));
  const askCount = useRef(0);
  const askLanded = useRef(0);

  /** Asks which key is in use. An older reply never overwrites a newer one. */
  const askMode = useCallback(async (): Promise<EngineMode> => {
    const mine = ++askCount.current;
    const fresh = await client.access();
    if (mine > askLanded.current) {
      askLanded.current = mine;
      const next = modeIn(fresh);
      if (next !== modeNow.current) setKeyChanged(true);
      modeNow.current = next;
      setAccess(fresh);
    }
    return modeNow.current;
  }, [client]);

  /** The engine itself just said which mode it worked in. Believed at once; any `access` read already in flight is older. */
  const takeMode = useCallback((seen: EngineMode) => {
    askLanded.current = askCount.current;
    if (seen === modeNow.current) return;
    modeNow.current = seen;
    setKeyChanged(true);
    setAccess((before) => ({ ...before, mode: seen }));
  }, []);

  const read = useCallback(
    async (number: number): Promise<EngineBookings | null> => {
      const mine = ++readCount.current;
      const answer = await client.bookings({ table: source.table, id: source.id, parcelNumber: number });
      if (readCount.current !== mine) return null;
      // A row under the other key may mean the key moved: ask before anything is filtered by mode.
      if (answer.bookings.some((one) => one.purpose === "outbound" && one.test !== (modeNow.current === "test"))) {
        await askMode();
        if (readCount.current !== mine) return null;
      }
      setAll(answer.bookings);
      setSlot({ bookable: answer.bookable, blockedBy: answer.blockedBy });
      return answer;
    },
    [client, source.table, source.id, askMode],
  );

  const load = useCallback(
    async (number: number) => {
      setLoadFailed(false);
      try {
        await read(number);
        setLoaded(true);
      } catch {
        setLoadFailed(true);
        setLoaded(true);
      }
    },
    [read],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const merge = useCallback((fresh: EngineBooking) => {
    setAll((before) => (before.some((one) => one.id === fresh.id) ? before.map((one) => (one.id === fresh.id ? mergedBooking(one, fresh) : one)) : [...before, fresh]));
  }, []);

  useEffect(() => {
    if (keyChanged) say(t("addon.shipping-kit.engine.keyChanged"));
  }, [keyChanged, say, t]);

  const keep = (booking: EngineBooking) => {
    if (booking.test !== (modeNow.current === "test")) setKept((before) => (before.includes(booking.id) ? before : [...before, booking.id]));
  };

  const inMode = outboundIn(all, mode);
  const mine = [...inMode, ...all.filter((one) => kept.includes(one.id) && !inMode.includes(one))];
  const holders = holdersIn(mine);
  // A label that lost its place to a replacement still stands: it is paid for, and someone has to see it.
  const booked = [...holders.filter((one) => one.state === "booked" || one.state === "voiding"), ...mine.filter((one) => (one.state === "booked" || one.state === "voiding") && !holders.includes(one))];
  const unknown = holders.filter((one) => one.state === "unknown");
  const underWay = holders.filter((one) => one.state === "reserved" || one.state === "calling");
  const active = holderOf(mine, parcelNumber);
  const unsettled = unknown.length > 0 || underWay.length > 0;
  const many = holders.length > 1 || parcelNumber > 1;
  /* A label bought under the other key is real to someone, and it has no bearing on this parcel. */
  const otherKeyLabel = outboundIn(all, test ? "live" : "test").some((one) => one.state === "booked" && !kept.includes(one.id));

  /** No clear answer to a purchase: say so, then read what really happened. */
  const settle = async (number: number, { rate, lookedUp = false }: { rate?: EngineRate; lookedUp?: boolean } = {}) => {
    const seen = new Set(all.map((one) => one.id));
    setAftermath("checking");
    say(t("addon.shipping-kit.engine.checking.title"));
    try {
      await askMode();
      const answer = await read(parcelNumber);
      // A newer read overtook this one, so this answer says nothing. Never guess: offer to read again.
      if (answer === null) {
        setAftermath("read-failed");
        return;
      }
      const current = modeNow.current;
      const holder = standingOn(answer.bookings, current, number);
      if (holder !== null) keep(holder);
      if (holder !== null && rate?.handover !== undefined) handovers.current.set(holder.id, rate.handover);
      if (holder?.state === "booked") {
        setAftermath("found");
        setFocusId(holder.id);
        say(t("addon.shipping-kit.engine.found.title"));
      } else if (holder !== null) {
        setAftermath(null);
        setFocusId(holder.id);
        say(t("addon.shipping-kit.engine.unknown.title"));
      } else {
        const latest = latestOf(outboundIn(answer.bookings, current), number);
        const settled = lookedUp || (latest !== null && !seen.has(latest.id) && latest.state === "refused");
        setAftermath(settled ? "safe" : "no-record");
        say(t(settled ? (current === "test" ? "addon.shipping-kit.engine.safe.titleTest" : "addon.shipping-kit.engine.safe.title") : "addon.shipping-kit.engine.noRecord.title"));
      }
    } catch {
      setAftermath("read-failed");
      say(t("addon.shipping-kit.engine.readFailed.title"));
    }
  };

  const onAnswered = (booking: EngineBooking, rate: EngineRate) => {
    if (rate.handover !== undefined) handovers.current.set(booking.id, rate.handover);
    if (booking.state !== "booked") {
      void settle(booking.parcelNumber, { rate });
      return;
    }
    merge(booking);
    if (booking.test !== (modeNow.current === "test")) {
      // Bought under a key this screen was not showing. A live label stays drawn whatever the next read says.
      if (!booking.test) setKept((before) => (before.includes(booking.id) ? before : [...before, booking.id]));
      takeMode(booking.test ? "test" : "live");
      void askMode()
        .catch(() => undefined)
        .then(() => load(parcelNumber));
    }
    setAdding(false);
    setReplacing(null);
    setFocusId(booking.id);
    say(t("addon.shipping-kit.engine.label.title"));
  };

  const onLookUp = (outcome: EngineLookUpOutcome, fresh: EngineBooking) => {
    merge(fresh);
    if (outcome === "found") {
      setAftermath("found");
      setFocusId(fresh.id);
    } else if (outcome === "not-bought") {
      void settle(fresh.parcelNumber, { lookedUp: true });
    }
  };

  /** A quote came back in another mode: its rates are gone, and the key and the list are read again. */
  const onModeMoved = (seen: EngineMode) => {
    takeMode(seen);
    setKeyChanged(true);
    void askMode()
      .catch(() => undefined)
      .then(() => load(parcelNumber));
  };

  /** After a clear refusal. True only when the list, read under the current key, has nothing on this parcel. */
  const afterRefusal = async (): Promise<boolean> => {
    try {
      await askMode();
      const answer = await read(parcelNumber);
      if (answer === null) return false;
      const holder = standingOn(answer.bookings, modeNow.current, parcelNumber);
      if (holder === null) return true;
      keep(holder);
      setFocusId(holder.id);
      return false;
    } catch {
      return false;
    }
  };

  const startAgain = () => {
    setAftermath(null);
    setOpened(true);
    void load(parcelNumber);
  };

  const addParcel = () => {
    const next = nextParcel(mine);
    if (next === null) return;
    setSlot(null);
    setParcelNumber(next);
    setAdding(true);
    setOpened(true);
    setAftermath(null);
    setKeyChanged(false);
    // Every row may be under the old key, so the list alone cannot show that the key moved.
    void askMode().catch(() => undefined);
    void load(next);
  };

  const closeParcel = () => {
    setAdding(false);
    setSlot(null);
    setParcelNumber(1);
    void load(1);
  };

  const canAdd = access.mayBook && booked.length > 0 && !unsettled && !adding && aftermath !== "checking" && nextParcel(mine) !== null;
  const showForm =
    carrierHere &&
    loaded &&
    !loadFailed &&
    (aftermath === null || aftermath === "found") &&
    !unsettled &&
    // Chosen on S33: the old label stays blocked, and the engine lets it give up its place.
    (replacing !== null ? active?.id === replacing && access.mayBook : active === null && slot?.bookable === true && (opened || adding || booked.length === 0));
  const showOpener = showForm && replacing === null && !opened && !adding && booked.length === 0;
  const refunded = active === null ? latestOf(mine, parcelNumber) : null;
  const blocked = loaded && !loadFailed && aftermath === null && active === null && !unsettled && slot !== null && !slot.bookable && (adding || booked.length === 0);
  const locked = booked.length > 0 || unsettled;

  let blockCard = null;
  if (blocked) {
    const by = slot?.blockedBy ?? null;
    const words =
      by === "label-on-order"
        ? { title: t("addon.shipping-kit.engine.blocked.labelOnOrder.title"), body: t("addon.shipping-kit.engine.blocked.labelOnOrder.body") }
        : by === "no-carrier"
          ? {
              title: t("addon.shipping-kit.engine.blocked.noCarrier.title"),
              body: t(access.manages ? "addon.shipping-kit.engine.blocked.noCarrier.manage" : "addon.shipping-kit.engine.blocked.noCarrier.ask"),
            }
          : by === "booking"
            ? { title: t("addon.shipping-kit.engine.blocked.booking.title"), body: t("addon.shipping-kit.engine.blocked.booking.body") }
            : { title: t("addon.shipping-kit.engine.blocked.noRight.title"), body: t("addon.shipping-kit.engine.blocked.noRight.body") };
    blockCard = (
      <StatusCard
        tone="warn"
        icon={<Lock size={20} />}
        testId={`engine-blocked-${by ?? "no-right"}`}
        title={words.title}
        body={words.body}
        actions={
          by === "booking" || by === "label-on-order" ? (
            <FlowButton variant="ghost" onClick={() => void load(parcelNumber)} testId="engine-look-again">
              <RefreshCw size={15} aria-hidden="true" />
              {t("addon.shipping-kit.engine.lookAgain")}
            </FlowButton>
          ) : null
        }
      />
    );
  }

  return (
    <div data-testid="engine-dispatch" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14, inlineSize: "100%", minInlineSize: 0 }}>
      <LiveRegion said={said} />
      {test && <TestBanner />}

      {!loaded && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--fg-muted)" }}>
          <LoaderCircle size={15} aria-hidden="true" />
          {t("addon.shipping-kit.engine.loading")}
        </div>
      )}

      {loaded && loadFailed && aftermath === null && (
        <StatusCard
          tone="warn"
          icon={<CircleX size={20} />}
          testId="engine-load-failed"
          title={t("addon.shipping-kit.engine.readFailed.title")}
          body={t("addon.shipping-kit.engine.readFailed.body")}
          actions={
            <FlowButton variant="accent" onClick={() => void load(parcelNumber)} testId="engine-look-again">
              <RefreshCw size={15} aria-hidden="true" />
              {t("addon.shipping-kit.engine.lookAgain")}
            </FlowButton>
          }
        />
      )}

      {loaded && !loadFailed && locked && <AddressBlock order={order} locked />}

      {otherKeyLabel && (
        <div role="note" data-testid="engine-other-key" style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)" }}>
          {t(test ? "addon.shipping-kit.engine.otherKey.live" : "addon.shipping-kit.engine.otherKey.test")}
        </div>
      )}

      {aftermath === "checking" && (
        <StatusCard
          tone="info"
          icon={<LoaderCircle size={20} />}
          testId="engine-checking"
          takeFocus
          title={t("addon.shipping-kit.engine.checking.title")}
          body={t("addon.shipping-kit.engine.checking.body")}
        />
      )}

      {aftermath === "found" && (
        <StatusCard
          tone="pos"
          icon={<CircleCheck size={20} />}
          testId="engine-found"
          title={t("addon.shipping-kit.engine.found.title")}
          body={t("addon.shipping-kit.engine.found.body")}
          actions={
            <FlowButton variant="accent" onClick={() => setAftermath(null)} testId="engine-open-label">
              {t("addon.shipping-kit.engine.found.open")}
            </FlowButton>
          }
        />
      )}

      {aftermath === "safe" && (
        <StatusCard
          tone="info"
          icon={<CircleSlash size={20} />}
          testId="engine-safe"
          takeFocus
          title={t(test ? "addon.shipping-kit.engine.safe.titleTest" : "addon.shipping-kit.engine.safe.title")}
          actions={
            <FlowButton variant="accent" onClick={startAgain} testId="engine-start-again">
              <RefreshCw size={15} aria-hidden="true" />
              {t("addon.shipping-kit.engine.refused.getRates")}
            </FlowButton>
          }
        />
      )}

      {aftermath === "no-record" && (
        <StatusCard
          tone="info"
          icon={<CircleSlash size={20} />}
          testId="engine-no-record"
          takeFocus
          title={t("addon.shipping-kit.engine.noRecord.title")}
          body={t("addon.shipping-kit.engine.noRecord.body")}
          actions={
            <FlowButton variant="accent" onClick={startAgain} testId="engine-start-again">
              <RefreshCw size={15} aria-hidden="true" />
              {t("addon.shipping-kit.engine.refused.getRates")}
            </FlowButton>
          }
        />
      )}

      {aftermath === "read-failed" && (
        <StatusCard
          tone="warn"
          icon={<CircleX size={20} />}
          testId="engine-read-failed"
          takeFocus
          title={t("addon.shipping-kit.engine.readFailed.title")}
          body={t("addon.shipping-kit.engine.readFailed.body")}
          actions={
            <FlowButton variant="accent" onClick={() => void settle(parcelNumber)} testId="engine-look-again">
              <RefreshCw size={15} aria-hidden="true" />
              {t("addon.shipping-kit.engine.lookAgain")}
            </FlowButton>
          }
        />
      )}

      {aftermath !== "checking" &&
        unknown.map((booking) => (
          <UnknownCard
            key={booking.id}
            booking={booking}
            access={access}
            client={client}
            orderRef={order.ref}
            many={many}
            say={say}
            takeFocus={focusId === booking.id}
            onLookUp={onLookUp}
            onReleased={(fresh) => {
              merge(fresh);
              setAftermath(null);
              setOpened(true);
              void load(parcelNumber);
            }}
            onStale={() => void load(parcelNumber)}
          />
        ))}

      {aftermath !== "checking" &&
        underWay.map((booking) => (
          <StatusCard
            key={booking.id}
            tone="info"
            icon={<LoaderCircle size={20} />}
            testId="engine-under-way"
            title={t("addon.shipping-kit.engine.underWay.title")}
            body={t("addon.shipping-kit.engine.underWay.body")}
            actions={
              <FlowButton variant="ghost" onClick={() => void load(parcelNumber)} testId="engine-look-again">
                <RefreshCw size={15} aria-hidden="true" />
                {t("addon.shipping-kit.engine.lookAgain")}
              </FlowButton>
            }
          />
        ))}

      {booked.length > 1 && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.engine.label.parcels")}</div>}
      {booked.map((booking) => (
        <LabelCard
          key={booking.id}
          booking={booking}
          access={access}
          client={client}
          handover={handovers.current.get(booking.id)}
          orderRef={order.ref}
          many={many}
          takeFocus={focusId === booking.id && aftermath === null}
          say={say}
          onChange={merge}
          onStale={() => void load(parcelNumber)}
          onReplace={booking.state === "voiding" && booking.parcelNumber === parcelNumber && active?.id === booking.id && access.mayBook && access.mayCancel ? () => setReplacing(booking.id) : undefined}
        />
      ))}

      {refunded?.state === "voided" && <RefundedCard booking={refunded} access={access} />}

      {canAdd && (
        <div>
          <FlowButton variant="ghost" onClick={addParcel} testId="engine-add-parcel">
            <Plus size={15} aria-hidden="true" />
            {t("addon.shipping-kit.engine.add.open")}
          </FlowButton>
        </div>
      )}

      {blockCard}

      {adding && slot === null && !loadFailed && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--fg-muted)" }}>
          <LoaderCircle size={15} aria-hidden="true" />
          {t("addon.shipping-kit.engine.loading")}
        </div>
      )}

      {showOpener && (
        <div>
          <FlowButton variant="ghost" onClick={() => setOpened(true)} testId="engine-open">
            <Truck size={15} aria-hidden="true" />
            {t("addon.shipping-kit.engine.open")}
          </FlowButton>
        </div>
      )}

      {keyChanged && showForm && !showOpener && (
        <StatusCard tone="warn" icon={<RefreshCw size={20} />} testId="engine-key-changed" takeFocus title={t("addon.shipping-kit.engine.keyChanged")} />
      )}

      {showForm && !showOpener && (
        <ParcelBooking
          key={parcelNumber}
          client={client}
          access={access}
          order={order}
          source={source}
          chosen={chosen}
          parcelNumber={parcelNumber}
          say={say}
          onAnswered={onAnswered}
          onUnknown={(rate) => void settle(parcelNumber, { rate })}
          onRefused={afterRefusal}
          onModeMoved={onModeMoved}
          onQuoted={() => setKeyChanged(false)}
          onClose={adding ? closeParcel : replacing !== null ? () => setReplacing(null) : undefined}
          replaceRefunding={replacing !== null}
        />
      )}

      <NotAffiliated>{t("addon.shipping-kit.engine.notAffiliated")}</NotAffiliated>
    </div>
  );
}
