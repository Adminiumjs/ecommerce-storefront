/**
 * The demo card's optional note (R6): one line in `demo.json` that says no
 * money moves in this demo.
 *
 * It is added after `demo-emit.ts` has written the file, and lives here,
 * because `demo-emit.ts` and `src/demo-types.ts` are byte-identical across
 * every app. Changing them would move every app's demo pin on the website.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { DEMO_LOCALES, type DemoLabels } from "./src/demo-types.ts";

export interface DemoNoteOptions {
  /** The message key of the note. */
  labelKey: string;
  /** `{ 'en-US': { key: string, … }, … }`, all eight languages. */
  messages: Record<string, Record<string, string>>;
}

/** The note as `demo.json` carries it; a missing language throws. */
export function demoNote({ labelKey, messages }: DemoNoteOptions): { labels: DemoLabels } {
  const labels: DemoLabels = {};
  for (const locale of DEMO_LOCALES) {
    const value = messages[locale]?.[labelKey];
    if (value === undefined || value === "") throw new Error(`demo.json: no ${locale} string for "${labelKey}"`);
    labels[locale] = value;
  }
  return { labels };
}

/** Runs after the bundle is written, and only where the demo build left a `demo.json`. */
export function demoNotePlugin(opts: DemoNoteOptions) {
  let target = "";
  return {
    name: "northline:demo-note",
    apply: "build" as const,
    configResolved(config: { root: string; build: { outDir: string } }) {
      target = join(resolve(config.root, config.build.outDir), "demo.json");
    },
    closeBundle() {
      if (!existsSync(target)) return;
      const doc = JSON.parse(readFileSync(target, "utf8")) as Record<string, unknown>;
      writeFileSync(target, `${JSON.stringify({ ...doc, note: demoNote(opts) }, null, 2)}\n`, "utf8");
    },
  };
}
