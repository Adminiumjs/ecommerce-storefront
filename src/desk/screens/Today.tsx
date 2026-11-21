/**
 * K1 Today (comp N2 236–280): the day's tiles, each a link to the list it
 * counts, and the orders to ship today. Every count is the length of the list
 * the tile opens, built by the same function (`facts.ts`).
 *
 * r4: the packed tile names DHL's booking cut-off when DHL is on ("Packed ·
 * DHL cut-off 15:00", ADD-13), else "Packed, ready to ship" (BN-02); paid
 * orders whose stock hold runs out soon get a tile of their own (T2); money
 * to give back on a cancelled order, the owner's (LIFE-8); a banner when a
 * needed add-on does not answer, and when the shop has no e-mail for staff
 * mails (ACC-16).
 */
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, ChevronRight, Clock, PackageCheck, Package, Star, Truck, Undo2, Wallet, Banknote, Boxes } from "lucide-react";

import { useData, useEnv } from "../env.tsx";
import { DHL, holdEndingSoon, INVENTORY, isOwner, owed, packed, returnsIn, reviewsIn, shipsByOf, status, stockLists, toPack, waitingForPayment } from "../facts.ts";
import { useFmt } from "../format.ts";
import { go, NO_FILTER } from "../store.ts";
import { Chip, Fig } from "../ui.tsx";
import { orderStatusWord, serviceWord } from "../words.ts";
import { text, num, type Row } from "../wire.ts";
import { useT } from "../../i18n/index.tsx";

interface Tile {
  key: string;
  icon: ReactNode;
  tone: "accent" | "warn" | "danger" | "pos" | "info";
  label: string;
  num: number;
  sub: ReactNode;
  open: () => void;
}

/** DHL's booking cut-off, as its settings say it; null without DHL or a cut-off. */
export function dhlCutoff(settings: Record<string, unknown> | undefined): string | null {
  const v = settings?.["collection_cutoff"];
  return typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v) ? v : null;
}

export function TodayScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const who = door.who();
  const owner = isOwner(who);
  const facts = door.facts();
  const dhlOn = facts.addOns.includes(DHL);
  const cutoff = dhlOn ? dhlCutoff(facts.addOnSettings[DHL]) : null;

  const pack = toPack(data);
  const done = packed(data);
  const waiting = waitingForPayment(data);
  const asked = returnsIn(data, "asked");
  const back = returnsIn(data, "approved");
  const received = returnsIn(data, "received");
  const stock = stockLists(data);
  const showStock = data.stock !== null || data.variants.some((v) => v["sold_out"] === true);
  const soon = holdEndingSoon(data, door.now());
  const owing = owner ? owed(data) : [];
  const numbers = (rows: Row[]) => (rows.length === 0 ? t("desk.tile.none") : <Fig>{rows.map((o) => text(o["number"]) ?? "").join(" · ")}</Fig>);

  const waitingSub = (): ReactNode => {
    const first = waiting[0];
    if (first === undefined) return t("desk.tile.none");
    const more = waiting.length > 1 ? ` +${String(waiting.length - 1)}` : "";
    const number = text(first["number"]) ?? "";
    if (status(first) === "awaiting_transfer") {
      return (
        <>
          <Fig>{number}</Fig> · {t("desk.tile.transferBy", { day: fmt.day(first["transfer_by"]) })}
          {more}
        </>
      );
    }
    return (
      <>
        <Fig>{number}</Fig> · {t("desk.tile.payBy", { time: fmt.time(first["pay_by"]) })}
        {more}
      </>
    );
  };

  const tiles: Tile[] = [
    { key: "pack", icon: <PackageCheck size={18} />, tone: "accent", label: t("desk.tile.toPack"), num: pack.length, sub: t("desk.tile.toPackSub", undefined, pack.length), open: () => go("packing") },
    { key: "packed", icon: <Package size={18} />, tone: "info", label: cutoff === null ? t("desk.tile.packedReady") : t("desk.tile.packedDhl", { time: cutoff }), num: done.length, sub: numbers(done), open: () => go("packing") },
    { key: "waiting", icon: <Clock size={18} />, tone: "warn", label: t("desk.tile.waiting"), num: waiting.length, sub: waitingSub(), open: () => go("orders", { orderFilter: { ...NO_FILTER, paid: "unpaid" } }) },
    owner
      ? {
          key: "returns",
          icon: <Undo2 size={18} />,
          tone: "danger",
          label: t("desk.tile.returns"),
          num: asked.length + received.length + back.length,
          sub: t("desk.tile.returnsSub", { decide: asked.length, refund: received.length, back: back.length }),
          open: () => go("returns"),
        }
      : { key: "returns", icon: <Undo2 size={18} />, tone: "danger", label: t("desk.tile.returns"), num: back.length + received.length, sub: t("desk.tile.returnsPackerSub", { back: back.length, received: received.length }), open: () => go("returns") },
  ];
  if (showStock) tiles.push({ key: "stock", icon: <Boxes size={18} />, tone: "warn", label: t("desk.tile.lowStock"), num: stock.low.length, sub: t("desk.tile.soldOut", undefined, stock.out.length), open: () => go("products", { productTab: "low" }) });
  if (owner && data.reviews !== null) {
    const w = reviewsIn(data, "waiting").length;
    tiles.push({ key: "reviews", icon: <Star size={18} />, tone: "pos", label: t("desk.tile.reviews"), num: w, sub: t("desk.tile.reviewsSub", undefined, w), open: () => go("reviews") });
  }
  if (soon.length > 0) tiles.push({ key: "hold", icon: <AlertTriangle size={18} />, tone: "danger", label: t("desk.tile.holdSoon"), num: soon.length, sub: numbers(soon), open: () => go("packing") });
  if (owing.length > 0) {
    const byBank = owing.filter((o) => text(o["pay_method"]) === "transfer").length;
    tiles.push({
      key: "owed",
      icon: byBank > 0 ? <Banknote size={18} /> : <Wallet size={18} />,
      tone: "danger",
      label: t("desk.tile.owed"),
      num: owing.length,
      sub: byBank > 0 ? t("desk.tile.owedBank", undefined, byBank) : numbers(owing),
      open: () => go("orders", { orderFilter: { ...NO_FILTER, paid: "owed" } }),
    });
  }

  const inventoryQuiet = facts.addOns.includes(INVENTORY) && data.stock === null;
  const noShopEmail = owner && data.settings !== null && text(data.settings["email"]) === null;

  return (
    <div className="dk-screen">
      <div className="dk-head">
        <div>
          <h1 className="dk-h1">{t("desk.today.title")}</h1>
          <div className="dk-sub">
            <Fig>{fmt.day(new Date(door.now()).toISOString())}</Fig>
          </div>
        </div>
      </div>
      {inventoryQuiet && (
        <div className="dk-banner dk-banner--warn" role="note">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{t("desk.banner.inventoryQuiet")}</span>
        </div>
      )}
      {noShopEmail && (
        <div className="dk-banner dk-banner--warn" role="note">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{t("desk.banner.noShopEmail")}</span>
          <button type="button" className="dk-link" onClick={() => go("settings")}>
            {t("desk.banner.openSettings")}
          </button>
        </div>
      )}
      <div className="dk-tiles">
        {tiles.map((tile) => (
          <a
            key={tile.key}
            href="#main"
            className="dk-tile"
            data-tile={tile.key}
            onClick={(e) => {
              e.preventDefault();
              tile.open();
            }}
          >
            <span className="dk-tile-head">
              <span className={`dk-tile-ico dk-tone--${tile.tone}`} aria-hidden="true">
                {tile.icon}
              </span>
              <span className="dk-tile-label">{tile.label}</span>
              <ChevronRight size={16} aria-hidden="true" className="dk-flip dk-tile-chev" />
            </span>
            <span className="dk-tile-num">
              <Fig strong>{tile.num}</Fig>
            </span>
            <span className="dk-tile-sub">{tile.sub}</span>
          </a>
        ))}
      </div>
      <section className="dk-card" aria-labelledby="ship-today-h">
        <div className="dk-card-head">
          <span className="dk-card-ico" aria-hidden="true">
            <Truck size={18} />
          </span>
          <h2 id="ship-today-h" className="dk-card-title">
            {t("desk.today.shipToday")}
          </h2>
          <button type="button" className="dk-btn dk-btn--primary dk-btn--sm" onClick={() => go("packing")}>
            {t("desk.today.openPacking")}
            <ArrowRight size={15} aria-hidden="true" className="dk-flip" />
          </button>
        </div>
        {pack.length === 0 ? (
          <div className="dk-empty">{t("desk.packing.allPacked")}</div>
        ) : (
          <div className="dk-scroll">
            <table className="dk-table">
              <thead>
                <tr>
                  <th scope="col">{t("desk.col.number")}</th>
                  <th scope="col">{t("desk.col.customer")}</th>
                  <th scope="col">{t("desk.col.items")}</th>
                  <th scope="col">{t("desk.col.service")}</th>
                  <th scope="col">{t("desk.col.shipsBy")}</th>
                  <th scope="col">{t("desk.col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {pack.map((o) => {
                  const word = orderStatusWord(t, o);
                  const ships = shipsByOf(o);
                  return (
                    <tr key={String(o.id)}>
                      <td>
                        <a
                          href="#main"
                          className="dk-num-link"
                          onClick={(e) => {
                            e.preventDefault();
                            go("order", { orderId: o.id });
                          }}
                        >
                          <Fig strong>{text(o["number"])}</Fig>
                        </a>
                      </td>
                      <td className="dk-strong">{text(o["ship_name"]) ?? text(o["name"])}</td>
                      <td className="dk-muted">{t("desk.items", undefined, num(o["pieces"]) ?? 0)}</td>
                      <td>{serviceWord(data, o)}</td>
                      <td>
                        <Fig>{ships === null ? "—" : fmt.day(ships)}</Fig>
                      </td>
                      <td>
                        <Chip tone={word.tone}>{word.label}</Chip>
                        {soon.includes(o) && (
                          <>
                            {" "}
                            <Chip tone="danger">{t("desk.today.holdUntil", { day: fmt.day(o["stock_until"]) })}</Chip>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
