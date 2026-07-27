// Account · order history: the just-placed order (if any) followed by the
// seeded history, each with status, item thumbs, total, and view/buy-again.

import type { Order, OrderStatus } from "../data/types.ts";
import { money } from "../lib/format.ts";
import { hexToRgba } from "../lib/placeholders.ts";
import { confTotals, normItems } from "../lib/pricing.ts";
import { useStore } from "../state/store.ts";
import { Icon } from "../components/Icon.tsx";
import { ProductImage } from "../components/ProductImage.tsx";

const STATUS_META: Record<OrderStatus, [string, string, string, string]> = {
  pending: ["Pending", "clock", "var(--warn)", "var(--warn-soft)"],
  paid: ["Paid", "check-circle-2", "var(--pos)", "var(--pos-soft)"],
  shipped: ["Shipped", "truck", "var(--accent)", "var(--accent-soft)"],
  refunded: ["Refunded", "rotate-ccw", "var(--fg-subtle)", "var(--surface-3)"],
};

export function Account() {
  const index = useStore((s) => s.index);
  const seedOrders = useStore((s) => s.seedOrders);
  const lastOrder = useStore((s) => s.lastOrder);
  const customer = useStore((s) => s.customer);
  const viewOrder = useStore((s) => s.viewOrder);
  const buyAgain = useStore((s) => s.buyAgain);

  const list: Order[] = [];
  if (lastOrder) list.push({ ...lastOrder, status: "paid", placed: "Just now" });
  seedOrders.forEach((o) => {
    if (!lastOrder || o.number !== lastOrder.number) list.push(o);
  });

  return (
    <main
      className="sf-screen"
      style={{
        maxWidth: "820px",
        margin: "0 auto",
        padding: "clamp(18px,3vw,30px) clamp(16px,4vw,32px) 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          marginBottom: "clamp(22px,3vw,30px)",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "15px",
            background: "var(--accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "17px",
            letterSpacing: "-.01em",
            flexShrink: 0,
            boxShadow: "0 3px 12px var(--accent-soft)",
          }}
        >
          {customer.initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(22px,3vw,28px)",
              fontWeight: 800,
              letterSpacing: "-.03em",
            }}
          >
            {customer.name}
          </h1>
          <div style={{ fontSize: "13px", color: "var(--fg-muted)", marginTop: "2px" }}>
            {customer.email}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <Icon name="package-search" size={18} color="var(--accent)" />
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, letterSpacing: "-.01em" }}>
          Order history
        </h2>
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "12px",
            color: "var(--fg-subtle)",
          }}
        >
          {list.length + (list.length === 1 ? " order" : " orders")}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {list.map((o) => {
          const sm = STATUS_META[o.status || "paid"];
          const total = typeof o.total === "number" ? o.total : confTotals(o, index).total;
          const ni = normItems(o.items, index);
          const count = ni.reduce((s, it) => s + it.qty, 0);
          const thumbs = ni.slice(0, 4).map((it) => index[it.pid]);
          return (
            <div
              key={o.number}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "16px",
                background: "var(--surface)",
                boxShadow: "var(--shadow)",
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "15px",
                }}
              >
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "15px" }}>
                    #{o.number}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--fg-subtle)", marginTop: "2px" }}>
                    Placed {o.placed}
                  </div>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    padding: "5px 11px",
                    borderRadius: "20px",
                    color: sm[2],
                    background: sm[3],
                  }}
                >
                  <Icon name={sm[1]} size={13} />
                  {sm[0]}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  {thumbs.map((p, i) => (
                    <div
                      key={p.id + i}
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "11px",
                        background: hexToRgba(p.tint, 0.15),
                        border: "1px solid var(--border)",
                        flexShrink: 0,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <ProductImage src={p.image} alt={p.title} tint={p.tint} />
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: "12.5px", color: "var(--fg-muted)" }}>
                  {count + (count === 1 ? " item" : " items")}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "16px",
                  paddingTop: "15px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--fg-subtle)" }}>Total</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "16px" }}>
                    {money(total)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "9px" }}>
                  <button
                    className="sf-gi"
                    onClick={() => viewOrder(o.number)}
                    style={{
                      padding: "9px 15px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--fg)",
                      fontWeight: 700,
                      fontSize: "12.5px",
                      cursor: "pointer",
                    }}
                  >
                    View details
                  </button>
                  <button
                    className="sf-btn"
                    onClick={() => buyAgain(o)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "9px 15px",
                      borderRadius: "10px",
                      border: "none",
                      background: "var(--accent)",
                      color: "var(--accent-fg)",
                      fontWeight: 700,
                      fontSize: "12.5px",
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="rotate-ccw" size={14} />
                    Buy again
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
