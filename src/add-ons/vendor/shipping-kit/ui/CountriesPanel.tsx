/*
 * VENDORED from add-ons/packages/shipping-kit/src/ui/CountriesPanel.tsx — synced by scripts/sync-add-ons.sh.
 * Never hand-edit this copy: edit the monorepo and re-run `sync-add-ons.sh sync`.
 * The screens every carrier shares; its tests live in the monorepo.
 */
/**
 * COUNTRIES WE DELIVER TO, for someone who manages shipping.
 *
 * NOTHING CHANGES UNTIL A COUNTRY IS ADDED, and a country is only ever added
 * with its delivery price, so a shopper abroad can never be charged the home
 * price. The price is the shop's own, so the app hands in where it keeps it.
 * It stays an exact decimal string from the keyboard to that store.
 *
 * The price is written first and the list second. If the list refuses, the
 * price is taken back, so no country is left half added.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Globe, LoaderCircle, Plus, Trash2 } from "lucide-react";
import type { EngineCarrier, EngineInternational } from "../../host/engine-carrier.ts";

import { useLocale, useT } from "../i18n/t.ts";
import { inputStyle, Mono, monoInputStyle } from "./atoms.tsx";
import { ISO_COUNTRIES } from "./countries.ts";
import { countryName, moneyText, readFailure } from "./engine/flow.ts";
import { FlowButton, FORM_COLUMNS, LiveRegion, TOUCH, useSay } from "./engine/parts.tsx";
import { refusalWords, savedBody } from "./customsSettings.ts";

/** Where the shop keeps its delivery price per country. */
export interface CountryPrices {
  read(): Promise<Readonly<Record<string, string>>>;
  save(country: string, amount: string): Promise<void>;
  remove(country: string): Promise<void>;
}

/** A price as typed, as an exact decimal above zero, or null. A comma counts as the decimal mark. */
export function cleanPrice(text: string): string | null {
  const value = text.trim().replace(",", ".");
  return /^\d{1,10}(\.\d{1,2})?$/.test(value) && /[1-9]/.test(value) ? value : null;
}

export function CountriesPanel({
  client,
  prices,
  currency,
  onOpenCustoms,
}: {
  client: EngineCarrier;
  prices: CountryPrices;
  /** The shop's currency: what each delivery price is in. */
  currency: string;
  onOpenCustoms?: (() => void) | undefined;
}) {
  const t = useT();
  const locale = useLocale();
  const ids = useId();
  const { said, say } = useSay();
  const [view, setView] = useState<EngineInternational | null>(null);
  const [priceOf, setPriceOf] = useState<Readonly<Record<string, string>>>({});
  const [loadFailed, setLoadFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState("");
  const [priceText, setPriceText] = useState("");
  const [priceFault, setPriceFault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fault, setFault] = useState<string | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const picker = useRef<HTMLSelectElement>(null);
  const priceInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const [fresh, stored] = await Promise.all([client.international(), prices.read()]);
      setView(fresh);
      setPriceOf(stored);
    } catch {
      setLoadFailed(true);
    }
  }, [client, prices]);

  useEffect(() => {
    void load();
  }, [load]);

  const own = view?.ownCountry ?? null;
  const shown = view?.shopCurrency ?? currency;
  const listed = view?.settings?.countries ?? [];
  const options = useMemo(
    () =>
      ISO_COUNTRIES.filter((code) => code !== own && !listed.includes(code))
        .map((code) => ({ code, name: countryName(code, locale) }))
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    [own, listed, locale],
  );
  const chosen = options.some((one) => one.code === picked) ? picked : (options[0]?.code ?? "");

  useEffect(() => {
    if (adding) picker.current?.focus();
  }, [adding]);

  const closeAdd = () => {
    setAdding(false);
    setPriceText("");
    setPriceFault(false);
    requestAnimationFrame(() => addButton.current?.focus());
  };

  const add = async () => {
    if (busy || view === null || own === null || chosen === "") return;
    const amount = cleanPrice(priceText);
    if (amount === null) {
      setPriceFault(true);
      priceInput.current?.focus();
      return;
    }
    setBusy(true);
    setFault(null);
    try {
      await prices.save(chosen, amount);
      try {
        const now = await client.international();
        const held = now.settings?.countries ?? [];
        const fresh = await client.saveInternational(savedBody(now, { originCountry: own }, { countries: [...held.filter((one) => one !== chosen), chosen] }));
        setView(fresh);
        setPriceOf((held) => ({ ...held, [chosen]: amount }));
      } catch (err) {
        await prices.remove(chosen).catch(() => undefined);
        throw err;
      }
      say(t("addon.shipping-kit.countries.added", { c: countryName(chosen, locale) }));
      closeAdd();
    } catch (err) {
      const words = t(refusalWords(readFailure(err).code));
      setFault(words);
      say(words);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (code: string) => {
    if (busy || view === null || own === null) return;
    setBusy(true);
    setFault(null);
    try {
      // The list first: a price left behind sells nothing, and a country left behind would.
      const now = await client.international();
      const fresh = await client.saveInternational(savedBody(now, { originCountry: own }, { countries: (now.settings?.countries ?? []).filter((one) => one !== code) }));
      setView(fresh);
      await prices.remove(code).catch(() => undefined);
      setPriceOf(({ [code]: _gone, ...rest }) => rest);
      say(t("addon.shipping-kit.countries.removed", { c: countryName(code, locale) }));
      requestAnimationFrame(() => addButton.current?.focus());
    } catch (err) {
      const words = t(refusalWords(readFailure(err).code));
      setFault(words);
      say(words);
    } finally {
      setBusy(false);
    }
  };

  if (loadFailed) {
    return (
      <section data-testid="countries-panel" style={sectionStyle}>
        <h2 style={h2Style}>{t("addon.shipping-kit.countries.title")}</h2>
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.settings.loadFailed")}</p>
        <div>
          <FlowButton variant="ghost" onClick={() => void load()} testId="countries-retry">
            {t("addon.shipping-kit.engine.lookAgain")}
          </FlowButton>
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

  const name = (code: string) => countryName(code, locale);
  return (
    <section aria-labelledby={`${ids}-h`} data-testid="countries-panel" style={sectionStyle}>
      <LiveRegion said={said} />
      <div>
        <h2 id={`${ids}-h`} style={h2Style}>{t("addon.shipping-kit.countries.title")}</h2>
        <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--fg-subtle)" }}>{t("addon.shipping-kit.countries.sub")}</p>
      </div>
      {own === null ? (
        <p role="note" data-testid="countries-no-home" style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.countries.noHome")}</p>
      ) : view.shopCurrency === null ? (
        <p role="note" data-testid="countries-no-currency" style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.countries.noCurrency")}</p>
      ) : (
        <>
          <ul aria-label={t("addon.shipping-kit.countries.list")} style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <li style={rowStyle}>
              <Globe size={16} aria-hidden="true" style={{ color: "var(--fg-subtle)", flex: "0 0 auto" }} />
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{name(own)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: "var(--surface-3)", color: "var(--fg-muted)" }}>{t("addon.shipping-kit.countries.own")}</span>
            </li>
            {listed.map((code) => (
              <li key={code} data-testid={`countries-row-${code}`} style={rowStyle}>
                <Globe size={16} aria-hidden="true" style={{ color: "var(--fg-subtle)", flex: "0 0 auto" }} />
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{name(code)}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.countries.delivery")}</span>
                <Mono style={{ fontSize: 13, fontWeight: 600 }}>{priceOf[code] === undefined ? "—" : moneyText(priceOf[code]!, shown, locale)}</Mono>
                <button
                  type="button"
                  aria-label={t("addon.shipping-kit.countries.remove", { c: name(code) })}
                  aria-disabled={busy || undefined}
                  data-testid={`countries-remove-${code}`}
                  onClick={() => void remove(code)}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", inlineSize: TOUCH, blockSize: TOUCH, borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--fg-muted)", cursor: "pointer" }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          {adding ? (
            <div role="group" aria-labelledby={`${ids}-add`} style={{ border: "1.5px solid var(--accent)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "var(--surface-2)" }}>
              <h3 id={`${ids}-add`} style={{ margin: 0, fontSize: 13.5, fontWeight: 800 }}>{t("addon.shipping-kit.countries.add")}</h3>
              <div style={{ display: "grid", gridTemplateColumns: FORM_COLUMNS, gap: 12 }}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>{t("addon.shipping-kit.countries.country")}</span>
                  <select ref={picker} value={chosen} disabled={busy} data-testid="countries-pick" onChange={(event) => setPicked(event.target.value)} style={{ ...inputStyle, background: "var(--surface)", minBlockSize: TOUCH }}>
                    {options.map((one) => (
                      <option key={one.code} value={one.code}>{one.name}</option>
                    ))}
                  </select>
                </label>
                <div style={fieldStyle}>
                  <label htmlFor={`${ids}-price`} style={labelStyle}>{t("addon.shipping-kit.countries.price", { c: name(chosen) })}</label>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, border: `1.5px solid ${priceFault ? "var(--danger)" : "var(--border-strong)"}`, borderRadius: 10, background: "var(--surface)", paddingInline: 12 }}>
                    <Mono style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-subtle)" }}>{shown}</Mono>
                    <input
                      id={`${ids}-price`}
                      ref={priceInput}
                      value={priceText}
                      disabled={busy}
                      inputMode="decimal"
                      data-testid="countries-price"
                      aria-invalid={priceFault}
                      aria-describedby={priceFault ? `${ids}-price-err` : undefined}
                      onChange={(event) => {
                        setPriceText(event.target.value);
                        setPriceFault(false);
                      }}
                      style={{ ...monoInputStyle, fontWeight: 500, border: 0, background: "transparent", paddingInline: 0, minBlockSize: 42, textAlign: "start" }}
                    />
                  </span>
                  {priceFault && <span id={`${ids}-price-err`} style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>{t("addon.shipping-kit.countries.priceFault", { cur: shown })}</span>}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--fg-muted)" }}>{t("addon.shipping-kit.countries.abroadNote", { c: name(chosen), own: name(own) })}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <FlowButton variant="accent" busy={busy} onClick={() => void add()} testId="countries-save">{t("addon.shipping-kit.countries.save")}</FlowButton>
                <FlowButton variant="ghost" busy={busy} onClick={closeAdd} testId="countries-cancel">{t("addon.shipping-kit.settings.cancel")}</FlowButton>
              </div>
            </div>
          ) : (
            <div>
              <FlowButton ref={addButton} variant="ghost" disabled={options.length === 0} onClick={() => setAdding(true)} testId="countries-open">
                <Plus size={14} aria-hidden="true" />
                {t("addon.shipping-kit.countries.add")}
              </FlowButton>
            </div>
          )}

          {fault !== null && <p role="alert" data-testid="countries-fault" style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--danger)" }}>{fault}</p>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", alignItems: "center", fontSize: 12.5, color: "var(--fg-muted)" }}>
            <span>{listed.length > 0 ? t("addon.shipping-kit.countries.footSome") : t("addon.shipping-kit.countries.footNone", { c: name(own) })}</span>
            {onOpenCustoms !== undefined && (
              <button type="button" onClick={onOpenCustoms} data-testid="countries-customs" style={{ border: 0, background: "transparent", padding: 0, color: "var(--accent)", fontWeight: 700, fontSize: 12.5, textDecoration: "underline", cursor: "pointer", minBlockSize: 24 }}>
                {t("addon.shipping-kit.defaults.title")}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

const sectionStyle = { position: "relative", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14, minInlineSize: 0 } as const;
const h2Style = { margin: 0, fontSize: 15, fontWeight: 800 } as const;
const rowStyle = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px", borderBlockEnd: "1px solid var(--border)", background: "var(--surface)" } as const;
const fieldStyle = { display: "flex", flexDirection: "column", gap: 5, minInlineSize: 0 } as const;
const labelStyle = { fontSize: 12, fontWeight: 700, color: "var(--fg-muted)" } as const;
