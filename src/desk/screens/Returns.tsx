/**
 * K5 Returns (comp N2 457–482): the queue by step, each return with its own
 * number (BN-09), its pieces, the customer's reason and note, and the moves
 * its step allows.
 *
 * r4: Approve has no DHL label choice (ADD-5): the customer posts it with any
 * carrier. "Mark received" opens a sheet with "Put back in stock" per piece,
 * on by default and off for a faulty one (BN-10, N2-F1), and the packer has
 * it too; it cannot be undone in stock. Refund gives back the amount
 * Adminium worked out (`refund_short`), in two steps, the owner's; the
 * return moves on only once its refunds cover it, and a refund that was not
 * sent shows so and stays to retry.
 */
import { Check, CircleAlert, PackageOpen, Undo2, X } from "lucide-react";

import { useData, useEnv, useRun } from "../env.tsx";
import { isOwner, returnLinesOf, returnsIn, returnStatus } from "../facts.ts";
import { useFmt } from "../format.ts";
import { go, openSheet } from "../store.ts";
import { Chip, Fig } from "../ui.tsx";
import { returnReasonWord, returnStatusWord } from "../words.ts";
import { num, same, text, type Row } from "../wire.ts";
import { useT } from "../../i18n/index.tsx";

export function ReturnsScreen() {
  const t = useT();
  const data = useData();
  const { door } = useEnv();
  const who = door.who();
  const owner = isOwner(who);
  const groups: { key: string; title: string; rows: Row[] }[] = owner
    ? [
        { key: "asked", title: t("desk.ret.group.asked"), rows: returnsIn(data, "asked") },
        { key: "approved", title: t("desk.ret.group.approved"), rows: returnsIn(data, "approved") },
        { key: "received", title: t("desk.ret.group.received"), rows: returnsIn(data, "received") },
        { key: "done", title: t("desk.ret.group.done"), rows: returnsIn(data, "refunded", "declined") },
      ]
    : [
        { key: "approved", title: t("desk.ret.group.approved"), rows: returnsIn(data, "approved") },
        { key: "received", title: t("desk.ret.group.receivedPacker"), rows: returnsIn(data, "received") },
      ];
  return (
    <div className="dk-screen">
      <div className="dk-head">
        <div>
          <h1 className="dk-h1">{t("desk.ret.title")}</h1>
          <div className="dk-sub">{owner ? t("desk.ret.sub") : t("desk.ret.subPacker")}</div>
        </div>
      </div>
      {groups.map((g) => (
        <section key={g.key} className="dk-group" aria-labelledby={`ret-${g.key}`}>
          <h2 id={`ret-${g.key}`} className="dk-group-title">
            {g.title}
            <Fig>{g.rows.length}</Fig>
          </h2>
          {g.rows.length === 0 && <div className="dk-empty dk-empty--small">{t("desk.nothingHere")}</div>}
          {g.rows.map((r) => (
            <ReturnCard key={String(r.id)} ret={r} />
          ))}
        </section>
      ))}
    </div>
  );
}

function ReturnCard({ ret }: { ret: Row }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const who = door.who();
  const owner = isOwner(who);
  const { busy, run } = useRun();
  const word = returnStatusWord(t, ret);
  const s = returnStatus(ret);
  const order = data.orders.find((o) => same(o.id, ret["order_id"]));
  const lines = returnLinesOf(data, ret);
  const number = text(ret["number"]) ?? "";
  const notSent = data.refunds.filter((f) => same(f["return_id"], ret.id) && text(f["refund_state"]) === "not-sent");
  const money = "refund_amount" in ret;
  const short = num(ret["refund_short"]) ?? 0;
  return (
    <article className="dk-card dk-ret">
      <span className="dk-ret-ico" aria-hidden="true">
        <Undo2 size={18} />
      </span>
      <div className="dk-ret-words">
        <div className="dk-title-row">
          <Fig strong>{number}</Fig>
          <Chip tone={word.tone}>{s === "received" && owner && short > 0 ? t("desk.ret.refundOwed") : word.label}</Chip>
          <Chip tone={text(ret["reason"]) === "faulty" ? "danger" : "neutral"}>{returnReasonWord(t, ret)}</Chip>
          {notSent.length > 0 && <Chip tone="danger">{t("desk.refund.state.notSent")}</Chip>}
        </div>
        {lines.map((l) => (
          <div key={String(l.id)} className="dk-strong">
            {text(l["product_name"])}
            {text(l["variant_label"]) !== null && <span className="dk-muted"> · {text(l["variant_label"])}</span>}
            <span className="dk-muted">
              {" "}
              <Fig>× {num(l["qty"]) ?? 1}</Fig>
            </span>
            {s !== "asked" && s !== "approved" && l["restock"] === false && <span className="dk-muted"> · {t("desk.ret.notRestocked")}</span>}
          </div>
        ))}
        <div className="dk-muted">
          {order !== undefined && text(order["name"])}
          {order !== undefined && " · "}
          <a
            href="#main"
            className="dk-num-link"
            onClick={(e) => {
              e.preventDefault();
              if (order !== undefined) go("order", { orderId: order.id });
            }}
          >
            <Fig>{text(ret["order_number"])}</Fig>
          </a>
          {" · "}
          <Fig>{fmt.day(ret["asked_at"])}</Fig>
        </div>
        {text(ret["note"]) !== null && <div className="dk-quote">{text(ret["note"])}</div>}
        {s === "declined" && text(ret["staff_reason"]) !== null && <div className="dk-muted">{t("desk.ret.declinedWhy", { why: text(ret["staff_reason"])! })}</div>}
        {!owner && s === "received" && <div className="dk-muted">{t("desk.ret.ownerRefunds")}</div>}
      </div>
      <div className="dk-ret-side">
        {money && <Fig strong>{s === "refunded" ? `−${fmt.money(ret["refunded_total"])}` : fmt.money(ret["refund_amount"])}</Fig>}
        <div className="dk-moves">
          {owner && s === "asked" && (
            <>
              <button type="button" className="dk-btn dk-btn--primary dk-btn--sm" disabled={busy} onClick={() => void run(async (d) => (await d.moveReturn(ret, "approved"), t("desk.toast.approved", { number })))}>
                <Check size={15} aria-hidden="true" />
                {t("desk.ret.approve")}
              </button>
              <button type="button" className="dk-btn dk-btn--sm" disabled={busy} onClick={() => openSheet({ kind: "decline", returnId: ret.id })}>
                <X size={15} aria-hidden="true" />
                {t("desk.ret.decline")}
              </button>
            </>
          )}
          {s === "approved" && who.can("returns", "update") && (
            <button type="button" className="dk-btn dk-btn--primary dk-btn--sm" disabled={busy} onClick={() => openSheet({ kind: "receive", returnId: ret.id })}>
              <PackageOpen size={15} aria-hidden="true" />
              {t("desk.ret.received")}
            </button>
          )}
          {owner && s === "received" && short > 0 && who.can("payment_refunds", "create") && (
            <button type="button" className="dk-btn dk-btn--primary dk-btn--sm" disabled={busy} onClick={() => openSheet({ kind: "refund", orderId: ret["order_id"] as string, returnId: ret.id })}>
              <Undo2 size={15} aria-hidden="true" />
              {t("desk.ret.refundAmount", { amount: fmt.money(short) })}
            </button>
          )}
          {owner && s === "received" && money && short <= 0 && (
            <button type="button" className="dk-btn dk-btn--sm" disabled={busy} onClick={() => void run(async (d) => (await d.moveReturn(ret, "refunded"), t("desk.toast.returnRefunded", { number })))}>
              <CircleAlert size={15} aria-hidden="true" />
              {t("desk.ret.markRefunded")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
