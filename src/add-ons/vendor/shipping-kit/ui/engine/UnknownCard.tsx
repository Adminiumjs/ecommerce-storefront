/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/engine/UnknownCard.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * A PURCHASE WITH NO KNOWN RESULT (S21, S22).
 *
 * A label may have been paid for, so nothing on this card leads to Book.
 * "Check again" asks the carrier and reports each of its seven answers in its
 * own words. Only a clear answer settles it: an empty search never does.
 *
 * Releasing is a person's own declaration that no label exists, for someone who
 * manages shipping, after the quiet period. The screen holds no clock, so the
 * quiet period is read from the server's stamp on a look-up made after it ended.
 * If the look-up itself cannot run, the button is left to the engine, which
 * refuses a release that comes too early.
 */

import { useId, useState } from "react";
import { CircleHelp, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import type { EngineAccess, EngineBooking, EngineCarrier, EngineLookUpOutcome } from "../../../host/engine-carrier.ts";

import { kitBrand } from "../../brand.ts";
import type { StringKey } from "../../i18n/strings.ts";
import { useFormat, useLocale, useT } from "../../i18n/t.ts";
import { quietPassed, readFailure, stampOf, timeOf } from "./flow.ts";
import { Detail, Dialog, FlowButton, StatusCard, Worded } from "./parts.tsx";

const OUTCOME: Readonly<Record<EngineLookUpOutcome, StringKey>> = {
  found: "addon.shipping-kit.engine.found.title",
  "not-bought": "addon.shipping-kit.engine.safe.title",
  "no-match": "addon.shipping-kit.engine.outcome.noMatch",
  "no-answer": "addon.shipping-kit.engine.outcome.noAnswer",
  "cannot-check": "addon.shipping-kit.engine.outcome.cannotCheck",
  "other-account": "addon.shipping-kit.engine.outcome.otherAccount",
  "other-rate": "addon.shipping-kit.engine.outcome.otherRate",
};

export function UnknownCard({
  booking,
  access,
  client,
  orderRef,
  many,
  say,
  takeFocus,
  onLookUp,
  onReleased,
  onStale,
}: {
  booking: EngineBooking;
  access: EngineAccess;
  client: EngineCarrier;
  orderRef: string;
  /** Whether the order has more than one parcel, so this card must say which. */
  many: boolean;
  say: (text: string) => void;
  takeFocus: boolean;
  onLookUp: (outcome: EngineLookUpOutcome, fresh: EngineBooking) => void;
  onReleased: (fresh: EngineBooking) => void;
  /** Someone else settled it: the list is out of date. */
  onStale: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const { number } = useFormat();
  const dialogTitle = useId();
  const tickFault = useId();
  const waitLine = useId();
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<EngineLookUpOutcome | null>(null);
  const [checkFault, setCheckFault] = useState<StringKey | null>(null);
  const [checkBroke, setCheckBroke] = useState(false);
  const [asking, setAsking] = useState(false);
  const [ticked, setTicked] = useState(false);
  const [needTick, setNeedTick] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseFault, setReleaseFault] = useState<string | null>(null);

  const company = booking.carrierName ?? kitBrand().name;
  const foreign = booking.reason === "label-on-order";
  const mayPress = quietPassed(booking) || checkBroke;
  const test = booking.test;

  const check = async () => {
    if (checking) return;
    setChecking(true);
    setCheckFault(null);
    try {
      const answer = await client.checkBooking(booking.id);
      setOutcome(answer.outcome);
      setCheckBroke(false);
      // "Nothing was bought" is said by the parent, once it has read the list again.
      if (answer.outcome !== "not-bought") say(t(OUTCOME[answer.outcome]));
      onLookUp(answer.outcome, answer.booking);
    } catch (err) {
      const code = readFailure(err).code;
      if (code === "BOOKING_NOT_UNKNOWN") {
        onStale();
        return;
      }
      const fault: StringKey = code === "CSRF_FAILED" ? "addon.shipping-kit.engine.refused.csrf.next" : "addon.shipping-kit.engine.check.failed";
      setCheckFault(fault);
      setOutcome(null);
      setCheckBroke(code !== "CSRF_FAILED");
      say(t(fault));
    } finally {
      setChecking(false);
    }
  };

  const release = async () => {
    if (releasing) return;
    if (!ticked) {
      setNeedTick(true);
      return;
    }
    setReleasing(true);
    setReleaseFault(null);
    try {
      const fresh = await client.releaseBooking(booking.id);
      setAsking(false);
      say(t("addon.shipping-kit.engine.release.done"));
      onReleased(fresh);
    } catch (err) {
      const code = readFailure(err).code;
      if (code === "BOOKING_NOT_UNKNOWN") {
        setAsking(false);
        onStale();
      } else if (code === "RELEASE_TOO_SOON" && booking.releaseAfter !== null) {
        setCheckBroke(false);
        setReleaseFault(t("addon.shipping-kit.engine.release.tooSoon", { time: timeOf(booking.releaseAfter, locale) }));
      } else if (code === "CSRF_FAILED") {
        setReleaseFault(t("addon.shipping-kit.engine.refused.csrf.next"));
      } else {
        setReleaseFault(t("addon.shipping-kit.engine.release.failed"));
      }
    } finally {
      setReleasing(false);
    }
  };

  const details = (
    <dl
      style={{
        margin: 0,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))",
        gap: "10px 16px",
        border: "1px solid var(--border)",
        borderRadius: 11,
        background: "var(--surface-2)",
        padding: "12px 14px",
      }}
    >
      <Detail label={t("addon.shipping-kit.engine.unknown.order")} value={orderRef} mono />
      {many && <Detail label={t("addon.shipping-kit.engine.unknown.parcel")} value={number(booking.parcelNumber)} mono />}
      {/* The delivery company is known only once a label is bought. The account's own name is not an answer to it. */}
      {booking.carrierName !== null && <Detail label={t("addon.shipping-kit.engine.unknown.carrier")} value={<span dir="auto">{booking.carrierName}</span>} />}
      <Detail label={t("addon.shipping-kit.engine.unknown.service")} value={<span dir="auto">{booking.service}</span>} />
      {booking.calledAt !== null && <Detail label={t("addon.shipping-kit.engine.unknown.asked")} value={stampOf(booking.calledAt, locale)} mono />}
    </dl>
  );

  return (
    <>
      <StatusCard
        tone="warn"
        icon={<CircleHelp size={20} />}
        testId="engine-unknown"
        takeFocus={takeFocus}
        title={t(foreign ? "addon.shipping-kit.engine.unknown.foreignTitle" : "addon.shipping-kit.engine.unknown.title")}
        body={t(foreign ? "addon.shipping-kit.engine.unknown.foreignBody" : "addon.shipping-kit.engine.unknown.body")}
        details={details}
        {...(outcome !== null && outcome !== "found" && outcome !== "not-bought"
          ? { next: <span data-testid="engine-check-outcome">{t(OUTCOME[outcome])}</span> }
          : checkFault !== null
            ? { next: <span data-testid="engine-check-outcome">{t(checkFault)}</span> }
            : {})}
        actions={
          access.mayBook || access.manages ? (
            <>
              {access.mayBook && (
                <FlowButton variant="accent" busy={checking} onClick={() => void check()} testId="engine-check">
                  <RefreshCw size={15} aria-hidden="true" />
                  {checking ? t("addon.shipping-kit.engine.unknown.checking") : t("addon.shipping-kit.engine.unknown.check")}
                </FlowButton>
              )}
              {access.manages && (
                <FlowButton
                  variant="ghost"
                  onClick={() => {
                    setTicked(false);
                    setNeedTick(false);
                    setReleaseFault(null);
                    setAsking(true);
                  }}
                  testId="engine-release-open"
                >
                  <ShieldCheck size={15} aria-hidden="true" />
                  {t("addon.shipping-kit.engine.unknown.myself")}
                </FlowButton>
              )}
            </>
          ) : null
        }
        {...(access.manages
          ? {}
          : { note: t(access.mayBook ? "addon.shipping-kit.engine.unknown.ownerOnly" : "addon.shipping-kit.engine.unknown.askOwner") })}
      />

      {asking && (
        <Dialog labelledBy={dialogTitle} onClose={() => setAsking(false)}>
          <h2 id={dialogTitle} style={{ margin: 0, fontSize: 16.5, fontWeight: 800, lineHeight: 1.35 }}>
            {t("addon.shipping-kit.engine.release.title")}
          </h2>
          {booking.calledAt !== null && (
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--fg-muted)" }}>
              <Worded k="addon.shipping-kit.engine.release.asked" figures={{ time: timeOf(booking.calledAt, locale) }} words={{ company }} />
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: 9,
              alignItems: "flex-start",
              border: "1.5px solid var(--danger)",
              background: "var(--danger-soft)",
              borderRadius: 11,
              padding: "10px 12px",
              fontSize: 13,
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            <TriangleAlert size={16} aria-hidden="true" style={{ color: "var(--danger)", flex: "0 0 auto", marginBlockStart: 2 }} />
            <span>{t(test ? "addon.shipping-kit.engine.release.warnTest" : "addon.shipping-kit.engine.release.warn")}</span>
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={ticked}
              data-testid="engine-release-tick"
              aria-invalid={needTick}
              aria-describedby={needTick ? tickFault : undefined}
              onChange={(event) => {
                setTicked(event.target.checked);
                setNeedTick(false);
              }}
              style={{ inlineSize: 20, blockSize: 20, margin: 0, accentColor: "var(--accent)", flex: "0 0 auto" }}
            />
            <span>{t("addon.shipping-kit.engine.release.tick", { company })}</span>
          </label>
          {needTick && (
            <span id={tickFault} style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)", paddingInlineStart: 30 }}>
              {t("addon.shipping-kit.engine.release.tickNeeded")}
            </span>
          )}
          {!mayPress && booking.releaseAfter !== null && (
            <div id={waitLine} data-testid="engine-release-wait" style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--fg-muted)" }}>
              <Worded k="addon.shipping-kit.engine.release.wait" figures={{ time: timeOf(booking.releaseAfter, locale) }} />
            </div>
          )}
          {releaseFault !== null && <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--danger)" }}>{releaseFault}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBlockStart: 4 }}>
            <FlowButton variant="ghost" firstFocus onClick={() => setAsking(false)} testId="engine-release-keep">
              {t("addon.shipping-kit.engine.release.keep")}
            </FlowButton>
            <FlowButton
              variant="solid"
              disabled={!mayPress}
              busy={releasing}
              onClick={() => void release()}
              testId="engine-release-confirm"
              {...(!mayPress ? { describedBy: waitLine } : {})}
            >
              {t("addon.shipping-kit.engine.release.ok")}
            </FlowButton>
          </div>
        </Dialog>
      )}
    </>
  );
}
