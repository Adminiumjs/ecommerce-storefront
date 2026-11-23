/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/NeedsAttentionList.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * "NEEDS ATTENTION", the first group of a shop's shipments (S41).
 *
 * The engine decides which labels need a person and which of them this person
 * may see. Reading the list calls no carrier, so it is safe to do on every open.
 *
 * AN UNKNOWN RESULT IS NEVER A PURCHASE. Nobody knows whether that label was
 * bought, so its row has no "Bought" time and says when we asked (S3-F18).
 *
 * Each row only opens its order. Whatever settles the row is done there.
 *
 * THE ONE EXCEPTION IS AN ORDER THAT WAS DELETED. Its unknown purchase still
 * holds the carrier's key and no order screen can reach it, so someone who
 * manages shipping settles it here, on the same card an order uses, with the
 * same quiet period and declaration. `access()` is asked only when such a row
 * is on the list.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import type { EngineAccess, EngineAttention, EngineAttentionItem, EngineBooking, EngineCarrier, EngineLookUpOutcome } from "../../host/engine-carrier.ts";

import { kitBrand } from "../brand.ts";
import type { StringKey } from "../i18n/strings.ts";
import { useFormat, useLocale, useT, type TFunction } from "../i18n/t.ts";
import { engineCarrier } from "../runtime.ts";
import { Code, Mono, Tag } from "./atoms.tsx";
import { readFailure, stampOf } from "./engine/flow.ts";
import { FlowButton, LiveRegion, SampleStamp, TOUCH, useSay } from "./engine/parts.tsx";
import { UnknownCard } from "./engine/UnknownCard.tsx";

export interface NeedsAttentionListProps {
  /** Opens the order a row is about. */
  onOpen: (source: { table: string; id: string }) => void;
  /** Change it to read the list again, as after "Refresh open parcels". */
  reloadKey?: string | number | undefined;
}

type Seen = { kind: "loading" } | { kind: "denied" } | { kind: "failed" } | { kind: "ready"; list: EngineAttention };

/** What this person may do, asked only once a deleted order's row is on the list. */
type Rights = { kind: "idle" } | { kind: "asking" } | { kind: "denied" } | { kind: "failed" } | { kind: "answered"; access: EngineAccess };

/** The one line a row leads with: its most pressing reason. */
function reasonLine(item: EngineAttentionItem, t: TFunction, locale: string): string {
  const { booking } = item;
  const carrier = booking.carrierName ?? kitBrand().name;
  const statusAt = booking.track?.statusAt ?? null;
  const lastEvent = statusAt === null ? "" : ` ${t("addon.shipping-kit.engine.attention.lastEvent", { time: stampOf(statusAt, locale) })}`;
  switch (item.reasons[0]) {
    case "unknown":
      if (booking.reason === "label-on-order") return t("addon.shipping-kit.engine.unknown.foreignBody");
      return booking.calledAt === null
        ? t("addon.shipping-kit.engine.attention.unknownNoTime")
        : t("addon.shipping-kit.engine.attention.unknownAsked", { time: stampOf(booking.calledAt, locale) });
    case "duplicates":
      return t("addon.shipping-kit.engine.label.duplicates", { company: carrier, n: booking.duplicates });
    case "refund-refused":
      return t("addon.shipping-kit.engine.refund.refusedTitle", { company: carrier });
    case "refund-pending":
      return t("addon.shipping-kit.engine.refund.pendingTitle");
    case "label-owed":
      return t("addon.shipping-kit.engine.label.owedBody", { company: carrier });
    case "new-number":
      return t("addon.shipping-kit.engine.track.newNumber");
    case "tracking-failed":
      return `${t("addon.shipping-kit.engine.attention.trackingFailed", { carrier })}${lastEvent}`;
    case "returned":
      return `${t("addon.shipping-kit.engine.attention.returned", { carrier })}${lastEvent}`;
    case "ambiguous":
      return t("addon.shipping-kit.engine.track.ambiguous");
    case "quiet":
      return `${t("addon.shipping-kit.engine.attention.quiet")}${lastEvent}`;
    default:
      return t("addon.shipping-kit.engine.attention.other");
  }
}

function Row({ item, onOpen }: { item: EngineAttentionItem; onOpen: NeedsAttentionListProps["onOpen"] }) {
  const t = useT();
  const locale = useLocale();
  const { booking } = item;
  const carrier = booking.carrierName ?? kitBrand().name;
  const unknown = item.reasons[0] === "unknown";
  return (
    <li style={{ minInlineSize: 0 }}>
      <button
        type="button"
        data-testid={`attention-row-${booking.id}`}
        onClick={() => onOpen({ table: item.source.table, id: item.source.id })}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "6px 12px",
          inlineSize: "100%",
          minBlockSize: TOUCH,
          padding: "12px 14px",
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--surface)",
          color: "var(--fg)",
          textAlign: "start",
          cursor: "pointer",
        }}
      >
        <span style={{ flex: "1 1 150px", minInlineSize: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <Code style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", whiteSpace: "normal", overflowWrap: "anywhere" }}>{item.reference}</Code>
          <Tag tone="warn">{t(unknown ? "addon.shipping-kit.engine.attention.unknown" : "addon.shipping-kit.engine.attention.check")}</Tag>
          {booking.test && <SampleStamp />}
        </span>
        <span style={{ flex: "1 1 220px", minInlineSize: 0, fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}>
          {carrier} · {booking.service}
        </span>
        <span style={{ flex: "1 1 170px", minInlineSize: 0, fontSize: 12, color: "var(--fg-muted)" }}>
          {booking.tracking === null ? (
            t("addon.shipping-kit.engine.attention.noNumber")
          ) : (
            <Code style={{ fontWeight: 500, whiteSpace: "normal", overflowWrap: "anywhere" }}>{booking.tracking}</Code>
          )}
        </span>
        <span style={{ flex: "2 1 260px", minInlineSize: 0, fontSize: 12, lineHeight: 1.45, color: "var(--fg-muted)" }}>{reasonLine(item, t, locale)}</span>
      </button>
    </li>
  );
}

/**
 * A row with no order to open. Its only actions are the card's, and the card
 * draws them from `access`, so a person it does not allow is offered nothing.
 */
function GoneRow({
  item,
  rights,
  client,
  say,
  onAskAgain,
  onLookUp,
  onReleased,
  onStale,
}: {
  item: EngineAttentionItem;
  rights: Rights;
  client: EngineCarrier;
  say: (text: string) => void;
  onAskAgain: () => void;
  onLookUp: (outcome: EngineLookUpOutcome, fresh: EngineBooking) => void;
  onReleased: () => void;
  onStale: () => void;
}) {
  const t = useT();
  const { booking } = item;
  return (
    <li data-testid={`attention-gone-${booking.id}`} style={{ minInlineSize: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 10px", fontSize: 12.5, lineHeight: 1.45, color: "var(--fg-muted)" }}>
        <span style={{ flex: "1 1 220px", minInlineSize: 0, fontWeight: 700, color: "var(--fg)" }}>{t("addon.shipping-kit.engine.attention.orderGone")}</span>
        {booking.tracking !== null && <Code style={{ fontSize: 12, fontWeight: 500, whiteSpace: "normal", overflowWrap: "anywhere" }}>{booking.tracking}</Code>}
        {booking.test && <SampleStamp />}
      </div>
      {rights.kind === "answered" ? (
        <UnknownCard
          booking={booking}
          access={rights.access}
          client={client}
          orderRef={item.reference}
          many={booking.parcelNumber > 1}
          say={say}
          takeFocus={false}
          onLookUp={onLookUp}
          onReleased={onReleased}
          onStale={onStale}
        />
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "10px 14px", fontSize: 13, color: "var(--fg-muted)" }}>
          {rights.kind === "failed" ? (
            <>
              <span style={{ flex: "1 1 200px" }}>{t("addon.shipping-kit.engine.gate.failed.title")}</span>
              <FlowButton onClick={onAskAgain} testId="needs-attention-rights-retry" style={{ fontSize: 13, fontWeight: 700, padding: "8px 13px" }}>
                <RefreshCw size={14} aria-hidden="true" />
                {t("addon.shipping-kit.engine.retry")}
              </FlowButton>
            </>
          ) : rights.kind === "denied" ? (
            <span>{t("addon.shipping-kit.engine.gate.noRight.title")}</span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <LoaderCircle size={15} aria-hidden="true" />
              {t("addon.shipping-kit.engine.loading")}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * What a settled row leaves behind, because the row itself goes. The card's own
 * words are about an order that can be booked again, and this one is deleted.
 */
const settledWords = (outcome: "found" | "not-bought" | "released", test: boolean): StringKey => {
  if (outcome === "released") return "addon.shipping-kit.engine.attention.goneReleased";
  if (outcome === "not-bought") return "addon.shipping-kit.engine.attention.goneNotBought";
  return test ? "addon.shipping-kit.engine.found.title" : "addon.shipping-kit.engine.attention.goneFound";
};

export function NeedsAttentionList({ onOpen, reloadKey }: NeedsAttentionListProps) {
  const t = useT();
  const { number } = useFormat();
  const heading = useId();
  const client = engineCarrier();
  const [seen, setSeen] = useState<Seen>({ kind: "loading" });
  const turn = useRef(0);
  const [rights, setRights] = useState<Rights>({ kind: "idle" });
  const [rightsTry, setRightsTry] = useState(0);
  const [settled, setSettled] = useState<string | null>(null);
  const settledLine = useRef<HTMLDivElement>(null);
  const { said, say } = useSay();

  const read = useCallback(() => {
    if (client === null) return;
    turn.current += 1;
    const mine = turn.current;
    // Rows already on screen stay there while they are read again.
    setSeen((before) => (before.kind === "ready" ? before : { kind: "loading" }));
    client.attention().then(
      (list) => {
        if (turn.current === mine) setSeen({ kind: "ready", list });
      },
      (err: unknown) => {
        if (turn.current === mine) setSeen({ kind: readFailure(err).code === "FORBIDDEN" ? "denied" : "failed" });
      },
    );
  }, [client]);

  useEffect(() => {
    read();
    return () => {
      turn.current += 1;
    };
  }, [read, reloadKey]);

  const hasGone = seen.kind === "ready" && seen.list.items.some((item) => item.orderGone);

  useEffect(() => {
    if (client === null || !hasGone) {
      setRights({ kind: "idle" });
      return undefined;
    }
    let live = true;
    setRights({ kind: "asking" });
    client.access().then(
      (access) => {
        if (live) setRights({ kind: "answered", access });
      },
      (err: unknown) => {
        if (!live) return;
        const { status } = readFailure(err);
        setRights({ kind: status === 401 || status === 403 ? "denied" : "failed" });
      },
    );
    return () => {
      live = false;
    };
  }, [client, hasGone, rightsTry]);

  // The row that held focus has gone, so focus moves to what became of it.
  useEffect(() => {
    if (settled !== null) settledLine.current?.focus();
  }, [settled]);

  // Someone with no right on this shop's labels has no such list.
  if (client === null || seen.kind === "denied") return null;

  const items = seen.kind === "ready" ? seen.list.items : [];
  const more = seen.kind === "ready" && seen.list.more;

  const finish = (outcome: "found" | "not-bought" | "released", test: boolean) => {
    const words = t(settledWords(outcome, test));
    setSettled(words);
    // Said after the card's own line, so this is the one announced.
    say(words);
  };

  return (
    <section aria-labelledby={heading} data-testid="needs-attention" style={{ display: "flex", flexDirection: "column", gap: 8, minInlineSize: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <TriangleAlert size={15} aria-hidden="true" style={{ color: "var(--warn)", flex: "0 0 auto" }} />
        <h2 id={heading} style={{ margin: 0, fontSize: 13.5, fontWeight: 800 }}>
          {t("addon.shipping-kit.engine.attention.title")}
        </h2>
        {seen.kind === "ready" && (
          <Mono style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-subtle)" }}>
            <span data-testid="needs-attention-count">
              {number(items.length)}
              {more ? "+" : ""}
            </span>
          </Mono>
        )}
      </div>

      {seen.kind === "loading" && (
        <div role="status" style={{ fontSize: 12.5, color: "var(--fg-muted)", padding: "10px 14px" }}>
          {t("addon.shipping-kit.engine.attention.loading")}
        </div>
      )}

      {seen.kind === "failed" && (
        <div role="alert" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "10px 14px" }}>
          <span style={{ flex: "1 1 200px", fontSize: 13, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.engine.attention.failed")}</span>
          <FlowButton onClick={read} testId="needs-attention-retry" style={{ fontSize: 13, fontWeight: 700, padding: "8px 13px" }}>
            <RefreshCw size={14} aria-hidden="true" />
            {t("addon.shipping-kit.engine.label.retry")}
          </FlowButton>
        </div>
      )}

      {seen.kind === "ready" && items.length === 0 && !more && (
        <div style={{ fontSize: 12.5, color: "var(--fg-subtle)", padding: "10px 14px", border: "1px dashed var(--border)", borderRadius: 11 }}>
          {t("addon.shipping-kit.engine.attention.empty")}
        </div>
      )}

      {items.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) =>
            item.orderGone ? (
              <GoneRow
                key={item.booking.id}
                item={item}
                rights={rights}
                client={client}
                say={say}
                onAskAgain={() => setRightsTry((tried) => tried + 1)}
                onLookUp={(outcome, fresh) => {
                  if (outcome === "found" || outcome === "not-bought") finish(outcome, fresh.test);
                  read();
                }}
                onReleased={() => {
                  finish("released", item.booking.test);
                  read();
                }}
                onStale={read}
              />
            ) : (
              <Row key={item.booking.id} item={item} onOpen={onOpen} />
            ),
          )}
        </ul>
      )}

      {settled !== null && (
        <div ref={settledLine} tabIndex={-1} data-testid="needs-attention-settled" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: "var(--fg)" }}>
          {settled}
        </div>
      )}

      {(hasGone || said !== "") && <LiveRegion said={said} />}

      {more && (
        <div role="note" data-testid="needs-attention-more" style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--fg-muted)" }}>
          {t("addon.shipping-kit.engine.attention.more")}
        </div>
      )}
    </section>
  );
}
