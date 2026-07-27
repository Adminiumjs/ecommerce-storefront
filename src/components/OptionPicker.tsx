// Option selectors (swatches + chips) with the cross-option variant matrix:
// each value's existence/stock is recomputed against the rest of the current
// selection, so picking one option disables the values that have no variant
// (or marks out-of-stock ones). This is the load-bearing PDP logic.

import type { Product } from "../data/types.ts";
import { variantExists, variantStatus } from "../lib/pricing.ts";
import { useStore } from "../state/store.ts";
import { Icon } from "./Icon.tsx";

export interface OptionPickerProps {
  product: Product;
}

export function OptionPicker({ product: p }: OptionPickerProps) {
  const sel = useStore((s) => s.sel);
  const setSel = useStore((s) => s.setSel);
  const openSizeGuide = useStore((s) => s.openSizeGuide);

  if (!p.options || !p.options.length) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        marginTop: "2px",
      }}
    >
      {p.options.map((o) => {
        const selVal = o.values.find((v) => v.id === sel[o.key]);
        const isSwatch = o.type === "swatch";
        return (
          <div key={o.key}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <span style={{ fontSize: "12.5px", fontWeight: 700 }}>
                {o.name}:{" "}
                <span style={{ color: "var(--fg-muted)", fontWeight: 600 }}>
                  {selVal ? selVal.label : ""}
                </span>
              </span>
              {o.key === "size" && (
                <button
                  className="sf-link"
                  onClick={openSizeGuide}
                  style={{
                    marginInlineStart: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    border: "none",
                    background: "transparent",
                    color: "var(--accent)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <Icon name="ruler" size={14} />
                  Size guide
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {o.values.map((v) => {
                const combo = { ...sel, [o.key]: v.id };
                const ex = variantExists(p, combo);
                const st = ex ? variantStatus(p, combo) : "na";
                const active = sel[o.key] === v.id;
                const disabled = !ex;
                const oos = st === "out";
                const onClick = () => {
                  if (!disabled) setSel(o.key, v.id);
                };
                if (isSwatch) {
                  return (
                    <button
                      key={v.id}
                      onClick={onClick}
                      title={v.label}
                      style={{
                        position: "relative",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: v.hex || "var(--surface-3)",
                        cursor: disabled ? "not-allowed" : "pointer",
                        border:
                          "2px solid " + (active ? "var(--accent)" : "transparent"),
                        boxShadow:
                          "inset 0 0 0 1px rgba(0,0,0,.14), 0 0 0 1px var(--border-strong)",
                        opacity: disabled ? 0.3 : 1,
                        padding: 0,
                      }}
                    >
                      {oos && (
                        <span
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: "8px",
                            fontWeight: 800,
                            background: "rgba(0,0,0,.4)",
                            borderRadius: "50%",
                          }}
                        >
                          OOS
                        </span>
                      )}
                    </button>
                  );
                }
                return (
                  <button
                    key={v.id}
                    onClick={onClick}
                    style={{
                      position: "relative",
                      minWidth: "46px",
                      padding: "10px 15px",
                      borderRadius: "10px",
                      border:
                        "1px solid " +
                        (active ? "var(--accent)" : "var(--border-strong)"),
                      background: active ? "var(--accent-soft)" : "var(--surface)",
                      color: active
                        ? "var(--accent)"
                        : disabled
                          ? "var(--fg-subtle)"
                          : "var(--fg)",
                      fontWeight: 700,
                      fontSize: "13.5px",
                      cursor: disabled ? "not-allowed" : "pointer",
                      textDecoration: disabled ? "line-through" : "none",
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    {v.label}
                    {oos && (
                      <span
                        style={{
                          marginInlineStart: "6px",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "var(--warn)",
                        }}
                      >
                        · out
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
