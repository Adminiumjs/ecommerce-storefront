/**
 * `npm run sample`: write the two sample files from the one source of the
 * sample (`src/sample/northline.ts`). `src/sample/sample-bundle.test.ts`
 * fails when a file and the source disagree.
 *
 * No Forms file: the reviews are Forms' own, and no app's sample may bring
 * them (see the end of `northline.ts`).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { inventorySection, sampleBundle } from "../src/sample/northline.ts";

const SEEDS = join(import.meta.dirname, "..", "seeds");
export const SAMPLE_FILE = join(SEEDS, "ecommerce-shop.sample.json");
export const INVENTORY_FILE = join(SEEDS, "ecommerce-shop.inventory.sample.json");

export const sampleText = (): string => `${JSON.stringify(sampleBundle(), null, 2)}\n`;
export const inventoryText = (): string => `${JSON.stringify(inventorySection(), null, 2)}\n`;

if (process.env["VITEST"] === undefined) {
  mkdirSync(SEEDS, { recursive: true });
  writeFileSync(SAMPLE_FILE, sampleText());
  writeFileSync(INVENTORY_FILE, inventoryText());
  for (const bundle of [sampleBundle(), inventorySection()]) {
    const moves = bundle.moves === undefined ? "" : `; moves ${String(bundle.moves.length)}`;
    console.info(`[sample] ${bundle.addOn ?? bundle.app}: ${bundle.tables.map((t) => `${t.ref} ${String(t.rows.length)}`).join(", ")}${moves}`);
  }
}
