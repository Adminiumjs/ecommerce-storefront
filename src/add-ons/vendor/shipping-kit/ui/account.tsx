/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/account.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * WHO ANSWERS FOR THE CARRIER, SAID ON THE SCREEN.
 *
 * Two states a works must know about before it presses "Get rates":
 *
 *  - `NotConnected`: the demo carrier is off and no carrier account answers this
 *    shop. Nothing is quoted or booked; the card says how to connect the
 *    account, or how to try the flow with the demo carrier instead.
 *  - `DemoNotice`: the demo carrier is on (the default). It answers, and the
 *    line says nothing goes to the carrier until the account is connected.
 *
 * Shared by the dispatch flow and the return label, so the two say the same.
 */

import { kitBrand } from "../brand.ts";
import { PlugZap } from "lucide-react";

import { useT } from "../i18n/t.ts";
import { Monogram, NotAffiliated, Panel, PanelTitle } from "./atoms.tsx";

export function NotConnected() {
  const t = useT();
  return (
    <Panel>
      <div data-testid="carrier-not-connected" role="status" style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
        <Monogram letters={kitBrand().monogram} size={34} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minInlineSize: 0 }}>
          <PanelTitle>
            <PlugZap size={15} aria-hidden="true" style={{ marginInlineEnd: 6, verticalAlign: "-2px" }} />
            {t("addon.shipping-kit.account.notConnectedTitle")}
          </PanelTitle>
          <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.account.notConnectedBody")}</span>
          <NotAffiliated>{t("addon.shipping-kit.notAffiliated")}</NotAffiliated>
        </div>
      </div>
    </Panel>
  );
}

export function DemoNotice() {
  const t = useT();
  return (
    <span data-testid="carrier-demo-notice" style={{ flexBasis: "100%", fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)" }}>
      {t("addon.shipping-kit.account.demoNotice")}
    </span>
  );
}
