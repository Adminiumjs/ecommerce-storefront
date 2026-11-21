/**
 * The manifest the contract installs, and the Adminium it needs.
 *
 * The contract installs the manifest that ships, so it runs on its floor
 * (`MIN_ADMINIUM`) or a later Adminium; when the contract is asked for, an
 * older checkout is refused here by name rather than by an install that
 * fails half way.
 *
 * Tests only; nothing that ships imports it.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { MIN_ADMINIUM } from "../manifest/build.ts";

const REPO = fileURLToPath(new URL("../..", import.meta.url));

/** The release of the Adminium under test, as its server's own package says it (null when there is no checkout). */
const ENGINE_VERSION: string | null = (() => {
  const file = join(process.env["ADMINIUM_REPO"] ?? "", "apps", "server", "package.json");
  if (!existsSync(file)) return null;
  return (JSON.parse(readFileSync(file, "utf8")) as { version?: string }).version ?? null;
})();

/** Whether release `a` is `b` or later, on major.minor.patch. */
const atLeast = (a: string, b: string): boolean => {
  const [x, y] = [a, b].map((v) => v.split(/[.-]/).slice(0, 3).map(Number));
  for (let i = 0; i < 3; i += 1) if (x![i] !== y![i]) return x![i]! > y![i]!;
  return true;
};

/**
 * The release a checkout built before its version was moved becomes
 * (`CONTRACT_ENGINE_RELEASE=0.3.47`): its server still says the release
 * before, and refuses a manifest whose floor is the one it is about to be.
 * Given, the contract runs on that checkout as that release, and the manifest
 * is installed with its floor at what the server says. Never set in CI, which
 * runs a released Adminium.
 */
const BECOMES = process.env["CONTRACT_ENGINE_RELEASE"] ?? null;

const asked = process.env["CONTRACT"] === "1" || process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1";
if (asked && ENGINE_VERSION !== null && !atLeast(BECOMES ?? ENGINE_VERSION, MIN_ADMINIUM)) {
  throw new Error(`the contract needs Adminium ${MIN_ADMINIUM} or later, the app's floor; ADMINIUM_REPO has ${ENGINE_VERSION}`);
}

/** Whether the Adminium under test is release `release` or later (as `CONTRACT_ENGINE_RELEASE` names it, when given). */
export const engineAtLeast = (release: string): boolean => ENGINE_VERSION !== null && atLeast(BECOMES ?? ENGINE_VERSION, release);

/** The manifest that ships. */
export const MANIFEST_TEXT: string = readFileSync(join(REPO, "manifest.json"), "utf8");
