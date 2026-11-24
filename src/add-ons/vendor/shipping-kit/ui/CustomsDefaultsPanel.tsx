/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/CustomsDefaultsPanel.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * CUSTOMS DEFAULTS, for someone who manages shipping.
 *
 * ADMINIUM NEVER FILLS IN A CODE. Every default starts empty, and a wrong code
 * on a declaration is the shop's legal problem, so a guess would be worse than
 * nothing. The named signer is picked from the people who hold the customs
 * right, and from nobody else.
 *
 * THE EXPORT NUMBERS ARE OPTIONAL, and each goes to the carrier only when it is
 * here. An IOSS number goes only on a parcel into the EU, in euros, within its
 * ceiling.
 *
 * THE US FILING STATEMENT IS A LEGAL ONE, so it starts on "none" and is asked
 * only of a shop that ships from the US. The engine states it only on a parcel
 * it is true of.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ExternalLink, LoaderCircle, Plus, Trash2 } from "lucide-react";
import type { EngineCarrier, EngineCustomsProduct, EngineExporter, EngineFilingCode, EngineInternational } from "../../host/engine-carrier.ts";

import { useLocale, useT } from "../i18n/t.ts";
import { inputStyle, Mono, monoInputStyle } from "./atoms.tsx";
import { ISO_COUNTRIES } from "./countries.ts";
import { refusalWords, savedBody } from "./customsSettings.ts";
import { countryName, hsLooksRight, readFailure, codeListWords } from "./engine/flow.ts";
import { FlowButton, FORM_COLUMNS, LiveRegion, TOUCH, useSay } from "./engine/parts.tsx";

const TAX_TYPES = ["VAT", "EIN", "ARN"] as const;
type TaxType = (typeof TAX_TYPES)[number];

const bare = (text: string) => text.replace(/\s/g, "").toUpperCase();
export const eoriLooksRight = (text: string) => /^[A-Z]{2}[A-Z0-9]{6,17}$/.test(bare(text));
export const iossLooksRight = (text: string) => /^IM\d{10}$/.test(bare(text));
export const taxLooksRight = (text: string) => /^[A-Z0-9-]{1,15}$/.test(bare(text));

const sectionStyle: CSSProperties = { position: "relative", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14, minInlineSize: 0 };
const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: FORM_COLUMNS, gap: 14 };
const labelStyle: CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--fg-muted)" };
const helpStyle: CSSProperties = { fontSize: 12, color: "var(--fg-subtle)" };
const faultStyle: CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--danger)" };

function TextField({
  label,
  value,
  onChange,
  fault,
  help,
  mono,
  english,
  full,
  disabled,
  numeric,
  testId,
  after,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  fault?: string | null | undefined;
  help?: string | undefined;
  mono?: boolean;
  english?: boolean;
  full?: boolean;
  disabled: boolean;
  numeric?: boolean;
  testId: string;
  after?: ReactNode;
}) {
  const id = useId();
  const described = [fault ? `${id}-err` : null, help === undefined ? null : `${id}-help`].filter((one) => one !== null).join(" ");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minInlineSize: 0, ...(full ? { gridColumn: "1 / -1" } : {}) }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <input
        id={id}
        value={value}
        disabled={disabled}
        data-testid={testId}
        aria-invalid={Boolean(fault)}
        aria-describedby={described === "" ? undefined : described}
        {...(numeric ? { inputMode: "numeric" as const } : {})}
        {...(english ? { lang: "en", dir: "ltr" } : {})}
        onChange={(event) => onChange(event.target.value)}
        style={{ ...(mono ? { ...monoInputStyle, fontWeight: 500, textAlign: "start" as const } : inputStyle), borderWidth: 1.5, borderColor: fault ? "var(--danger)" : "var(--border-strong)", minBlockSize: TOUCH }}
      />
      {fault ? <span id={`${id}-err`} style={faultStyle}>{fault}</span> : null}
      {help !== undefined && <span id={`${id}-help`} style={helpStyle}>{help}</span>}
      {after}
    </div>
  );
}

function PickField({ label, value, onChange, options, help, disabled, testId }: { label: string; value: string; onChange: (next: string) => void; options: readonly { value: string; label: string }[]; help?: string; disabled: boolean; testId: string }) {
  const id = useId();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minInlineSize: 0 }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <select id={id} value={value} disabled={disabled} data-testid={testId} aria-describedby={help === undefined ? undefined : `${id}-help`} onChange={(event) => onChange(event.target.value)} style={{ ...inputStyle, borderWidth: 1.5, minBlockSize: TOUCH }}>
        {options.map((one) => (
          <option key={one.value} value={one.value}>{one.label}</option>
        ))}
      </select>
      {help !== undefined && <span id={`${id}-help`} style={helpStyle}>{help}</span>}
    </div>
  );
}

interface Faults {
  hs?: string;
  eori?: string;
  ioss?: string;
  tax?: string;
}

export function CustomsDefaultsPanel({ client }: { client: EngineCarrier }) {
  const t = useT();
  const locale = useLocale();
  const ids = useId();
  const { said, say } = useSay();
  const [view, setView] = useState<EngineInternational | null>(null);
  const [signers, setSigners] = useState<readonly { id: string; name: string }[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fault, setFault] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [hs, setHs] = useState("");
  const [origin, setOrigin] = useState("");
  const [signer, setSigner] = useState("");
  const [eori, setEori] = useState("");
  const [ioss, setIoss] = useState("");
  const [taxType, setTaxType] = useState<TaxType>("VAT");
  const [taxNumber, setTaxNumber] = useState("");
  const [filing, setFiling] = useState<EngineFilingCode | "">("");
  const [faults, setFaults] = useState<Faults>({});

  const [adding, setAdding] = useState(false);
  const [sku, setSku] = useState("");
  const [ownHs, setOwnHs] = useState("");
  const [ownMaker, setOwnMaker] = useState("");
  const [skuFault, setSkuFault] = useState<string | null>(null);
  const [ownHsFault, setOwnHsFault] = useState<string | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);

  const take = useCallback((fresh: EngineInternational) => {
    setView(fresh);
    const held = fresh.settings;
    setDescription(held?.description ?? "");
    setHs(held?.hsCode ?? "");
    setOrigin(held?.originCountry ?? fresh.ownCountry ?? "");
    setSigner(held?.signerId ?? "");
    setEori(held?.exporter?.eori ?? "");
    setIoss(held?.exporter?.ioss ?? "");
    setTaxType(held?.exporter?.taxId?.type ?? "VAT");
    setTaxNumber(held?.exporter?.taxId?.number ?? "");
    setFiling(held?.filingCode ?? "");
  }, []);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const [fresh, people] = await Promise.all([client.international(), client.customsSigners()]);
      take(fresh);
      setSigners(people);
    } catch {
      setLoadFailed(true);
    }
  }, [client, take]);

  useEffect(() => {
    void load();
  }, [load]);

  const countries = useMemo(
    () => ISO_COUNTRIES.map((code) => ({ value: code, label: countryName(code, locale) })).sort((a, b) => a.label.localeCompare(b.label, locale)),
    [locale],
  );

  if (loadFailed) {
    return (
      <section data-testid="defaults-panel" style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{t("addon.shipping-kit.defaults.title")}</h2>
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.settings.loadFailed")}</p>
        <div>
          <FlowButton variant="ghost" onClick={() => void load()} testId="defaults-retry">{t("addon.shipping-kit.engine.lookAgain")}</FlowButton>
        </div>
      </section>
    );
  }
  if (view === null) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--fg-muted)" }}>
        <LoaderCircle size={15} aria-hidden="true" />
        {t("addon.shipping-kit.engine.loading")}
      </div>
    );
  }

  const own = view.ownCountry;
  if (own === null) {
    return (
      <section data-testid="defaults-panel" style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{t("addon.shipping-kit.defaults.title")}</h2>
        <p role="note" data-testid="defaults-no-home" style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.countries.noHome")}</p>
      </section>
    );
  }

  if (view.shopCurrency === null) {
    return (
      <section data-testid="defaults-panel" style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{t("addon.shipping-kit.defaults.title")}</h2>
        <p role="note" data-testid="defaults-no-currency" style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.countries.noCurrency")}</p>
      </section>
    );
  }

  const signerGone = view.settings !== null && view.settings.signerName === null;
  const hsFaultWords = t("addon.shipping-kit.customs.fault.hs");
  const products = view.settings?.products ?? [];
  // Until someone is chosen, whoever saves this is the signer: the engine says so, and it is the owner who is here.
  const signerOptions = [
    ...(signer === "" ? [{ value: "", label: t("addon.shipping-kit.defaults.signerYou") }] : []),
    ...(signer === "" || signers.some((one) => one.id === signer) ? [] : [{ value: signer, label: t("addon.shipping-kit.defaults.signerGone") }]),
    ...signers.map((one) => ({ value: one.id, label: one.name })),
  ];

  const write = async (change: { products?: EngineCustomsProduct[]; form?: boolean }, words: "saved" | "added" | "removed") => {
    setBusy(true);
    setFault(null);
    setSaved(null);
    try {
      const exporter: EngineExporter = { eori: bare(eori), ioss: bare(ioss), taxId: { type: taxType, number: bare(taxNumber) } };
      const fresh = await client.saveInternational(
        savedBody(await client.international(), { originCountry: origin }, {
          ...(change.products === undefined ? {} : { products: change.products }),
          ...(change.form === true
            ? { originCountry: origin, description: description.trim(), hsCode: hs.trim(), exporter, ...(own === "US" ? { filingCode: filing === "" ? null : filing } : {}), ...(signer === "" ? {} : { signerId: signer }) }
            : {}),
        }),
      );
      if (change.form === true) take(fresh);
      else setView(fresh);
      const done = t(words === "saved" ? "addon.shipping-kit.defaults.saved" : words === "added" ? "addon.shipping-kit.defaults.ownAdded" : "addon.shipping-kit.defaults.ownRemoved");
      setSaved(done);
      say(done);
      return true;
    } catch (err) {
      const words2 = t(refusalWords(readFailure(err).code));
      setFault(words2);
      say(words2);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveForm = () => {
    const next: Faults = {
      ...(hs.trim() !== "" && !hsLooksRight(hs) ? { hs: hsFaultWords } : {}),
      ...(eori.trim() !== "" && !eoriLooksRight(eori) ? { eori: t("addon.shipping-kit.defaults.eoriFault") } : {}),
      ...(ioss.trim() !== "" && !iossLooksRight(ioss) ? { ioss: t("addon.shipping-kit.defaults.iossFault") } : {}),
      ...(taxNumber.trim() !== "" && !taxLooksRight(taxNumber) ? { tax: t("addon.shipping-kit.defaults.taxFault") } : {}),
    };
    setFaults(next);
    if (Object.keys(next).length > 0) return;
    void write({ form: true }, "saved");
  };

  const closeOwn = () => {
    setAdding(false);
    setSku("");
    setOwnHs("");
    setOwnMaker("");
    setSkuFault(null);
    setOwnHsFault(null);
    requestAnimationFrame(() => addButton.current?.focus());
  };

  const addOwn = async () => {
    const code = sku.trim();
    const skuWords = code === "" ? t("addon.shipping-kit.defaults.skuFault") : products.some((one) => one.sku === code) ? t("addon.shipping-kit.defaults.skuTaken") : null;
    const hsWords = hsLooksRight(ownHs) ? null : hsFaultWords;
    setSkuFault(skuWords);
    setOwnHsFault(hsWords);
    if (skuWords !== null || hsWords !== null) return;
    const maker = ownMaker.trim();
    const row: EngineCustomsProduct = { sku: code, hsCode: ownHs.replace(/[\s.]/g, ""), ...(maker === "" ? {} : { manufacturerCode: maker }) };
    if (await write({ products: [...products, row] }, "added")) closeOwn();
  };

  return (
    <div data-testid="defaults-panel" style={{ display: "flex", flexDirection: "column", gap: 14, minInlineSize: 0 }}>
      <LiveRegion said={said} />
      <section aria-labelledby={`${ids}-h`} style={sectionStyle}>
        <div>
          <h2 id={`${ids}-h`} style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{t("addon.shipping-kit.defaults.title")}</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--fg-subtle)" }}>{t("addon.shipping-kit.defaults.intro", { c: countryName(own, locale) })}</p>
        </div>
        <div style={gridStyle}>
          <TextField full english label={t("addon.shipping-kit.customs.description")} value={description} onChange={setDescription} help={t("addon.shipping-kit.defaults.descriptionHelp")} disabled={busy} testId="defaults-description" />
          <TextField
            mono
            numeric
            label={t("addon.shipping-kit.customs.hs")}
            value={hs}
            onChange={(next) => {
              setHs(next);
              setFaults(({ hs: _gone, ...rest }) => rest);
            }}
            fault={faults.hs}
            help={t("addon.shipping-kit.defaults.hsHelp")}
            disabled={busy}
            testId="defaults-hs"
            after={
              view.codeListUrl === null ? undefined : (
                <a href={view.codeListUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--accent)" }}>
                  {t(codeListWords(own) === "uk" ? "addon.shipping-kit.defaults.codeListUk" : "addon.shipping-kit.customs.codeListUs")}
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              )
            }
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minInlineSize: 0 }}>
            <PickField label={t("addon.shipping-kit.customs.origin")} value={origin} onChange={setOrigin} options={countries} disabled={busy} testId="defaults-origin" />
            <PickField label={t("addon.shipping-kit.defaults.signedBy")} value={signer} onChange={setSigner} options={signerOptions} help={t("addon.shipping-kit.defaults.signedHelp")} disabled={busy} testId="defaults-signer" />
            {signerGone && <span role="alert" data-testid="defaults-signer-gone" style={faultStyle}>{t("addon.shipping-kit.customs.noSigner.manage")}</span>}
          </div>
        </div>

        <div style={{ borderBlockStart: "1px solid var(--border)", paddingBlockStart: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 800 }}>{t("addon.shipping-kit.defaults.numbers")}</h3>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--fg-subtle)" }}>{t("addon.shipping-kit.defaults.numbersSub")}</p>
          </div>
          <div style={gridStyle}>
            <TextField mono label={t("addon.shipping-kit.defaults.eori")} value={eori} onChange={(next) => { setEori(next); setFaults(({ eori: _gone, ...rest }) => rest); }} fault={faults.eori} disabled={busy} testId="defaults-eori" />
            <TextField mono label={t("addon.shipping-kit.defaults.ioss")} value={ioss} onChange={(next) => { setIoss(next); setFaults(({ ioss: _gone, ...rest }) => rest); }} fault={faults.ioss} help={t("addon.shipping-kit.defaults.iossHelp")} disabled={busy} testId="defaults-ioss" />
            <PickField label={t("addon.shipping-kit.defaults.taxType")} value={taxType} onChange={(next) => setTaxType(next as TaxType)} options={TAX_TYPES.map((one) => ({ value: one, label: one }))} disabled={busy} testId="defaults-tax-type" />
            <TextField mono label={t("addon.shipping-kit.defaults.taxNumber")} value={taxNumber} onChange={(next) => { setTaxNumber(next); setFaults(({ tax: _gone, ...rest }) => rest); }} fault={faults.tax} disabled={busy} testId="defaults-tax" />
            {own === "US" && (
              <PickField
                label={t("addon.shipping-kit.defaults.filing")}
                value={filing}
                onChange={(next) => setFiling(next as EngineFilingCode | "")}
                options={[
                  { value: "", label: t("addon.shipping-kit.defaults.filingNone") },
                  { value: "NOEEI_30_37_a", label: t("addon.shipping-kit.defaults.filingLow", { code: "NOEEI 30.37(a)" }) },
                  { value: "NOEEI_30_36", label: t("addon.shipping-kit.defaults.filingCanada", { code: "NOEEI 30.36" }) },
                ]}
                help={t("addon.shipping-kit.defaults.filingHelp")}
                disabled={busy}
                testId="defaults-filing"
              />
            )}
          </div>
        </div>

        {fault !== null && <p role="alert" data-testid="defaults-fault" style={{ ...faultStyle, margin: 0, fontSize: 12.5 }}>{fault}</p>}
        {saved !== null && <p data-testid="defaults-saved" style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--pos)" }}>{saved}</p>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingBlockStart: 14, borderBlockStart: "1px solid var(--border)" }}>
          <FlowButton variant="accent" busy={busy} onClick={saveForm} testId="defaults-save">{t("addon.shipping-kit.defaults.save")}</FlowButton>
        </div>
      </section>

      <section aria-labelledby={`${ids}-own`} style={{ ...sectionStyle, gap: 12 }}>
        <div>
          <h2 id={`${ids}-own`} style={{ margin: 0, fontSize: 14.5, fontWeight: 800 }}>{t("addon.shipping-kit.defaults.own")}</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--fg-subtle)" }}>{t("addon.shipping-kit.defaults.ownSub")}</p>
        </div>
        {products.length === 0 && <p data-testid="defaults-own-empty" style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)", border: "1px dashed var(--border-strong)", borderRadius: 12, padding: 14 }}>{t("addon.shipping-kit.defaults.ownEmpty")}</p>}
        {products.map((row) => (
          <div key={row.sku} data-testid={`defaults-own-${row.sku}`} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 14px", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <Mono style={{ fontSize: 13, fontWeight: 600, whiteSpace: "normal", overflowWrap: "anywhere" }}>{row.sku}</Mono>
            <span style={{ flex: 1 }} />
            {row.hsCode !== undefined && (
              <>
                <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>HS</span>
                <Mono style={{ fontSize: 13, fontWeight: 600 }}>{row.hsCode}</Mono>
              </>
            )}
            {row.manufacturerCode !== undefined && <Mono style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-muted)", whiteSpace: "normal", overflowWrap: "anywhere" }}>{row.manufacturerCode}</Mono>}
            {row.originCountry !== undefined && <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{countryName(row.originCountry, locale)}</span>}
            <button
              type="button"
              aria-label={t("addon.shipping-kit.countries.remove", { c: row.sku })}
              aria-disabled={busy || undefined}
              data-testid={`defaults-own-remove-${row.sku}`}
              onClick={() => {
                if (!busy) void write({ products: products.filter((one) => one.sku !== row.sku) }, "removed");
              }}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", inlineSize: TOUCH, blockSize: TOUCH, borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--fg-muted)", cursor: "pointer" }}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
        {adding ? (
          <div style={{ border: "1.5px solid var(--accent)", borderRadius: 12, padding: 14, display: "grid", gridTemplateColumns: FORM_COLUMNS, gap: 12, background: "var(--surface-2)" }}>
            <TextField mono label={t("addon.shipping-kit.customs.sku")} value={sku} onChange={(next) => { setSku(next); setSkuFault(null); }} fault={skuFault} disabled={busy} testId="defaults-own-sku" />
            <TextField mono numeric label={t("addon.shipping-kit.customs.hs")} value={ownHs} onChange={(next) => { setOwnHs(next); setOwnHsFault(null); }} fault={ownHsFault} disabled={busy} testId="defaults-own-hs" />
            <TextField mono label={t("addon.shipping-kit.customs.maker")} value={ownMaker} onChange={setOwnMaker} disabled={busy} testId="defaults-own-maker" />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", gridColumn: "1 / -1" }}>
              <FlowButton variant="accent" busy={busy} onClick={() => void addOwn()} testId="defaults-own-save">{t("addon.shipping-kit.defaults.ownAdd")}</FlowButton>
              <FlowButton variant="ghost" busy={busy} onClick={closeOwn} testId="defaults-own-cancel">{t("addon.shipping-kit.settings.cancel")}</FlowButton>
            </div>
          </div>
        ) : (
          <div>
            <FlowButton ref={addButton} variant="ghost" onClick={() => setAdding(true)} testId="defaults-own-open">
              <Plus size={14} aria-hidden="true" />
              {t("addon.shipping-kit.defaults.ownOpen")}
            </FlowButton>
          </div>
        )}
      </section>
    </div>
  );
}
