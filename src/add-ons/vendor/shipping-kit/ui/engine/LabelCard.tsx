/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/engine/LabelCard.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * ONE BOUGHT PARCEL: its number, its file, how it leaves, where it is (S23–S26).
 *
 * Each parcel draws its own card and document row, with its own real state.
 * Download and Print exist only on a `ready` label. An owed file is a retry,
 * because the label is paid for whether or not its file has arrived.
 *
 * A test label reads SAMPLE and its number is never drawn, with no charge
 * anywhere on it (S2-F20). Buying a label moves no order and tells no customer,
 * so this card never says the parcel has gone anywhere (D4).
 *
 * New actions on a label belong in `LabelActions`, which is the one place that
 * decides what a person can do with it.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download, FileText, Hourglass, PackageCheck, Printer, RefreshCw, TriangleAlert } from "lucide-react";
import type { HandoverKind } from "../../../host/contracts/index.ts";
import type {
  EngineAccess,
  EngineBooking,
  EngineCarrier,
  EngineRefreshOutcome,
  EngineTrackStatus,
  ENGINE_NO_DOWNLOAD,
} from "../../../host/engine-carrier.ts";

import { kitBrand } from "../../brand.ts";
import type { StringKey } from "../../i18n/strings.ts";
import { useLocale, useT } from "../../i18n/t.ts";
import { Code, Mono, Tag } from "../atoms.tsx";
import { invoiceFileName, labelFileName, moneyText, readFailure, stampOf } from "./flow.ts";
import { Detail, FlowButton, SampleStamp, Worded } from "./parts.tsx";
import { HANDOVER } from "./RatesPanel.tsx";
import { RefundBlock } from "./RefundBlock.tsx";

/** Named by type from the client, so a renamed code fails the build rather than this comparison. */
const NO_DOWNLOAD: typeof ENGINE_NO_DOWNLOAD = "ENGINE_NO_DOWNLOAD";

const TRACK_WORDS: Readonly<Record<EngineTrackStatus, StringKey>> = {
  UNKNOWN: "addon.shipping-kit.engine.track.none",
  PRE_TRANSIT: "addon.shipping-kit.engine.track.pre",
  TRANSIT: "addon.shipping-kit.engine.track.moving",
  FAILURE: "addon.shipping-kit.engine.track.failed",
  RETURNED: "addon.shipping-kit.engine.track.returned",
  DELIVERED: "addon.shipping-kit.engine.track.delivered",
};

const REFRESH_WORDS: Readonly<Record<EngineRefreshOutcome, StringKey>> = {
  updated: "addon.shipping-kit.engine.refresh.updated",
  unchanged: "addon.shipping-kit.engine.refresh.unchanged",
  "no-events": "addon.shipping-kit.engine.refresh.noEvents",
  recent: "addon.shipping-kit.engine.refresh.recent",
  test: "addon.shipping-kit.engine.track.test",
  "not-open": "addon.shipping-kit.engine.refresh.notOpen",
  "other-account": "addon.shipping-kit.engine.refresh.otherAccount",
  "no-answer": "addon.shipping-kit.engine.refresh.noAnswer",
  "rate-limited": "addon.shipping-kit.engine.refresh.rateLimited",
};

/** A document's failure, in words a person can act on. */
function documentFault(code: string): StringKey {
  switch (code) {
    case NO_DOWNLOAD:
      return "addon.shipping-kit.engine.label.noUpdate";
    case "FORBIDDEN":
    case "TABLE_FORBIDDEN":
      return "addon.shipping-kit.engine.label.noAddressRight";
    case "CSRF_FAILED":
      return "addon.shipping-kit.engine.refused.csrf.next";
    case "LABEL_OTHER_ACCOUNT":
      return "addon.shipping-kit.engine.label.otherAccount";
    case "LABEL_GONE":
    case "LABEL_EXPIRED":
      return "addon.shipping-kit.engine.label.expired";
    case "LABEL_FETCH_FAILED":
    case "LABEL_OWED":
      return "addon.shipping-kit.engine.label.fetchFailed";
    default:
      return "addon.shipping-kit.engine.label.failed";
  }
}

/** Hand a file to the browser. The address lasts long enough for a download or a print to start. */
function withBlob(blob: Blob, use: (url: string) => void): void {
  const url = URL.createObjectURL(blob);
  use(url);
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * WHETHER THE PERSON'S PRESS STILL COUNTS. A browser opens a new tab only for a
 * recent press, and blocks it silently once a slow file has used that up. A
 * browser that cannot say is treated as having used it up.
 */
function pressStillCounts(): boolean {
  return (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive === true;
}

/** Its own tab, because Adminium's page policy refuses a framed blob, so a hidden frame never reaches the printer. */
function openInTab(blob: Blob): void {
  withBlob(blob, (url) => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  });
}

/**
 * The customs invoice: only for who may send the parcel abroad, since it
 * states what the goods are worth. One that is owed is fetched by a person's
 * press, and the label itself stays usable whatever happens here.
 */
function InvoiceRow({
  booking,
  client,
  orderRef,
  say,
  onChange,
  onStale,
}: {
  booking: EngineBooking;
  client: EngineCarrier;
  orderRef: string;
  say: (text: string) => void;
  onChange: (fresh: EngineBooking) => void;
  onStale: () => void;
}) {
  const t = useT();
  const [working, setWorking] = useState(false);
  const [fault, setFault] = useState<StringKey | null>(null);
  const company = booking.carrierName ?? kitBrand().name;
  const fileName = invoiceFileName(orderRef, booking.parcelNumber);
  const failed = (err: unknown) => {
    const code = readFailure(err).code;
    const words = documentFault(code);
    setFault(words);
    say(t(words, { company }));
    if (code === "LABEL_GONE" || code === "LABEL_EXPIRED" || code === "LABEL_OWED") onStale();
  };
  const download = async () => {
    if (working) return;
    setWorking(true);
    setFault(null);
    try {
      const blob = await client.downloadDocument(booking.id, "customs-invoice");
      withBlob(blob, (url) => {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
      });
      say(t("addon.shipping-kit.engine.say.saved"));
    } catch (err) {
      failed(err);
    } finally {
      setWorking(false);
    }
  };
  const fetchIt = async () => {
    if (working) return;
    setWorking(true);
    setFault(null);
    try {
      const fresh = await client.fetchDocument(booking.id, "customs-invoice");
      onChange(fresh);
      if (fresh.label.customsInvoice) say(t("addon.shipping-kit.engine.say.arrived"));
      else {
        setFault("addon.shipping-kit.engine.label.fetchFailed");
        say(t("addon.shipping-kit.engine.label.fetchFailed", { company }));
      }
    } catch (err) {
      failed(err);
    } finally {
      setWorking(false);
    }
  };
  const { customsInvoice, customsInvoiceOwed } = booking.label;
  return (
    <div data-testid="engine-invoice" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 12px", border: "1px solid var(--border)", borderRadius: 11, background: "var(--surface-2)", padding: "9px 12px" }}>
        <FileText size={15} aria-hidden="true" style={{ color: "var(--fg-subtle)", flex: "0 0 auto" }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{t("addon.shipping-kit.customs.invoice")}</span>
        {customsInvoice && <Mono style={{ fontSize: 11, fontWeight: 500, color: "var(--fg-subtle)", whiteSpace: "normal", overflowWrap: "anywhere" }}>{fileName}</Mono>}
        <span style={{ flex: 1 }} />
        {customsInvoice ? (
          <FlowButton variant="ghost" busy={working} onClick={() => void download()} testId="engine-invoice-download" style={{ fontSize: 12.5, fontWeight: 700, padding: "8px 12px" }}>
            <Download size={14} aria-hidden="true" />
            {t("addon.shipping-kit.label.download")}
          </FlowButton>
        ) : (
          <FlowButton variant="ghost" busy={working} onClick={() => void fetchIt()} testId="engine-invoice-retry" style={{ fontSize: 12.5, fontWeight: 700, padding: "8px 12px" }}>
            <RefreshCw size={14} aria-hidden="true" />
            {t("addon.shipping-kit.engine.label.retry")}
          </FlowButton>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
        {t(customsInvoiceOwed ? "addon.shipping-kit.customs.invoiceOwed" : "addon.shipping-kit.customs.invoiceHow", { company })}
      </div>
      {fault !== null && (
        <div data-testid="engine-invoice-fault" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--danger)" }}>
          {t(fault, { company })}
        </div>
      )}
    </div>
  );
}

function LabelActions({
  booking,
  client,
  orderRef,
  say,
  onChange,
  onStale,
}: {
  booking: EngineBooking;
  client: EngineCarrier;
  orderRef: string;
  say: (text: string) => void;
  onChange: (fresh: EngineBooking) => void;
  onStale: () => void;
}) {
  const t = useT();
  const [working, setWorking] = useState<"download" | "print" | "fetch" | null>(null);
  const [fault, setFault] = useState<StringKey | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  // A file that arrived after the press stopped counting: one more press opens it.
  const [printable, setPrintable] = useState<Blob | null>(null);
  const { state, sizeDiffers, size, sizeGot } = booking.label;
  const company = booking.carrierName ?? kitBrand().name;

  const failed = (err: unknown) => {
    const code = readFailure(err).code;
    const words = documentFault(code);
    setFault(words);
    say(t(words, { company }));
    // A file that has moved on since this card was drawn: read where it stands.
    if (code === "LABEL_GONE" || code === "LABEL_EXPIRED" || code === "LABEL_OWED") onStale();
  };

  const fileAction = async (kind: "download" | "print") => {
    if (working !== null) return;
    setWorking(kind);
    setFault(null);
    setPrintable(null);
    try {
      const blob = await client.downloadDocument(booking.id, "label");
      if (kind === "print") {
        if (pressStillCounts()) {
          openInTab(blob);
          say(t("addon.shipping-kit.engine.say.printing"));
        } else {
          setPrintable(blob);
          say(t("addon.shipping-kit.engine.label.printReady"));
        }
      } else {
        withBlob(blob, (url) => {
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = labelFileName(orderRef, booking.parcelNumber, blob.type);
          anchor.click();
        });
        setDownloaded(true);
        say(t("addon.shipping-kit.engine.say.saved"));
      }
    } catch (err) {
      failed(err);
    } finally {
      setWorking(null);
    }
  };

  const fetchFile = async () => {
    if (working !== null) return;
    setWorking("fetch");
    setFault(null);
    try {
      const fresh = await client.fetchDocument(booking.id, "label");
      onChange(fresh);
      if (fresh.label.state === "ready") say(t("addon.shipping-kit.engine.say.arrived"));
      else {
        setFault("addon.shipping-kit.engine.label.fetchFailed");
        say(t("addon.shipping-kit.engine.label.fetchFailed", { company }));
      }
    } catch (err) {
      failed(err);
    } finally {
      setWorking(null);
    }
  };

  let status: ReactNode = null;
  if (state === "owed") {
    status = (
      <div
        role="note"
        data-testid="engine-label-owed"
        style={{ display: "flex", flexWrap: "wrap", gap: "10px 12px", alignItems: "center", border: "1px solid var(--border-strong)", background: "var(--info-soft)", borderRadius: 11, padding: "11px 13px" }}
      >
        <Hourglass size={16} aria-hidden="true" style={{ color: "var(--info)", flex: "0 0 auto" }} />
        <div style={{ flex: "1 1 200px", minInlineSize: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{t("addon.shipping-kit.engine.label.owedTitle")}</div>
          <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginBlockStart: 2 }}>{t("addon.shipping-kit.engine.label.owedBody", { company })}</div>
        </div>
        <FlowButton variant="ghost" busy={working === "fetch"} onClick={() => void fetchFile()} testId="engine-label-retry" style={{ fontSize: 13, fontWeight: 700, padding: "9px 14px" }}>
          <RefreshCw size={14} aria-hidden="true" />
          {t("addon.shipping-kit.engine.label.retry")}
        </FlowButton>
      </div>
    );
  } else if (state === "gone" || state === "none") {
    status = (
      <div data-testid={`engine-label-${state}`} style={{ border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 11, padding: "11px 13px" }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{t(state === "gone" ? "addon.shipping-kit.engine.label.goneTitle" : "addon.shipping-kit.engine.label.noneTitle")}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)", marginBlockStart: 2 }}>
          {t(state === "gone" ? "addon.shipping-kit.engine.label.goneBody" : "addon.shipping-kit.engine.label.noneBody")}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 12px", border: "1px solid var(--border)", borderRadius: 11, background: "var(--surface-2)", padding: "9px 12px" }}>
        <FileText size={15} aria-hidden="true" style={{ color: "var(--fg-subtle)", flex: "0 0 auto" }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{t("addon.shipping-kit.engine.label.file")}</span>
        {booking.test && <SampleStamp />}
        <span style={{ flex: 1 }} />
        {state === "ready" && (
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <FlowButton variant="ghost" busy={working === "download"} onClick={() => void fileAction("download")} testId="engine-label-download" style={{ fontSize: 12.5, fontWeight: 700, padding: "8px 12px" }}>
              <Download size={14} aria-hidden="true" />
              {t(downloaded ? "addon.shipping-kit.engine.label.again" : "addon.shipping-kit.label.download")}
            </FlowButton>
            <FlowButton variant="ghost" busy={working === "print"} onClick={() => void fileAction("print")} testId="engine-label-print" style={{ fontSize: 12.5, fontWeight: 700, padding: "8px 12px" }}>
              <Printer size={14} aria-hidden="true" />
              {t("addon.shipping-kit.label.print")}
            </FlowButton>
          </span>
        )}
      </div>
      {status}
      {state === "ready" && printable !== null && (
        <div data-testid="engine-label-print-ready" style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", alignItems: "center", border: "1px solid var(--border-strong)", background: "var(--info-soft)", borderRadius: 11, padding: "9px 12px" }}>
          <span style={{ flex: "1 1 180px", minInlineSize: 0, fontSize: 12.5, fontWeight: 600 }}>{t("addon.shipping-kit.engine.label.printReady")}</span>
          <FlowButton
            variant="ghost"
            onClick={() => {
              openInTab(printable);
              setPrintable(null);
              say(t("addon.shipping-kit.engine.say.printing"));
            }}
            testId="engine-label-print-open"
            style={{ fontSize: 12.5, fontWeight: 700, padding: "8px 12px" }}
          >
            <Printer size={14} aria-hidden="true" />
            {t("addon.shipping-kit.engine.label.printOpen")}
          </FlowButton>
        </div>
      )}
      {sizeDiffers && size !== null && sizeGot !== null && (
        <div data-testid="engine-label-size" style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12.5, color: "var(--fg-muted)" }}>
          <TriangleAlert size={13} aria-hidden="true" style={{ color: "var(--warn)", flex: "0 0 auto", marginBlockStart: 2 }} />
          <span>
            <Worded k="addon.shipping-kit.engine.label.size" figures={{ asked: size.toUpperCase(), got: sizeGot.toUpperCase() }} words={{ company }} />
          </span>
        </div>
      )}
      {fault !== null && (
        <div data-testid="engine-label-fault" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--danger)" }}>
          {t(fault, { company })}
        </div>
      )}
    </div>
  );
}

function TrackingBlock({
  booking,
  client,
  say,
  onChange,
}: {
  booking: EngineBooking;
  client: EngineCarrier;
  say: (text: string) => void;
  onChange: (fresh: EngineBooking) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [refreshing, setRefreshing] = useState(false);
  const [words, setWords] = useState<StringKey | null>(null);
  const company = booking.carrierName ?? kitBrand().name;
  const track = booking.track ?? null;

  if (booking.test) {
    return <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.engine.track.test")}</div>;
  }

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setWords(null);
    try {
      const answer = await client.refreshBooking(booking.id);
      const said = REFRESH_WORDS[answer.outcome];
      setWords(said);
      say(t(said, { company }));
      if (answer.track !== null) onChange({ ...booking, track: answer.track });
    } catch (err) {
      const said: StringKey = readFailure(err).code === "CSRF_FAILED" ? "addon.shipping-kit.engine.refused.csrf.next" : "addon.shipping-kit.engine.refresh.failed";
      setWords(said);
      say(t(said, { company }));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div data-testid="engine-tracking" style={{ display: "flex", flexDirection: "column", gap: 8, borderBlockStart: "1px solid var(--border)", paddingBlockStart: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 12px" }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>{t("addon.shipping-kit.tracking.title")}</span>
        <Tag tone={track?.status === "FAILURE" ? "danger" : track?.status === "DELIVERED" ? "pos" : "neutral"}>
          {t(track?.status != null ? TRACK_WORDS[track.status] : "addon.shipping-kit.engine.track.none")}
        </Tag>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.engine.track.lastChecked")}</span>
        <span style={{ fontSize: 12.5, fontWeight: 500 }}>
          {track?.checkedAt != null ? stampOf(track.checkedAt, locale) : t("addon.shipping-kit.engine.track.never")}
        </span>
        <FlowButton variant="ghost" busy={refreshing} onClick={() => void refresh()} testId="engine-track-refresh" style={{ fontSize: 13, fontWeight: 700, padding: "8px 13px" }}>
          <RefreshCw size={14} aria-hidden="true" />
          {refreshing ? t("addon.shipping-kit.engine.unknown.checking") : t("addon.shipping-kit.engine.track.refresh")}
        </FlowButton>
      </div>
      {track?.newNumber === true && <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--warn)" }}>{t("addon.shipping-kit.engine.track.newNumber")}</div>}
      {track?.flag === "ambiguous" && <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.engine.track.ambiguous")}</div>}
      {words !== null && (
        <div data-testid="engine-track-words" style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
          {t(words, { company })}
        </div>
      )}
    </div>
  );
}

export function LabelCard({
  booking,
  access,
  client,
  handover,
  orderRef,
  many,
  takeFocus,
  say,
  onChange,
  onStale,
  onReplace,
}: {
  booking: EngineBooking;
  access: EngineAccess;
  client: EngineCarrier;
  /** Known only when the rate was chosen on this page: a booking does not record it. */
  handover: HandoverKind | undefined;
  orderRef: string;
  many: boolean;
  takeFocus: boolean;
  say: (text: string) => void;
  onChange: (fresh: EngineBooking) => void;
  onStale: () => void;
  /** Offered on a label with a refund pending, when this person may book another. */
  onReplace?: (() => void) | undefined;
}) {
  const t = useT();
  const locale = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (takeFocus) heading.current?.focus();
  }, [takeFocus]);

  const company = booking.carrierName ?? kitBrand().name;
  const test = booking.test;
  const showCharge = !test && !access.pricesHidden && booking.amount !== undefined && booking.currency !== undefined;
  const how = HANDOVER[handover ?? "unknown"];
  const HowIcon = how.icon;
  const service = booking.carrierName === null ? booking.service : `${booking.carrierName} · ${booking.service}`;
  const voiding = booking.state === "voiding";
  const refused = booking.refund?.state === "refused";
  const edge = voiding ? "var(--warn)" : refused ? "var(--danger)" : "var(--pos)";

  return (
    <section
      data-testid={`engine-label-card-${booking.parcelNumber}`}
      style={{ border: `1.5px solid ${edge}`, background: "var(--surface)", borderRadius: 14, padding: 17, display: "flex", flexDirection: "column", gap: 14, minInlineSize: 0 }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 10px" }}>
        <PackageCheck size={19} aria-hidden="true" style={{ color: edge, flex: "0 0 auto" }} />
        <h3 ref={heading} tabIndex={-1} style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: edge, lineHeight: 1.35, flex: "1 1 160px", outline: "none" }}>
          {voiding ? t("addon.shipping-kit.engine.refund.requestedTitle") : refused ? t("addon.shipping-kit.engine.refund.refusedTitle", { company }) : t("addon.shipping-kit.engine.label.title")}
        </h3>
        {many && <Tag>{t("addon.shipping-kit.engine.parcelN", { n: booking.parcelNumber })}</Tag>}
      </div>

      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", gap: "12px 22px" }}>
        <div style={{ minInlineSize: 0 }}>
          <dt style={{ fontSize: 11.5, color: "var(--fg-subtle)", marginBlockEnd: 3 }}>{t("addon.shipping-kit.engine.label.tracking")}</dt>
          <dd style={{ margin: 0, overflowWrap: "anywhere" }} data-testid="engine-label-number">
            {test ? (
              <SampleStamp />
            ) : booking.tracking !== null ? (
              <Code style={{ fontSize: 17, fontWeight: 600, whiteSpace: "normal" }}>{booking.tracking}</Code>
            ) : (
              <span style={{ fontSize: 12, color: "var(--fg-subtle)", border: "1.5px dashed var(--border-strong)", borderRadius: 7, paddingBlock: 2, paddingInline: 8 }}>
                {t("addon.shipping-kit.engine.label.noNumber")}
              </span>
            )}
          </dd>
        </div>
        <Detail label={t("addon.shipping-kit.engine.unknown.service")} value={<span dir="auto">{service}</span>} />
        {showCharge && <Detail label={t("addon.shipping-kit.engine.label.charged")} value={moneyText(booking.amount!, booking.currency!, locale)} mono />}
        <div style={{ minInlineSize: 0 }}>
          <dt style={{ fontSize: 11.5, color: "var(--fg-subtle)", marginBlockEnd: 3 }}>{t("addon.shipping-kit.engine.label.how")}</dt>
          <dd style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, fontWeight: 700 }}>
            <HowIcon size={15} aria-hidden="true" style={{ marginBlockStart: 1, flex: "0 0 auto" }} />
            <span>{t(how.key, { company })}</span>
          </dd>
        </div>
      </dl>

      {showCharge && (
        <div data-testid="engine-charges-line" style={{ fontSize: 12, lineHeight: 1.45, color: "var(--fg-muted)" }}>
          {t("addon.shipping-kit.engine.label.later")}
          {booking.chargeDiffers === true ? ` ${t("addon.shipping-kit.engine.label.chargeDiffers")}` : ""}
        </div>
      )}

      {booking.duplicates > 0 && (
        <div style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12.5, fontWeight: 600, color: "var(--warn)" }}>
          <TriangleAlert size={14} aria-hidden="true" style={{ flex: "0 0 auto", marginBlockStart: 2 }} />
          <span>
            <Worded k="addon.shipping-kit.engine.label.duplicates" figures={{ n: booking.duplicates }} words={{ company }} />
          </span>
        </div>
      )}

      {voiding ? (
        <div role="note" data-testid="engine-refund-blocked" style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12.5, fontWeight: 600, color: "var(--warn)" }}>
          <TriangleAlert size={14} aria-hidden="true" style={{ flex: "0 0 auto", marginBlockStart: 2 }} />
          <span>{t("addon.shipping-kit.engine.refund.doNotUse")}</span>
        </div>
      ) : (
        <LabelActions booking={booking} client={client} orderRef={orderRef} say={say} onChange={onChange} onStale={onStale} />
      )}

      {!voiding && access.mayShipAbroad && (booking.label.customsInvoice || booking.label.customsInvoiceOwed) && (
        <InvoiceRow booking={booking} client={client} orderRef={orderRef} say={say} onChange={onChange} onStale={onStale} />
      )}

      {!voiding && booking.purpose !== "return" && (
        <div style={{ border: "1px solid var(--border-strong)", background: "var(--surface-2)", borderRadius: 11, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{t("addon.shipping-kit.engine.label.nextTitle")}</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)" }}>
            {t(test ? "addon.shipping-kit.engine.label.nextTest" : "addon.shipping-kit.engine.label.nextBody")}
          </div>
        </div>
      )}

      <RefundBlock booking={booking} access={access} client={client} company={company} say={say} onChange={onChange} onStale={onStale} onReplace={onReplace} />

      <TrackingBlock booking={booking} client={client} say={say} onChange={onChange} />
    </section>
  );
}
