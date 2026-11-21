/**
 * K6 Products (comp N2 484–517) and K7 the product (519–610).
 *
 * The list shows each product's category, price, how many variants, its
 * stock in Inventory's words and its status; the Low stock and Sold out tabs
 * list the variants themselves (where Today's tile lands).
 *
 * The product: its details, status and flags, its colours and sizes, and the
 * variants grid, one row per made combination with its SKU, price
 * difference, weight, whether it is on sale, and its stock: Inventory's
 * figure with a link to it, or "Not counted — link it in Inventory" (STK-5,
 * N2-F24); with Inventory off, a "Sold out" switch. A hole in the grid is
 * "Not made" with [Make it], which adds the variant switched off; adding a
 * size adds the missing rows switched off. The packer reads it all and
 * changes nothing (no prices to change).
 */
import { useState } from "react";
import { ArrowLeft, Check, ExternalLink, ImageIcon, Plus } from "lucide-react";

import { useData, useEnv, useRun } from "../env.tsx";
import { grid, isOwner, optionsOf, productStock, skuFor, stockLists, stockOf, variantsOf } from "../facts.ts";
import { useFmt } from "../format.ts";
import { go, useDesk, type ProductTab } from "../store.ts";
import { Chip, Fig, FieldError, Switch } from "../ui.tsx";
import { num, same, text, type Row } from "../wire.ts";
import { useT, type MessageKey } from "../../i18n/index.tsx";

const STATUS_KEY: Record<string, MessageKey> = { draft: "desk.prod.draft", active: "desk.prod.active", archived: "desk.prod.archived" };
const STATUS_TONE: Record<string, "neutral" | "pos" | "warn"> = { draft: "neutral", active: "pos", archived: "warn" };

/** A console page of the record, for someone who may open the console (never the packer). */
export const consoleRecord = (page: string, id: unknown): string => `/p/${page}/r/${encodeURIComponent(String(id))}`;

export function ProductsScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const tab = useDesk((s) => s.productTab);
  const lists = stockLists(data);
  const showStock = data.stock !== null || data.variants.some((v) => v["sold_out"] === true);
  const tabs: { key: ProductTab; label: string; count: number }[] = [
    { key: "all", label: t("desk.prod.tabAll"), count: data.products.length },
    ...(showStock
      ? [
          { key: "low" as const, label: t("desk.prod.tabLow"), count: lists.low.length },
          { key: "out" as const, label: t("desk.prod.tabOut"), count: lists.out.length },
        ]
      : []),
  ];
  const open = (id: unknown) => go("product", { productId: id as string });
  return (
    <div className="dk-screen">
      <div className="dk-head">
        <h1 className="dk-h1">{t("desk.prod.title")}</h1>
      </div>
      <div role="tablist" aria-label={t("desk.prod.title")} className="dk-tabs">
        {tabs.map((b) => (
          <button key={b.key} type="button" role="tab" aria-selected={tab === b.key} className="dk-tab" onClick={() => useDesk.setState({ productTab: b.key })}>
            {b.label}
            <Fig>{b.count}</Fig>
          </button>
        ))}
      </div>
      <div className="dk-card" role="tabpanel">
        <div className="dk-scroll">
          {tab === "all" ? (
            <table className="dk-table">
              <thead>
                <tr>
                  <th scope="col">{t("desk.prod.colProduct")}</th>
                  <th scope="col">{t("desk.prod.colCategory")}</th>
                  <th scope="col">{t("desk.prod.colPrice")}</th>
                  <th scope="col">{t("desk.prod.colVariants")}</th>
                  {showStock && <th scope="col">{t("desk.prod.colStock")}</th>}
                  <th scope="col">{t("desk.prod.colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p) => {
                  const stock = productStock(data, p);
                  const st = text(p["status"]) ?? "draft";
                  return (
                    <tr key={String(p.id)}>
                      <td>
                        <a
                          href="#main"
                          className="dk-link dk-strong"
                          onClick={(e) => {
                            e.preventDefault();
                            open(p.id);
                          }}
                        >
                          {text(p["name"])}
                        </a>
                      </td>
                      <td>{text(p["category_name"])}</td>
                      <td>
                        <Fig>{fmt.money(p["price"])}</Fig>
                      </td>
                      <td>
                        <Fig>{num(p["variants_count"]) ?? variantsOf(data, p).length}</Fig>
                      </td>
                      {showStock && (
                        <td>
                          <span className="dk-chips">
                            {stock !== null && stock.out > 0 && <Chip tone="danger">{t("desk.prod.nSoldOut", undefined, stock.out)}</Chip>}
                            {stock !== null && stock.low > 0 && <Chip tone="warn">{t("desk.prod.nLow", undefined, stock.low)}</Chip>}
                            {stock !== null && stock.out === 0 && stock.low === 0 && <Chip tone="pos">{t("desk.prod.inStock")}</Chip>}
                          </span>
                        </td>
                      )}
                      <td>
                        <Chip tone={STATUS_TONE[st] ?? "neutral"}>{t(STATUS_KEY[st] ?? "desk.prod.draft")}</Chip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="dk-table">
              <thead>
                <tr>
                  <th scope="col">{t("desk.prod.colSku")}</th>
                  <th scope="col">{t("desk.prod.colProduct")}</th>
                  <th scope="col">{t("desk.prod.colAvailable")}</th>
                  <th scope="col">{t("desk.prod.colStock")}</th>
                </tr>
              </thead>
              <tbody>
                {(tab === "low" ? lists.low : lists.out).map((v) => {
                  const s = stockOf(data, v.id);
                  return (
                    <tr key={String(v.id)}>
                      <td>
                        <Fig strong>{text(v["sku"])}</Fig>
                      </td>
                      <td>
                        <a
                          href="#main"
                          className="dk-link dk-strong"
                          onClick={(e) => {
                            e.preventDefault();
                            open(v["product_id"]);
                          }}
                        >
                          {text(v["product_name"])}
                        </a>
                        <span className="dk-muted"> · {[text(v["colour_label"]), text(v["size_label"])].filter((x) => x !== null).join(" · ")}</span>
                      </td>
                      <td>
                        <Fig>{s === null ? "—" : s.available}</Fig>
                      </td>
                      <td>{tab === "low" ? <Chip tone="warn">{t("desk.prod.low")}</Chip> : <Chip tone="danger">{t("desk.prod.soldOut")}</Chip>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

interface Draft {
  name: string;
  category_id: string;
  price: string;
  blurb: string;
  description: string;
  size_guide_id: string;
  status: string;
  featured: boolean;
  new_until: string;
  specs: { label: string; value: string }[];
}

const draftOf = (p: Row): Draft => ({
  name: text(p["name"]) ?? "",
  category_id: String(p["category_id"] ?? ""),
  price: num(p["price"]) === null ? "" : (num(p["price"]) ?? 0).toFixed(2),
  blurb: text(p["blurb"]) ?? "",
  description: text(p["description"]) ?? "",
  size_guide_id: p["size_guide_id"] === null || p["size_guide_id"] === undefined ? "" : String(p["size_guide_id"]),
  status: text(p["status"]) ?? "draft",
  featured: p["featured"] === true,
  new_until: (text(p["new_until"]) ?? "").slice(0, 10),
  specs: Array.isArray(p["specs"]) ? (p["specs"] as { label?: unknown; value?: unknown }[]).map((s) => ({ label: String(s.label ?? ""), value: String(s.value ?? "") })) : [],
});

export function ProductScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const who = door.who();
  const productId = useDesk((s) => s.productId);
  const product = data.products.find((p) => same(p.id, productId));
  const { busy, run } = useRun();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<{ name?: boolean; price?: boolean }>({});
  const [newSize, setNewSize] = useState("");

  if (product === undefined) {
    return (
      <div className="dk-screen">
        <BackLink />
        <div className="dk-empty">{t("desk.prod.gone")}</div>
      </div>
    );
  }
  const canEdit = isOwner(who) && who.can("products", "update");
  const ro = !canEdit;
  const f = draft ?? draftOf(product);
  const set = (patch: Partial<Draft>) => setDraft({ ...f, ...patch });
  const colours = optionsOf(data, product, "colour");
  const sizes = optionsOf(data, product, "size");
  const rows = grid(data, product);
  const inv = data.stock !== null;
  const st = f.status;

  const save = () => {
    const price = Number(f.price);
    const bad = { name: f.name.trim() === "", price: f.price.trim() === "" || !Number.isFinite(price) || price < 0 || !/^\d+(\.\d{1,2})?$/.test(f.price.trim()) };
    setErrors(bad);
    if (bad.name || bad.price) return;
    void run(async (d) => {
      await d.saveProduct(product, {
        name: f.name.trim(),
        category_id: f.category_id,
        price: f.price.trim(),
        blurb: f.blurb,
        description: f.description.trim() === "" ? null : f.description,
        size_guide_id: f.size_guide_id === "" ? null : f.size_guide_id,
        status: f.status,
        featured: f.featured,
        new_until: f.new_until === "" ? null : f.new_until,
        specs: f.specs.filter((s) => s.label.trim() !== ""),
      });
      setDraft(null);
      return t("desk.toast.saved");
    });
  };
  const weightOf = variantsOf(data, product).find((v) => num(v["weight_g"]) !== null)?.["weight_g"] ?? null;
  const make = (colour: Row | null, size: Row | null) =>
    run(async (d) => {
      await d.createVariant({
        product_id: product.id,
        ...(colour === null ? {} : { colour_id: colour.id }),
        ...(size === null ? {} : { size_id: size.id }),
        sku: skuFor(data, product, colour, size),
        active: false,
        ...(weightOf === null ? {} : { weight_g: weightOf }),
      });
      return t("desk.toast.made", { what: [text(colour?.["label"]), text(size?.["label"])].filter((x) => x !== null).join(" / ") });
    });
  const addSize = () => {
    const label = newSize.trim();
    if (label === "") return;
    void run(async (d) => {
      // The size first, then a row for each colour, switched off until the owner turns it on.
      const size = await d.createOption({ product_id: product.id, kind: "size", code: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, position: sizes.length + 1 });
      for (const colour of colours.length > 0 ? colours : [null]) {
        await d.createVariant({ product_id: product.id, ...(colour === null ? {} : { colour_id: colour.id }), size_id: size.id, sku: skuFor(data, product, colour, size), active: false, ...(weightOf === null ? {} : { weight_g: weightOf }) });
      }
      setNewSize("");
      return t("desk.toast.sizeAdded", { size: label });
    });
  };

  return (
    <div className="dk-screen">
      <BackLink />
      <div className="dk-title-row dk-head">
        <h1 className="dk-h1">{text(product["name"])}</h1>
        <Chip tone={STATUS_TONE[text(product["status"]) ?? "draft"] ?? "neutral"}>{t(STATUS_KEY[text(product["status"]) ?? "draft"] ?? "desk.prod.draft")}</Chip>
        {canEdit && (
          <button type="button" className="dk-btn dk-btn--primary dk-push" disabled={busy || draft === null} onClick={save}>
            <Check size={16} aria-hidden="true" />
            {t("desk.save")}
          </button>
        )}
      </div>
      <div className="dk-two">
        <div className="dk-col">
          <section className="dk-card" aria-labelledby="pd-det">
            <h2 id="pd-det" className="dk-card-title dk-card-head">
              {t("desk.prod.details")}
            </h2>
            <div className="dk-grid3">
              <div className="dk-field">
                <label htmlFor="pd-name">{t("desk.prod.name")}</label>
                <input id="pd-name" className="dk-input" value={f.name} readOnly={ro} aria-invalid={errors.name === true} aria-describedby={errors.name === true ? "pd-name-err" : undefined} onChange={(e) => set({ name: e.target.value })} />
                {errors.name === true && <FieldError id="pd-name-err">{t("desk.prod.errName")}</FieldError>}
              </div>
              <div className="dk-field">
                <label htmlFor="pd-cat">{t("desk.prod.category")}</label>
                <select id="pd-cat" className="dk-input" value={f.category_id} disabled={ro} onChange={(e) => set({ category_id: e.target.value })}>
                  {data.categories.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {text(c["name"])}
                    </option>
                  ))}
                </select>
              </div>
              <div className="dk-field">
                <label htmlFor="pd-price">{t("desk.prod.price")}</label>
                {canEdit ? (
                  <>
                    <input id="pd-price" className="dk-input dk-input--mono" dir="ltr" inputMode="decimal" value={f.price} aria-invalid={errors.price === true} aria-describedby={errors.price === true ? "pd-price-err" : undefined} onChange={(e) => set({ price: e.target.value })} />
                    {errors.price === true && <FieldError id="pd-price-err">{t("desk.prod.errPrice")}</FieldError>}
                  </>
                ) : (
                  <div id="pd-price" className="dk-readonly">
                    <Fig strong>{fmt.money(product["price"])}</Fig>
                  </div>
                )}
              </div>
            </div>
            <div className="dk-field">
              <label htmlFor="pd-blurb">{t("desk.prod.blurb")}</label>
              <input id="pd-blurb" className="dk-input" value={f.blurb} readOnly={ro} onChange={(e) => set({ blurb: e.target.value })} />
            </div>
            <div className="dk-field">
              <label htmlFor="pd-desc">{t("desk.prod.description")}</label>
              <textarea id="pd-desc" className="dk-input" rows={4} value={f.description} readOnly={ro} placeholder={t("desk.prod.descPh")} onChange={(e) => set({ description: e.target.value })} />
            </div>
            <fieldset className="dk-fieldset">
              <legend>{t("desk.prod.specs")}</legend>
              {f.specs.map((s, i) => (
                <div key={i} className="dk-spec">
                  <input className="dk-input" aria-label={t("desk.prod.specName", { n: i + 1 })} value={s.label} readOnly={ro} onChange={(e) => set({ specs: f.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                  <input className="dk-input" aria-label={t("desk.prod.specValue", { n: i + 1 })} value={s.value} readOnly={ro} onChange={(e) => set({ specs: f.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
                </div>
              ))}
              {canEdit && (
                <button type="button" className="dk-btn dk-btn--sm" onClick={() => set({ specs: [...f.specs, { label: "", value: "" }] })}>
                  <Plus size={14} aria-hidden="true" />
                  {t("desk.prod.addSpec")}
                </button>
              )}
            </fieldset>
            <div className="dk-field">
              <label htmlFor="pd-guide">{t("desk.prod.sizeGuide")}</label>
              <select id="pd-guide" className="dk-input" value={f.size_guide_id} disabled={ro} onChange={(e) => set({ size_guide_id: e.target.value })}>
                <option value="">{t("desk.prod.noGuide")}</option>
                {data.sizeGuides.map((g) => (
                  <option key={String(g.id)} value={String(g.id)}>
                    {text(g["name"])}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="dk-card" aria-labelledby="pd-pics">
            <h2 id="pd-pics" className="dk-card-title dk-card-head">
              {t("desk.prod.pictures")}
            </h2>
            <div className="dk-pics">
              {(colours.length > 0 ? colours : [null]).map((c) => {
                const pics = data.pictures.filter((p) => same(p["product_id"], product.id) && (c === null || same(p["colour_id"], c.id)));
                return (
                  <div key={String(c?.id ?? "all")} className="dk-pic">
                    <div className="dk-pic-head">
                      {c !== null && <span className="dk-swatch" style={{ background: text(c["hex"]) ?? "transparent" }} aria-hidden="true" />}
                      {c === null ? t("desk.prod.allColours") : text(c["label"])}
                    </div>
                    <div className="dk-pic-box">
                      <ImageIcon size={22} aria-hidden="true" />
                      <span>{t("desk.prod.picCount", undefined, pics.length)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {canEdit && (
              <a className="dk-link" href={consoleRecord("ecommerce-products", product.id)} target="_top">
                {t("desk.prod.picturesInConsole")}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </section>

          <section className="dk-card" aria-labelledby="pd-var">
            <div className="dk-card-head">
              <h2 id="pd-var" className="dk-card-title">
                {t("desk.prod.variants")}
              </h2>
            </div>
            <div className="dk-opts">
              {colours.length > 0 && (
                <div>
                  <div className="dk-label">{t("desk.prod.colours")}</div>
                  <div className="dk-chips">
                    {colours.map((c) => (
                      <span key={String(c.id)} className="dk-opt">
                        <span className="dk-swatch" style={{ background: text(c["hex"]) ?? "transparent" }} aria-hidden="true" />
                        {text(c["label"])}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {sizes.length > 0 && (
                <div>
                  <div className="dk-label">{text(product["size_name"]) ?? t("desk.prod.sizes")}</div>
                  <div className="dk-chips">
                    {sizes.map((s) => (
                      <span key={String(s.id)} className="dk-opt">
                        {text(s["label"])}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {canEdit && sizes.length > 0 && (
                <div className="dk-field dk-field--inline">
                  <label htmlFor="pd-new-size">{t("desk.prod.addSize")}</label>
                  <input id="pd-new-size" className="dk-input" value={newSize} onChange={(e) => setNewSize(e.target.value)} />
                  <button type="button" className="dk-btn dk-btn--sm" disabled={busy || newSize.trim() === ""} onClick={addSize}>
                    <Plus size={14} aria-hidden="true" />
                    {t("desk.prod.add")}
                  </button>
                </div>
              )}
            </div>
            <div className="dk-scroll">
              <table className="dk-table">
                <thead>
                  <tr>
                    <th scope="col">{t("desk.prod.colColour")}</th>
                    <th scope="col">{t("desk.prod.colSize")}</th>
                    <th scope="col">{t("desk.prod.colSku")}</th>
                    {"price_delta" in (variantsOf(data, product)[0] ?? { price_delta: null }) && <th scope="col">{t("desk.prod.colDiff")}</th>}
                    <th scope="col">{t("desk.prod.colWeight")}</th>
                    <th scope="col">{t("desk.prod.colActive")}</th>
                    <th scope="col">{t("desk.prod.colStock")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ colour, size, variant }) => {
                    const key = `${String(colour?.id ?? "-")}:${String(size?.id ?? "-")}`;
                    const label = [text(colour?.["label"]), text(size?.["label"])].filter((x) => x !== null).join(" / ");
                    const money = variant !== null && "price_delta" in variant;
                    if (variant === null) {
                      return (
                        <tr key={key} className="dk-row--dim">
                          <td>{colour === null ? "—" : <ColourCell colour={colour} />}</td>
                          <td>{text(size?.["label"]) ?? "—"}</td>
                          <td colSpan={money ? 5 : 4}>
                            <span className="dk-muted">{t("desk.prod.notMade")}</span>{" "}
                            {canEdit && (
                              <button type="button" className="dk-btn dk-btn--sm" disabled={busy} onClick={() => void make(colour, size)} aria-label={t("desk.prod.makeIt", { what: label })}>
                                <Plus size={14} aria-hidden="true" />
                                {t("desk.prod.make")}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }
                    const stock = stockOf(data, variant.id);
                    const delta = num(variant["price_delta"]);
                    return (
                      <tr key={key}>
                        <td>{colour === null ? "—" : <ColourCell colour={colour} />}</td>
                        <td>{text(size?.["label"]) ?? "—"}</td>
                        <td>
                          <Fig strong>{text(variant["sku"])}</Fig>
                        </td>
                        {money && (
                          <td>
                            <Fig>{delta === null || delta === 0 ? "—" : `+${fmt.money(delta)}`}</Fig>
                          </td>
                        )}
                        <td>
                          <Fig>{fmt.grams(variant["weight_g"])}</Fig>
                        </td>
                        <td>
                          <Switch on={variant["active"] !== false} label={t("desk.prod.activeFor", { what: label })} disabled={!canEdit || busy} onChange={(on) => void run(async (d) => (await d.saveVariant(variant, { active: on }), null))} />
                        </td>
                        <td>
                          {inv ? (
                            stock === null ? (
                              <span className="dk-muted">
                                {t("desk.prod.notCounted")}
                                {canEdit && (
                                  <>
                                    {" "}
                                    <a className="dk-link" href={consoleRecord("ecommerce-variants", variant.id)} target="_top">
                                      {t("desk.prod.linkIt")}
                                    </a>
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="dk-chips">
                                <Fig strong>{stock.available}</Fig>
                                {stock.state === "out" && <Chip tone="danger">{t("desk.prod.soldOut")}</Chip>}
                                {stock.state === "low" && <Chip tone="warn">{t("desk.prod.low")}</Chip>}
                                {canEdit && (
                                  <a className="dk-link" href={consoleRecord("ecommerce-variants", variant.id)} target="_top" aria-label={t("desk.prod.stockFor", { what: label })}>
                                    <ExternalLink size={13} aria-hidden="true" />
                                  </a>
                                )}
                              </span>
                            )
                          ) : (
                            <label className="dk-inline">
                              <Switch on={variant["sold_out"] === true} label={t("desk.prod.soldOutFor", { what: label })} disabled={!canEdit || busy} onChange={(on) => void run(async (d) => (await d.saveVariant(variant, { sold_out: on }), null))} />
                              {t("desk.prod.soldOut")}
                            </label>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <div className="dk-col">
          <section className="dk-card" aria-labelledby="pd-st">
            <h2 id="pd-st" className="dk-card-title dk-card-head">
              {t("desk.prod.status")}
            </h2>
            <div role="radiogroup" aria-labelledby="pd-st" className="dk-seg">
              {["draft", "active", "archived"].map((s) => (
                <button key={s} type="button" role="radio" aria-checked={st === s} className="dk-seg-btn" disabled={ro} onClick={() => set({ status: s })}>
                  {t(STATUS_KEY[s]!)}
                </button>
              ))}
            </div>
            <label className="dk-check">
              <input type="checkbox" checked={f.featured} disabled={ro} onChange={(e) => set({ featured: e.target.checked })} />
              {t("desk.prod.featured")}
            </label>
            <div className="dk-field">
              <label htmlFor="pd-new">{t("desk.prod.newUntil")}</label>
              <input id="pd-new" className="dk-input dk-input--mono" type="date" value={f.new_until} readOnly={ro} aria-describedby="pd-new-hint" onChange={(e) => set({ new_until: e.target.value })} />
              <div id="pd-new-hint" className="dk-hint">
                {t("desk.prod.newHint")}
              </div>
            </div>
            {st === "archived" && <div className="dk-hint">{t("desk.prod.archivedHint")}</div>}
          </section>
        </div>
      </div>
    </div>
  );
}

function ColourCell({ colour }: { colour: Row }) {
  return (
    <span className="dk-opt">
      <span className="dk-swatch" style={{ background: text(colour["hex"]) ?? "transparent" }} aria-hidden="true" />
      {text(colour["label"])}
    </span>
  );
}

function BackLink() {
  const t = useT();
  return (
    <a
      href="#main"
      className="dk-back"
      onClick={(e) => {
        e.preventDefault();
        go("products");
      }}
    >
      <ArrowLeft size={15} aria-hidden="true" className="dk-flip" />
      {t("desk.prod.all")}
    </a>
  );
}
