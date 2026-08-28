/*
 * INSTALLED from add-ons/packages/host-kit/guards/lexicon.ts — by scripts/host-kit.sh.
 * Never hand-edit this copy: edit the kit and re-run `host-kit.sh install`.
 * The GUARD half: suites import this; nothing that ships may.
 */
/**
 * THE RELEASE SWEEP'S WORD LIST, IN ONE EXECUTABLE PLACE — and, new in this
 * package, SCOPED so that a retrofit is answerable for its own copy and not for
 * the shop's.
 *
 * ── THE GUARD HAS TO BE THE RELEASE GREP, NOT A POLITER VERSION OF IT ───────
 *
 * The sweep (17 §2) reads BUILT OUTPUT case-insensitively for
 * `pricing|plan|tier|billing|upgrade|/mo|free` as SUBSTRINGS, and 24 D12 adds
 * `premium` and `pro` for add-ons. A `\b`-anchored version of that list is
 * strictly weaker than the thing it claims to enforce: "explanation",
 * "frontier", "freephone" and "flatplan" all pass a word boundary and all fail
 * the release. Substrings here, no anchors, and nobody may add anchors later
 * because the anchored version PASSES while the gate it stands for FAILS, which
 * is the worst arrangement a guard can be in.
 *
 * THE LIST IS NEVER SHORTENED TO MAKE A BUILD PASS. An earlier version of the
 * file this was extracted from kept a second, reduced array for the bundle with
 * `free` and `plan` dropped, on the grounds that a minified file cannot tell
 * German copy from a JavaScript identifier. That is true and it is not a reason
 * to drop a word: it is a reason to NAME the exceptions. So the full list runs,
 * and the handful of genuine non-English homographs are allowed ONE EXACT TOKEN
 * AT A TIME in `HOMOGRAPH_TOKENS`, each with the language it belongs to and what
 * it actually means. A word the gate has to allow is a word a reviewer gets to
 * read, which is why `lexiconGuard` prints both allow-lists on every run.
 *
 * ── AND A HOST MAY ADD NOTHING TO ANY OF IT ─────────────────────────────────
 *
 * `config.ts` records the argument at length and it is not repeated here: a
 * host that must be edited before a portable add-on passes its gates makes
 * 24 D21 false by a route nobody would look down. What IS worth recording here
 * is the one host-local list that was tried, because its shape is instructive.
 *
 * `maker-shop/src/testing/lexicon.ts` carries a seventh export the print works'
 * copy does not — `CRAFT_TRAPS`, seven "wrong → say this instead" pairs for a
 * shop that sells pots and cake toppers: `plants?`, `planters?`,
 * `free postage`, `free engraving`, `free[- ]standing`, `tiered`, `upgrade to`.
 * It reads like exactly the thing a host would need to add.
 *
 * IT IS NOT, AND THE MEASUREMENT IS THE WHOLE ARGUMENT: every one of those
 * seven patterns is a STRICT SUBSET of `SUBSTRING_BANNED`. "plant" and "planter"
 * contain `plan`; the three `free …` phrases contain `free`; "tiered" contains
 * `tier`; "upgrade to" contains `upgrade`. Not one of them can match a string
 * the substring ban would have passed. So `CRAFT_TRAPS` never widened the gate
 * by a single byte — it is a REMEDY table, telling a writer what to say instead
 * — and a remedy belongs in a failure message rather than in a rule. That is
 * where it is: `hostCopyDebt` and the offence report print the token and the
 * sentence around it, which is more use than a fixed right-hand column and is
 * the same information a shop's own writer needs.
 *
 * The distinction generalises. A host asking to add a word is either adding one
 * the list already covers — in which case it wants better wording on a failure
 * — or one it does not, in which case the list is short for EVERY host and the
 * word belongs here, in this file, where all twelve get it.
 *
 * ── THE NEW RULING: WHOSE COPY IS THIS GATE ABOUT? (31 D4) ──────────────────
 *
 * Every earlier copy of this gate ran over a MERGED bundle and failed on any
 * hit anywhere. That was correct in the two repos it was written for, because
 * both were built from nothing with the ban already in force. It is wrong for a
 * RETROFIT, and wrong on day one:
 *
 *   `ecommerce-storefront` renders its free-shipping copy on the very screen
 *   the carrier retrofit touches. Measured over its built bundle on
 *   2026-08-28 — `dist/index.html` plus every emitted `.js` and `.css`,
 *   case-insensitively:
 *
 *       free      70        upgrade    5
 *       billing   16        plan       1
 *       tier       9        premium    1
 *       pricing    0        /mo        0
 *
 *   `factory-ops`, measured the same way the same day, comes back clean but for
 *   five hits on `upgrade`, all of them inside React's own
 *   `__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`.
 *
 * So an unscoped gate installed into the storefront is red before the retrofit
 * has contributed one string, on ninety-odd hits in copy the add-on did not
 * write and cannot fix. A gate that is red on arrival is a gate that gets an
 * exemption list, and an exemption list is where nine of wave 4b's holes came
 * from. A gate that is red on arrival and CANNOT be fixed by the person
 * installing it is worse: it gets deleted.
 *
 * D4 therefore splits the rule in two, and the split is by AUTHOR rather than
 * by severity:
 *
 *   ADD-ON-CONTRIBUTED COPY FAILS. A registered add-on's own message bundle,
 *   and the slot-fill copy a retrofit writes at a mount site. This is the thing
 *   17 §2 is actually about — new words, going onto a screen, now.
 *
 *   PRE-EXISTING HOST COPY IS REPORTED AS DEBT AND DOES NOT FAIL. It is a real
 *   finding about a real app and somebody has to pay it; it is not this
 *   installation's fault and it must not block this installation.
 *
 * ── WHICH IS ONLY HONEST IF THE DEBT IS LOUD ────────────────────────────────
 *
 * A gate that silently ignores host copy is exactly how this debt went unpaid
 * for two waves. So the report is PER HOST — it names `config.appKey`, because
 * a finding that reads identically in twelve repos is a finding a reader cannot
 * place — it is PRINTED ON EVERY RUN whether or not there is anything in it,
 * and it is AVAILABLE AS A LIST through `hostCopyDebt`, so a repo that wants to
 * ratchet its own number down can assert on it without re-deriving the rule.
 *
 * Printing an EMPTY report is deliberate. "No debt" and "the report stopped
 * running" look identical when a clean run prints nothing, and the second is
 * the state this file is most likely to end up in.
 *
 * ── AND WHY THE SCOPED GATE CANNOT RUN OVER BUILT OUTPUT ────────────────────
 *
 * A built bundle interleaves every locale of every source and no byte can be
 * attributed back to the author of the string it came from. Scoping is exactly
 * an attribution question, so over `dist/` there is nothing to scope BY: the
 * storefront's seventy `free`s and the retrofit's would be the same seventy-odd
 * bytes in the same chunk.
 *
 * So this file draws the line where attribution still exists — the MESSAGE
 * BUNDLE, where a key names its author — and `lexiconGuard` runs there. The
 * scanner that reads built output (`readableText`) and the offence finder over
 * arbitrary text (`bundleOffences`) are still exported, because a host built
 * clean is entitled to run the unscoped check over its own bytes and should.
 * What is NOT offered is a scoped built-output gate, because it would be a
 * fiction, and the reason is written here rather than discovered later by
 * somebody wondering why the kit has no such factory.
 */

import { describe, expect, it } from 'vitest';

import type { HostFacts } from '../../add-ons/kit/config.ts';

/** Every substring the release grep looks for. */
export const SUBSTRING_BANNED = [
  'pricing',
  'plan',
  'tier',
  'billing',
  'upgrade',
  'free',
  'premium',
  '/mo',
] as const;

/**
 * The one 24 D12 adds that is a WORD rather than a substring.
 *
 * "pro" is not in 17 §2's run of substrings and must not be turned into one: a
 * shop that makes things says "proof", "process", "product" and "properties" on
 * nearly every screen, and a substring rule over those would trade a real
 * defect for an imaginary one. What D12 forbids is the marketing word — a "Pro"
 * add-on, a "Pro" account — so it is checked as a standalone token, and the
 * places a translator legitimately wrote it are allowed by exact phrase in
 * `PRO_PHRASES`.
 */
export const WORD_BANNED = ['pro'] as const;

/** One non-English word that happens to spell an English marketing word. */
export interface HomographToken {
  token: string;
  language: string;
  means: string;
}

/**
 * The only tokens allowed to carry a banned substring.
 *
 * Each entry is an EXACT token, matched case-insensitively against the whole
 * run of word characters around the hit — never a loosened pattern. "planen" is
 * allowed; "plan", "planning" and "planned" are not, and an English sentence
 * that reaches for any of them fails the gate exactly as the release would.
 *
 * Everything here is a word in one of the seven non-English locales. Forcing a
 * translator away from the ordinary word in their own language would be trading
 * a real defect for an imaginary one; naming the word costs one line.
 */
export const HOMOGRAPH_TOKENS: readonly HomographToken[] = [
  {
    token: 'eingeplant',
    language: 'German',
    means: '“scheduled in” — the past participle of einplanen, used of work that has a slot',
  },
  {
    token: 'planen',
    language: 'Danish (also German)',
    means: 'Danish “the schedule” (the definite form of plan); German “to plan”',
  },
  {
    token: 'Planches',
    language: 'French',
    means: '“sheets”, the plural of planche — a sheet of die-cut stickers',
  },
  {
    token: 'tarifs',
    language: 'French',
    means:
      '“rates” — what a carrier charges to carry a parcel, the plural of tarif. ' +
      'The German Tarif is a PLAN and is banned; this exact plural is not a German ' +
      'word, so the singular, Tarife and Tarifwechsel all still fail',
  },
];

/** One phrase in which a standalone "pro" is a preposition rather than a tier. */
export interface ProPhrase {
  phrase: string;
  language: string;
  means: string;
}

/**
 * The only phrases allowed to contain a standalone "pro".
 *
 * A phrase and not a token, because the token IS "pro" in every case and an
 * allow-list of the bare token would wave the English marketing word straight
 * through. Each entry must match from the "pro" onwards, case-insensitively.
 *
 * THESE BELONG TO THE LANGUAGES AND NOT TO ANY SHOP, which is the whole reason
 * they are in the kit. `maker-shop`'s copy of this list was empty, with a
 * comment saying its eight locales had been written around the ban and needed
 * no allowance — true of that app's own copy, and the wrong thing to encode.
 * Registering a portable add-on whose Czech permission line reads
 * "Číst zakázku, pro kterou se návrh dělá" turned that host's gate RED, while
 * the same add-on passed in the print works, which happened to carry the
 * phrase. One list, every host, no edits on install.
 */
export const PRO_PHRASES: readonly ProPhrase[] = [
  { phrase: 'pro Stück', language: 'German', means: '“per item”, i.e. each' },
  { phrase: 'pro kterou', language: 'Czech', means: '“for which”' },
  { phrase: 'pro účetnictví', language: 'Czech', means: '“for the accounts”' },
  {
    phrase: 'pro {ref}',
    language: 'Czech',
    means: 'the preposition “for” in front of a reference placeholder',
  },
];

/**
 * ── THE BANNED IDEAS, SPELT IN EVERY LANGUAGE ───────────────────────────────
 *
 * What this replaced, in the repos it was extracted from, was a table holding
 * per language the spelling of ONE idea — "premium". It was a fingerprint, and
 * it was proven blind: planting "الترقية إلى الباقة المدفوعة" ("upgrade to the
 * paid plan") in an ar-EG bundle and "Jetzt auf den bezahlten Tarif wechseln"
 * ("switch to the paid tariff now") in a de-DE one left every built-output case
 * green. Neither sentence contains an English banned run, and neither is the
 * word "premium".
 *
 * So the table below is `IDEA × LANGUAGE` and it is TOTAL BY TYPE: every idea
 * has a cell in every non-English language, and adding a language or an idea is
 * a compile failure until somebody fills the cells in.
 *
 * ── AND TOTAL BY TYPE IS NOT COMPLETE, WHICH IS THIS FILE'S OWN TRAP ────────
 *
 * YOU CANNOT FORGET A CELL; YOU CAN LEAVE EVERY CELL SHORT. Each one is a
 * hand-picked list of stems, so the table catches its own examples and looks
 * finished while doing it. Two plants walked through it:
 *
 *     "Wechseln Sie jetzt zur kostenpflichtigen Vollversion."   (de-DE)
 *     "انتقل إلى النسخة المدفوعة للحصول على مزايا إضافية."        (ar-EG)
 *
 * "Switch now to the paid full version" and "move to the paid version for extra
 * benefits" — a paid-tier upsell in two shipped locales, with every case green.
 * Neither says Tarif, Abo, Preisstufe, باقة or ترقية. They did not have to: a
 * language has more than one way to say a thing, and a stem list knows the ways
 * its author thought of.
 *
 * ── A COMPLETE MECHANICAL RULE HERE IS IMPOSSIBLE, AND SAYING SO IS THE ─────
 * ── ONLY HONEST THING TO DO ─────────────────────────────────────────────────
 *
 * The rule being enforced is: v1 ships completely free of charge, so no
 * sentence anywhere may raise the subject of paying for the product. Deciding
 * whether an arbitrary sentence in seven languages raises that subject is
 * reading for MEANING. No list of stems can do it and a bigger table would only
 * be a slower way to arrive back here.
 *
 * SO THIS TABLE IS A REGRESSION SET. It holds every spelling that has actually
 * got through, and it will go on growing that way. A green run means "nothing
 * we have been bitten by before", never "no upsell in this bundle". A reviewer
 * still has to ask, of every new or changed string in any locale: does this
 * sentence tell the reader that something costs money, or that more of the
 * product can be had by paying — in any words at all?
 *
 * ── AND WHY THE STEMS ARE THE COMMERCIAL ONES, NOT THE ORDINARY ONES ────────
 *
 * A shop says "price" on every page and must go on saying it: the English ban
 * is on `pricing`, not `price`, and the same distinction has to be kept in each
 * language or the gate fails on copy that is simply copy. So German is
 * `Preisgestaltung` and not `Preis`, French is `tarification` and not `tarif`,
 * Czech is `cenový plán` and not `cena`. Three words that would have been
 * obvious choices are DELIBERATELY ABSENT, each because it means something
 * ordinary in a shop that posts parcels: German `Paket`, Czech `balíček` and
 * Danish `pakke` all mean "parcel", and banning them would ban a delivery
 * add-on's own vocabulary in three languages.
 */

/**
 * The ideas 17 §2 and 24 D12 forbid, named once.
 *
 * `paid` ON ITS OWN IS DELIBERATELY NOT ONE OF THEM, and the attempt is worth
 * recording. It was in this list for one run and came straight back out: a shop
 * is PAID for what it makes, so a confirm screen reads "المدفوع" and an add-on
 * shelf has a "المدفوعات" category, both ordinary and both hits.
 *
 * `paid-version` IS one of them. "The paid version" and "the full version" are
 * how an upsell is written when the writer is not reaching for a plan or a
 * tier — which is what both plants above did. The phrase is the unit: `paid`
 * alone is a shop's own word, `paid version` is never anything else.
 */
export const BANNED_IDEAS = [
  'pricing',
  'plan',
  'tier',
  'billing',
  'upgrade',
  'free',
  'premium',
  'paid-version',
] as const;

export type BannedIdea = (typeof BANNED_IDEAS)[number];

/** The seven languages whose spellings the English substring ban cannot see. */
export const OTHER_LANGUAGES = [
  'de-DE',
  'fr-FR',
  'cs-CZ',
  'da-DK',
  'zh-CN',
  'zh-TW',
  'ar-EG',
] as const;

export type OtherLanguage = (typeof OTHER_LANGUAGES)[number];

/**
 * TOTAL BY TYPE, WHICH IS WHAT MAKES IT A RULE RATHER THAN A LIST.
 *
 * `Record<Language, Record<BannedIdea, …>>` over the two arrays above: delete a
 * cell and `tsc` names the missing idea; add a language or an idea and every
 * gap is a compile error until somebody fills it in. A list can be short and
 * look finished — that is exactly what the one-word table it replaced did.
 */
export const IDEA_IN_LANGUAGE: Record<OtherLanguage, Record<BannedIdea, RegExp[]>> = {
  'de-DE': {
    // Preisgestaltung/Preismodell — never bare `Preis`, which is what every
    // product page says, and never `Preisliste`: a delivery add-on's German
    // copy says "Die Preisliste dahinter wird … gepflegt" of a carrier's own
    // rate card, and a PRICE LIST is a thing a shop has. English bans `pricing`
    // and does not ban `price list` either.
    pricing: [/preisgestaltung/i, /preismodell/i],
    // `Tarif` is the word the first plant used. A shop never says it; a mobile
    // network does.
    plan: [/\btarif/i, /\babo\b/i, /abonnement/i],
    tier: [/preisstufe/i, /\bstufenpreis/i, /\btarif/i],
    billing: [/abrechnung/i, /rechnungsstellung/i],
    // German borrows "Upgrade", which the English substring ban already sees;
    // these are the German-formed alternatives it does not.
    upgrade: [/höherstufen/i, /hochstufen/i, /aufwerten auf/i],
    free: [/kostenlos/i, /\bgratis/i, /umsonst/i],
    premium: [/premium/i, /\bprofi/i],
    // THE SECOND PLANT: "Wechseln Sie jetzt zur kostenpflichtigen
    // Vollversion." `kostenpflichtig` is "subject to a charge" and a shop never
    // says it; `Vollversion`/`Bezahlversion` are the software-upsell words.
    // Bare `Kosten` is absent on purpose — a shop talks about costs.
    'paid-version': [/kostenpflichtig/i, /vollversion/i, /bezahlversion/i],
  },
  'fr-FR': {
    // `tarif` alone is French for "rate" and is legitimate on a delivery page.
    pricing: [/tarification/i, /grille tarifaire/i],
    plan: [/forfait/i, /abonnement/i],
    // NEVER bare `palier`: it is the French for a quantity BREAK, and a price
    // page is legitimately headed "Paliers de quantité". English calls those
    // "breaks" and does not ban the word either.
    tier: [/palier tarifaire/i, /niveau tarifaire/i],
    billing: [/facturation/i],
    upgrade: [/mise à niveau/i, /surclassement/i, /passer à l'offre/i],
    free: [/gratuit/i],
    premium: [/premium/i],
    // `payant` qualifies a THING that costs; a shop quotes prices without it.
    'paid-version': [/version payante/i, /version complète/i, /offre payante/i],
  },
  'cs-CZ': {
    // `ceník` is an ordinary price list and a shop has one; `cenový plán` is
    // the commercial idea.
    pricing: [/cenový plán/i, /cenová politika/i],
    plan: [/\btarif/i, /předplatn/i],
    tier: [/cenová hladina/i, /\btarif/i],
    billing: [/fakturace/i, /vyúčtování/i],
    upgrade: [/povýšit na/i, /vyšší tarif/i],
    free: [/zdarma/i, /zadarmo/i, /bezplatn/i],
    premium: [/prémiov/i, /profesionál/i],
    // `placená verze` / `plná verze`. `\S*` rather than `\w*`: Czech endings
    // are accented and `\w` is ASCII, so `plná verze` slipped a `\w*` pattern.
    'paid-version': [/placen\S*\s+verz/i, /pln\S*\s+verz/i],
  },
  'da-DK': {
    // `prisliste` is an ordinary price list; `prisplan`/`prismodel` are not.
    pricing: [/prisplan/i, /prismodel/i],
    plan: [/abonnement/i],
    tier: [/prisniveau/i, /pristrin/i],
    billing: [/fakturering/i, /betalingsplan/i],
    // Danish borrows "upgrade" as `opgradering`, which the substring ban does
    // NOT see — `opgrader` is not `upgrade`.
    upgrade: [/opgrader/i],
    free: [/\bgratis/i, /vederlagsfri/i],
    premium: [/premium/i],
    'paid-version': [/betalingsversion/i, /betalt version/i, /fuld version/i],
  },
  'zh-CN': {
    pricing: [/定价/, /价格方案/],
    plan: [/套餐/, /订阅/],
    // NEVER bare `档位`: delivery copy legitimately says 档位由我们替您选好 of the
    // weight bracket a parcel falls into, which is a bracket and not a plan.
    tier: [/价格档/, /套餐档/],
    billing: [/账单/, /计费/],
    upgrade: [/升级/],
    free: [/免费/],
    premium: [/高级版/, /专业版/],
    'paid-version': [/付费版/, /完整版/],
  },
  'zh-TW': {
    pricing: [/定價/, /價格方案/],
    plan: [/方案/, /訂閱/],
    // NEVER bare `級距`, for the same reason as zh-CN's 档位.
    tier: [/價格級/, /方案級/],
    billing: [/帳單/, /計費/],
    upgrade: [/升級/],
    free: [/免費/],
    premium: [/高級版/, /專業版/],
    'paid-version': [/付費版/, /完整版/],
  },
  'ar-EG': {
    pricing: [/التسعير/, /تسعير/],
    // `باقة` — the first plant's word for a package a shop pays for.
    plan: [/باقة/, /الباقة/, /اشتراك/],
    tier: [/فئة سعرية/, /مستوى سعري/],
    billing: [/فوترة/, /الفوترة/],
    // `ترقية` — the first plant's word for "upgrade".
    upgrade: [/ترقية/],
    free: [/مجان/],
    premium: [/احترافي/, /مميز/],
    // THE OTHER PLANT: "انتقل إلى النسخة المدفوعة …". The PHRASE, never bare
    // مدفوع — a shop's own confirm screen says المدفوع of an order.
    'paid-version': [/النسخة المدفوعة/, /نسخة مدفوعة/, /الإصدار المدفوع/, /النسخة الكاملة/],
  },
};

/**
 * The per-locale view a message-bundle gate wants.
 *
 * `en-US` is the English substring ban's own job, so its only entry is what D12
 * adds on top plus the round-6 plant WRITTEN IN ENGLISH: 17 §2's substring run
 * covers `pricing plan tier billing upgrade free /mo` and none of them appears
 * in "switch to the paid version for more". The hole was in every language
 * including this one.
 */
export const TIERING_WORDS: Readonly<Record<string, readonly RegExp[]>> = {
  'en-US': [/premium/i, /paid version/i, /full version/i, /paid account/i],
  ...Object.fromEntries(
    OTHER_LANGUAGES.map((language) => [
      language,
      BANNED_IDEAS.flatMap((idea) => IDEA_IN_LANGUAGE[language][idea]),
    ]),
  ),
};

/**
 * Every pattern above, flattened.
 *
 * A built file carries all eight locales interleaved and there is no way to
 * attribute a byte back to the language it came from, so a check over built
 * output runs the UNION. That is stricter than the per-locale check, which is
 * the right direction.
 */
export const TIERING_PATTERNS: readonly RegExp[] = Object.values(TIERING_WORDS).flat();

/**
 * WHAT A READER COULD READ IN A BUILT SCRIPT: its string and template literals.
 *
 * ── WHY THE GREP STOPPED READING CODE ───────────────────────────────────────
 *
 * A bundle grep that ran over the WHOLE minified file, code included, reported
 * `"/mo" in "/mo"` against `E=b/mo` — a division by a one-letter identifier the
 * minifier happened to name `mo`. Nothing was wrong, nothing was on a screen,
 * and no word in the app had changed; a variable had been renamed by a tool
 * nobody drives.
 *
 * That is a false positive rather than a miss, and it is still serious. A gate
 * whose output has to be inspected hit by hit is a gate a hurried reviewer
 * waves through, and one that fires on a change altering no words teaches
 * everybody that its red means nothing. Both failure modes end with a real hit
 * going past.
 *
 * AND IT LOSES NOTHING WORTH KEEPING. The ban is on WORDS A SHOP OWNER READS. A
 * banned run inside a minified identifier is not one. Everything a reader can
 * read in a script is in a string: every locale bundle, every label, every URL,
 * every `aria-label`. Hand-written markup — `index.html` — has no minifier
 * between the author and the bytes and is read whole, with no allowance.
 *
 * ── IT IS A SCANNER, NOT A REGEX, AND IT HAS TO BE ──────────────────────────
 *
 * Quotes appear inside comments and inside regular-expression literals, so a
 * pattern that matched `'…'` would desynchronise on the first `/["']/` in the
 * bundle and read the rest of the file as one giant string. This walks the
 * source once and tracks which of the seven states it is in. A `/` starts a
 * regex only where a value cannot have just ended, which is the same rule a
 * JavaScript parser applies and the reason `E=b/mo` reads as division.
 */
/**
 * One escape sequence, DECODED, and the index of its last character.
 *
 * Decoding is not tidiness. A bundler is free to write any character as
 * `\uXXXX` — esbuild does exactly that whenever its charset is `ascii`, which
 * is one config line away — and a gate reading `free` sees no `free` at all.
 * Reading the escapes back means the scanner's answer is the STRING, not the
 * source of the string, so the ban keeps biting whatever spelling the packer
 * chose.
 */
function unescape(source: string, at: number): [string, number] {
  const c = source[at + 1] ?? '';
  const simple: Record<string, string> = {
    n: '\n',
    t: '\t',
    r: '\r',
    b: '\b',
    f: '\f',
    v: '\v',
    '0': '\0',
  };
  if (c === 'u' && source[at + 2] === '{') {
    const end = source.indexOf('}', at + 3);
    if (end > 0) {
      const code = Number.parseInt(source.slice(at + 3, end), 16);
      return [Number.isNaN(code) ? '' : String.fromCodePoint(code), end];
    }
  }
  if (c === 'u') {
    const code = Number.parseInt(source.slice(at + 2, at + 6), 16);
    return [Number.isNaN(code) ? '' : String.fromCharCode(code), at + 5];
  }
  if (c === 'x') {
    const code = Number.parseInt(source.slice(at + 2, at + 4), 16);
    return [Number.isNaN(code) ? '' : String.fromCharCode(code), at + 3];
  }
  // `\"`, `\'`, `\\`, `\/` and a line continuation all stand for themselves.
  return [simple[c] ?? c, at + 1];
}

export function readableText(source: string): string {
  const out: string[] = [];
  let literal = '';
  /** Nested `${…}` inside template literals, innermost last. */
  const templates: number[] = [];
  let state: 'code' | 'line' | 'block' | 'regex' | "'" | '"' | '`' = 'code';
  /** The last character that could end a value — decides `/` division vs regex. */
  let prev = '';
  let braces = 0;

  for (let i = 0; i < source.length; i += 1) {
    const c = source[i]!;
    const next = source[i + 1] ?? '';

    if (state === 'line') {
      if (c === '\n') state = 'code';
      continue;
    }
    if (state === 'block') {
      if (c === '*' && next === '/') {
        state = 'code';
        i += 1;
      }
      continue;
    }
    if (state === 'regex') {
      if (c === '\\') i += 1;
      else if (c === '[') {
        // A character class may hold an unescaped `/`; skip to its end.
        while (i + 1 < source.length && source[i + 1] !== ']') {
          if (source[i + 1] === '\\') i += 1;
          i += 1;
        }
        i += 1;
      } else if (c === '/') {
        state = 'code';
        prev = 'x';
      }
      continue;
    }
    if (state === "'" || state === '"') {
      if (c === '\\') {
        const [decoded, after] = unescape(source, i);
        literal += decoded;
        i = after;
        continue;
      }
      if (c === state) {
        out.push(literal);
        literal = '';
        state = 'code';
        prev = 'x';
        continue;
      }
      literal += c;
      continue;
    }
    if (state === '`') {
      if (c === '\\') {
        const [decoded, after] = unescape(source, i);
        literal += decoded;
        i = after;
        continue;
      }
      if (c === '$' && next === '{') {
        // The expression inside is CODE. Remember the template to come back to.
        out.push(literal);
        literal = '';
        // `${` counts as an opening brace, so an object literal inside the
        // expression closes its own braces before this one is reached.
        templates.push(braces);
        braces += 1;
        state = 'code';
        prev = '';
        i += 1;
        continue;
      }
      if (c === '`') {
        out.push(literal);
        literal = '';
        state = 'code';
        prev = 'x';
        continue;
      }
      literal += c;
      continue;
    }

    // ── code ────────────────────────────────────────────────────────────────
    if (c === '/' && next === '/') {
      state = 'line';
      i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      state = 'block';
      i += 1;
      continue;
    }
    if (c === '/') {
      // After a value — an identifier, a number, `)`, `]` or a string — this is
      // division. Anywhere else it opens a regular expression.
      state = /[\p{L}\p{N}_$)\]]/u.test(prev) ? 'code' : 'regex';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      state = c;
      continue;
    }
    if (c === '{') braces += 1;
    if (c === '}') {
      braces -= 1;
      if (templates.length > 0 && braces === templates[templates.length - 1]) {
        templates.pop();
        state = '`';
        continue;
      }
    }
    if (!/\s/.test(c)) prev = c;
  }

  return out.join('\n');
}

/** Every banned substring present in `value`, case-insensitively. */
export function bannedSubstringsIn(
  value: string,
  words: readonly string[] = SUBSTRING_BANNED,
): string[] {
  const lower = value.toLowerCase();
  return words.filter((word) => lower.includes(word));
}

/** One place a banned run of letters survived. */
export interface Offence {
  /** The banned substring, the word `pro`, or the tiering pattern's source. */
  word: string;
  /** The whole word the hit sits inside — what an allow-list entry names. */
  token: string;
  /** Enough either side to recognise the sentence. */
  context: string;
}

const WORD_CHAR = /[\p{L}\p{N}_$]/u;

/** The maximal run of word characters around `[at, end)`. */
function tokenAround(text: string, at: number, end: number): string {
  let i = at;
  while (i > 0 && WORD_CHAR.test(text[i - 1]!)) i -= 1;
  let j = end;
  while (j < text.length && WORD_CHAR.test(text[j]!)) j += 1;
  return text.slice(i, j);
}

const ALLOWED_TOKENS = new Set(HOMOGRAPH_TOKENS.map((h) => h.token.toLowerCase()));

/**
 * Every banned run of letters in `text` that no explicit carve-out covers.
 *
 * THE SAME SEMANTICS AS THE RELEASE GREP, with two named departures and no
 * others: a hit whose whole token is in `HOMOGRAPH_TOKENS`, and a standalone
 * "pro" that begins one of `PRO_PHRASES`. Both lists are printed by
 * `lexiconGuard`, so the carve-outs are read rather than discovered.
 *
 * `patterns` defaults to the UNION of every language's tiering stems, which is
 * what a check over built output wants. A per-locale caller passes
 * `TIERING_WORDS[locale]` instead, which is the weaker and correctly-attributed
 * form: German's `Tarif` is a plan and French's `tarifs` is what a carrier
 * charges, and only the union has to reconcile them.
 */
export function bundleOffences(
  text: string,
  patterns: readonly RegExp[] = TIERING_PATTERNS,
): Offence[] {
  const lower = text.toLowerCase();
  const out: Offence[] = [];

  const context = (at: number, end: number) =>
    text.slice(Math.max(0, at - 55), Math.min(text.length, end + 55)).replace(/\s+/g, ' ');

  for (const word of SUBSTRING_BANNED) {
    for (let at = lower.indexOf(word); at >= 0; at = lower.indexOf(word, at + 1)) {
      const end = at + word.length;
      // `/mo` is punctuation-led: it has no enclosing word and no carve-out.
      const token = WORD_CHAR.test(word[0]!) ? tokenAround(text, at, end) : word;
      if (ALLOWED_TOKENS.has(token.toLowerCase())) continue;
      out.push({ word, token, context: context(at, end) });
    }
  }

  for (const word of WORD_BANNED) {
    const standalone = new RegExp(`(?<![\\p{L}\\p{N}_$])${word}(?![\\p{L}\\p{N}_$])`, 'giu');
    for (const match of lower.matchAll(standalone)) {
      const at = match.index;
      const end = at + word.length;
      const covered = PRO_PHRASES.some(
        (p) => lower.slice(at, at + p.phrase.length) === p.phrase.toLowerCase(),
      );
      if (covered) continue;
      out.push({ word, token: text.slice(at, end), context: context(at, end) });
    }
  }

  for (const pattern of patterns) {
    // Fresh, global, so every occurrence is reported rather than the first.
    const all = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
    );
    for (const match of text.matchAll(all)) {
      const at = match.index;
      const end = at + match[0].length;
      const token = tokenAround(text, at, end);
      /*
       * THE HOMOGRAPH CARVE-OUT APPLIES HERE TOO, and it did not once, which
       * only mattered when the tiering table stopped being one word per
       * language. The union is where German's `Tarif` (a PLAN) meets French's
       * `tarifs` (what a carrier charges). One is banned, the other is on a
       * delivery page in front of a customer. The exact-token list is the
       * mechanism this file already has for exactly that.
       */
      if (ALLOWED_TOKENS.has(token.toLowerCase())) continue;
      out.push({ word: pattern.source, token, context: context(at, end) });
    }
  }

  return out;
}

/** One offence, with the key and locale it was found under. */
export interface CopyOffence extends Offence {
  locale: string;
  key: string;
  value: string;
}

/**
 * WHERE A HOST'S WORDS COME FROM, and how to tell whose they are.
 *
 * A value rather than a module path, because the merged bundle is a runtime
 * object in every host that has one and no two of them file it in the same
 * place.
 */
export interface LexiconScope {
  /**
   * Every string this app can render in one locale, merged — the host's own
   * copy AND the message bundles registered add-ons brought with them.
   */
  bundleFor(locale: string): Readonly<Record<string, string>>;
  /**
   * IS THIS KEY ONE THE RETROFIT PUT THERE?
   *
   * The default is a prefix of `addon.`, and it works because both halves of
   * "add-on-contributed" already live under it: an add-on's own bundle
   * registers `addon.<key>.…`, and the slot-fill copy a host writes at a mount
   * site — the empty states, the "nothing is connected" lines — goes under
   * `addon.host.…` in both repos this was extracted from.
   *
   * A HOST THAT FILES THAT COPY SOMEWHERE ELSE MUST SAY SO HERE, and the cost
   * of not saying so is that its new strings are reported as pre-existing debt
   * and do not fail. That is the failure mode this option exists to make
   * visible rather than to hide, which is why the guard prints how many keys
   * each side of the split holds on every run: a split that suddenly puts
   * everything on the debt side is a split that has stopped working.
   */
  contributed?(key: string): boolean;
}

const DEFAULT_CONTRIBUTED = (key: string): boolean => key.startsWith('addon.');

/** Placeholder names are not copy — `{spare}` is a number, not a word. */
const stripPlaceholders = (value: string): string => value.replace(/\{\w+\}/g, '');

function scan(
  scope: LexiconScope,
  locale: string,
  wanted: (key: string) => boolean,
): CopyOffence[] {
  const patterns = TIERING_WORDS[locale];
  const bundle = scope.bundleFor(locale);
  const out: CopyOffence[] = [];
  for (const [key, value] of Object.entries(bundle)) {
    if (!wanted(key)) continue;
    for (const hit of bundleOffences(stripPlaceholders(value), patterns ?? [])) {
      out.push({ ...hit, locale, key, value });
    }
  }
  return out;
}

/**
 * EVERY OFFENCE IN THE HOST'S PRE-EXISTING COPY — reported, never failed.
 *
 * Exported separately from the guard so a host that has begun paying this debt
 * down can ratchet on the number without re-deriving the rule, and so the
 * report can be read by something other than a person watching a console.
 */
export function hostCopyDebt(config: HostFacts, scope: LexiconScope): CopyOffence[] {
  const contributed = scope.contributed ?? DEFAULT_CONTRIBUTED;
  return config.localeTags.flatMap((locale) => scan(scope, locale, (key) => !contributed(key)));
}

/** Every offence in copy the retrofit itself contributed. These fail. */
export function addOnCopyOffences(config: HostFacts, scope: LexiconScope): CopyOffence[] {
  const contributed = scope.contributed ?? DEFAULT_CONTRIBUTED;
  return config.localeTags.flatMap((locale) => scan(scope, locale, contributed));
}

const show = (hit: CopyOffence): string =>
  `${hit.locale} · ${hit.key} · "${hit.word}" in "${hit.token}" — ${hit.value}`;

/**
 * DECLARE THE VOCABULARY SUITE for one host.
 *
 * Everything this asserts is stated over `config` and `scope`, so a host's own
 * test file is the import, the config and one call.
 */
export function lexiconGuard(config: HostFacts, scope: LexiconScope): void {
  describe(`${config.appKey} · the vocabulary ban (17 §2, 24 D10, D12; scoped by 31 D4)`, () => {
    const contributed = scope.contributed ?? DEFAULT_CONTRIBUTED;

    it('has a bundle to read, in every locale this host ships', () => {
      /*
       * THE GUARD ON THE GUARD. Every case below is an ABSENCE, and an absence
       * over an empty object is indistinguishable from a pass. A locale whose
       * bundle came back `{}` — a merge that stopped happening, a registry
       * nobody imported — would make the whole suite green by having nothing to
       * read, which is the exact way the built-output gate went blind twice.
       */
      expect(config.localeTags.length, 'this host declares no locales at all').toBeGreaterThan(0);
      const empty = config.localeTags.filter(
        (locale) => Object.keys(scope.bundleFor(locale)).length === 0,
      );
      expect(empty, 'these locales resolved to an empty bundle').toEqual([]);
    });

    it('can see the difference between its own copy and the retrofit’s', () => {
      /*
       * AND THE GUARD ON THE SPLIT, which is the thing D4 newly rests on. A
       * `contributed` that answered `false` to everything would move the whole
       * bundle onto the debt side and this suite would go green on any copy at
       * all. Both sides have to be non-empty: a retrofit that contributed no
       * strings has not been installed, and a host with no copy of its own is
       * not a host.
       */
      const [first] = config.localeTags;
      const keys = Object.keys(scope.bundleFor(first!));
      const mine = keys.filter((key) => contributed(key));
      const theirs = keys.filter((key) => !contributed(key));
      expect(
        mine.length,
        'no key in this bundle reads as add-on-contributed — see LexiconScope.contributed. ' +
          'Every offence would be reported as pre-existing debt and nothing could fail',
      ).toBeGreaterThan(0);
      expect(theirs.length, 'the whole bundle reads as add-on-contributed').toBeGreaterThan(0);
    });

    it('knows how to read every locale this host ships', () => {
      /*
       * A locale with no `IDEA × LANGUAGE` cell is a locale in which the gate
       * can see the English substrings and nothing else — which is precisely
       * the state the one-word table was in when two plants walked through it.
       * Failing here rather than passing quietly is the point: the fix is a
       * column in THIS file, so every host gets it, and never a list in a host.
       */
      const unreadable = config.localeTags.filter((locale) => TIERING_WORDS[locale] === undefined);
      expect(
        unreadable,
        'these locales have no idea×language column. Add one to guards/lexicon.ts — ' +
          'never to a list inside a host, which is the drift config.ts is about',
      ).toEqual([]);
    });

    it('prints its carve-outs and this host’s debt, on every run', () => {
      const debt = hostCopyDebt(config, scope);
      const byWord = new Map<string, number>();
      for (const hit of debt) byWord.set(hit.word, (byWord.get(hit.word) ?? 0) + 1);

      // eslint-disable-next-line no-console
      console.log(
        [
          `vocabulary ban — ${config.appKey}`,
          'allowed homographs (exact token, case-insensitive):',
          ...HOMOGRAPH_TOKENS.map((h) => `  "${h.token}" · ${h.language} · ${h.means}`),
          'allowed "pro" phrases (exact phrase, from the "pro" onwards):',
          ...PRO_PHRASES.map((p) => `  "${p.phrase}" · ${p.language} · ${p.means}`),
          `pre-existing host copy (31 D4: REPORTED, does not fail) — ${debt.length} offence(s)`,
          ...[...byWord.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([word, n]) => `  ${word} · ${n}`),
          ...debt.slice(0, 40).map((hit) => `  ${show(hit)}`),
          ...(debt.length > 40 ? [`  … and ${debt.length - 40} more`] : []),
        ].join('\n'),
      );

      /*
       * The report is the assertion. There is deliberately no threshold: a
       * number fitted to whichever host its author had open is the shape
       * `expect(ALL).toHaveLength(7)` had, and it turned "register one more
       * add-on" into a red suite on a faultless app. A host that wants to
       * ratchet its own debt down asserts on `hostCopyDebt` in its own repo,
       * where the number is a fact about that repo.
       */
      expect(Array.isArray(debt)).toBe(true);
    });

    it('keeps every string the retrofit contributed clear of all of it', () => {
      const offences = addOnCopyOffences(config, scope);
      expect(
        offences.map(show),
        '\nThese are strings the retrofit put in front of a reader, and they carry a word ' +
          '17 §2 sweeps for. Pre-existing host copy is reported as debt and does not fail ' +
          '(31 D4); this half does, because it is new copy going onto a screen now:\n' +
          offences.map(show).join('\n') +
          '\n',
      ).toEqual([]);
    });

    it('would bite, in the spellings a word-anchored version misses', () => {
      /*
       * AN ABSENCE PROVES NOTHING UNLESS THE CHECK IS SHOWN TO BITE — and this
       * is the case that would fail if somebody "repaired" the list with `\b`.
       * Both traps 24 D10 names by name are here, plus the two words a
       * shortened list once dropped.
       */
      const bites = (text: string) => bundleOffences(text).map((o) => o.word);
      expect(bites('a short explanation of the sizes')).toContain('plan');
      expect(bites('the frontier of large format')).toContain('tier');
      expect(bites('delivery is free on this one')).toContain('free');
      expect(bites('a Pro account')).toContain('pro');
      // And the allowances are allowances, not holes.
      expect(bites('Das ist eingeplant.')).toEqual([]);
      expect(bites('0,04 $ pro Stück')).toEqual([]);
      expect(bites('proof, process, product')).toEqual([]);
      expect(bites('we have no plans')).toContain('plan');
    });
  });
}
