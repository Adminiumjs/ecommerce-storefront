// Order confirmation: summary, ship-to / delivery cards, a "what happens next"
// timeline, and continue/track CTAs. Renders standalone from the seeded order.

import type { ShipMethod } from "../data/types.ts";
import { money } from "../lib/format.ts";
import { hexToRgba } from "../lib/placeholders.ts";
import { confTotals, normItems } from "../lib/pricing.ts";
import { useStore } from "../state/store.ts";
import { Icon } from "../components/Icon.tsx";
import { ProductImage } from "../components/ProductImage.tsx";

const METHOD_LABEL: Record<ShipMethod, string> = {
  standard: "Standard shipping",
  express: "Express shipping",
  overnight: "Overnight shipping",
};
const ETA: Record<ShipMethod, string> = {
  standard: "Arrives in 3–5 business days",
  express: "Arrives in 2 business days",
  overnight: "Arrives next business day",
};

export function Confirm() {
  const index = useStore((s) => s.index);
  const lastOrder = useStore((s) => s.lastOrder);
  const goCat = useStore((s) => s.goCat);
  const go = useStore((s) => s.go);

  const o = lastOrder!;
  const t = confTotals(o, index);
  const m = (o.shipMethod || o.ship || "standard") as ShipMethod;
  const eta = ETA[m];

  const items = normItems(o.items, index).map((it, idx) => {
    const p = index[it.pid];
    return { ...it, key: "ci" + idx, p };
  });

  const steps = [
    {
      icon: "check-circle-2",
      title: "Order confirmed",
      desc: "We’ve received your order and payment.",
      state: "done",
    },
    {
      icon: "package",
      title: "Packed with care",
      desc: "Usually ships within 1 business day.",
      state: "active",
    },
    {
      icon: "truck",
      title: "On its way",
      desc: "You’ll get a tracking link by email.",
      state: "todo",
    },
    { icon: "home", title: "Delivered", desc: eta, state: "todo" },
  ];

  const confFirst = (o.name || "there").split(" ")[0];

  return (
    <main
      className="sf-screen"
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "clamp(24px,4vw,44px) clamp(16px,4vw,32px) 30px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "clamp(28px,4vw,40px)" }}>
        <div
          style={{
            width: "74px",
            height: "74px",
            borderRadius: "22px",
            background: "var(--pos-soft)",
            color: "var(--pos)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
          }}
        >
          <Icon name="check" size={36} />
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(27px,4vw,38px)",
            fontWeight: 800,
            letterSpacing: "-.03em",
          }}
        >
          Thank you, {confFirst}!
        </h1>
        <p
          style={{
            margin: "12px auto 0",
            fontSize: "15px",
            color: "var(--fg-muted)",
            lineHeight: 1.6,
            maxWidth: "520px",
          }}
        >
          Your order{" "}
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontWeight: 700,
              color: "var(--accent)",
            }}
          >
            #{o.number}
          </span>{" "}
          is confirmed. We’ve emailed a receipt to{" "}
          <span style={{ fontWeight: 700, color: "var(--fg)" }}>{o.email}</span>.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "clamp(20px,3vw,36px)",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1.2, minWidth: "290px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "18px",
              background: "var(--surface)",
              boxShadow: "var(--shadow)",
              padding: "22px",
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "-.01em", marginBottom: "16px" }}>
              Order summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
              {items.map((it) => (
                <div key={it.key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      position: "relative",
                      width: "58px",
                      height: "58px",
                      borderRadius: "12px",
                      background: hexToRgba(it.p.tint, 0.15),
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  >
                    <ProductImage
                      src={it.p.image}
                      alt={it.p.title}
                      tint={it.p.tint}
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
                      {it.qty}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "-.01em" }}>
                      {it.p.title}
                    </div>
                    {(it.optLabel || it.customLabel) && (
                      <div style={{ fontSize: "11px", color: "var(--fg-subtle)", marginTop: "2px", lineHeight: 1.4 }}>
                        {it.optLabel && <>{it.optLabel}</>}
                        {it.customLabel && (
                          <span style={{ display: "block", color: "var(--accent)", fontWeight: 600 }}>
                            {it.customLabel}
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: "11.5px",
                        color: "var(--fg-subtle)",
                        fontFamily: "'JetBrains Mono',monospace",
                        marginTop: "3px",
                      }}
                    >
                      {money(it.unit)} each
                    </div>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: "14px" }}>
                    {money(it.unit * it.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ height: "1px", background: "var(--border)", marginBottom: "14px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                <span style={{ color: "var(--fg-muted)" }}>Subtotal</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{money(t.sub)}</span>
              </div>
              {t.disc > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                  <span style={{ color: "var(--pos)", fontWeight: 600 }}>Discount</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: "var(--pos)" }}>
                    −{money(t.disc)}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                <span style={{ color: "var(--fg-muted)" }}>Shipping</span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 600,
                    color: t.shipFree ? "var(--pos)" : undefined,
                  }}
                >
                  {t.shipFree ? "Free" : money(t.ship)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                <span style={{ color: "var(--fg-muted)" }}>Tax</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{money(t.tax)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "6px",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: "14.5px", fontWeight: 800 }}>Total paid</span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 700,
                    fontSize: "19px",
                    letterSpacing: "-.02em",
                  }}
                >
                  {money(t.total)}
                </span>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))",
              gap: "12px",
            }}
          >
            <div style={{ border: "1px solid var(--border)", borderRadius: "14px", background: "var(--surface)", padding: "16px 18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: ".05em",
                  textTransform: "uppercase",
                  color: "var(--fg-subtle)",
                  marginBottom: "9px",
                }}
              >
                <Icon name="map-pin" size={14} />
                Shipping to
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{o.name}</div>
              <div style={{ fontSize: "12.5px", color: "var(--fg-muted)", lineHeight: 1.5, marginTop: "3px" }}>
                {o.addr}
                <br />
                {o.city}
              </div>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: "14px", background: "var(--surface)", padding: "16px 18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: ".05em",
                  textTransform: "uppercase",
                  color: "var(--fg-subtle)",
                  marginBottom: "9px",
                }}
              >
                <Icon name="truck" size={14} />
                Delivery
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{METHOD_LABEL[m]}</div>
              <div style={{ fontSize: "12.5px", color: "var(--fg-muted)", lineHeight: 1.5, marginTop: "3px" }}>
                {eta}
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: "270px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "18px",
              background: "var(--surface)",
              boxShadow: "var(--shadow)",
              padding: "22px",
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "-.01em", marginBottom: "18px" }}>
              What happens next
            </div>
            {steps.map((s, i, arr) => {
              const on = s.state !== "todo";
              return (
                <div key={s.title} style={{ display: "flex", gap: "14px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          s.state === "done"
                            ? "var(--accent)"
                            : s.state === "active"
                              ? "var(--accent-soft)"
                              : "var(--surface-2)",
                        color:
                          s.state === "done"
                            ? "var(--accent-fg)"
                            : s.state === "active"
                              ? "var(--accent)"
                              : "var(--fg-subtle)",
                        border: s.state === "todo" ? "1px solid var(--border-strong)" : "none",
                      }}
                    >
                      <Icon name={s.icon} size={16} />
                    </span>
                    {i < arr.length - 1 && (
                      <span
                        style={{
                          width: "2px",
                          flex: 1,
                          minHeight: "22px",
                          background: on ? "var(--accent)" : "var(--border-strong)",
                          margin: "4px 0",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? "20px" : "0" }}>
                    <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{s.title}</div>
                    <div style={{ fontSize: "12.5px", color: "var(--fg-muted)", lineHeight: 1.5, marginTop: "2px" }}>
                      {s.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              gap: "9px",
              padding: "14px 16px",
              borderRadius: "14px",
              background: "var(--accent-soft)",
              border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
            }}
          >
            <Icon name="mail" size={17} color="var(--accent)" style={{ flexShrink: 0, marginTop: "1px" }} />
            <span style={{ fontSize: "12.5px", color: "var(--fg-muted)", lineHeight: 1.5 }}>
              A confirmation with your receipt and tracking link is on the way to{" "}
              <span style={{ fontWeight: 700, color: "var(--fg)" }}>{o.email}</span>.
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: "clamp(26px,4vw,38px)",
        }}
      >
        <button
          className="sf-btn"
          onClick={() => goCat("all")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "14px 24px",
            borderRadius: "12px",
            border: "none",
            background: "var(--accent)",
            color: "var(--accent-fg)",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          <Icon name="store" size={17} />
          Continue shopping
        </button>
        <button
          className="sf-gi"
          onClick={() => go("account")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "14px 22px",
            borderRadius: "12px",
            border: "1px solid var(--border-strong)",
            background: "var(--surface)",
            color: "var(--fg)",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          <Icon name="package-search" size={17} />
          View order status
        </button>
      </div>
    </main>
  );
}
