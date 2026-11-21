/**
 * Every e-mail in every language has English's sentences and English's
 * variables, sentence by sentence — a translation may not drop a `{{…}}` the
 * outbox fills, or invent one it does not (a backup's own words after the bar
 * are the language's) — and none of it says anything the release vocabulary
 * bans.
 */
import { describe, expect, it } from "vitest";

import { bundleOffences } from "../testing/lexicon.ts";
import { EMAIL_EN, emailWords } from "./emails.ts";
import { LOCALES } from "./labels.ts";

function leaves(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}[${String(i)}]`));
  if (typeof value === "object" && value !== null) return Object.entries(value).flatMap(([k, v]) => leaves(v, path === "" ? k : `${path}.${k}`));
  return [];
}
/** Every variable a sentence reads, by its name: `{{order.name|Jemand}}` is `order.name`. */
const vars = (text: string) => [...text.matchAll(/\{\{([^{}|]+)(?:\|[^{}]*)?\}\}/g)].map((m) => m[1]!.trim()).sort();
/** What a sentence says outside its variables. */
const words = (text: string) => text.replace(/\{\{[^{}]+\}\}/g, "");

describe.each(LOCALES.filter((t) => t !== "en-US"))("%s", (tag) => {
  const local = new Map(leaves(emailWords()[tag]));
  const en = new Map(leaves(EMAIL_EN));

  it("has every sentence English has, and no other", () => {
    expect([...local.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it("says every sentence, trimmed and non-empty", () => {
    expect([...local].filter(([, text]) => text.trim() === "" || text !== text.trim()).map(([path]) => path)).toEqual([]);
  });

  it("uses English's variables in each sentence", () => {
    const wrong = [...en].filter(([path, text]) => JSON.stringify(vars(text)) !== JSON.stringify(vars(local.get(path) ?? ""))).map(([path]) => path);
    expect(wrong).toEqual([]);
  });

  it("is not English", () => {
    const same = [...en].filter(([path, text]) => local.get(path) === text && /\p{L}/u.test(words(text))).map(([path]) => path);
    expect(same).toEqual([]);
  });

  it("says nothing the release vocabulary bans", () => {
    const hits = [...local].flatMap(([path, text]) => bundleOffences(text).map((o) => `${path} · ${o.token} · ${text}`));
    expect(hits).toEqual([]);
  });

  if (tag === "ar-EG") {
    it("writes no Latin digit outside a variable", () => {
      expect([...local].filter(([, text]) => /[0-9]/.test(words(text))).map(([path]) => path)).toEqual([]);
    });
  }
});

describe("English", () => {
  it("says nothing the release vocabulary bans", () => {
    expect(leaves(EMAIL_EN).flatMap(([path, text]) => bundleOffences(text).map((o) => `${path} · ${o.token}`))).toEqual([]);
  });

  it("types no figure: every number is the row's or the settings'", () => {
    expect(leaves(EMAIL_EN).filter(([, text]) => /[0-9$]/.test(words(text))).map(([path]) => path)).toEqual([]);
  });
});
