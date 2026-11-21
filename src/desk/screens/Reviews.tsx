/**
 * K8 Reviews (comp N2 612–639): the shop's reviews as Forms & surveys keeps
 * them, read and moved through the owner's own grant: waiting, published,
 * hidden. Publish; hide with a reason from Forms' fixed list (never about
 * stars, and there is no "hide low ratings"); a reply shown under the review
 * as the shop's. No publish tick (C12a). Escape on a reply closes it and
 * puts focus back on Reply (N2-F21).
 *
 * The average under a product is Forms' own count and sum of its published
 * stars, divided for reading.
 */
import { useRef, useState } from "react";
import { Eye, EyeOff, MessageSquare, Star } from "lucide-react";

import { useData, useRun } from "../env.tsx";
import { orderOfReview, reviewsIn, reviewState, totalsOf } from "../facts.ts";
import { useFmt } from "../format.ts";
import { go, openSheet, useDesk, type ReviewTab } from "../store.ts";
import { Fig, FieldError } from "../ui.tsx";
import { num, text, type Row } from "../wire.ts";
import { useT, type MessageKey } from "../../i18n/index.tsx";

export const HIDE_REASONS: Record<string, MessageKey> = {
  abusive: "desk.rv.reason.abusive",
  "names-someone": "desk.rv.reason.namesSomeone",
  "not-about-us": "desk.rv.reason.notAboutUs",
  "looks-fake": "desk.rv.reason.looksFake",
};

export function ReviewsScreen() {
  const t = useT();
  const data = useData();
  const tab = useDesk((s) => s.reviewTab);
  const tabs: { key: ReviewTab; label: string }[] = [
    { key: "waiting", label: t("desk.rv.waiting") },
    { key: "published", label: t("desk.rv.published") },
    { key: "hidden", label: t("desk.rv.hidden") },
  ];
  const list = reviewsIn(data, tab);
  return (
    <div className="dk-screen">
      <div className="dk-head">
        <h1 className="dk-h1">{t("desk.rv.title")}</h1>
      </div>
      <div role="tablist" aria-label={t("desk.rv.title")} className="dk-tabs">
        {tabs.map((b) => (
          <button key={b.key} type="button" role="tab" aria-selected={tab === b.key} className="dk-tab" onClick={() => useDesk.setState({ reviewTab: b.key })}>
            {b.label}
            <Fig>{reviewsIn(data, b.key).length}</Fig>
          </button>
        ))}
      </div>
      <div role="tabpanel" className="dk-col">
        {list.length === 0 && <div className="dk-empty">{t("desk.nothingHere")}</div>}
        {list.map((r) => (
          <ReviewCard key={String(r.id)} review={r} />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Row }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { busy, run } = useRun();
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState(text(review["reply"]) ?? "");
  const [error, setError] = useState(false);
  const replyButton = useRef<HTMLButtonElement>(null);
  const stars = num(review["stars"]) ?? 0;
  const totals = totalsOf(data, review["about_key"]);
  const order = orderOfReview(data, review);
  const state = reviewState(review);
  const rid = `rv-reply-${String(review.id)}`;
  const close = () => {
    setReplying(false);
    setError(false);
    replyButton.current?.focus();
  };
  const reason = text(review["hide_reason"]);
  return (
    <article className="dk-card dk-review">
      <div className="dk-title-row">
        <div>
          <div className="dk-strong">
            {text(review["about_name"])}
            {text(review["about_detail"]) !== null && <span className="dk-muted"> · {text(review["about_detail"])}</span>}
          </div>
          <div className="dk-muted">{totals === null || totals.count === 0 ? t("desk.rv.noAverage") : t("desk.rv.average", { avg: fmt.number(Math.round((totals.sum / totals.count) * 10) / 10) }, totals.count)}</div>
        </div>
        <span className="dk-stars dk-push" role="img" aria-label={t("desk.rv.starsAria", undefined, stars)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={16} aria-hidden="true" className={n <= stars ? "dk-star--on" : "dk-star--off"} />
          ))}
        </span>
      </div>
      {text(review["title"]) !== null && <div className="dk-strong">{text(review["title"])}</div>}
      {text(review["body"]) !== null && <p className="dk-review-body">{text(review["body"])}</p>}
      <div className="dk-muted">
        {text(review["shown_name"])} · <Fig>{fmt.day(review["submitted_at"])}</Fig>
        {order !== undefined && (
          <>
            {" · "}
            {t("desk.rv.fromOrder")}{" "}
            <a
              href="#main"
              className="dk-num-link"
              onClick={(e) => {
                e.preventDefault();
                go("order", { orderId: order.id });
              }}
            >
              <Fig>{text(order["number"])}</Fig>
            </a>
          </>
        )}
      </div>
      {state === "hidden" && reason !== null && (
        <div className="dk-note">
          <EyeOff size={15} aria-hidden="true" />
          {t("desk.rv.hiddenWhy", { reason: t(HIDE_REASONS[reason] ?? "desk.rv.reason.abusive") })}
        </div>
      )}
      {text(review["reply"]) !== null && !replying && (
        <div className="dk-reply">
          <div className="dk-label">{t("desk.rv.replyFrom", { shop: text(data.settings?.["shop_name"]) ?? t("brand.name") })}</div>
          {text(review["reply"])}
        </div>
      )}
      {replying && (
        <div className="dk-field" onKeyDown={(e) => e.key === "Escape" && close()}>
          <label htmlFor={rid}>{t("desk.rv.yourReply")}</label>
          <textarea id={rid} className="dk-input" rows={3} autoFocus value={draft} aria-invalid={error} aria-describedby={error ? `${rid}-err` : undefined} onChange={(e) => setDraft(e.target.value)} />
          {error && <FieldError id={`${rid}-err`}>{t("desk.rv.errReply")}</FieldError>}
          <div className="dk-moves">
            <button
              type="button"
              className="dk-btn dk-btn--primary dk-btn--sm"
              disabled={busy}
              onClick={() => {
                if (draft.trim() === "") {
                  setError(true);
                  return;
                }
                void run(async (d) => {
                  await d.saveReview(review, { reply: draft.trim() });
                  close();
                  return t("desk.toast.replied");
                });
              }}
            >
              {t("desk.rv.postReply")}
            </button>
            <button type="button" className="dk-btn dk-btn--sm" onClick={close}>
              {t("desk.cancel")}
            </button>
          </div>
        </div>
      )}
      <div className="dk-moves">
        {state !== "published" && (
          <button type="button" className="dk-btn dk-btn--primary dk-btn--sm" disabled={busy} onClick={() => void run(async (d) => (await d.saveReview(review, { state: "published" }), t("desk.toast.published")))}>
            <Eye size={15} aria-hidden="true" />
            {state === "hidden" ? t("desk.rv.showAgain") : t("desk.rv.publish")}
          </button>
        )}
        {state !== "hidden" && (
          <button type="button" className="dk-btn dk-btn--sm" disabled={busy} onClick={() => openSheet({ kind: "hide", reviewId: review.id })}>
            <EyeOff size={15} aria-hidden="true" />
            {t("desk.rv.hide")}
          </button>
        )}
        <button ref={replyButton} type="button" className="dk-btn dk-btn--sm" aria-expanded={replying} aria-controls={replying ? rid : undefined} onClick={() => setReplying(true)}>
          <MessageSquare size={15} aria-hidden="true" />
          {t("desk.rv.reply")}
        </button>
      </div>
    </article>
  );
}
