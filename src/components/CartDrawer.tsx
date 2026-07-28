// Right-side cart drawer with empty + filled states.

import { FREE_SHIP } from "../data/demo.ts";
import { money } from "../lib/format.ts";
import { hexToRgba } from "../lib/placeholders.ts";
import { cartArr, count as countLines, subtotalOf } from "../lib/pricing.ts";
import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";
import { ProductImage } from "./ProductImage.tsx";
import { QtyStepper } from "./QtyStepper.tsx";

export function CartDrawer() {
  const drawer = useStore((s) => s.drawer);
  const cart = useStore((s) => s.cart);
  const index = useStore((s) => s.index);
  const closeDrawer = useStore((s) => s.closeDrawer);
  const goCat = useStore((s) => s.goCat);
  const inc = useStore((s) => s.inc);
  const dec = useStore((s) => s.dec);
  const removeItem = useStore((s) => s.removeItem);
  const goCheckout = useStore((s) => s.goCheckout);
  const go = useStore((s) => s.go);

  if (!drawer) return null;

  const lines = cartArr(cart, index);
  const cnt = countLines(lines);
  const sub = subtotalOf(lines);
  const shipNote =
    sub >= FREE_SHIP
      ? "You’ve unlocked free shipping 🎉"
      : "Add " + money(FREE_SHIP - sub) + " more for free shipping. Taxes at checkout.";

  return (
    <div
      onClick={closeDrawer}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(10,10,15,.5)",
        backdropFilter: "blur(3px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sf-scroll sf-drawer-panel"
        style={{
          inlineSize: "428px",
          maxInlineSize: "94vw",
          blockSize: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "19px 22px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <Icon name="shopping-bag" size={19} color="var(--accent)" />
          <span
            style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-.01em" }}
          >
            Your cart
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--fg-subtle)",
            }}
          >
            {cnt + (cnt === 1 ? " item" : " items")}
          </span>
          <button
            className="sf-gi"
            onClick={closeDrawer}
            style={{
              marginInlineStart: "auto",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--fg-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {cnt === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "6px",
              padding: "40px 30px",
            }}
          >
            <div
              style={{
                width: "66px",
                height: "66px",
                borderRadius: "18px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--fg-subtle)",
                marginBottom: "8px",
              }}
            >
              <Icon name="shopping-cart" size={28} />
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 800,
                letterSpacing: "-.01em",
              }}
            >
              Your cart is empty
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--fg-muted)",
                lineHeight: 1.5,
                maxWidth: "250px",
              }}
            >
              Add something you love and it’ll show up right here.
            </div>
            <button
              className="sf-btn"
              onClick={() => goCat("all")}
              style={{
                marginTop: "14px",
                padding: "11px 20px",
                borderRadius: "11px",
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-fg)",
                fontWeight: 700,
                fontSize: "13.5px",
                cursor: "pointer",
              }}
            >
              Start shopping
            </button>
          </div>
        ) : (
          <>
            <div
              className="sf-scroll"
              style={{ flex: 1, overflow: "auto", padding: "6px 22px" }}
            >
              {lines.map((l) => (
                <div
                  key={l.key}
                  style={{
                    display: "flex",
                    gap: "13px",
                    padding: "15px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: "66px",
                      height: "66px",
                      borderRadius: "13px",
                      background: hexToRgba(l.p.tint, 0.15),
                      flexShrink: 0,
                      position: "relative",
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <ProductImage src={l.p.image} alt={l.p.title} tint={l.p.tint} />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13.5px",
                            fontWeight: 700,
                            letterSpacing: "-.01em",
                            lineHeight: 1.3,
                          }}
                        >
                          {l.p.title}
                        </div>
                        {(l.optLabel || l.customLabel || l.bundleOff > 0) && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--fg-subtle)",
                              marginTop: "3px",
                              lineHeight: 1.4,
                            }}
                          >
                            {l.optLabel && <>{l.optLabel}</>}
                            {l.customLabel && (
                              <span
                                style={{
                                  display: "block",
                                  color: "var(--accent)",
                                  fontWeight: 600,
                                }}
                              >
                                {l.customLabel}
                              </span>
                            )}
                            {l.bundleOff > 0 && (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginTop: "4px",
                                  fontSize: "9.5px",
                                  fontWeight: 700,
                                  color: "var(--pos)",
                                  background: "var(--pos-soft)",
                                  padding: "2px 7px",
                                  borderRadius: "20px",
                                }}
                              >
                                Bundle · 15% off
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
                          {money(l.unit)} each
                        </div>
                      </div>
                      <button
                        className="sf-link"
                        onClick={() => removeItem(l.key)}
                        title="Remove"
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "var(--fg-subtle)",
                          cursor: "pointer",
                          padding: "2px",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="trash-2" size={15} />
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "3px",
                      }}
                    >
                      <QtyStepper
                        qty={l.qty}
                        onInc={() => inc(l.key)}
                        onDec={() => dec(l.key)}
                        size={30}
                        radius={9}
                        fontSize={13}
                        iconSize={14}
                      />
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          fontWeight: 600,
                          fontSize: "14px",
                        }}
                      >
                        {money(l.unit * l.qty)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid var(--border)",
                padding: "18px 22px",
                background: "var(--surface-2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>
                  Subtotal
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 700,
                    fontSize: "16px",
                  }}
                >
                  {money(sub)}
                </span>
              </div>
              <div
                style={{
                  fontSize: "11.5px",
                  color: "var(--fg-subtle)",
                  marginBottom: "14px",
                }}
              >
                {shipNote}
              </div>
              <button
                className="sf-btn"
                onClick={goCheckout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                  fontWeight: 700,
                  fontSize: "14.5px",
                  cursor: "pointer",
                }}
              >
                Checkout
                <Icon name="arrow-right" size={16} />
              </button>
              <button
                className="sf-link"
                onClick={() => go("cart")}
                style={{
                  width: "100%",
                  marginTop: "9px",
                  padding: "8px",
                  border: "none",
                  background: "transparent",
                  color: "var(--fg-muted)",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                View full cart
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
