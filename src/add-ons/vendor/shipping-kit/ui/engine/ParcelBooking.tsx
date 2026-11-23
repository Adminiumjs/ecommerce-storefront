/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/engine/ParcelBooking.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * ONE PARCEL, FROM ITS WEIGHT TO A BOOKED LABEL (S09–S17).
 *
 * This is only ever drawn when the engine has said `bookable` for this parcel.
 * Each parcel has its own copy, with its own form, rates, limit and Book
 * (S2-F4), and it is keyed by the parcel number so nothing carries across.
 *
 * ANY EDIT CLEARS THE RATES. The engine refuses a stale quote anyway, but a
 * screen still showing a price for yesterday's weight is the thing that makes
 * someone press Book. A reply that arrives after an edit is dropped too.
 *
 * A RATE IS ONLY DRAWN UNDER THE KEY ON SCREEN. A quote names the mode it was
 * priced in. One that differs is never drawn as bookable: the parent re-reads
 * the shop's key and says the rates must be fetched again.
 *
 * BOOK IS ASKED ONCE. A ref holds it, because two presses can land before React
 * has drawn the busy state. Only a clear refusal stays on this screen: anything
 * else goes to the parent, which reads what really happened.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CircleX, MapPin, RefreshCw, Search } from "lucide-react";
import { classifyBookFailure } from "../../../host/contracts/index.ts";
import type { DispatchPayload } from "../../../host/index.ts";
import type { EngineAccess, EngineBooking, EngineCarrier, EngineMode, EngineQuote } from "../../../host/engine-carrier.ts";

import { kitBrand } from "../../brand.ts";
import type { StringKey } from "../../i18n/strings.ts";
import { useFormat, useLocale, useT } from "../../i18n/t.ts";
import { parcelFor, type ParcelEstimate } from "../../parcel.ts";
import { inputStyle, Mono, monoInputStyle, Panel, PanelTitle, Typed } from "../atoms.tsx";
import { contentsLine } from "../labels.ts";
import {
  contentsFor,
  decimalMarkOf,
  firstPick,
  MAX_SIDE_CM,
  MAX_WEIGHT_KG,
  NEW_RATES_HELP,
  OWNER_FIXES,
  readFailure,
  readSize,
  readWeight,
  refusalCardOf,
  type EngineFailure,
  type EngineRate,
  type FigureFault,
  type RefusalCard,
} from "./flow.ts";
import { Dialog, FlowButton, StatusCard, TOUCH } from "./parts.tsx";
import { RatesPanel } from "./RatesPanel.tsx";

type OwnerBlock = "no-limit" | "daily-limit";

const REFUSAL: Readonly<Record<RefusalCard, { title: StringKey; next: StringKey; ask?: StringKey }>> = {
  csrf: { title: "addon.shipping-kit.engine.refused.csrf.title", next: "addon.shipping-kit.engine.refused.csrf.next" },
  session: { title: "addon.shipping-kit.engine.refused.session.title", next: "addon.shipping-kit.engine.refused.session.next" },
  "no-right": { title: "addon.shipping-kit.engine.blocked.noRight.title", next: "addon.shipping-kit.engine.blocked.noRight.body" },
  "read-only": { title: "addon.shipping-kit.engine.refused.readOnly.title", next: "addon.shipping-kit.engine.refused.readOnly.next" },
  slow: { title: "addon.shipping-kit.engine.refused.slow.title", next: "addon.shipping-kit.engine.refused.slow.next" },
  "app-update": { title: "addon.shipping-kit.engine.gate.appUpdate.title", next: "addon.shipping-kit.engine.gate.appUpdate.body" },
  "not-ready": {
    title: "addon.shipping-kit.engine.blocked.noCarrier.title",
    next: "addon.shipping-kit.engine.blocked.noCarrier.manage",
    ask: "addon.shipping-kit.engine.blocked.noCarrier.ask",
  },
  "ship-from": {
    title: "addon.shipping-kit.engine.refused.shipFrom.title",
    next: "addon.shipping-kit.engine.refused.shipFrom.next",
    ask: "addon.shipping-kit.engine.refused.shipFrom.ask",
  },
  "address-gap": { title: "addon.shipping-kit.engine.refused.addressGap.title", next: "addon.shipping-kit.engine.refused.addressGap.next" },
  country: { title: "addon.shipping-kit.engine.refused.country.title", next: "addon.shipping-kit.engine.refused.country.next" },
  abroad: { title: "addon.shipping-kit.engine.refused.abroad.title", next: "addon.shipping-kit.engine.refused.abroad.next" },
  "no-answer": { title: "addon.shipping-kit.engine.refused.noAnswer.title", next: "addon.shipping-kit.engine.refused.noAnswer.next" },
  address: { title: "addon.shipping-kit.engine.refused.address.title", next: "addon.shipping-kit.engine.refused.address.next" },
  customs: {
    title: "addon.shipping-kit.engine.refused.customs.title",
    next: "addon.shipping-kit.engine.refused.owner",
    ask: "addon.shipping-kit.engine.refused.owner",
  },
  payment: {
    title: "addon.shipping-kit.engine.refused.payment.title",
    next: "addon.shipping-kit.engine.refused.payment.next",
    ask: "addon.shipping-kit.engine.refused.payment.ask",
  },
  key: {
    title: "addon.shipping-kit.engine.refused.key.title",
    next: "addon.shipping-kit.engine.refused.key.next",
    ask: "addon.shipping-kit.engine.refused.key.ask",
  },
  "rate-old": { title: "addon.shipping-kit.engine.refused.old.title", next: "addon.shipping-kit.engine.refused.old.next" },
  unavailable: { title: "addon.shipping-kit.engine.refused.unavailable.title", next: "addon.shipping-kit.engine.refused.unavailable.next" },
  "over-limit": { title: "addon.shipping-kit.engine.rate.ownerBooks", next: "addon.shipping-kit.engine.refused.overLimit.next" },
  other: { title: "addon.shipping-kit.engine.refused.other.title", next: "addon.shipping-kit.engine.refused.other.next" },
};

const OWNER_BLOCK_BODY: Readonly<Record<OwnerBlock, StringKey>> = {
  "no-limit": "addon.shipping-kit.engine.limit.noLimit",
  "daily-limit": "addon.shipping-kit.engine.limit.daily",
};

/** A figure stays left-to-right inside its field, so `start` would pin it to the wrong side of an Arabic page. */
const pageIsRtl = () => typeof document !== "undefined" && document.documentElement.getAttribute("dir") === "rtl";

function FigureField({
  label,
  unit,
  value,
  onChange,
  fault,
  hint,
  disabled,
  inputRef,
  inputMode,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (next: string) => void;
  fault: string | null;
  hint?: string | undefined;
  disabled: boolean;
  inputRef: { current: HTMLInputElement | null };
  inputMode?: "decimal";
}) {
  const id = useId();
  const faultId = `${id}-fault`;
  const hintId = `${id}-hint`;
  const describedBy = [fault === null ? null : faultId, hint === undefined ? null : hintId].filter((one) => one !== null).join(" ");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minInlineSize: 0 }}>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-muted)" }}>
        {label}
      </label>
      <span
        style={{
          ...inputStyle,
          display: "flex",
          alignItems: "center",
          padding: 0,
          paddingInlineEnd: 11,
          borderColor: fault === null ? "var(--border-strong)" : "var(--danger)",
          borderWidth: fault === null ? 1 : 1.5,
        }}
      >
        <input
          id={id}
          ref={inputRef}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={fault !== null}
          aria-describedby={describedBy === "" ? undefined : describedBy}
          {...(inputMode === undefined ? {} : { inputMode })}
          style={{ ...monoInputStyle, textAlign: pageIsRtl() ? "right" : "left", fontWeight: 500, border: 0, background: "transparent", minBlockSize: TOUCH }}
        />
        <Mono style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-subtle)" }}>{unit}</Mono>
      </span>
      {fault !== null && (
        <span id={faultId} style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>
          {fault}
        </span>
      )}
      {hint !== undefined && (
        <span id={hintId} style={{ fontSize: 11.5, color: "var(--fg-subtle)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

/** The country in the reader's language. An order holds its ISO code; anything else is shown as it is. */
function countryName(code: string, locale: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Where it is going. Read-only here: an address change is the order's own audited write. */
export function AddressBlock({ order, locked }: { order: DispatchPayload["order"]; locked: boolean }) {
  const t = useT();
  const locale = useLocale();
  const to = order.destination;
  const lines = to === undefined ? [] : [to.name, ...to.lines, [to.city, to.region, to.postcode].filter(Boolean).join(" "), countryName(to.country, locale)];
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-muted)", marginBlockEnd: 6 }}>{t("addon.shipping-kit.parcel.goingTo")}</div>
      <div
        data-testid="engine-address"
        style={{ border: "1px solid var(--border)", borderRadius: 11, background: "var(--surface-2)", padding: "11px 13px", display: "flex", flexDirection: "column", gap: 2 }}
      >
        {lines.length === 0 ? (
          <span style={{ fontSize: 13 }}>{order.recipient.name}</span>
        ) : (
          lines.map((line, index) => (
            <Typed key={`${line}-${index}`} style={{ alignSelf: "flex-start", fontSize: 13, fontFamily: "inherit", fontWeight: to !== undefined && index === lines.length - 1 ? 700 : undefined, color: "var(--fg)" }}>
              {line}
            </Typed>
          ))
        )}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBlockStart: 8, fontSize: 12, color: "var(--fg-muted)" }}>
        <MapPin size={13} aria-hidden="true" style={{ flex: "0 0 auto", marginBlockStart: 2 }} />
        <span>
          {locked
            ? t("addon.shipping-kit.engine.form.addressLocked")
            : to === undefined
              ? t("addon.shipping-kit.engine.form.addressNone")
              : t("addon.shipping-kit.engine.form.addressEdit")}
        </span>
      </div>
    </div>
  );
}

const sizeText = (estimate: ParcelEstimate, number: (value: number, opts?: Intl.NumberFormatOptions) => string) =>
  [estimate.lengthCm, estimate.widthCm, estimate.heightCm].map((side) => number(side, { useGrouping: false })).join(" × ");

export function ParcelBooking({
  client,
  access,
  order,
  source,
  chosen,
  parcelNumber,
  say,
  onAnswered,
  onUnknown,
  onRefused,
  onModeMoved,
  onQuoted,
  onClose,
  replaceRefunding = false,
}: {
  client: EngineCarrier;
  access: EngineAccess;
  order: DispatchPayload["order"];
  source: { table: string; id: string };
  chosen?: DispatchPayload["chosen"];
  parcelNumber: number;
  say: (text: string) => void;
  /** The engine answered the purchase. It may still say `unknown`, so the parent reads the state. */
  onAnswered: (booking: EngineBooking, rate: EngineRate) => void;
  /** No clear answer: a label may have been paid for. */
  onUnknown: (rate: EngineRate) => void;
  /** A clear no. The parent re-reads the key and the list, and says whether nothing stands on this parcel. */
  onRefused: () => Promise<boolean>;
  /** A quote came back in a mode this screen is not showing. Its rates are not drawn. */
  onModeMoved: (mode: EngineMode) => void;
  /** A quote in the mode on screen is being drawn. */
  onQuoted: () => void;
  /** Leaves an added parcel's form. Absent on the first parcel. */
  onClose?: (() => void) | undefined;
  /** Someone was told both labels stay paid until the refund lands, and chose to book another. */
  replaceRefunding?: boolean | undefined;
}) {
  const t = useT();
  const locale = useLocale();
  const { number, list } = useFormat();
  const mark = useMemo(() => decimalMarkOf(locale), [locale]);
  const estimate = useMemo(() => parcelFor(order.items, { packedGrams: order.parcelWeightGrams }), [order.items, order.parcelWeightGrams]);
  const contents = useMemo(() => contentsFor(contentsLine(t, estimate, list), order.ref), [estimate, list, order.ref, t]);
  const speed = order.deliveryPromise;
  const brandName = kitBrand().name;
  const test = access.mode === "test";

  const [weight, setWeight] = useState(() => number(estimate.weightKg, { useGrouping: false }));
  const [size, setSize] = useState(() => sizeText(estimate, number));
  const [sizeEdited, setSizeEdited] = useState(false);
  const [weightFault, setWeightFault] = useState<FigureFault | null>(null);
  const [sizeFault, setSizeFault] = useState<FigureFault | null>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const sizeRef = useRef<HTMLInputElement>(null);

  const [quote, setQuote] = useState<EngineQuote | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const [booking, setBooking] = useState(false);
  const [failure, setFailure] = useState<{ card: RefusalCard; info: EngineFailure; company: string; afterBook: boolean; wordsHidden: boolean; nothingStands: boolean } | null>(null);
  const [ownerBlock, setOwnerBlock] = useState<OwnerBlock | null>(
    access.booking === "no-limit" ? "no-limit" : access.booking === "daily-limit" ? "daily-limit" : null,
  );
  const [rebuy, setRebuy] = useState<EngineRate | null>(null);
  const [rebuyAsking, setRebuyAsking] = useState(false);
  const rebuyTitle = useId();

  /** Moves on every edit: a quote asked for before it is not this parcel's any more. */
  const edition = useRef(0);
  const bookingNow = useRef(false);

  /** Held in state for one render at most after the key moves, and never drawn or bought from in that render. */
  const shownQuote = quote !== null && quote.mode === access.mode ? quote : null;
  const hidesMoney = access.pricesHidden || quote?.pricesHidden === true;

  const clearRates = () => {
    edition.current += 1;
    setFailure(null);
    setRebuy(null);
    if (quote !== null) {
      setQuote(null);
      setSelectedId(null);
      setCleared(true);
      say(t("addon.shipping-kit.engine.cleared.title"));
    }
  };

  /* The address is the order's: when the host hands a changed one, this quote is not for it. */
  const addressKey = JSON.stringify(order.destination ?? null);
  const seenAddress = useRef(addressKey);
  useEffect(() => {
    if (seenAddress.current === addressKey) return;
    seenAddress.current = addressKey;
    clearRates();
  }, [addressKey]);

  /* The shop's key moved: nothing priced or refused under the old one still applies. */
  const seenMode = useRef(access.mode);
  useEffect(() => {
    if (seenMode.current === access.mode) return;
    seenMode.current = access.mode;
    edition.current += 1;
    setQuote(null);
    setSelectedId(null);
    setFailure(null);
    setRebuy(null);
    setRebuyAsking(false);
    setCleared(false);
  }, [access.mode]);

  const showFailure = (err: unknown, afterBook: boolean, company: string) => {
    const info = readFailure(err);
    if (info.code === "OWNER_BOOKS" && (info.detail === "daily-limit" || info.detail === "no-limit")) {
      setOwnerBlock(info.detail);
      setQuote(null);
      setSelectedId(null);
      say(t("addon.shipping-kit.engine.rate.ownerBooks"));
      return;
    }
    const card: RefusalCard = info.code === "OWNER_BOOKS" ? (info.detail === "abroad" ? "abroad" : "over-limit") : refusalCardOf(info.code, info.reason);
    setFailure({ card, info, company, afterBook, wordsHidden: hidesMoney, nothingStands: false });
    setQuote(null);
    setSelectedId(null);
    say(t(REFUSAL[card].title, { company }));
  };

  const getRates = async () => {
    const readW = readWeight(weight, mark);
    const readS = readSize(size, mark);
    setWeightFault(readW.ok ? null : readW.fault);
    setSizeFault(readS.ok ? null : readS.fault);
    if (!readW.ok || !readS.ok) {
      (!readW.ok ? weightRef : sizeRef).current?.focus();
      say(t(!readW.ok ? "addon.shipping-kit.engine.form.fixWeight" : "addon.shipping-kit.engine.form.fixSize"));
      return;
    }
    setFailure(null);
    setCleared(false);
    setRebuy(null);
    const asked = ++edition.current;
    setBooking(true);
    try {
      const answer = await client.quote({
        source: { table: source.table, id: source.id },
        parcel: { weightKg: readW.weightKg, lengthCm: readS.lengthCm, widthCm: readS.widthCm, heightCm: readS.heightCm, contents },
        parcelNumber,
      });
      if (edition.current !== asked) return;
      if (answer.mode !== access.mode) {
        onModeMoved(answer.mode);
        return;
      }
      onQuoted();
      const wantedCode = chosen !== undefined && chosen !== null && chosen.addOn === kitBrand().addOnKey ? chosen.code : null;
      setQuote(answer);
      setSelectedId(firstPick(answer.rates, speed, wantedCode));
      say(t("addon.shipping-kit.engine.say.rates", { n: answer.rates.length }));
    } catch (err) {
      if (edition.current === asked) showFailure(err, false, brandName);
    } finally {
      setBooking(false);
    }
  };

  const book = async (confirmEarlier: boolean, rateOverride?: EngineRate) => {
    const rate = rateOverride ?? (shownQuote?.rates as readonly EngineRate[] | undefined)?.find((one) => one.rateId === selectedId);
    if (bookingNow.current || shownQuote === null || rate === undefined) return;
    bookingNow.current = true;
    setBooking(true);
    say(t("addon.shipping-kit.engine.say.booking"));
    try {
      const answer = await client.book({ quoteId: shownQuote.quoteId, rateId: rate.rateId, ...(confirmEarlier ? { confirmEarlier: true } : {}), ...(replaceRefunding ? { replaceRefunding: true } : {}) });
      onAnswered(answer, rate);
    } catch (err) {
      if (classifyBookFailure(err).outcome !== "refused") {
        onUnknown(rate);
        return;
      }
      const info = readFailure(err);
      if (info.code === "REBUY_UNCHECKED") {
        setRebuy(rate);
        say(t("addon.shipping-kit.engine.rebuy.title"));
        return;
      }
      showFailure(err, true, rate.carrier ?? brandName);
      // "Nothing was charged" waits for the list. A stale token reads nothing, so it never says so.
      if (info.code !== "CSRF_FAILED" && (await onRefused())) {
        setFailure((held) => (held === null ? null : { ...held, nothingStands: true }));
      }
    } finally {
      bookingNow.current = false;
      setBooking(false);
    }
  };

  const locked = booking;
  const faultText = (fault: FigureFault | null, kind: "weight" | "size"): string | null => {
    if (fault === null) return null;
    if (kind === "weight") {
      return fault === "format"
        ? t("addon.shipping-kit.engine.form.weightFormat", { example: number(0.5) })
        : t("addon.shipping-kit.engine.form.weightRange", { max: MAX_WEIGHT_KG });
    }
    return fault === "format"
      ? t("addon.shipping-kit.engine.form.sizeFormat", { example: `${number(30)} × ${number(20)} × ${number(10)}` })
      : t("addon.shipping-kit.engine.form.sizeRange", { max: MAX_SIDE_CM });
  };

  const refusal = failure === null ? null : REFUSAL[failure.card];
  const canFix = failure !== null && (!OWNER_FIXES.has(failure.card) || access.manages);
  const offersRates = failure !== null && canFix && NEW_RATES_HELP.has(failure.card);
  const carrierWords =
    failure !== null && failure.info.code === "CARRIER_REFUSED" && !failure.wordsHidden && failure.info.message !== ""
      ? { by: t("addon.shipping-kit.engine.refused.said", { who: failure.company }), words: failure.info.message }
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minInlineSize: 0 }}>
      <Panel>
        <PanelTitle>
          {parcelNumber === 1 ? t("addon.shipping-kit.parcel.title") : t("addon.shipping-kit.engine.parcelN", { n: parcelNumber })}
        </PanelTitle>
        <div style={{ fontSize: 12.5, color: "var(--fg-subtle)", marginBlock: "4px 14px" }}>{t("addon.shipping-kit.engine.form.sub")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.parcel.contents")}</span>
            <span dir="auto" style={{ alignSelf: "flex-start", fontSize: 13.5, overflowWrap: "anywhere" }}>{contents}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))", gap: 12 }}>
            <FigureField
              label={t("addon.shipping-kit.parcel.weight")}
              unit="kg"
              value={weight}
              inputMode="decimal"
              disabled={locked}
              inputRef={weightRef}
              fault={faultText(weightFault, "weight")}
              hint={estimate.from.assumed.length > 0 ? t("addon.shipping-kit.engine.form.estimated") : undefined}
              onChange={(next) => {
                setWeight(next);
                setWeightFault(null);
                clearRates();
              }}
            />
            <FigureField
              label={t("addon.shipping-kit.engine.form.size")}
              unit="cm"
              value={size}
              disabled={locked}
              inputRef={sizeRef}
              fault={faultText(sizeFault, "size")}
              hint={sizeEdited ? undefined : t("addon.shipping-kit.engine.form.estimated")}
              onChange={(next) => {
                setSize(next);
                setSizeEdited(true);
                setSizeFault(null);
                clearRates();
              }}
            />
          </div>
          <AddressBlock order={order} locked={false} />
        </div>
      </Panel>

      {ownerBlock !== null && (
        <StatusCard
          tone="warn"
          icon={<CircleX size={20} />}
          title={t("addon.shipping-kit.engine.rate.ownerBooks")}
          body={t(OWNER_BLOCK_BODY[ownerBlock])}
          testId="engine-owner-block"
        />
      )}

      {ownerBlock === null && cleared && quote === null && failure === null && (
        <StatusCard
          tone="neutral"
          icon={<RefreshCw size={20} />}
          title={t("addon.shipping-kit.engine.cleared.title")}
          body={t("addon.shipping-kit.engine.cleared.body")}
          testId="engine-cleared"
        />
      )}

      {failure !== null && refusal !== null && (
        <StatusCard
          tone="danger"
          icon={<CircleX size={20} />}
          testId={`engine-refused-${failure.card}`}
          takeFocus
          {...(failure.afterBook && failure.nothingStands
            ? { eyebrow: test ? t("addon.shipping-kit.engine.refused.eyebrowTest") : t("addon.shipping-kit.engine.refused.eyebrow") }
            : !failure.afterBook && (failure.card === "ship-from" || failure.card === "address-gap" || failure.card === "country")
              ? { eyebrow: t("addon.shipping-kit.engine.refused.before") }
              : {})}
          title={t(refusal.title, { company: failure.company })}
          quote={carrierWords}
          {...(canFix ? { next: t(refusal.next, { company: failure.company }) } : {})}
          {...(!canFix && refusal.ask !== undefined ? { note: t(refusal.ask) } : {})}
          actions={
            offersRates ? (
              <FlowButton variant="accent" onClick={() => void getRates()} testId="engine-new-rates">
                <RefreshCw size={15} aria-hidden="true" />
                {t("addon.shipping-kit.engine.refused.getRates")}
              </FlowButton>
            ) : null
          }
        />
      )}

      {rebuy !== null && (
        <StatusCard
          tone="warn"
          icon={<CircleX size={20} />}
          testId="engine-rebuy"
          takeFocus
          title={t("addon.shipping-kit.engine.rebuy.title")}
          body={test ? t("addon.shipping-kit.engine.rebuy.bodyTest") : t("addon.shipping-kit.engine.rebuy.body")}
          actions={
            access.manages ? (
              <FlowButton variant="ghost" busy={booking} onClick={() => setRebuyAsking(true)} testId="engine-rebuy-open">
                {t("addon.shipping-kit.engine.rebuy.open")}
              </FlowButton>
            ) : null
          }
          {...(access.manages ? {} : { note: t("addon.shipping-kit.engine.rebuy.ask") })}
        />
      )}

      {rebuyAsking && rebuy !== null && (
        <Dialog labelledBy={rebuyTitle} onClose={() => setRebuyAsking(false)}>
          <h2 id={rebuyTitle} style={{ margin: 0, fontSize: 16.5, fontWeight: 800, lineHeight: 1.35 }}>
            {t("addon.shipping-kit.engine.rebuy.dialogTitle")}
          </h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--fg-muted)" }}>
            {test ? t("addon.shipping-kit.engine.rebuy.warnTest") : t("addon.shipping-kit.engine.rebuy.warn")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBlockStart: 4 }}>
            <FlowButton variant="ghost" firstFocus onClick={() => setRebuyAsking(false)} testId="engine-rebuy-keep">
              {t("addon.shipping-kit.engine.rebuy.keep")}
            </FlowButton>
            <FlowButton
              variant="solid"
              testId="engine-rebuy-confirm"
              onClick={() => {
                const rate = rebuy;
                setRebuyAsking(false);
                setRebuy(null);
                void book(true, rate);
              }}
            >
              {t("addon.shipping-kit.engine.rebuy.ok")}
            </FlowButton>
          </div>
        </Dialog>
      )}

      {ownerBlock === null && shownQuote !== null && rebuy === null && (
        <RatesPanel
          quote={shownQuote}
          speed={speed}
          customer={order.recipient.name}
          selectedId={selectedId}
          onSelect={setSelectedId}
          busy={booking}
          showMoney={!hidesMoney}
          access={access}
          onBook={() => void book(false)}
          say={say}
        />
      )}

      {ownerBlock === null && shownQuote === null && failure === null && rebuy === null && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <FlowButton variant="accent" busy={booking} onClick={() => void getRates()} testId="engine-get-rates">
            <Search size={15} aria-hidden="true" />
            {t("addon.shipping-kit.rates.get")}
          </FlowButton>
        </div>
      )}

      {onClose !== undefined && !booking && (
        <div>
          <FlowButton variant="ghost" onClick={onClose} testId="engine-parcel-close">
            {t("addon.shipping-kit.engine.add.close")}
          </FlowButton>
        </div>
      )}
    </div>
  );
}
