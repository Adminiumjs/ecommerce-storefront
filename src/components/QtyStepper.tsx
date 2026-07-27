// Quantity stepper — minus / qty / plus, in three sizes (PDP 44 / cart 34 /
// drawer 30). Digits are mono.

import { Icon } from "./Icon.tsx";

export interface QtyStepperProps {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  /** Button square size in px. */
  size?: number;
  /** Button height in px (defaults to size). */
  height?: number;
  radius?: number;
  fontSize?: number;
  iconSize?: number;
}

export function QtyStepper({
  qty,
  onInc,
  onDec,
  size = 30,
  height,
  radius = 9,
  fontSize = 13,
  iconSize = 14,
}: QtyStepperProps) {
  const h = height ?? size;
  const btn: React.CSSProperties = {
    width: size + "px",
    height: h + "px",
    border: "none",
    background: "var(--surface)",
    color: "var(--fg-muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: "1px solid var(--border-strong)",
        borderRadius: radius + "px",
        overflow: "hidden",
      }}
    >
      <button className="sf-gi" onClick={onDec} style={btn}>
        <Icon name="minus" size={iconSize} />
      </button>
      <span
        style={{
          minWidth: size + "px",
          textAlign: "center",
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: fontSize + "px",
          fontWeight: 600,
        }}
      >
        {qty}
      </span>
      <button className="sf-gi" onClick={onInc} style={btn}>
        <Icon name="plus" size={iconSize} />
      </button>
    </div>
  );
}
