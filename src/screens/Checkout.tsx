// Checkout: a 4-step flow (Contact → Shipping → Delivery → Payment) with a
// revisitable stepper, per-step validation, a demo Stripe-Elements-style card
// field, and a sticky order summary.

import {
  FREE_SHIP,
  SHIP_EXPRESS,
  SHIP_OVERNIGHT,
  SHIP_STANDARD,
} from "../data/demo.ts";
import type { ShipMethod } from "../data/types.ts";
import { useI18n, type MessageKey } from "../i18n";
import { money } from "../lib/format.ts";
import { hexToRgba } from "../lib/placeholders.ts";
import { cartArr, computeTotals, subtotalOf } from "../lib/pricing.ts";
import type { Form } from "../state/store.ts";
import { useStore } from "../state/store.ts";
import { Checkbox } from "../components/Checkbox.tsx";
import { Icon } from "../components/Icon.tsx";
import { ProductImage } from "../components/ProductImage.tsx";
import { backArrow, forwardArrow, rich } from "./shared.tsx";

/* Keys, not copy: these tables are built once at module load. */
const STEP_LABELS: MessageKey[] = [
  "screens.checkout.stepContact",
  "screens.checkout.stepShipping",
  "screens.checkout.stepDelivery",
  "screens.checkout.stepPayment",
];
const NEXT_LABELS: MessageKey[] = [
  "screens.checkout.nextShipping",
  "screens.checkout.nextDelivery",
  "screens.checkout.nextPayment",
];
/* ISO 3166 codes, not English names. `Intl.DisplayNames` renders each one in
 * the reader's language, so the picker says "Vereinigte Staaten" in de-DE
 * without a translator touching this list. */
const COUNTRY_CODES = ["US", "CA", "GB", "AU"];

function fieldStyle(err: string): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 13px",
    borderRadius: "11px",
    border: "1px solid " + (err ? "var(--danger)" : "var(--border-strong)"),
    background: "var(--surface-2)",
    fontSize: "14px",
    color: "var(--fg)",
    outline: "none",
  };
}

export function Checkout() {
  const { t, number, locale, dir } = useI18n();
  const st = useStore();
  const {
    form: f,
    errs: e,
    coStep: step,
    ship,
    promoOn,
    optIn,
    billingSame,
    cart,
    index,
  } = st;

  const lines = cartArr(cart, index);
  const sub = subtotalOf(lines);
  const tot = computeTotals(lines, ship, promoOn);

  const countryNames = new Intl.DisplayNames([locale], { type: "region" });

  const field = (name: keyof Form) => ({
    value: f[name],
    onChange: (
      ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => st.setField(name, ev.target.value),
    err: e[name] || "",
  });

  const cardErr = e.card
    ? t("screens.checkout.errCard")
    : e.exp || e.cvc
      ? t("screens.checkout.errExpCvc")
      : "";

  const dopts: {
    key: ShipMethod;
    name: string;
    desc: string;
    fee: string;
  }[] = [
    {
      key: "standard",
      name: t("screens.checkout.methodStandard"),
      desc: t("screens.checkout.descStandard"),
      fee: sub >= FREE_SHIP ? t("screens.summary.free") : money(SHIP_STANDARD),
    },
    {
      key: "express",
      name: t("screens.checkout.methodExpress"),
      desc: t("screens.checkout.descExpress"),
      fee: money(SHIP_EXPRESS),
    },
    {
      key: "overnight",
      name: t("screens.checkout.methodOvernight"),
      desc: t("screens.checkout.descOvernight"),
      fee: money(SHIP_OVERNIGHT),
    },
  ];

  const LabelledField = ({
    name,
    label,
    placeholder,
    optional,
  }: {
    name: keyof Form;
    label: string;
    placeholder: string;
    optional?: boolean;
  }) => {
    const fd = field(name);
    return (
      <div>
        <label
          style={{
            display: "block",
            fontSize: "12.5px",
            fontWeight: 600,
            marginBottom: "7px",
          }}
        >
          {label}{" "}
          {optional && (
            <span style={{ color: "var(--fg-subtle)", fontWeight: 500 }}>
              (optional)
            </span>
          )}
        </label>
        <input
          className="sf-fld"
          value={fd.value}
          onChange={fd.onChange}
          placeholder={placeholder}
          style={fieldStyle(fd.err)}
        />
        {fd.err && (
          <div style={{ fontSize: "12px", color: "var(--danger)", marginTop: "6px" }}>
            {fd.err}
          </div>
        )}
      </div>
    );
  };

  return (
    <main
      className="sf-screen"
      style={{
        maxWidth: "1060px",
        margin: "0 auto",
        padding: "clamp(18px,3vw,32px) clamp(16px,4vw,32px) 40px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "clamp(24px,3.5vw,52px)",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1.5, minWidth: "320px" }}>
          {/* stepper */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "clamp(22px,3vw,30px)",
            }}
          >
            {STEP_LABELS.map((lbl, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div key={lbl} style={{ display: "contents" }}>
                  <button
                    onClick={() => st.gotoStep(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "13px",
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono',monospace",
                        flexShrink: 0,
                        background: done || active ? "var(--accent)" : "var(--surface-2)",
                        color: done || active ? "var(--accent-fg)" : "var(--fg-subtle)",
                        border: done || active ? "none" : "1px solid var(--border-strong)",
                      }}
                    >
                      {done ? <Icon name="check" size={15} /> : number(i + 1)}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: active ? 800 : 600,
                        color: active
                          ? "var(--fg)"
                          : done
                            ? "var(--fg-muted)"
                            : "var(--fg-subtle)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t(lbl)}
                    </span>
                  </button>
                  {i < 3 && (
                    <span
                      style={{
                        flex: 1,
                        height: "2px",
                        margin: "0 8px",
                        background: done ? "var(--accent)" : "var(--border-strong)",
                        minWidth: "12px",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* step body */}
          {step === 0 && (
            <div
              className="sf-screen"
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, letterSpacing: "-.02em" }}>
                  {t("screens.checkout.stepContact")}
                </h2>
                <span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>
                  {rich(t("screens.checkout.haveAccount"), {
                    login: (
                      <button
                        className="sf-link"
                        onClick={st.onLogin}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "var(--accent)",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {t("screens.checkout.logIn")}
                      </button>
                    ),
                  })}
                </span>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    marginBottom: "7px",
                  }}
                >
                  {t("chrome.footer.emailAria")}
                </label>
                <input
                  className="sf-fld"
                  value={f.email}
                  onChange={(ev) => st.setField("email", ev.target.value)}
                  placeholder={t("chrome.footer.emailPlaceholder")}
                  style={fieldStyle(e.email || "")}
                />
                {e.email && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--danger)",
                      marginTop: "7px",
                    }}
                  >
                    <Icon name="alert-circle" size={13} />
                    {e.email}
                  </div>
                )}
              </div>
              <button
                onClick={st.toggleOptIn}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "11px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "2px 0",
                  textAlign: "start",
                }}
              >
                <Checkbox on={optIn} />
                <span style={{ fontSize: "13px", color: "var(--fg-muted)", lineHeight: 1.45 }}>
                  {t("screens.checkout.optIn")}
                </span>
              </button>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "13px 15px",
                  borderRadius: "12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon
                  name="user-round"
                  size={17}
                  color="var(--fg-subtle)"
                  style={{ flexShrink: 0, marginTop: "1px" }}
                />
                <span style={{ fontSize: "12.5px", color: "var(--fg-muted)", lineHeight: 1.5 }}>
                  {t("screens.checkout.guestNote")}
                </span>
              </div>
            </div>
          )}

          {step === 1 && (
            <div
              className="sf-screen"
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, letterSpacing: "-.02em" }}>
                {t("screens.checkout.shippingAddress")}
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,100%),1fr))",
                  gap: "14px",
                }}
              >
                <LabelledField
                  name="first"
                  label={t("screens.checkout.firstName")}
                  placeholder="Ava"
                />
                <LabelledField
                  name="last"
                  label={t("screens.checkout.lastName")}
                  placeholder="Reyes"
                />
              </div>
              <LabelledField
                name="addr"
                label={t("screens.checkout.streetAddress")}
                placeholder="118 Larkin St"
              />
              <LabelledField
                name="apt"
                label={t("screens.checkout.apartment")}
                placeholder="Apt 4"
                optional
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,100%),1fr))",
                  gap: "14px",
                }}
              >
                <LabelledField
                  name="city"
                  label={t("screens.checkout.city")}
                  placeholder="San Francisco"
                />
                <LabelledField
                name="zip"
                label={t("screens.checkout.zip")}
                placeholder="94102"
              />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    marginBottom: "7px",
                  }}
                >
                  {t("screens.checkout.country")}
                </label>
                <select
                  value={f.country}
                  onChange={(ev) => st.setField("country", ev.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 13px",
                    borderRadius: "11px",
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface-2)",
                    fontSize: "14px",
                    color: "var(--fg)",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {COUNTRY_CODES.map((co) => (
                    <option key={co} value={co}>
                      {countryNames.of(co) ?? co}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div
              className="sf-screen"
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, letterSpacing: "-.02em" }}>
                {t("screens.checkout.deliveryMethod")}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                {dopts.map((d) => {
                  const sel = ship === d.key;
                  return (
                    <button
                      key={d.key}
                      onClick={() => st.setShip(d.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "13px",
                        width: "100%",
                        padding: "15px 16px",
                        borderRadius: "13px",
                        border: "1px solid " + (sel ? "var(--accent)" : "var(--border)"),
                        background: sel ? "var(--accent-soft)" : "var(--surface)",
                        cursor: "pointer",
                        textAlign: "start",
                      }}
                    >
                      <span
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          border: "2px solid " + (sel ? "var(--accent)" : "var(--border-strong)"),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {sel && (
                          <span
                            style={{
                              width: "9px",
                              height: "9px",
                              borderRadius: "50%",
                              background: "var(--accent)",
                            }}
                          />
                        )}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 700 }}>{d.name}</div>
                        <div
                          style={{
                            fontSize: "12.5px",
                            color: "var(--fg-muted)",
                            marginTop: "2px",
                          }}
                        >
                          {d.desc}
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: "14px",
                          fontWeight: 600,
                        }}
                      >
                        {d.fee}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div
              className="sf-screen"
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, letterSpacing: "-.02em" }}>
                  {t("screens.checkout.stepPayment")}
                </h2>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: "var(--accent)",
                    background: "var(--accent-soft)",
                    padding: "5px 11px",
                    borderRadius: "20px",
                  }}
                >
                  <Icon name="lock" size={13} />
                  {t("screens.checkout.securedByStripe")}
                </span>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    marginBottom: "7px",
                  }}
                >
                  {t("screens.checkout.cardInformation")}
                </label>
                <div
                  style={{
                    border: "1px solid " + (cardErr ? "var(--danger)" : "var(--border-strong)"),
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "var(--surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      paddingInline: "14px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <Icon
                      name="credit-card"
                      size={17}
                      color="var(--fg-subtle)"
                      style={{ flexShrink: 0 }}
                    />
                    <input
                      className="sf-fld"
                      value={f.card}
                      onChange={(ev) => st.setField("card", ev.target.value)}
                      placeholder="1234 1234 1234 1234"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: "none",
                        background: "transparent",
                        padding: "14px 4px",
                        fontSize: "14px",
                        fontFamily: "'JetBrains Mono',monospace",
                        color: "var(--fg)",
                        outline: "none",
                      }}
                    />
                    <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
                      {["VISA", "MC"].map((c) => (
                        <span
                          key={c}
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: "9px",
                            fontWeight: 700,
                            color: "var(--fg-subtle)",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                            padding: "3px 5px",
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex" }}>
                    <input
                      className="sf-fld"
                      value={f.exp}
                      onChange={(ev) => st.setField("exp", ev.target.value)}
                      placeholder={t("screens.checkout.expiryPlaceholder")}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: "none",
                        borderInlineEnd: "1px solid var(--border)",
                        background: "transparent",
                        padding: "14px",
                        fontSize: "14px",
                        fontFamily: "'JetBrains Mono',monospace",
                        color: "var(--fg)",
                        outline: "none",
                      }}
                    />
                    <input
                      className="sf-fld"
                      value={f.cvc}
                      onChange={(ev) => st.setField("cvc", ev.target.value)}
                      placeholder={t("screens.checkout.cvcPlaceholder")}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: "none",
                        background: "transparent",
                        padding: "14px",
                        fontSize: "14px",
                        fontFamily: "'JetBrains Mono',monospace",
                        color: "var(--fg)",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
                {cardErr && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--danger)",
                      marginTop: "7px",
                    }}
                  >
                    <Icon name="alert-circle" size={13} />
                    {cardErr}
                  </div>
                )}
              </div>
              <LabelledField
                name="name"
                label={t("screens.checkout.nameOnCard")}
                placeholder="Ava Reyes"
              />
              <button
                onClick={st.toggleBilling}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "11px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "2px 0",
                  textAlign: "start",
                }}
              >
                <Checkbox on={billingSame} />
                <span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>
                  {t("screens.checkout.billingSame")}
                </span>
              </button>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "13px 15px",
                  borderRadius: "12px",
                  background: "var(--pos-soft)",
                  border: "1px solid color-mix(in srgb, var(--pos) 24%, transparent)",
                }}
              >
                <Icon
                  name="shield-check"
                  size={17}
                  color="var(--pos)"
                  style={{ flexShrink: 0, marginTop: "1px" }}
                />
                <span style={{ fontSize: "12.5px", color: "var(--fg-muted)", lineHeight: 1.5 }}>
                  {rich(t("screens.checkout.demoNote"), {
                    lead: (
                      <span style={{ fontWeight: 700, color: "var(--fg)" }}>
                        {t("screens.checkout.demoNoteLead")}
                      </span>
                    ),
                  })}
                </span>
              </div>
            </div>
          )}

          {/* nav buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "26px" }}>
            <button
              className="sf-gi"
              onClick={st.coBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "14px 20px",
                borderRadius: "12px",
                border: "1px solid var(--border-strong)",
                background: "var(--surface)",
                color: "var(--fg)",
                fontWeight: 700,
                fontSize: "14.5px",
                cursor: "pointer",
              }}
            >
              <Icon name={backArrow(dir)} size={16} />
              {step === 0
                ? t("chrome.header.backToCart")
                : t("screens.checkout.back")}
            </button>
            {step < 3 ? (
              <button
                className="sf-btn"
                onClick={st.coNext}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "14px 20px",
                  borderRadius: "12px",
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                  fontWeight: 700,
                  fontSize: "14.5px",
                  cursor: "pointer",
                }}
              >
                {t(NEXT_LABELS[step] ?? "screens.checkout.continue")}
                <Icon name={forwardArrow(dir)} size={16} />
              </button>
            ) : (
              <button
                className="sf-btn"
                onClick={st.placeOrder}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "14px 20px",
                  borderRadius: "12px",
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                  fontWeight: 700,
                  fontSize: "14.5px",
                  cursor: "pointer",
                }}
              >
                <Icon name="lock" size={16} />
                {t("screens.checkout.pay", { amount: money(tot.total) })}
              </button>
            )}
          </div>
        </div>

        {/* order summary */}
        <aside style={{ flex: 1, minWidth: "290px", position: "sticky", top: "84px" }}>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "18px",
              background: "var(--surface)",
              boxShadow: "var(--shadow)",
              padding: "22px",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 800,
                letterSpacing: "-.01em",
                marginBottom: "16px",
              }}
            >
              {t("screens.summary.title")}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginBottom: "18px",
              }}
            >
              {lines.map((l) => (
                <div key={l.key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      position: "relative",
                      width: "56px",
                      height: "56px",
                      borderRadius: "12px",
                      background: hexToRgba(l.p.tint, 0.15),
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  >
                    <ProductImage
                      src={l.p.image}
                      alt={l.p.title}
                      tint={l.p.tint}
                      style={{ borderRadius: "12px" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: "-7px",
                        insetInlineEnd: "-7px",
                        minWidth: "20px",
                        height: "20px",
                        padding: "0 5px",
                        borderRadius: "20px",
                        background: "var(--fg)",
                        color: "var(--bg)",
                        fontSize: "10.5px",
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono',monospace",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {l.qty}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13.5px", fontWeight: 700, letterSpacing: "-.01em" }}>
                      {l.p.title}
                    </div>
                    {(l.optLabel || l.customLabel) && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--fg-subtle)",
                          marginTop: "2px",
                          lineHeight: 1.4,
                        }}
                      >
                        {l.optLabel && <>{l.optLabel}</>}
                        {l.customLabel && (
                          <span style={{ display: "block", color: "var(--accent)", fontWeight: 600 }}>
                            {l.customLabel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontWeight: 600,
                      fontSize: "13.5px",
                    }}
                  >
                    {money(l.unit * l.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ height: "1px", background: "var(--border)", marginBottom: "16px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "14px",
                }}
              >
                <span style={{ color: "var(--fg-muted)" }}>{t("chrome.cart.subtotal")}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                  {money(tot.sub)}
                </span>
              </div>
              {tot.disc > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ color: "var(--pos)", fontWeight: 600 }}>{t("screens.summary.discount")}</span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontWeight: 600,
                      color: "var(--pos)",
                    }}
                  >
                    −{money(tot.disc)}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "14px",
                }}
              >
                <span style={{ color: "var(--fg-muted)" }}>{t("screens.summary.shipping")}</span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 600,
                    color: tot.shipFree ? "var(--pos)" : undefined,
                  }}
                >
                  {tot.shipFree ? t("screens.summary.free") : money(tot.ship)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "14px",
                }}
              >
                <span style={{ color: "var(--fg-muted)" }}>{t("screens.summary.taxEst")}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                  {money(tot.tax)}
                </span>
              </div>
            </div>
            <div style={{ height: "1px", background: "var(--border)", margin: "16px 0" }} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "15px", fontWeight: 800 }}>{t("screens.summary.total")}</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontWeight: 700,
                  fontSize: "20px",
                  letterSpacing: "-.02em",
                }}
              >
                {money(tot.total)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                marginTop: "16px",
                fontSize: "12px",
                color: "var(--fg-subtle)",
              }}
            >
              <Icon name="lock" size={13} />
              {rich(t("screens.checkout.encryptedPoweredBy"), {
                stripe: (
                  <span style={{ fontWeight: 700, color: "var(--fg-muted)" }}>
                    Stripe
                  </span>
                ),
              })}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
