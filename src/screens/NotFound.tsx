// 404 — reachable only if `view` is ever set to an unknown value.

import { useStore } from "../state/store.ts";
import { Icon } from "../components/Icon.tsx";

export function NotFound() {
  const go = useStore((s) => s.go);
  const goCat = useStore((s) => s.goCat);

  return (
    <main
      className="sf-screen"
      style={{
        maxWidth: "560px",
        margin: "0 auto",
        padding: "clamp(50px,10vw,110px) clamp(16px,4vw,32px)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: "clamp(58px,12vw,84px)",
          fontWeight: 700,
          letterSpacing: "-.04em",
          color: "var(--accent)",
          lineHeight: 1,
        }}
      >
        404
      </div>
      <h1
        style={{
          margin: "18px 0 0",
          fontSize: "clamp(22px,3vw,28px)",
          fontWeight: 800,
          letterSpacing: "-.02em",
        }}
      >
        We can’t find that page
      </h1>
      <p
        style={{
          margin: "12px auto 0",
          fontSize: "14.5px",
          color: "var(--fg-muted)",
          lineHeight: 1.6,
          maxWidth: "380px",
        }}
      >
        The link may be broken or the product may have sold out. Let’s get you
        back to the good stuff.
      </p>
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: "26px",
        }}
      >
        <button
          className="sf-btn"
          onClick={() => go("home")}
          style={{
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
          <Icon name="home" size={17} />
          Back home
        </button>
        <button
          className="sf-gi"
          onClick={() => goCat("all")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "13px 22px",
            borderRadius: "12px",
            border: "1px solid var(--border-strong)",
            background: "var(--surface)",
            color: "var(--fg)",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Shop all
        </button>
      </div>
    </main>
  );
}
