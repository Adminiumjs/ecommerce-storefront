// Cart page: line items on the left, a sticky order-summary aside with the
// free-shipping progress bar, promo input, and checkout CTA on the right.

import { FREE_SHIP } from "../data/demo.ts";
import { catName } from "../lib/catalog.ts";
import { money } from "../lib/format.ts";
import { hexToRgba } from "../lib/placeholders.ts";
import {
  cartArr,
  computeTotals,
  count as countLines,
  subtotalOf,
} from "../lib/pricing.ts";
import { useStore } from "../state/store.ts";
import { Icon } from "../components/Icon.tsx";
import { ProductImage } from "../components/ProductImage.tsx";
import { QtyStepper } from "../components/QtyStepper.tsx";

export function Cart() {
  const cart = useStore((s) => s.cart);
  const index = useStore((s) => s.index);
  const cats = useStore((s) => s.cats);
  const ship = useStore((s) => s.ship);
  const promoOn = useStore((s) => s.promoOn);
  const promoDraft = useStore((s) => s.promoDraft);

  const openProduct = useStore((s) => s.openProduct);
  const inc = useStore((s) => s.inc);
  const dec = useStore((s) => s.dec);
  const removeItem = useStore((s) => s.removeItem);
  const goCat = useStore((s) => s.goCat);
  const goCheckout = useStore((s) => s.goCheckout);
  const setPromoDraft = useStore((s) => s.setPromoDraft);
  const applyPromo = useStore((s) => s.applyPromo);
  const removePromo = useStore((s) => s.removePromo);

  const lines = cartArr(cart, index);
  const cnt = countLines(lines);
  const sub = subtotalOf(lines);
  const t = computeTotals(lines, ship, promoOn);
  const free = t.ship === 0 && sub > 0;

  return (
    <main
      className="sf-screen"
      style={{
        maxWidth: "1080px",
        margin: "0 auto",
        padding: "clamp(18px,3vw,30px) clamp(16px,4vw,32px) 20px",
      }}
    >
      <h1
        style={{
          margin: "0 0 clamp(16px,2.5vw,24px)",
          fontSize: "clamp(26px,3.6vw,36px)",
          fontWeight: 800,
          letterSpacing: "-.03em",
        }}
      >
        Your cart
      </h1>

      {cnt === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "clamp(50px,8vw,90px) 30px",
            border: "1px dashed var(--border-strong)",
            borderRadius: "20px",
            background: "var(--surface)",
          }}
        >
          <div
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "20px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--fg-subtle)",
              marginBottom: "16px",
            }}
          >
            <Icon name="shopping-cart" size={32} />
          </div>
          <div style={{ fontSize: "19px", fontWeight: 800, letterSpacing: "-.02em" }}>
            Your cart is empty
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "var(--fg-muted)",
              marginTop: "7px",
              maxWidth: "360px",
              lineHeight: 1.55,
            }}
          >
            Once you add products they’ll show up here, ready for checkout.
          </div>
          <button
            className="sf-btn"
            onClick={() => goCat("all")}
            style={{
              marginTop: "20px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "13px 24px",
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
            Start shopping
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: "clamp(20px,3vw,40px)",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1.7, minWidth: "300px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span
                style={{ fontSize: "13px", color: "var(--fg-muted)", fontWeight: 600 }}
              >
                {cnt + (cnt === 1 ? " item" : " items")}
              </span>
              <button
                className="sf-link"
                onClick={() => goCat("all")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "none",
                  background: "transparent",
                  color: "var(--fg-muted)",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Icon name="arrow-left" size={15} />
                Continue shopping
              </button>
            </div>
            <div>
              {lines.map((l) => (
                <div
                  key={l.key}
                  style={{
                    display: "flex",
                    gap: "16px",
                    padding: "18px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <button
                    onClick={() => openProduct(l.p.id)}
                    style={{
                      position: "relative",
                      width: "92px",
                      height: "92px",
                      borderRadius: "14px",
                      background: hexToRgba(l.p.tint, 0.15),
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                      overflow: "hidden",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <ProductImage src={l.p.image} alt={l.p.title} tint={l.p.tint} />
                  </button>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <button
                          className="sf-link"
                          onClick={() => openProduct(l.p.id)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--fg)",
                            fontSize: "15px",
                            fontWeight: 700,
                            letterSpacing: "-.01em",
                            cursor: "pointer",
                            textAlign: "start",
                            padding: 0,
                            lineHeight: 1.3,
                          }}
                        >
                          {l.p.title}
                        </button>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--fg-subtle)",
                            marginTop: "3px",
                          }}
                        >
                          {catName(cats, l.p.cat)} ·{" "}
                          <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                            {l.p.sku}
                          </span>
                        </div>
                        {(l.optLabel || l.customLabel || l.bundleOff > 0) && (
                          <div
                            style={{
                              fontSize: "12px",
                              marginTop: "5px",
                              lineHeight: 1.45,
                            }}
                          >
                            {l.optLabel && (
                              <span
                                style={{ color: "var(--fg-muted)", fontWeight: 600 }}
                              >
                                {l.optLabel}
                              </span>
                            )}
                            {l.customLabel && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  marginInlineStart: "8px",
                                  color: "var(--accent)",
                                  fontWeight: 600,
                                }}
                              >
                                <Icon name="sparkles" size={12} />
                                {l.customLabel}
                              </span>
                            )}
                            {l.bundleOff > 0 && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  marginInlineStart: "8px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "var(--pos)",
                                }}
                              >
                                <Icon name="package" size={12} />
                                Bundle · 15% off · was {money(l.orig)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        className="sf-link"
                        onClick={() => removeItem(l.key)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          border: "none",
                          background: "transparent",
                          color: "var(--fg-subtle)",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="trash-2" size={15} />
                        Remove
                      </button>
                    </div>
                    <div
                      style={{
                        marginTop: "auto",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "space-between",
                        gap: "12px",
                        paddingTop: "14px",
                      }}
                    >
                      <QtyStepper
                        qty={l.qty}
                        onInc={() => inc(l.key)}
                        onDec={() => dec(l.key)}
                        size={34}
                        height={36}
                        radius={10}
                        fontSize={14}
                        iconSize={15}
                      />
                      <div style={{ textAlign: "end" }}>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontWeight: 600,
                            fontSize: "16px",
                          }}
                        >
                          {money(l.unit * l.qty)}
                        </div>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: "11.5px",
                            color: "var(--fg-subtle)",
                            marginTop: "2px",
                          }}
                        >
                          {money(l.unit)} each
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                Order summary
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ color: "var(--fg-muted)" }}>Subtotal</span>
                  <span
                    style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}
                  >
                    {money(sub)}
                  </span>
                </div>
                {t.disc > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "14px",
                    }}
                  >
                    <span style={{ color: "var(--pos)", fontWeight: 600 }}>
                      Discount · WELCOME10
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontWeight: 600,
                        color: "var(--pos)",
                      }}
                    >
                      −{money(t.disc)}
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
                  <span style={{ color: "var(--fg-muted)" }}>Shipping</span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontWeight: 600,
                      color: free ? "var(--pos)" : undefined,
                    }}
                  >
                    {sub > 0 ? (free ? "Free" : money(t.ship)) : money(0)}
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
                  <span style={{ color: "var(--fg-muted)" }}>Tax (est.)</span>
                  <span
                    style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}
                  >
                    {money(t.tax)}
                  </span>
                </div>
              </div>
              <div style={{ height: "1px", background: "var(--border)", margin: "16px 0" }} />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "15px", fontWeight: 800 }}>Total</span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 700,
                    fontSize: "20px",
                    letterSpacing: "-.02em",
                  }}
                >
                  {money(t.total)}
                </span>
              </div>
              {sub > 0 && !free && (
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      height: "7px",
                      borderRadius: "20px",
                      background: "var(--surface-3)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: Math.min(100, (sub / FREE_SHIP) * 100) + "%",
                        height: "100%",
                        background: "var(--accent)",
                        borderRadius: "20px",
                        transition: "width .3s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--fg-muted)",
                      marginTop: "7px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Icon name="truck" size={14} color="var(--accent)" />
                    Add {money(Math.max(0, FREE_SHIP - sub))} more for free shipping
                  </div>
                </div>
              )}
              {!promoOn ? (
                <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                  <input
                    className="sf-fld"
                    value={promoDraft}
                    onChange={(e) => setPromoDraft(e.target.value)}
                    placeholder="Promo code"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "11px 13px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-strong)",
                      background: "var(--surface-2)",
                      fontSize: "13px",
                      color: "var(--fg)",
                      outline: "none",
                      fontFamily: "'JetBrains Mono',monospace",
                    }}
                  />
                  <button
                    className="sf-gi"
                    onClick={applyPromo}
                    style={{
                      padding: "11px 16px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--fg)",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "14px",
                    padding: "10px 13px",
                    borderRadius: "10px",
                    background: "var(--pos-soft)",
                    border: "1px solid color-mix(in srgb, var(--pos) 26%, transparent)",
                  }}
                >
                  <Icon name="badge-check" size={16} color="var(--pos)" />
                  <span
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 700,
                      color: "var(--pos)",
                      flex: 1,
                    }}
                  >
                    WELCOME10 applied
                  </span>
                  <button
                    className="sf-link"
                    onClick={removePromo}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--fg-muted)",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                    }}
                  >
                    <Icon name="x" size={15} />
                  </button>
                </div>
              )}
              <button
                className="sf-btn"
                onClick={goCheckout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "15px",
                  borderRadius: "13px",
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                Checkout
                <Icon name="arrow-right" size={17} />
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  marginTop: "14px",
                  fontSize: "12px",
                  color: "var(--fg-subtle)",
                }}
              >
                <Icon name="lock" size={13} />
                Secure checkout · powered by{" "}
                <span style={{ fontWeight: 700, color: "var(--fg-muted)" }}>
                  Stripe
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
