/*
 * INSTALLED from add-ons/packages/host-kit/src/index.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The RUNTIME half: this compiles into the bundle.
 */
/**
 * THE RUNTIME HALF OF THE KIT, and nothing else.
 *
 * Four modules: the config a host writes, the mount component, the paint rule
 * the component depends on, and the stylesheet text. They are the files that
 * COMPILE INTO A HOST'S BUNDLE, and this barrel exists so that a host imports
 * one path and an install script vendors one directory.
 *
 * ── THE GUARDS ARE NOT HERE, AND THAT IS THE WHOLE POINT OF THE FILE ────────
 *
 * `./guards` is a separate entry point in `package.json`, it installs into a
 * different directory (`INSTALL_LAYOUT` in `config.ts` records why), and it is
 * not re-exported from here. That is not tidiness:
 *
 *   `guards/lexicon.ts` SPELLS EVERY BANNED WORD. A barrel that re-exported it
 *   would put that list one ordinary `import { … } from '…/kit'` away from a
 *   screen — and the release grep (17 §2) reads the BUILT BUNDLE, so the
 *   failure would arrive as a red release rather than a red test.
 *
 *   The guards pull in `node:fs`, a TypeScript parser and — in the tier-2 half
 *   — `@testing-library/react`. None of that belongs in a browser bundle, and a
 *   bundler cannot tree-shake what a barrel names.
 *
 * THIS HAS HAPPENED. `zod` reached a shipped bundle by exactly this route: a
 * conformance helper was re-exported from a package index, one runtime module
 * imported the index for one type, and the validator came with it. It is why
 * the hosts' sync scripts refuse to vendor `src/testing/` at all and why
 * `sources.test.ts` in both hosts asserts that no shipped file reaches the
 * test-only directory. Adding one convenience re-export below would defeat all
 * of it, silently, and the person who adds it will have a good reason.
 *
 * A type-only re-export is not an exception. `export type` erases at compile
 * time and reads as harmless, and it is — until the next edit drops the `type`
 * keyword because the symbol turned out to be a value too. The rule is easier to
 * hold than the exception: nothing from `./guards` is named in this file.
 */

export {
  INSTALL_LAYOUT,
  selectorsFor,
  type HostKitConfig,
  type HostKitSelectors,
  type HostKitTier,
} from './config.ts';

export { drewNothing, drewSomething } from './slot-content.ts';

export {
  createAddOnSlot,
  type AddOnSlotBinding,
  type AddOnSlotProps,
  type UseSlotFills,
} from './AddOnSlot.tsx';

export {
  slotRuleBlock,
  slotRuleCss,
  slotRulePatterns,
  type PrefixSource,
} from './styles.ts';
