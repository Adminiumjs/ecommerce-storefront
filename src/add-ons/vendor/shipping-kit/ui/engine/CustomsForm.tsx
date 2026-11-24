/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/engine/CustomsForm.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * THE CUSTOMS DECLARATION FOR ONE ORDER.
 *
 * Everything on it comes from the engine, which read it from the order. A person
 * may correct a description, an HS code or a manufacturer code. Quantity, value,
 * origin and SKU are drawn in read-only boxes, and the engine would refuse them
 * anyway.
 *
 * NO CODE IS EVER FILLED IN HERE. A code the destination asks for and the order
 * lacks is a warning, because the carrier has the last word on it.
 *
 * THE TICK IS NEVER PRE-TICKED, and it names the person the owner chose to
 * sign. The engine records separately who really ticked it.
 */

import { useId, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import { ExternalLink, Search, TriangleAlert } from "lucide-react";
import type { EngineCustomsForm, EngineCustomsLine } from "../../../host/engine-carrier.ts";

import type { StringKey } from "../../i18n/strings.ts";
import { useLocale, useT } from "../../i18n/t.ts";
import { inputStyle, MONO, monoInputStyle, PanelTitle } from "../atoms.tsx";
import { countryName, lineTotal, moneyText, codeListWords, type CustomsDraft, type CustomsFieldFault, type CustomsLineDraft } from "./flow.ts";
import { FlowButton, FORM_COLUMNS, TOUCH } from "./parts.tsx";

export type OfferedForm = Extract<EngineCustomsForm, { offered: true }>;
export type CustomsFaultAt = { line: string; field: keyof CustomsLineDraft; fault: CustomsFieldFault };

const FIELD_FAULT: Readonly<Record<CustomsFieldFault, StringKey>> = {
  description: "addon.shipping-kit.customs.fault.description",
  "hs-format": "addon.shipping-kit.customs.fault.hs",
  "hs-kept": "addon.shipping-kit.customs.fault.hsKept",
  "code-kept": "addon.shipping-kit.customs.fault.codeKept",
};

const labelWords: CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--fg-muted)" };
const fixedBox: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "var(--surface-3)",
  padding: "10px 12px",
  fontSize: 13.5,
  minBlockSize: TOUCH,
  overflowWrap: "anywhere",
};
const fixedFigure: CSSProperties = { ...fixedBox, fontFamily: MONO, fontWeight: 500, direction: "ltr", textAlign: "start", unicodeBidi: "isolate" };

/** A value the order holds. Read-only, so it is text and not a disabled input a reader has to work around. */
function Fixed({ label, mono = false, strong = false, children }: { label: string; mono?: boolean; strong?: boolean; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minInlineSize: 0 }}>
      <span style={labelWords}>{label}</span>
      <span style={mono ? { ...fixedFigure, fontWeight: strong ? 600 : 500 } : fixedBox}>{children}</span>
    </div>
  );
}

function Warning({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--warn)" }}>
      <TriangleAlert size={13} aria-hidden="true" style={{ flex: "0 0 auto", marginBlockStart: 2 }} />
      <span>{children}</span>
    </span>
  );
}

function CodeField({
  label,
  value,
  fault,
  warning,
  disabled,
  mono,
  english,
  full,
  testId,
  onChange,
  after,
}: {
  label: string;
  value: string;
  fault: string | null;
  warning: string | null;
  disabled: boolean;
  mono?: boolean;
  english?: boolean;
  full?: boolean;
  testId: string;
  onChange: (next: string) => void;
  after?: ReactNode;
}) {
  const id = useId();
  const faultId = `${id}-fault`;
  const warnId = `${id}-warn`;
  const describedBy = [fault === null ? null : faultId, warning === null ? null : warnId].filter((one) => one !== null).join(" ");
  const edge = fault !== null ? "var(--danger)" : warning !== null ? "var(--warn)" : "var(--border-strong)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minInlineSize: 0, ...(full ? { gridColumn: "1 / -1" } : {}) }}>
      <label htmlFor={id} style={labelWords}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        disabled={disabled}
        data-testid={testId}
        data-customs-fault={fault === null ? undefined : ""}
        aria-invalid={fault !== null}
        aria-describedby={describedBy === "" ? undefined : describedBy}
        {...(english ? { lang: "en", dir: "ltr" } : {})}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        style={{ ...(mono ? monoInputStyle : inputStyle), ...(mono ? { fontWeight: 500, textAlign: "start" } : {}), borderColor: edge, borderWidth: fault !== null || warning !== null ? 1.5 : 1, minBlockSize: TOUCH }}
      />
      {fault !== null && (
        <span id={faultId} style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>
          {fault}
        </span>
      )}
      {warning !== null && <Warning id={warnId}>{warning}</Warning>}
      {after}
    </div>
  );
}

function LineFields({
  form,
  line,
  index,
  draft,
  fault,
  busy,
  onEdit,
}: {
  form: OfferedForm;
  line: EngineCustomsLine;
  index: number;
  draft: CustomsLineDraft;
  fault: CustomsFaultAt | null;
  busy: boolean;
  onEdit: (field: keyof CustomsLineDraft, value: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const warned = (field: "hsCode" | "skuCode" | "manufacturerCode") => form.warnings.some((one) => one.line === line.line && one.field === field);
  const faultOn = (field: keyof CustomsLineDraft) => (fault !== null && fault.line === line.line && fault.field === field ? t(FIELD_FAULT[fault.fault]) : null);
  const money = (amount: string | null) => (amount === null ? t("addon.shipping-kit.customs.notRecorded") : form.currency === null ? amount : moneyText(amount, form.currency, locale));
  const hs = draft.hsCode ?? line.hsCode ?? "";
  const maker = draft.manufacturerCode ?? line.manufacturerCode ?? "";
  const stopped = form.faults.filter((one) => one.line === line.line && (one.field === "quantity" || one.field === "unitValue" || one.field === "weight"));
  return (
    <div data-testid={`customs-line-${index + 1}`} style={{ display: "grid", gridTemplateColumns: FORM_COLUMNS, gap: "12px 14px" }}>
      {form.lines.length > 1 && <div style={{ gridColumn: "1 / -1", fontSize: 13, fontWeight: 800 }}>{t("addon.shipping-kit.customs.item", { n: index + 1 })}</div>}
      <CodeField
        full
        english
        label={t("addon.shipping-kit.customs.description")}
        value={draft.description ?? line.description ?? ""}
        fault={faultOn("description")}
        warning={null}
        disabled={busy}
        testId={`customs-description-${index + 1}`}
        onChange={(next) => onEdit("description", next)}
      />
      <CodeField
        mono
        label={t("addon.shipping-kit.customs.hs")}
        value={hs}
        fault={faultOn("hsCode")}
        warning={warned("hsCode") && hs.trim() === "" ? t("addon.shipping-kit.customs.warn.hs") : null}
        disabled={busy}
        testId={`customs-hs-${index + 1}`}
        onChange={(next) => onEdit("hsCode", next)}
        after={
          form.codeListUrl === null ? undefined : (
            <a href={form.codeListUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
              {t(codeListWords(form.ownCountry) === "uk" ? "addon.shipping-kit.customs.codeListUk" : "addon.shipping-kit.customs.codeListUs")}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          )
        }
      />
      <Fixed label={t("addon.shipping-kit.customs.origin")}>{countryName(line.originCountry, locale)}</Fixed>
      <Fixed mono label={t("addon.shipping-kit.customs.quantity")}>
        {line.quantity === null ? t("addon.shipping-kit.customs.notRecorded") : new Intl.NumberFormat(locale).format(line.quantity)}
      </Fixed>
      <Fixed mono label={t("addon.shipping-kit.customs.unit")}>
        {money(line.unitValue)}
      </Fixed>
      <Fixed mono strong label={t("addon.shipping-kit.customs.total")}>
        {money(line.unitValue === null || line.quantity === null ? null : lineTotal(line.unitValue, line.quantity))}
      </Fixed>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minInlineSize: 0 }}>
        <Fixed mono label={t("addon.shipping-kit.customs.sku")}>
          {line.skuCode ?? t("addon.shipping-kit.customs.notRecorded")}
        </Fixed>
        {warned("skuCode") && <Warning id={`customs-sku-warn-${index + 1}`}>{t("addon.shipping-kit.customs.warn.sku")}</Warning>}
      </div>
      <CodeField
        full
        mono
        label={t("addon.shipping-kit.customs.maker")}
        value={maker}
        fault={faultOn("manufacturerCode")}
        warning={warned("manufacturerCode") && maker.trim() === "" ? t("addon.shipping-kit.customs.warn.maker") : null}
        disabled={busy}
        testId={`customs-maker-${index + 1}`}
        onChange={(next) => onEdit("manufacturerCode", next)}
      />
      {stopped.map((one) => (
        <div key={one.field} role="alert" style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>
          {t(one.field === "quantity" ? "addon.shipping-kit.customs.fault.quantity" : one.field === "weight" ? "addon.shipping-kit.customs.fault.weight" : "addon.shipping-kit.customs.fault.value")}
        </div>
      ))}
    </div>
  );
}

export function CustomsForm({
  form,
  draft,
  ticked,
  tickFault,
  fieldFault,
  busy,
  showSubmit,
  manages,
  onEdit,
  onTick,
  onSubmit,
}: {
  form: OfferedForm;
  draft: CustomsDraft;
  ticked: boolean;
  tickFault: boolean;
  fieldFault: CustomsFaultAt | null;
  busy: boolean;
  showSubmit: boolean;
  manages: boolean;
  onEdit: (line: string, field: keyof CustomsLineDraft, value: string) => void;
  onTick: (next: boolean) => void;
  onSubmit: () => void;
}) {
  const t = useT();
  const heading = useId();
  const tickError = useId();
  const orderFaults = form.faults.filter((one) => one.line === undefined);
  const lineStops = form.faults.some((one) => one.line !== undefined && (one.field === "quantity" || one.field === "unitValue" || one.field === "weight"));
  const stopped = orderFaults.length > 0 || lineStops || form.signer === null;
  const orderWords = (one: (typeof orderFaults)[number]) =>
    one.reason === "refunded"
      ? "addon.shipping-kit.customs.fault.refunded"
      : one.reason === "shop-currency"
        ? manages
          ? "addon.shipping-kit.customs.fault.shopCurrency.manage"
          : "addon.shipping-kit.customs.fault.shopCurrency.ask"
        : one.reason === "order-currency"
          ? "addon.shipping-kit.customs.fault.orderCurrency"
          : one.field === "currency"
          ? "addon.shipping-kit.customs.fault.currency"
          : "addon.shipping-kit.customs.fault.noLines";
  return (
    <section aria-labelledby={heading} data-testid="customs-form" style={{ border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 14, padding: "16px 17px", minInlineSize: 0 }}>
      <h2 id={heading} style={{ margin: "0 0 4px" }}>
        <PanelTitle>{t("addon.shipping-kit.customs.title")}</PanelTitle>
      </h2>
      <div style={{ fontSize: 12.5, color: "var(--fg-subtle)", marginBlockEnd: 14 }}>{t("addon.shipping-kit.customs.sub")}</div>
      {[...new Set(orderFaults.map(orderWords))].map((words) => (
        <div key={words} role="alert" data-testid="customs-order-fault" style={{ marginBlockEnd: 12, fontSize: 12.5, fontWeight: 600, color: "var(--danger)" }}>
          {t(words)}
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {form.lines.map((line, index) => (
          <LineFields
            key={line.line}
            form={form}
            line={line}
            index={index}
            draft={draft[line.line] ?? {}}
            fault={fieldFault}
            busy={busy}
            onEdit={(field, value) => onEdit(line.line, field, value)}
          />
        ))}
      </div>
      <div style={{ marginBlockStart: 16, borderBlockStart: "1px solid var(--border)", paddingBlockStart: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        {form.signer === null ? (
          <div role="alert" data-testid="customs-no-signer" style={{ fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>
            {t(manages ? "addon.shipping-kit.customs.noSigner.manage" : "addon.shipping-kit.customs.noSigner.ask")}
          </div>
        ) : (
          <>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={ticked}
                disabled={busy}
                data-testid="customs-declare"
                aria-invalid={tickFault}
                aria-describedby={tickFault ? tickError : undefined}
                onChange={(event) => onTick(event.target.checked)}
                style={{ inlineSize: 20, blockSize: 20, margin: 0, accentColor: "var(--accent)", flex: "0 0 auto" }}
              />
              <span>{t("addon.shipping-kit.customs.declare", { who: form.signer })}</span>
            </label>
            {tickFault && (
              <span id={tickError} role="alert" style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)", paddingInlineStart: 30 }}>
                {t("addon.shipping-kit.customs.fault.tick")}
              </span>
            )}
          </>
        )}
      </div>
      {showSubmit && (
        <FlowButton variant="accent" busy={busy} disabled={stopped} onClick={onSubmit} testId="customs-save" style={{ marginBlockStart: 10 }}>
          <Search size={15} aria-hidden="true" />
          {t("addon.shipping-kit.customs.save")}
        </FlowButton>
      )}
    </section>
  );
}
