/*
 * INSTALLED from add-ons/packages/host-kit/guards/index.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * THE GUARD HALF OF THE KIT — the entry point a host's suites import, and the
 * one that must never be reachable from a screen.
 *
 * ── WHY THIS BARREL EXISTS AND `../index.ts` MAY NOT NAME IT ────────────────
 *
 * `guards/lexicon.ts` SPELLS EVERY BANNED WORD. It is a module that would fail
 * the very release grep it defines if it ever reached a bundle. `payload-casts`
 * pulls in a TypeScript parser; four of the nine read `node:fs`. None of that
 * belongs in a browser, and a bundler cannot tree-shake what a barrel names.
 *
 * So the package has two entry points, they install into two directories
 * (`INSTALL_LAYOUT`), and `../index.ts` — the runtime barrel — does not mention
 * this file. `brand.ts` enforces the other half of that: any shipped source
 * that imports the guard directory is a finding.
 *
 * THAT HAS HAPPENED BY EXACTLY THIS ROUTE. `zod` reached a shipped bundle
 * because a conformance helper was re-exported from a package index, one
 * runtime module imported the index for one type, and the validator came with
 * it.
 *
 * ── WHAT A HOST'S OWN TEST FILE LOOKS LIKE ──────────────────────────────────
 *
 * Every guard is a FACTORY that declares its own suite, so a host's file is the
 * config, the fixtures it happens to have, and a call per guard:
 *
 *     import { brandGuard, lexiconGuard, … } from '../../add-ons/kit/testing/kit/index.ts';
 *     import { hostKit } from '../../add-ons/kit/add-ons/host-kit.config.ts';
 *
 * `testing/kit/index.ts` and NOT `testing/kit/guards/index.ts`: the install
 * writes this half FLAT — `INSTALL_LAYOUT.guards` is `testing/kit`, and the
 * script copies `src/guards/*` into it without keeping the `guards/` segment.
 * The same off-by-one directory is what made `guards/facts.ts` glob one level
 * too far up and discover nothing in the first host that ran it, so it is worth
 * getting right in prose as well as in a string literal: WRITE PATHS FOR THE
 * INSTALLED LAYOUT, NOT FOR THIS REPOSITORY'S.
 *
 *     lexiconGuard(hostKit, { bundleFor: (l) => MESSAGES[l] ?? {} });
 *     brandGuard(hostKit);
 *     …
 *
 * The alternative — exporting assertions for a host to arrange into `it`s — was
 * rejected for the reason this whole package exists: an arrangement is a thing
 * that drifts, and twelve hosts arranging the same nine guards is twelve
 * arrangements that agree until one of them is repaired.
 */

export {
  allSources,
  codeOf,
  ownShippedFiles,
  read,
  relativeTo,
  shippedFiles,
  suiteFiles,
  vendoredFiles,
  walk,
  withoutComments,
} from './files.ts';

export {
  addOnCopyOffences,
  bannedSubstringsIn,
  bundleOffences,
  hostCopyDebt,
  lexiconGuard,
  readableText,
  BANNED_IDEAS,
  HOMOGRAPH_TOKENS,
  IDEA_IN_LANGUAGE,
  OTHER_LANGUAGES,
  PRO_PHRASES,
  SUBSTRING_BANNED,
  TIERING_PATTERNS,
  TIERING_WORDS,
  WORD_BANNED,
  type BannedIdea,
  type CopyOffence,
  type HomographToken,
  type LexiconScope,
  type Offence,
  type OtherLanguage,
  type ProPhrase,
} from './lexicon.ts';

export {
  brandFindings,
  brandGuard,
  guardHalfImportsIn,
  vendorImportLine,
  COMPANY_NAMES,
  type BrandFinding,
} from './brand.ts';

export {
  affiliationFindings,
  carriesDisclaimer,
  labelPairingRenderedGuard,
  labelPairingSourceGuard,
  marksNamedIn,
  namesMark,
  surfaceStrings,
  type RenderedLabelFixtures,
  type RenderedLabelOptions,
  type TouredSurface,
} from './label-pairing.ts';

export {
  discoveredFacts,
  factsFrom,
  factsGuard,
  VENDORED_FACTS,
  type AddOnFactsModule,
  type CompanyMark,
  type DiscoveredFacts,
  type FactsGuardOptions,
  type InertOrigin,
  type ServerOnlyNeedle,
} from './facts.ts';

export {
  mountCount,
  payloadCasts,
  payloadCastsGuard,
  type CastFinding,
} from './payload-casts.ts';

export { mountsGuard, type MountFixtures, type SlotMountRecord } from './mounts.ts';

export {
  bareSpecifiersIn,
  syncHeaderProblems,
  vendoredGuard,
  NEVER_HAND_EDIT,
  type VendoredGuardOptions,
} from './vendored.ts';

export {
  readSlotRules,
  stylesGuard,
  withoutCssComments,
  type SlotRuleReading,
} from './styles.ts';

export {
  componentIsMounted,
  declaredDependencies,
  guardsNotWired,
  tierGuard,
  TIER_1_GUARDS,
  TIER_2_GUARDS,
  TIER_2_DEPENDENCIES,
  type GuardEntry,
} from './tier.ts';

import type { MountFixtures } from './mounts.ts';
import type { RenderedLabelFixtures } from './label-pairing.ts';

/**
 * EVERYTHING THE TIER-2 GUARDS NEED FROM A HOST, in one type.
 *
 * `config.ts`'s header promises this name and describes exactly what it is for:
 * a config is a value a host can write in a file that imports nothing, and the
 * moment it holds a `render` it drags React, the store and every screen into
 * whatever imports it. `people-ops` and `clinic-desk` have no React test tree
 * at all; their config must still load. So the renders are a SEPARATE ARGUMENT,
 * and this is that argument's type.
 *
 * IT IS DECLARED HERE RATHER THAN IN `config.ts` for the same reason it is a
 * separate argument in the first place. `MountFixtures.recorded()` returns
 * records the guards read, and `RenderedLabelFixtures.tour` hands over an
 * `Element` — both are DOM-shaped, and `config.ts` is the file two DOM-less
 * hosts import. Naming this type there would put `lib.dom` in the import graph
 * of a file whose entire virtue is having no dependencies.
 *
 * A host passes the halves separately where that reads better; the aggregate
 * exists so a host with both can write one object and hand it to both guards.
 */
export interface Tier2Fixtures extends RenderedLabelFixtures, MountFixtures {}
