/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/engine/EngineGate.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * WHICH DISPATCH FLOW THIS ORDER GETS, decided by the engine.
 *
 * With a client in hand, `access()` says whether this add-on really is the
 * shop's carrier. Only then does the real flow draw. Otherwise the demo keeps
 * working as it always has, or the screen says no account is connected.
 *
 * An answer that never came is NOT a "no": the demo switch is on by default, so
 * falling back to it during an outage would show a real shop a pretend booking.
 * It says it could not check, and offers to try again.
 *
 * A 403 IS A "NO" FROM THE ENGINE, about this person and this shop. The demo's
 * Book button on a real order would tell them they can do what they cannot, so
 * a 403 draws the no-access card whatever the demo switch says.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CircleX, LoaderCircle, Lock, RefreshCw } from "lucide-react";
import type { DispatchPayload } from "../../../host/index.ts";
import type { EngineAccess, EngineCarrier } from "../../../host/engine-carrier.ts";

import { kitBrand } from "../../brand.ts";
import { useT } from "../../i18n/t.ts";
import { isDemo } from "../../runtime.ts";
import { NotConnected } from "../account.tsx";
import { EngineDispatch } from "../EngineDispatch.tsx";
import { readFailure } from "./flow.ts";
import { FlowButton, StatusCard } from "./parts.tsx";

type GateState = { kind: "asking" } | { kind: "signed-out" } | { kind: "no-right" } | { kind: "failed" } | { kind: "answered"; access: EngineAccess };

export function EngineGate({ client, payload, demo }: { client: EngineCarrier; payload: DispatchPayload; demo: ReactNode }) {
  const t = useT();
  const [state, setState] = useState<GateState>({ kind: "asking" });

  const ask = useCallback(() => {
    let live = true;
    setState({ kind: "asking" });
    client.access().then(
      (access) => {
        if (live) setState({ kind: "answered", access });
      },
      (err: unknown) => {
        if (!live) return;
        const { status } = readFailure(err);
        setState({ kind: status === 403 ? "no-right" : status === 401 ? "signed-out" : "failed" });
      },
    );
    return () => {
      live = false;
    };
  }, [client]);

  useEffect(() => ask(), [ask]);

  if (state.kind === "asking") {
    return (
      <div role="status" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--fg-muted)" }}>
        <LoaderCircle size={15} aria-hidden="true" />
        {t("addon.shipping-kit.engine.loading")}
      </div>
    );
  }

  if (state.kind === "failed") {
    return (
      <StatusCard
        tone="warn"
        icon={<CircleX size={20} />}
        testId="engine-gate-failed"
        title={t("addon.shipping-kit.engine.gate.failed.title")}
        body={t("addon.shipping-kit.engine.gate.failed.body")}
        actions={
          <FlowButton variant="accent" onClick={ask} testId="engine-gate-retry">
            <RefreshCw size={15} aria-hidden="true" />
            {t("addon.shipping-kit.engine.retry")}
          </FlowButton>
        }
      />
    );
  }

  if (state.kind === "signed-out" && isDemo()) return <>{demo}</>;

  if (state.kind === "signed-out" || state.kind === "no-right") {
    return (
      <StatusCard
        tone="neutral"
        icon={<Lock size={20} />}
        testId="engine-gate-no-right"
        title={t("addon.shipping-kit.engine.gate.noRight.title")}
        body={t("addon.shipping-kit.engine.gate.noRight.body")}
      />
    );
  }

  const { access } = state;
  if (access.carrier !== kitBrand().addOnKey || access.mode === null) {
    return isDemo() ? <>{demo}</> : <NotConnected />;
  }

  const source = payload.order.source;
  if (source === undefined || !access.appUpdated) {
    return (
      <StatusCard
        tone="warn"
        icon={<CircleX size={20} />}
        testId="engine-gate-app-update"
        title={t("addon.shipping-kit.engine.gate.appUpdate.title")}
        body={t("addon.shipping-kit.engine.gate.appUpdate.body")}
      />
    );
  }

  return <EngineDispatch key={`${source.table}:${source.id}`} client={client} access={access} payload={payload} source={source} />;
}
