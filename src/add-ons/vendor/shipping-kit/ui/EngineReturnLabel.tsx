/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/EngineReturnLabel.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * A RETURN LABEL FOR ONE APPROVED RETURN, for the owner (D12).
 *
 * Bought through the engine, which decides everything that matters: that this
 * person is the owner, that the return is approved and belongs to this order,
 * and that the parcel travels from the customer to the shop. This screen asks
 * for a real weight and size, and says what the label costs before it is bought.
 *
 * Draws nothing for anyone else or for any other record.
 */

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { RecordActionsPayload } from "../../host/index.ts";
import { classifyBookFailure } from "../../host/contracts/index.ts";
import type { EngineAccess, EngineBooking, EngineQuote } from "../../host/engine-carrier.ts";

import { useLocale, useT } from "../i18n/t.ts";
import { engineCarrier } from "../runtime.ts";
import { inputStyle } from "./atoms.tsx";
import { decimalMarkOf, moneyText, readFailure, readSize, readWeight, type EngineRate } from "./engine/flow.ts";
import { LabelCard } from "./engine/LabelCard.tsx";
import { FlowButton } from "./engine/parts.tsx";

const SERVED_ENTITY = "return";

export function EngineReturnLabel({ payload }: { payload: RecordActionsPayload }) {
  const t = useT();
  const locale = useLocale();
  const weightId = useId();
  const sizeId = useId();
  const client = engineCarrier();
  const order = payload.order;
  const returnId = payload.recordId;
  const served = payload.entity === SERVED_ENTITY && order !== undefined && client !== null;
  const [access, setAccess] = useState<EngineAccess | null>(null);
  const [held, setHeld] = useState<EngineBooking | null>(null);
  const [weight, setWeight] = useState("");
  const [size, setSize] = useState("");
  const [quote, setQuote] = useState<EngineQuote | null>(null);
  const [rateId, setRateId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fault, setFault] = useState<"badFigures" | "failed" | "unclear" | "abroad" | null>(null);
  const mark = useMemo(() => decimalMarkOf(locale), [locale]);

  const load = useCallback(async () => {
    if (!served) return;
    const [who, list] = await Promise.all([client.access(), client.bookings({ table: order.table, id: order.id, purpose: "return", returnId })]);
    setAccess(who);
    const mine = list.bookings.filter((one) => one.purpose === "return" && one.parcelNumber === list.parcelNumber && one.test === (who.mode === "test"));
    setHeld(mine.filter((one) => one.state !== "refused" && one.state !== "released" && one.state !== "voided").at(-1) ?? null);
  }, [served, client, order?.table, order?.id, returnId]);

  useEffect(() => {
    void load().catch(() => setFault("failed"));
  }, [load]);

  if (!served || access === null || !access.manages || !access.activeHere) return null;

  const figures = () => {
    const w = readWeight(weight, mark);
    const s = readSize(size, mark);
    return w.ok && s.ok ? { weightKg: w.weightKg, lengthCm: s.lengthCm, widthCm: s.widthCm, heightCm: s.heightCm } : null;
  };

  const getRates = async () => {
    const parcel = figures();
    setFault(null);
    setQuote(null);
    if (parcel === null) {
      setFault("badFigures");
      return;
    }
    setBusy(true);
    try {
      const answer = await client.quote({ source: { table: order.table, id: order.id }, parcel: { ...parcel, contents: String(payload.record["number"] ?? returnId) }, purpose: "return", returnId });
      setQuote(answer);
      setRateId((answer.rates as readonly EngineRate[]).find((one) => one.withinLimit)?.rateId ?? null);
    } catch (err) {
      setFault(readFailure(err).code === "CUSTOMS_ONE_PARCEL" ? "abroad" : "failed");
    } finally {
      setBusy(false);
    }
  };

  const buy = async () => {
    if (quote === null || rateId === null || busy) return;
    setBusy(true);
    setFault(null);
    try {
      setHeld(await client.book({ quoteId: quote.quoteId, rateId, returnId }));
      setQuote(null);
    } catch (err) {
      setFault(classifyBookFailure(err).outcome === "refused" ? "failed" : "unclear");
      void load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  if (held !== null && (held.state === "booked" || held.state === "voiding")) {
    return <LabelCard booking={held} access={access} client={client} handover={undefined} orderRef={String(payload.record["number"] ?? returnId)} many={false} takeFocus={false} say={() => undefined} onChange={setHeld} onStale={() => void load()} />;
  }
  if (held !== null) return <div role="status" data-testid="engine-return-unclear" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--warn)" }}>{t("addon.shipping-kit.engine.return.unclear")}</div>;

  const rates = (quote?.rates ?? []) as readonly EngineRate[];
  return (
    <section data-testid="engine-return" style={{ display: "flex", flexDirection: "column", gap: 10, border: "1px solid var(--border)", borderRadius: 12, padding: 14, minInlineSize: 0 }}>
      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{t("addon.shipping-kit.engine.return.title")}</h4>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.engine.return.charged")}</div>
      <label htmlFor={weightId} style={{ fontSize: 12.5, fontWeight: 700 }}>{t("addon.shipping-kit.engine.return.weight")}</label>
      <input id={weightId} inputMode="decimal" value={weight} onChange={(event) => { setWeight(event.target.value); setQuote(null); }} style={inputStyle} data-testid="engine-return-weight" />
      <label htmlFor={sizeId} style={{ fontSize: 12.5, fontWeight: 700 }}>{t("addon.shipping-kit.engine.return.size")}</label>
      <input id={sizeId} value={size} onChange={(event) => { setSize(event.target.value); setQuote(null); }} style={inputStyle} data-testid="engine-return-size" />
      <div><FlowButton variant="ghost" busy={busy} onClick={() => void getRates()} testId="engine-return-rates">{t("addon.shipping-kit.engine.return.rates")}</FlowButton></div>
      {rates.length > 0 && (
        <div role="radiogroup" aria-label={t("addon.shipping-kit.engine.return.rates")} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rates.map((rate) => (
            <label key={rate.rateId} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input type="radio" name={weightId} checked={rateId === rate.rateId} disabled={!rate.withinLimit} onChange={() => setRateId(rate.rateId)} />
              <span dir="auto" style={{ flex: 1 }}>{rate.service}</span>
              {rate.priced && <strong dir="ltr">{moneyText(rate.amountDecimal, rate.currency, locale)}</strong>}
            </label>
          ))}
          <div><FlowButton variant="accent" busy={busy} disabled={rateId === null} onClick={() => void buy()} testId="engine-return-buy">{t("addon.shipping-kit.engine.return.buy")}</FlowButton></div>
        </div>
      )}
      {fault !== null && <div role="alert" data-testid="engine-return-fault" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--danger)" }}>{t(`addon.shipping-kit.engine.return.${fault}`)}</div>}
    </section>
  );
}
