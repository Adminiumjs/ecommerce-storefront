/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/OpenParcelsRefresh.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * "REFRESH OPEN PARCELS" for an order list (S42).
 *
 * A PERSON OPENING THE LIST IS THE ONLY TRIGGER (D11). It runs once when the
 * list mounts with old data, and again only when someone presses the button.
 * There is no timer and no background call. The engine holds its own cool-down,
 * so two people opening the list cost one round of carrier calls.
 *
 * WHAT IS "OLD". The list hands in the oldest check it knows and its own clock,
 * because this bundle reads none. A list that cannot say (staff without the
 * manager's tracking read) counts as old, and the engine's cool-down answers.
 *
 * "Last checked" is the OLDEST check among the open parcels, so a list never
 * reads fresher than its stalest parcel (S3-F19).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { EngineCarrier, EngineRefreshOpen } from "../../host/engine-carrier.ts";

import { useLocale, useT } from "../i18n/t.ts";
import { engineCarrier } from "../runtime.ts";
import { Mono } from "./atoms.tsx";
import { readFailure, stampOf, timeOf } from "./engine/flow.ts";
import { FlowButton } from "./engine/parts.tsx";

/** Older than this, a list's tracking is worth asking about when someone opens it. */
export const OPEN_PARCELS_OLD_AFTER_MS = 60 * 60_000;

/** A press already on its way: two lists mounting together ask once. */
const flying = new WeakMap<EngineCarrier, Promise<EngineRefreshOpen>>();

function askOnce(client: EngineCarrier): Promise<EngineRefreshOpen> {
  const held = flying.get(client);
  if (held !== undefined) return held;
  const asked = client.refreshOpenParcels().finally(() => flying.delete(client));
  flying.set(client, asked);
  return asked;
}

export function isOldList(oldestCheckedAt: number | null | undefined, nowMs: number | undefined, oldAfterMs: number): boolean {
  if (oldestCheckedAt === null || oldestCheckedAt === undefined || nowMs === undefined) return true;
  return nowMs - oldestCheckedAt >= oldAfterMs;
}

export interface OpenParcelsRefreshProps {
  /** The oldest check this list knows of, in ms. Absent or null when it does not know. */
  oldestCheckedAt?: number | null | undefined;
  /** The host's clock, in ms. */
  nowMs?: number | undefined;
  /** How old counts as old. Defaults to an hour. */
  oldAfterMs?: number | undefined;
  /** False on an empty list: nothing is asked and the button is off. */
  hasOpenParcels?: boolean | undefined;
  /** Hears each answer, so the list can read its rows again. */
  onRefreshed?: ((result: EngineRefreshOpen) => void) | undefined;
}

export function OpenParcelsRefresh({ oldestCheckedAt, nowMs, oldAfterMs = OPEN_PARCELS_OLD_AFTER_MS, hasOpenParcels = true, onRefreshed }: OpenParcelsRefreshProps) {
  const t = useT();
  const locale = useLocale();
  const client = engineCarrier();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EngineRefreshOpen | null>(null);
  const [fault, setFault] = useState<string | null>(null);
  const [lastGood, setLastGood] = useState<{ at: number | null; never: number } | null>(null);
  const ran = useRef(false);
  const heard = useRef(onRefreshed);
  heard.current = onRefreshed;

  const run = useCallback(async () => {
    if (client === null) return;
    setBusy(true);
    setFault(null);
    try {
      const answer = await askOnce(client);
      setResult(answer);
      // An idle "recent" reply carries no ages, so it must not blank the ones already shown.
      if (answer.oldestCheckedAt !== null || answer.neverChecked > 0) setLastGood({ at: answer.oldestCheckedAt, never: answer.neverChecked });
      heard.current?.(answer);
    } catch (err) {
      setFault(
        t(readFailure(err).code === "CSRF_FAILED" ? "addon.shipping-kit.engine.refused.csrf.next" : "addon.shipping-kit.engine.openParcels.failed"),
      );
    } finally {
      setBusy(false);
    }
  }, [client, t]);

  useEffect(() => {
    if (client === null || ran.current || !hasOpenParcels) return;
    if (!isOldList(oldestCheckedAt, nowMs, oldAfterMs)) return;
    ran.current = true;
    void run();
  }, [client, hasOpenParcels, nowMs, oldAfterMs, oldestCheckedAt, run]);

  if (client === null) return null;

  const checkedAt = lastGood === null ? (oldestCheckedAt ?? null) : lastGood.never > 0 ? null : lastGood.at;

  let line: string | null = null;
  if (result !== null) {
    if (result.outcome === "recent") {
      line = result.retryAt === null ? t("addon.shipping-kit.engine.openParcels.recent") : t("addon.shipping-kit.engine.openParcels.recentAt", { time: timeOf(result.retryAt, locale) });
    } else if (result.outcome === "rate-limited") {
      line = result.retryAt === null ? t("addon.shipping-kit.engine.openParcels.limited") : t("addon.shipping-kit.engine.openParcels.limitedAt", { time: timeOf(result.retryAt, locale) });
    } else if (result.checked === 0 && result.failed === 0 && result.remaining === 0) {
      line = t("addon.shipping-kit.engine.openParcels.none");
    } else {
      line = t("addon.shipping-kit.engine.openParcels.done", { checked: result.checked, updated: result.updated });
      if (result.failed > 0) line = `${line} ${t("addon.shipping-kit.engine.openParcels.failedSome", { failed: result.failed })}`;
    }
  }
  const more = result !== null && result.outcome !== "recent" && (result.more || result.remaining > 0);

  return (
    <div data-testid="open-parcels" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, minInlineSize: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: "8px 10px" }}>
        <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.engine.track.lastChecked")}</span>
        <Mono style={{ fontSize: 12.5, fontWeight: 500 }}>
          <span data-testid="open-parcels-checked">{checkedAt === null ? t("addon.shipping-kit.engine.track.never") : stampOf(checkedAt, locale)}</span>
        </Mono>
        <FlowButton
          variant="ghost"
          busy={busy}
          disabled={!hasOpenParcels}
          onClick={() => void run()}
          testId="open-parcels-refresh"
          style={{ fontSize: 13, fontWeight: 700, padding: "8px 13px" }}
        >
          <RefreshCw size={14} aria-hidden="true" />
          {busy ? t("addon.shipping-kit.engine.unknown.checking") : t("addon.shipping-kit.engine.openParcels.refresh")}
        </FlowButton>
      </div>
      <div role="status" aria-live="polite" data-testid="open-parcels-line" style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--fg-muted)", textAlign: "end" }}>
        {fault ?? line}
        {fault === null && more ? ` ${t("addon.shipping-kit.engine.openParcels.more")}` : ""}
      </div>
    </div>
  );
}
