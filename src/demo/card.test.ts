/**
 * `demo.json` as the website checks it: Northline's declaration, emitted in
 * the card's eight languages, passes the website's own `demoJsonIssues` with
 * icon names lucide draws; every screen and shortcut it offers is one the
 * bridge answers to; and every shortcut that names a figure names the
 * sample's own, as `figures.md` prints it (N4-F7).
 */
import { readFileSync } from "node:fs";

import { icons } from "lucide-react";
import { describe, expect, it } from "vitest";

import { buildDemoJson } from "../../demo-emit.ts";
import WORLD from "../sample/northline-data.json";
import { DEMO_LOCALES, demoJsonIssues } from "../demo-types.ts";
import { SCREEN_IDS, SHORTCUT_IDS } from "./shortcuts.ts";
import { CARD_MESSAGES, DEMO_CARD, PACK_CODE, PRIYA_SHIPPED } from "./card.ts";

const pascal = (name: string) => name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Za-z])([0-9])/g, "$1-$2").toLowerCase();
const ICONS = new Set(Object.keys(icons).map(kebab));
const FIGURES = readFileSync(new URL("../sample/figures.md", import.meta.url), "utf8");
const figureRow = (first: string): string[] =>
  FIGURES.split("\n")
    .find((l) => l.startsWith(`| ${first} |`))!
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());

const doc = buildDemoJson({ ...DEMO_CARD, messages: CARD_MESSAGES });
const shortcut = (id: string) => doc.screens.flatMap((s) => s.shortcuts ?? []).find((s) => s.id === id)!;

describe("demo.json", () => {
  it("passes the website's check", () => {
    expect(demoJsonIssues(doc, { appKey: "ecommerce-shop", dir: "ecommerce-storefront", icons: ICONS })).toEqual([]);
    expect(doc.base).toBe("/demo/ecommerce-storefront/app/");
    expect(doc.frames).toEqual(["desktop", "phone"]);
  });

  it("offers the shopper's fourteen screens and the shop desk's eight, with no Overview (R7)", () => {
    expect(doc.screens.filter((s) => s.persona === "shopper").map((s) => s.id)).toEqual(["home", "shop", "product", "basket", "checkout", "paying", "confirmation", "order", "find", "account", "sendback", "gift", "help", "404"]);
    expect(doc.screens.filter((s) => s.persona === "desk").map((s) => s.labels["en-US"])).toEqual(["Today", "Orders", "Packing", "Returns", "Products", "Reviews", "Customers", "Settings"]);
    expect(doc.personas?.map((p) => [p.id, p.icon, p.labels["en-US"]])).toEqual([
      ["shopper", "shopping-bag", "Shopper"],
      ["desk", "store", "Shop desk"],
    ]);
    expect(doc.screens.flatMap((s) => s.shortcuts ?? [])).toHaveLength(20);
    expect(doc.clock).toEqual({ advance: [{ id: "day", labels: expect.objectContaining({ "en-US": "+1 business day" }) }], reset: { labels: expect.objectContaining({ "en-US": "Back to Tuesday morning" }) } });
  });

  it("names each figure as the sample has it", () => {
    // NL-BSH-EMB-M: 3 left, low; NL-BSH-SLA-XL: sold out; no Ember in XS is made.
    expect(figureRow("NL-BSH-EMB-M")).toEqual(["NL-BSH-EMB-M", "4", "1", "3", "low"]);
    expect(shortcut("shell-low").labels["en-US"]).toBe("Ember, M — only 3 left");
    expect(figureRow("NL-BSH-SLA-XL")[4]).toBe("out");
    expect(shortcut("shell-out").labels["en-US"]).toBe("Slate, XL — sold out");
    expect(WORLD.VARIANTS.some((v) => v.sku === "NL-BSH-EMB-XS")).toBe(false);
    expect(shortcut("shell-none").labels["en-US"]).toBe("Ember, XS — not made");
    expect(shortcut("count-back").labels["en-US"]).toBe("Count the Slate XL back in");
    // The code for packs and bags, as figures.md counts its uses.
    expect(figureRow("Codes used: TRAIL15 / WELCOME10")[0]).toContain(PACK_CODE);
    expect(shortcut("try-code").labels["en-US"]).toBe("Try TRAIL15");
    // Priya's shipped order: simply shipped, so figures.md lists it among none of the others.
    expect(PRIYA_SHIPPED).toBe("NL-1053");
    expect(FIGURES).not.toContain("| NL-1053 |");
    expect(shortcut("fill-find").labels["en-US"]).toBe("Fill NL-1053 and Priya's e-mail");
    // The same figures in every language.
    for (const locale of DEMO_LOCALES) {
      expect(shortcut("shell-low").labels[locale]).toContain("3");
      expect(shortcut("fill-find").labels[locale]).toContain("NL-1053");
      expect(shortcut("try-code").labels[locale]).toContain("TRAIL15");
    }
  });

  it("labels everything in all eight languages, and says each in that language", () => {
    const labelled = [...doc.screens.flatMap((s) => [s.labels, ...(s.shortcuts ?? []).map((c) => c.labels)]), ...(doc.personas ?? []).map((p) => p.labels), ...(doc.clock?.advance ?? []).map((a) => a.labels)];
    for (const labels of labelled) {
      expect(Object.keys(labels).sort()).toEqual([...DEMO_LOCALES].sort());
      for (const text of Object.values(labels)) expect(text.trim()).not.toBe("");
    }
    // Translated, not English seven times over: every shortcut reads differently in German and in Arabic.
    for (const s of doc.screens.flatMap((one) => one.shortcuts ?? [])) {
      expect(s.labels["de-DE"], s.id).not.toBe(s.labels["en-US"]);
      expect(s.labels["ar-EG"], s.id).not.toBe(s.labels["en-US"]);
    }
  });

  it("names icons lucide draws, by their current names", () => {
    for (const screen of doc.screens) {
      expect(icons[pascal(screen.icon) as keyof typeof icons], screen.icon).toBeDefined();
      for (const s of screen.shortcuts ?? []) expect(icons[pascal(s.icon) as keyof typeof icons], s.icon).toBeDefined();
    }
    const all = doc.screens.flatMap((s) => [s.icon, ...(s.shortcuts ?? []).map((c) => c.icon)]);
    expect(all).not.toContain("wand-2");
    expect(all).not.toContain("x-circle");
  });

  it("has no screen or shortcut the bridge does not answer to", () => {
    expect(doc.screens.map((s) => s.id).filter((id) => !SCREEN_IDS.includes(id))).toEqual([]);
    expect(doc.screens.flatMap((s) => s.shortcuts ?? []).map((s) => s.id).filter((id) => !SHORTCUT_IDS.includes(id))).toEqual([]);
    expect(SCREEN_IDS).toHaveLength(22);
    expect(SHORTCUT_IDS).toHaveLength(20);
  });
});
