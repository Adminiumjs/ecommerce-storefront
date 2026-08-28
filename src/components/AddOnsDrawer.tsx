// The shop's own add-on drawer: what is connected, what each one is allowed to
// do, what disconnecting costs, and each one's own settings form.
//
// ── WHY THIS SURFACE HAD TO BE BUILT RATHER THAN FOUND ──────────────────────
//
// `settings.add-on.panel` is `surface: 'admin'` and `fill: 'per-add-on'` — one
// add-on's own form, rendered where a shop configures things — and this app had
// nowhere to mount it. It contains no settings screen of any kind: the
// merchant's half of this product is Adminium's generated dashboard, built from
// the same `manifest.json`, and it lives on the other side of the API.
//
// That is not a contradiction, and the reason is worth stating because it looks
// like one. An add-on that fills a customer surface has to be switchable ON
// somewhere the customer surface can see, and the only thing that can hold that
// switch in a static single-page storefront is the storefront. So this drawer
// is the shop owner's corner of their own site — the one place in this bundle
// that is addressed to them rather than to a shopper — and it says so in its
// first sentence.
//
// ── AND IT CAPTIONS ITS OWN SCOPE, ON SCREEN ────────────────────────────────
//
// `addon.host.manage.scope` is not a note for a reader of this file. A shop
// owner who connects a delivery company here and then goes looking for a Book
// collection button will not find one, because booking a collection is
// `order.dispatch.actions` — a warehouse surface — and this app declares only a
// customer frontend. Leaving them to discover that by its absence would be the
// worst kind of documentation, so the drawer says which half of the product
// they are looking at before they connect anything.
//
// ── NOTHING IN HERE NAMES A COMPANY ─────────────────────────────────────────
//
// Every word specific to an add-on arrives inside the object `register()`
// returned: `addOn.name` is its product name, `addOn.monogram` is the three
// letters it puts on a neutral tile, `lineKey` and `whatKey` and every
// permission and disconnect key are looked up in the merged message bundle.
// This file renders them; it does not know what any of them say. That is
// acceptance criterion 5, and `add-ons/addOns.test.ts` greps for it.

import { AddOnSlot } from "../add-ons/slot.tsx";
import { isConnectable, type AddOn } from "../add-ons/vendor/host/index.ts";
import { sampleCatalogue } from "../add-ons/records.ts";
import { useI18n, type MessageKey } from "../i18n";
import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";

/**
 * THE NOT-AFFILIATED LINE, as its own component (24 AC6).
 *
 * A component and not an inline paragraph because the source half of the
 * affiliation gate looks for exactly this: any of this app's own `.tsx` files
 * that prints `addOn.name`, `addOn.shortName` or `addOn.monogram` must also
 * mount an `Affiliation`. A grep is what covers the surface nobody thought of —
 * which is how the defect arrived in the first place, with three dialogs
 * carrying the line correctly and a fourth screen not.
 *
 * The sentence itself names no company and is the host's own copy: it is a
 * statement about Adminium's relationship to whoever an add-on connects to, so
 * it belongs to the platform rather than to any one add-on. The add-ons carry
 * their own version of it for their own surfaces, which the rendered half of
 * the gate checks separately.
 */
function Affiliation() {
  const { t } = useI18n();
  return (
    <p
      style={{
        margin: 0,
        fontSize: "11.5px",
        color: "var(--fg-subtle)",
        lineHeight: 1.5,
      }}
    >
      {t("addon.host.notAffiliated")}
    </p>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: ".05em",
        textTransform: "uppercase",
        color: "var(--fg-subtle)",
        marginBottom: "8px",
      }}
    >
      {children}
    </div>
  );
}

function AddOnCard({ addOn }: { addOn: AddOn }) {
  const { t } = useI18n();
  const enabled = useStore((s) => s.enabled);
  const toggleAddOn = useStore((s) => s.toggleAddOn);
  const patchAddOnSettings = useStore((s) => s.patchAddOnSettings);
  const products = useStore((s) => s.products);

  const on = enabled.has(addOn.key);
  /*
   * The key is a machine key that arrived on the add-on object, so the compiler
   * cannot check it against `MessageKey` — that is exactly what registration
   * took over from the type system, and `registerAddOnMessages` throws at boot
   * on a bundle that is missing one. The cast says "this is a runtime key", not
   * "trust me".
   */
  const line = t(addOn.lineKey as MessageKey);

  return (
    <section
      className="sf-addon-card"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "16px",
        background: "var(--surface)",
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "13px" }}>
        {/*
          THREE LETTERS ON A NEUTRAL TILE — never a mark, drawn or traced (24
          D12). The letters are the add-on's own `monogram`; this app does not
          know what they spell and has no image of anybody's logo anywhere.
         */}
        <span
          aria-hidden="true"
          style={{
            inlineSize: "38px",
            blockSize: "38px",
            borderRadius: "11px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: ".02em",
            color: "var(--fg-muted)",
          }}
        >
          {addOn.monogram}
        </span>
        <div style={{ flex: 1, minInlineSize: 0 }}>
          <div style={{ fontSize: "14.5px", fontWeight: 800, letterSpacing: "-.01em" }}>
            {addOn.name}
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--fg-muted)",
              lineHeight: 1.5,
              marginTop: "3px",
            }}
          >
            {line}
          </div>
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "5px 10px",
            borderRadius: "20px",
            whiteSpace: "nowrap",
            color: on ? "var(--pos)" : "var(--fg-subtle)",
            background: on ? "var(--pos-soft)" : "var(--surface-2)",
          }}
        >
          {t(on ? "addon.host.manage.connected" : "addon.host.manage.notConnected")}
        </span>
      </div>

      <div>
        <Eyebrow>{t("addon.host.manage.permissions")}</Eyebrow>
        <ul
          style={{
            margin: 0,
            paddingInlineStart: "18px",
            fontSize: "12.5px",
            color: "var(--fg-muted)",
            lineHeight: 1.6,
          }}
        >
          {addOn.permissions.map((permission) => (
            <li key={permission.key}>{t(permission.key as MessageKey)}</li>
          ))}
        </ul>
      </div>

      {/*
        WHAT A DISCONNECT COSTS, IN WORDS, BEFORE IT HAPPENS (24 D16).

        Both sentences are the ADD-ON's — it is the only party that knows what
        it leaves behind — and they are rendered whether or not it is currently
        connected, because the question a shop asks before pressing Connect is
        "what happens if I change my mind?".
       */}
      {addOn.disconnect !== undefined && (
        <div style={{ display: "grid", gap: "10px" }}>
          <div>
            <Eyebrow>{t("addon.host.manage.goes")}</Eyebrow>
            <div style={{ fontSize: "12.5px", color: "var(--fg-muted)", lineHeight: 1.5 }}>
              {t(addOn.disconnect.goesKey as MessageKey)}
            </div>
          </div>
          <div>
            <Eyebrow>{t("addon.host.manage.stays")}</Eyebrow>
            <div style={{ fontSize: "12.5px", color: "var(--fg-muted)", lineHeight: 1.5 }}>
              {t(addOn.disconnect.staysKey as MessageKey)}
            </div>
          </div>
        </div>
      )}

      {/*
        SLOT — this add-on's own settings form, and only this one's.

        `forAddOn` is what `per-add-on` means: the drawer asks for the panel of
        the add-on whose card this is and gets that one, not all of them. The
        add-on renders its own controls, its own labels and the sentence under
        each one; this app supplies the two things the add-on cannot know.

        IT SPEAKS WHEN EMPTY, because the heading above it is this app's and a
        heading with a gap under it is a hole. An add-on with nothing to
        configure says so in one line.
       */}
      <div>
        <Eyebrow>{t("addon.host.manage.settings")}</Eyebrow>
        <AddOnSlot
          slot="settings.add-on.panel"
          forAddOn={addOn.key}
          payload={{
            patch: (values: Record<string, unknown>) => patchAddOnSettings(addOn.key, values),
            /*
             * WHAT THE SHOP KNOWS AND NO ADD-ON DOES: its own catalogue, one
             * row per family. Nothing is estimated here — an add-on with an
             * opinion about these forms it with its own engine.
             *
             * REQUIRED, and the reason is in the payload's own comment: the
             * second host to mount this slot passed `{ patch }` alone, `tsc`
             * was happy, and the settings form threw on `.map`.
             */
            samples: sampleCatalogue(products),
          }}
          fallback={
            <div style={{ fontSize: "12.5px", color: "var(--fg-muted)" }}>
              {t("addon.host.manage.noSettings")}
            </div>
          }
        />
      </div>

      <button
        className="sf-btn"
        onClick={() => toggleAddOn(addOn.key)}
        style={{
          alignSelf: "flex-start",
          padding: "10px 18px",
          borderRadius: "11px",
          border: on ? "1px solid var(--border-strong)" : "none",
          background: on ? "var(--surface-2)" : "var(--accent)",
          color: on ? "var(--fg)" : "var(--accent-fg)",
          fontWeight: 700,
          fontSize: "13.5px",
          cursor: "pointer",
        }}
      >
        {t(on ? "addon.host.manage.disconnect" : "addon.host.manage.connect")}
      </button>

      <Affiliation />
    </section>
  );
}

export function AddOnsDrawer() {
  const { t } = useI18n();
  const open = useStore((s) => s.addOnsOpen);
  const closeAddOns = useStore((s) => s.closeAddOns);
  const registry = useStore((s) => s.registry);

  if (!open) return null;

  /*
   * `isConnectable` filters out the shelf entries an add-on catalogue may carry
   * to describe something that is not in a given build. This app registers
   * none of those — see `add-ons/registry.ts` for why a customer-facing
   * storefront's drawer is not a marketplace page — so today the filter removes
   * nothing and the empty branch below is unreachable. Both stay, because the
   * day a second add-on is registered is the day nobody re-reads this file, and
   * a list that silently rendered an unconnectable row would show a Connect
   * button that does nothing.
   */
  const rows = registry.all.filter(isConnectable);

  return (
    <div
      onClick={closeAddOns}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 210,
        background: "rgba(10,10,15,.5)",
        backdropFilter: "blur(3px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sf-scroll sf-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("addon.host.manage.title")}
        style={{
          inlineSize: "460px",
          maxInlineSize: "94vw",
          blockSize: "100%",
          overflowY: "auto",
          background: "var(--bg)",
          borderInlineStart: "1px solid var(--border)",
          padding: "22px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1, minInlineSize: 0 }}>
            <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 800, letterSpacing: "-.02em" }}>
              {t("addon.host.manage.title")}
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "12.5px",
                color: "var(--fg-muted)",
                lineHeight: 1.55,
              }}
            >
              {t("addon.host.manage.sub")}
            </p>
          </div>
          <button
            className="sf-gi"
            onClick={closeAddOns}
            aria-label={t("addon.host.manage.close")}
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface)",
              borderRadius: "10px",
              padding: "7px",
              cursor: "pointer",
              color: "var(--fg-muted)",
              display: "flex",
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/*
          WHICH HALF OF THE PRODUCT THIS IS — on the screen, before anything is
          connected. See this file's header: a shop owner who connects a
          delivery company here and goes hunting for a Book collection button is
          owed this sentence rather than its absence.
         */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "var(--accent-soft)",
            border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
          }}
        >
          <Icon
            name="info"
            size={17}
            color="var(--accent)"
            style={{ flexShrink: 0, marginTop: "1px" }}
          />
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: 700 }}>
              {t("addon.host.manage.scopeTitle")}
            </div>
            <div
              style={{
                fontSize: "12.5px",
                color: "var(--fg-muted)",
                lineHeight: 1.55,
                marginTop: "3px",
              }}
            >
              {t("addon.host.manage.scope")}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <p style={{ margin: 0, fontSize: "13px", color: "var(--fg-muted)" }}>
            {t("addon.host.manage.empty")}
          </p>
        ) : (
          rows.map((addOn) => <AddOnCard key={addOn.key} addOn={addOn} />)
        )}
      </div>
    </div>
  );
}
