/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/engine/RatesPanel.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * "Services for this parcel" (S09–S11, S13, S16).
 *
 * A rate for someone who may not see money has no amount at all, so there is
 * nothing here to hide: `priced` decides whether a price is drawn, and no row is
 * ever marked as the cheap one or put in price order.
 *
 * A service that may lose what the customer paid for needs a deliberate confirm
 * whose first focus is on the safe button (S2-F6, F7, F22). Arrow keys walk the
 * list; they select a safe service and only move focus onto a risky one, so no
 * dialog opens from walking past it.
 */

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CircleHelp, Gauge, LoaderCircle, Lock, MapPin, Truck, Warehouse } from "lucide-react";
import type { HandoverKind } from "../../../host/contracts/index.ts";
import type { EngineAccess, EngineQuote } from "../../../host/engine-carrier.ts";

import { kitBrand } from "../../brand.ts";
import type { StringKey } from "../../i18n/strings.ts";
import { useFormat, useLocale, useT } from "../../i18n/t.ts";
import { Mono } from "../atoms.tsx";
import { serviceName } from "../labels.ts";
import { moneyText, needsConfirm, ownerBooksAll, speedFit, type CustomerSpeed, type EngineRate, type SpeedFit } from "./flow.ts";
import { Dialog, FlowButton, TOUCH, Worded } from "./parts.tsx";

/** All four ways a parcel can leave, each with its own icon (S2-F26). */
export const HANDOVER: Readonly<Record<HandoverKind, { key: StringKey; icon: typeof Truck }>> = {
  "collection-booked": { key: "addon.shipping-kit.engine.hand.collection", icon: Truck },
  "drop-off": { key: "addon.shipping-kit.engine.hand.drop", icon: MapPin },
  "carrier-collects": { key: "addon.shipping-kit.engine.hand.carrierCollects", icon: Warehouse },
  unknown: { key: "addon.shipping-kit.engine.hand.unknown", icon: CircleHelp },
};

const FIT: Readonly<Record<SpeedFit, { key: StringKey; fg: string; bg: string }>> = {
  keeps: { key: "addon.shipping-kit.engine.fit.keeps", fg: "var(--pos)", bg: "var(--pos-soft)" },
  slower: { key: "addon.shipping-kit.engine.fit.slower", fg: "var(--warn)", bg: "var(--warn-soft)" },
  untracked: { key: "addon.shipping-kit.engine.fit.untracked", fg: "var(--warn)", bg: "var(--warn-soft)" },
  unstated: { key: "addon.shipping-kit.engine.fit.unstated", fg: "var(--fg-muted)", bg: "var(--surface-3)" },
};

const CONFIRM: Readonly<Record<Exclude<SpeedFit, "keeps">, { title: StringKey; body: StringKey; ok: StringKey; keep: StringKey }>> = {
  slower: {
    title: "addon.shipping-kit.engine.confirm.slower.title",
    body: "addon.shipping-kit.engine.confirm.slower.body",
    ok: "addon.shipping-kit.engine.confirm.slower.ok",
    keep: "addon.shipping-kit.engine.confirm.slower.keep",
  },
  untracked: {
    title: "addon.shipping-kit.engine.confirm.untracked.title",
    body: "addon.shipping-kit.engine.confirm.untracked.body",
    ok: "addon.shipping-kit.engine.confirm.use",
    keep: "addon.shipping-kit.engine.confirm.another",
  },
  unstated: {
    title: "addon.shipping-kit.engine.confirm.unstated.title",
    body: "addon.shipping-kit.engine.confirm.unstated.body",
    ok: "addon.shipping-kit.engine.confirm.use",
    keep: "addon.shipping-kit.engine.confirm.another",
  },
};

const pill = (fg: string, bg: string) =>
  ({ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: fg, background: bg, paddingBlock: 2, paddingInline: 9, borderRadius: 99 }) as const;

export function rateName(rate: Pick<EngineRate, "carrier" | "code" | "service">, name: (rate: { code: string; service: string }) => string): string {
  return rate.carrier === undefined ? name(rate) : `${rate.carrier} · ${name(rate)}`;
}

function Arrival({ rate }: { rate: EngineRate }) {
  const t = useT();
  const { day } = useFormat();
  if (rate.estimatedDays !== undefined) {
    return rate.estimatedDays === 1 ? (
      <Worded k="addon.shipping-kit.engine.rate.arrivesOne" figures={{ n: 1 }} />
    ) : (
      <Worded k="addon.shipping-kit.engine.rate.arrivesDays" figures={{ n: rate.estimatedDays }} />
    );
  }
  if (rate.estimatedDelivery !== undefined) {
    return <Worded k="addon.shipping-kit.engine.rate.arrivesOn" figures={{ date: day(rate.estimatedDelivery) }} />;
  }
  return <>{t("addon.shipping-kit.engine.rate.notStated")}</>;
}

export function RatesPanel({
  quote,
  speed,
  customer,
  selectedId,
  onSelect,
  busy,
  showMoney,
  access,
  onBook,
  say,
}: {
  quote: EngineQuote;
  speed: CustomerSpeed | undefined;
  customer: string;
  selectedId: string | null;
  onSelect: (rateId: string) => void;
  busy: boolean;
  showMoney: boolean;
  access: EngineAccess;
  onBook: () => void;
  say: (text: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const { timeOfDay } = useFormat();
  const headingId = useId();
  const dialogId = useId();
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const [asking, setAsking] = useState<{ rate: EngineRate; fit: Exclude<SpeedFit, "keeps"> } | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);

  const rates: readonly EngineRate[] = quote.rates;
  const test = quote.mode === "test";
  const whole = ownerBooksAll(rates, speed);
  const name = (rate: EngineRate) => rateName(rate, (one) => serviceName(t, one, timeOfDay));
  const usable = (rate: EngineRate) => rate.withinLimit && whole === null && !busy;
  const walkable = rates.filter(usable);
  const selected = whole === null ? (rates.find((rate) => rate.rateId === selectedId && rate.withinLimit) ?? null) : null;
  const tabStop = cursor ?? selected?.rateId ?? walkable[0]?.rateId ?? null;

  const take = (rate: EngineRate) => {
    onSelect(rate.rateId);
    say(t("addon.shipping-kit.engine.say.chosen", { service: name(rate) }));
  };

  const press = (rate: EngineRate) => {
    if (!usable(rate)) return;
    setCursor(rate.rateId);
    if (rate.rateId === selected?.rateId) return;
    const fit = speedFit(rate, speed);
    if (fit !== null && fit !== "keeps") {
      setAsking({ rate, fit });
      return;
    }
    take(rate);
  };

  const onRowKey = (event: KeyboardEvent<HTMLButtonElement>, rate: EngineRate) => {
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0 || walkable.length === 0) return;
    event.preventDefault();
    const at = walkable.findIndex((one) => one.rateId === rate.rateId);
    const next = walkable[(at + step + walkable.length) % walkable.length]!;
    setCursor(next.rateId);
    rows.current.get(next.rateId)?.focus();
    if (!needsConfirm(speedFit(next, speed))) take(next);
  };

  const askedCopy = asking === null ? null : CONFIRM[asking.fit];
  const bookWords: ReactNode = busy ? t("addon.shipping-kit.engine.book.busy") : test ? t("addon.shipping-kit.engine.book.test") : t("addon.shipping-kit.engine.book.live");
  const selectedPrice = selected !== null && selected.priced && showMoney ? moneyText(selected.amountDecimal, selected.currency, locale) : null;

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={busy}
      data-testid="engine-rates"
      style={{ border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 14, padding: "16px 17px", minInlineSize: 0 }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px", marginBlockEnd: 12 }}>
        <h3 id={headingId} style={{ margin: 0, fontSize: 14, fontWeight: 800, flex: "1 1 auto" }}>
          {t("addon.shipping-kit.engine.rates.title")}
        </h3>
        {speed !== undefined && (
          <span style={{ ...pill("var(--fg)", "var(--accent-soft, var(--surface-3))"), fontSize: 12.5, fontWeight: 800, paddingBlock: 5, paddingInline: 11 }}>
            <Gauge size={14} aria-hidden="true" style={{ color: "var(--accent)" }} />
            <span dir="auto">{t("addon.shipping-kit.engine.rates.chose", { speed: speed.label })}</span>
          </span>
        )}
      </div>

      {access.usedToday !== undefined && access.dailyLabels !== undefined && (
        <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginBlockEnd: 10 }}>
          <Worded k="addon.shipping-kit.engine.rates.limit" figures={{ used: access.usedToday, limit: access.dailyLabels }} />
        </div>
      )}

      {whole !== null && (
        <div
          role="note"
          data-testid="engine-owner-block"
          style={{ display: "flex", gap: 10, alignItems: "flex-start", border: "1.5px solid var(--warn)", background: "var(--warn-soft)", borderRadius: 12, padding: "12px 14px", marginBlockEnd: 12 }}
        >
          <Lock size={17} aria-hidden="true" style={{ color: "var(--warn)", flex: "0 0 auto", marginBlockStart: 1 }} />
          <div style={{ minInlineSize: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{t("addon.shipping-kit.engine.rate.ownerBooks")}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)", marginBlockStart: 2 }}>
              {whole === "keepers" && speed !== undefined
                ? t("addon.shipping-kit.engine.rates.wholeKeepers", { speed: speed.label })
                : t("addon.shipping-kit.engine.rates.wholeAll")}
            </div>
          </div>
        </div>
      )}

      {rates.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.engine.rates.none")}</p>
      ) : (
        <div role="radiogroup" aria-labelledby={headingId} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {rates.map((rate) => {
            const on = selected?.rateId === rate.rateId;
            const off = !usable(rate);
            const fit = speedFit(rate, speed);
            const hand = HANDOVER[rate.handover ?? "unknown"];
            const HandIcon = hand.icon;
            return (
              <button
                key={rate.rateId}
                ref={(node) => {
                  if (node === null) rows.current.delete(rate.rateId);
                  else rows.current.set(rate.rateId, node);
                }}
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={off || undefined}
                tabIndex={rate.rateId === tabStop ? 0 : -1}
                onClick={() => press(rate)}
                onKeyDown={(event) => onRowKey(event, rate)}
                style={{
                  textAlign: "start",
                  color: "var(--fg)",
                  border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
                  background: on ? "var(--accent-soft, var(--surface-2))" : "var(--surface-2)",
                  borderRadius: 11,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  minBlockSize: TOUCH,
                  opacity: !rate.withinLimit || (busy && !on) ? 0.6 : 1,
                  cursor: off ? "not-allowed" : "pointer",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ inlineSize: 19, blockSize: 19, borderRadius: 99, border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong)"}`, display: "grid", placeItems: "center", flex: "0 0 auto", marginBlockStart: 1 }}
                >
                  <span style={{ inlineSize: 9, blockSize: 9, borderRadius: 99, background: on ? "var(--accent)" : "transparent" }} />
                </span>
                <span style={{ flex: 1, minInlineSize: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span dir="auto" style={{ alignSelf: "flex-start", fontSize: 13.5, fontWeight: 700, overflowWrap: "anywhere" }}>{name(rate)}</span>
                  <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                    <Arrival rate={rate} />
                  </span>
                  <span style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: "var(--fg-muted)" }}>
                    <HandIcon size={13} aria-hidden="true" style={{ marginBlockStart: 2, flex: "0 0 auto" }} />
                    <span>{t(hand.key, { company: rate.carrier ?? kitBrand().name })}</span>
                  </span>
                  {(fit !== null || !rate.withinLimit) && (
                    <span style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBlockStart: 3 }}>
                      {fit !== null && <span style={pill(FIT[fit].fg, FIT[fit].bg)}>{t(FIT[fit].key)}</span>}
                      {!rate.withinLimit && (
                        <span style={pill("var(--warn)", "var(--warn-soft)")}>
                          <Lock size={11} aria-hidden="true" />
                          {t("addon.shipping-kit.engine.rate.ownerBooks")}
                        </span>
                      )}
                    </span>
                  )}
                </span>
                {rate.priced && showMoney && (
                  <Mono style={{ fontSize: 14, fontWeight: 600, flex: "0 0 auto" }}>{moneyText(rate.amountDecimal, rate.currency, locale)}</Mono>
                )}
              </button>
            );
          })}
        </div>
      )}

      {whole === null && rates.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 16px", marginBlockStart: 14, paddingBlockStart: 14, borderBlockStart: "1px solid var(--border)" }}>
          {selected === null ? (
            <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.engine.book.pick")}</span>
          ) : (
            <>
              <FlowButton variant="accent" busy={busy} onClick={onBook} testId="engine-book">
                {busy && <LoaderCircle size={16} aria-hidden="true" />}
                <span>{bookWords}</span>
              </FlowButton>
              {selectedPrice !== null && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minInlineSize: 0, flex: "1 1 200px" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>
                    <Worded k="addon.shipping-kit.engine.book.total" figures={{ amount: selectedPrice }} />
                  </span>
                  {!test && <span style={{ fontSize: 12, lineHeight: 1.45, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.engine.book.charges")}</span>}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {busy && <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginBlockStart: 10 }}>{t("addon.shipping-kit.engine.book.wait")}</div>}

      {asking !== null && askedCopy !== null && (
        <Dialog labelledBy={dialogId} onClose={() => setAsking(null)}>
          <h2 id={dialogId} style={{ margin: 0, fontSize: 16.5, fontWeight: 800, lineHeight: 1.35 }}>
            {t(askedCopy.title)}
          </h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--fg-muted)" }}>
            {asking.fit === "slower" ? (
              <Worded
                k={askedCopy.body}
                figures={{ n: asking.rate.estimatedDays ?? 0 }}
                words={{ customer, speed: speed?.label ?? "", service: name(asking.rate) }}
              />
            ) : (
              t(askedCopy.body, { customer, speed: speed?.label ?? "", service: name(asking.rate) })
            )}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBlockStart: 4 }}>
            <FlowButton variant="ghost" firstFocus onClick={() => setAsking(null)} testId="engine-confirm-keep">
              {t(askedCopy.keep)}
            </FlowButton>
            <FlowButton
              variant="solid"
              onClick={() => {
                take(asking.rate);
                setAsking(null);
              }}
              testId="engine-confirm-use"
            >
              {t(askedCopy.ok)}
            </FlowButton>
          </div>
        </Dialog>
      )}
    </section>
  );
}
