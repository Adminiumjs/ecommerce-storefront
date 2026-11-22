/**
 * THE ADD-ONS ADMINIUM HAS FOR THIS STUDIO, LOADED FROM ADMINIUM.
 *
 * On a real install the studio is served by Adminium (`build:surface:staff`)
 * and DHL Shipping's client half is too: this file asks Adminium which
 * add-ons are attached to Maker Shop and switched on, fetches each one's
 * client bundle from Adminium, checks its bytes, imports it and registers
 * it. Its dispatch flow then books with the carrier through the add-on's
 * SERVER half, where the account's credentials are. `registry.ts` is the
 * other source: the vendored client half the DEMO build compiles in, which
 * answers from its demo carrier in the page. The seam (`host.ts`'s
 * `createRegistry`) is the same for both; only where the add-ons come from
 * differs.
 *
 * ── THIS FILE SENDS, AND IT IS DECLARED ─────────────────────────────────────
 *
 * `sources.test.ts` bans naming `fetch` and an `import()` of anything but a
 * relative literal. Both bans are right, and both are lifted for this file
 * alone, by name, there: it asks the Adminium that served the page (the same
 * origin, the session's cookie riding along) and nothing else, and it imports
 * a bundle only from a URL on that origin under the add-on bundle path
 * (`bundleUrlIsSafe`). `connected.test.ts` drives the refusals, including the
 * URLs that look same-origin and are not.
 *
 * ── WHAT THE INTEGRITY CHECK IS WORTH ──────────────────────────────────────
 *
 * Each bundle arrives with a `sha256-…` the server recorded when it unpacked
 * the package. This fetches the bytes, hashes them and refuses a mismatch, then
 * imports the same URL (the HTTP cache makes the second read the first's bytes).
 * That proves the bytes match the reply that described them; it proves nothing
 * about a compromised server, which would describe its own bytes correctly.
 * The control against a bad package is the server's, at unpack and on every
 * read. It is not SRI: a dynamic `import()` cannot be held to an `integrity`.
 *
 * ── REACT FIRST ────────────────────────────────────────────────────────────
 *
 * A built add-on bundle imports no `react`: it reads the host's React from a
 * well-known global, when its module initialises. So `installAddOnRuntime`
 * runs before the first `import()`, once; two Reacts on one page would argue
 * over one DOM tree.
 *
 * ── THE KEY IS THE ONE THE SERVER NAMED ────────────────────────────────────
 *
 * The key an add-on registers under selects its settings and which fills are
 * attributed to it, so a bundle served as one add-on that registers as another
 * is dropped with a problem rather than registered.
 */
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as JsxRuntime from "react/jsx-runtime";

import type { AddOn } from "./host.ts";
import { installAddOnRuntime, type AddOnRuntime } from "./vendor/host/runtime/index.ts";
import { withInstall } from "../desk/transport/staffConnection.ts";
import { createEngineCarrier, type EngineSend } from "./vendor/host/engine-carrier.ts";

/** The panels' host API, once a screen has asked for one: kept, so a later install never takes it away. */
let panelHost: unknown;

/**
 * The host's React on the well-known global, for every bundle this page
 * imports: a slot's client half (DHL's) reads React and its JSX runtime from
 * it; a record panel also reads `react-dom` and the host API its screens are
 * drawn with (`host`, see `studio/panels/host.tsx`). One object for both, so
 * whichever loads second never takes away what the first was given.
 */
export function installRuntime(host?: unknown): void {
  if (host !== undefined) panelHost = host;
  installAddOnRuntime({
    react: React as unknown as Readonly<Record<string, unknown>>,
    jsx: {
      jsx: (JsxRuntime as unknown as { jsx: unknown }).jsx,
      jsxs: (JsxRuntime as unknown as { jsxs: unknown }).jsxs,
      Fragment: (JsxRuntime as unknown as { Fragment: unknown }).Fragment,
    },
    reactDom: ReactDOM as unknown as Readonly<Record<string, unknown>>,
    ...(panelHost === undefined ? {} : { host: panelHost }),
  } as AddOnRuntime);
}

/**
 * One add-on's client bundle, as `GET /api/v1/add-ons` describes it. From Adminium 0.3.53 the list also names the
 * add-on's page bundles (`ref`) and record panel bundles (`panel`) beside its slot bundle, in no promised order. Each
 * comes with its integrity: a bundle whose pin the server cannot read is left out of the list, so an add-on whose slot
 * bundle's pin is unreadable reaches this studio with no slot bundle and is passed over as a data pack is. No Adminium
 * sends a `null` integrity; one that did is refused, never imported unchecked.
 */
export interface ConnectedBundle {
  path: string;
  url: string;
  integrity: string | null;
  ref?: string;
  panel?: string;
}

/** One installed add-on, as the server describes it. Narrowed to what is read. */
export interface ConnectedAddOnDto {
  key: string;
  name: string;
  version: string;
  attachments: readonly ConnectedAttachment[];
  bundles: readonly ConnectedBundle[];
  /** Installed by the meta store but its files are not on the server. Absent from older servers. */
  missing?: boolean;
}

/**
 * One host an add-on is mounted on. An add-on may be installed once per
 * database, so two rows of the list can share a key; from 0.3.49 each
 * attachment also says which install of the HOST it joins (`hostInstall`,
 * `""` while the host is not installed). Absent from older servers.
 */
export interface ConnectedAttachment {
  attachedTo: string;
  enabled: boolean;
  hostInstall?: string;
}

/** Why one add-on did not make it. A list, not a throw: one broken add-on leaves its slot empty, never the studio. */
export interface ConnectedProblem {
  key: string;
  code: "NO_ENGINE_CLIENT" | "LIST_UNAVAILABLE" | "NO_BUNDLE" | "UNSAFE_URL" | "BUNDLE_UNAVAILABLE" | "INTEGRITY_MISMATCH" | "NO_REGISTER" | "KEY_MISMATCH" | "NO_DISCLAIMER" | "MALFORMED";
  detail: string;
}

export interface ConnectedLoad {
  addOns: AddOn[];
  problems: ConnectedProblem[];
}

/** The path a bundle URL must sit under: a fence this file checks, never a route it builds. */
const BUNDLE_PREFIX = "/api/v1/add-ons/";

/** Where the list lives, relative to the origin serving this page. */
const LIST_PATH = "/api/v1/add-ons";

/**
 * Whether this is a URL this studio will import a script from: on the page's
 * own origin and under the bundle path, both compared on the RESOLVED URL, so
 * `//evil.test/…`, `/api/v1/add-ons/../../evil.js` and `https://own.test@evil.test/…`
 * are refused as well as a plain other origin.
 */
export function bundleUrlIsSafe(raw: string, pageOrigin: string): boolean {
  let url: URL;
  try {
    url = new URL(raw, pageOrigin);
  } catch {
    return false;
  }
  if (url.origin !== new URL(pageOrigin).origin) return false;
  return url.pathname.startsWith(BUNDLE_PREFIX);
}

/**
 * Whether an entry is the shape this file reads. The reply is untrusted for its
 * shape too: Adminium and this app are versioned apart, and one entry this
 * cannot read must not stop the others loading.
 */
function isConnectedDto(value: unknown): value is ConnectedAddOnDto {
  if (typeof value !== "object" || value === null) return false;
  const dto = value as Record<string, unknown>;
  if (typeof dto["key"] !== "string" || dto["key"] === "") return false;
  if (!Array.isArray(dto["attachments"])) return false;
  if (!Array.isArray(dto["bundles"])) return false;
  for (const a of dto["attachments"] as unknown[]) {
    if (typeof a !== "object" || a === null) return false;
    if (typeof (a as Record<string, unknown>)["attachedTo"] !== "string") return false;
    const hostInstall = (a as Record<string, unknown>)["hostInstall"];
    if (hostInstall !== undefined && typeof hostInstall !== "string") return false;
  }
  for (const b of dto["bundles"] as unknown[]) {
    if (typeof b !== "object" || b === null) return false;
    const bundle = b as Record<string, unknown>;
    if (typeof bundle["url"] !== "string" || typeof bundle["path"] !== "string") return false;
    if (typeof bundle["integrity"] !== "string" && bundle["integrity"] !== null) return false;
    for (const named of ["ref", "panel"]) if (bundle[named] !== undefined && typeof bundle[named] !== "string") return false;
  }
  return true;
}

/**
 * Whether an add-on that names a company carries its not-affiliated line
 * (`addon.<key>.notAffiliated`) in every language its messages have: a studio
 * read in Arabic with the line only in English would carry the company's name
 * undisclaimed for its actual readers. Defensive about the values, since they
 * come from a downloaded bundle.
 */
function hasDisclaimer(addOn: AddOn): boolean {
  const messages: unknown = addOn.messages;
  if (typeof messages !== "object" || messages === null) return false;
  const bundles = Object.values(messages as Record<string, unknown>);
  if (bundles.length === 0) return false;
  return bundles.every((bundle) => {
    if (typeof bundle !== "object" || bundle === null) return false;
    return Object.entries(bundle as Record<string, unknown>).some(([key, value]) => key.endsWith(".notAffiliated") && typeof value === "string" && value.trim() !== "");
  });
}

/** `sha256-<base64>` over these bytes, in the spelling the server sends. */
async function sha256Integrity(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return `sha256-${btoa(binary)}`;
}

const sameIntegrity = (a: string, b: string): boolean => a === b && a.startsWith("sha256-");

/**
 * THE ADD-ONS OF THIS INSTALL, one per key.
 *
 * One app may be installed once per database, and so may an add-on: the list
 * then names the same key twice, one row per database, each with its own
 * attachments and its own off switch. Another database's attachment, or its
 * switch, is not this install's.
 *
 *   · The reply says which install each attachment joins (`hostInstall`, from
 *     0.3.49): keep an add-on attached to this app, at this install, switched
 *     on there, whose files are on the server — and, when the config listed
 *     this install's add-ons, one of them (the list does not say whether an
 *     add-on is still being installed; the config does).
 *   · It does not: the config's own list is this install's (attached here, on
 *     and installed), so keep those, attached to this app and switched on.
 *   · Neither (no config list): attached to this app and on, as before.
 *
 * Duplicate keys collapse to the first kept row: two copies of one add-on are
 * the same version and the same bundle, and two registrations of one key
 * would fill each slot twice.
 */
export function ofThisInstall(
  listed: readonly ConnectedAddOnDto[],
  appKey: string,
  installId: string | null,
  allowed?: ReadonlySet<string>,
): ConnectedAddOnDto[] {
  const saysInstall = installId !== null && listed.some((dto) => dto.attachments.some((a) => typeof a.hostInstall === "string"));
  const kept = new Map<string, ConnectedAddOnDto>();
  for (const dto of listed) {
    if (kept.has(dto.key)) continue;
    if (allowed !== undefined && !allowed.has(dto.key)) continue;
    const on = dto.attachments.some((a) => a.attachedTo === appKey && a.enabled === true && (!saysInstall || a.hostInstall === installId));
    if (!on) continue;
    if (saysInstall && dto.missing === true) continue;
    kept.set(dto.key, dto);
  }
  return [...kept.values()];
}

export interface ConnectedOptions {
  /** This app's manifest key: only the add-ons attached to it, and on there, are loaded. */
  appKey: string;
  /** The origin serving this page. Injected so a suite can drive the fence. */
  origin: string;
  /**
   * This install of the app, from its staff config. Said on every call, and
   * matched against each attachment's `hostInstall` when the reply carries it.
   * Null from an Adminium older than installs per database.
   */
  installId?: string | null;
  /**
   * The add-ons the staff config lists for this install (`addOns`' keys):
   * attached to it, switched on there and installed. What the list is
   * narrowed to when its attachments do not say which install they join.
   */
  allowed?: ReadonlySet<string>;
  /** The signed-in person's CSRF token, read when a write is sent. */
  csrfToken?: () => string | null;
  /** Injected for the suite; the default is why this file is declared in `sources.test.ts`. */
  request?: typeof fetch;
  /** Injected for the suite. Same. */
  importBundle?: (url: string) => Promise<unknown>;
}

interface BundleModule {
  register?: unknown;
  connectEngineCarrier?: unknown;
}

const ENGINE_SHIPPING_PATH = /^\/api\/v1\/apps\/[^/]+\/shipping(?:\/|$)/;

/**
 * THE ONE WAY A CARRIER'S SCREENS REACH ADMINIUM (plan 79, W2). The kit's client
 * names no sender, so this file, already the declared one, is its `send`: this
 * origin and this app's shipping routes only, with the session cookie, the
 * install header (`request` carries it) and the CSRF token on a write. A
 * redirect is refused rather than followed, and nothing is retried here: a
 * purchase is asked for once.
 */
export function engineSend(request: typeof fetch, origin: string, csrfToken: () => string | null): EngineSend {
  return async (path, init) => {
    const target = new URL(path, origin);
    if (target.origin !== new URL(origin).origin || !ENGINE_SHIPPING_PATH.test(target.pathname)) {
      throw new Error("not one of this app's shipping routes");
    }
    const token = init.method === "GET" ? null : csrfToken();
    const res = await request(target.toString(), {
      method: init.method,
      credentials: "same-origin",
      redirect: "error",
      headers: { ...init.headers, ...(token === null ? {} : { "x-adminium-csrf": token }) },
      ...(init.body === undefined ? {} : { body: init.body }),
    });
    return { status: res.status, text: () => res.text() };
  };
}

/**
 * The list, the bundles of what is attached here and on, registered. NEVER
 * THROWS: every failure is a problem, the list being unreachable included, and
 * the studio's slots stay empty for what did not load.
 */
export async function loadConnectedAddOns(options: ConnectedOptions): Promise<ConnectedLoad> {
  const { appKey, origin } = options;
  const request = withInstall(options.request ?? globalThis.fetch.bind(globalThis), options.installId);
  const importBundle = options.importBundle ?? ((url: string): Promise<unknown> => import(/* @vite-ignore */ url));

  // Before any import (see the header). Idempotent.
  installRuntime();

  const problems: ConnectedProblem[] = [];
  let listed: readonly unknown[];
  try {
    // Same origin: the signed-in person's session cookie rides along, which is what the add-on routes ask.
    const res = await request(new URL(LIST_PATH, origin).toString(), { credentials: "same-origin", headers: { accept: "application/json" } });
    if (!res.ok) {
      problems.push({ key: "*", code: "LIST_UNAVAILABLE", detail: `GET ${LIST_PATH} answered ${String(res.status)}` });
      return { addOns: [], problems };
    }
    const body = (await res.json()) as { addOns?: unknown };
    listed = Array.isArray(body.addOns) ? (body.addOns as readonly unknown[]) : [];
  } catch (cause) {
    problems.push({ key: "*", code: "LIST_UNAVAILABLE", detail: cause instanceof Error ? cause.message : String(cause) });
    return { addOns: [], problems };
  }

  const wellFormed: ConnectedAddOnDto[] = [];
  for (const entry of listed) {
    if (isConnectedDto(entry)) {
      wellFormed.push(entry);
      continue;
    }
    const key = typeof (entry as { key?: unknown } | null)?.key === "string" ? String((entry as { key: string }).key) : "?";
    problems.push({ key, code: "MALFORMED", detail: "the server described this add-on in a shape this build does not read" });
  }

  // Attached to THIS install of this app and switched on there: an add-on of another app, another database's copy, or one off here, is not this studio's.
  const mine = ofThisInstall(wellFormed, appKey, options.installId ?? null, options.allowed);

  const addOns: AddOn[] = [];
  for (const dto of mine) {
    // The slot bundle: the one that is no page's (`ref`) and no record panel's (`panel`). A page or a panel is the
    // dashboard's to draw, never a slot this studio registers.
    const bundle = dto.bundles.find((b) => b.ref === undefined && b.panel === undefined);
    // A data pack fills no slot and ships no client half: nothing to mount, and no failure.
    if (bundle === undefined) continue;
    // Never sent (see `ConnectedBundle`); refused rather than imported unchecked should a server send it.
    if (bundle.integrity === null) {
      problems.push({ key: dto.key, code: "INTEGRITY_MISMATCH", detail: `${bundle.path}: the server could not say what its bytes are` });
      continue;
    }
    if (!bundleUrlIsSafe(bundle.url, origin)) {
      problems.push({ key: dto.key, code: "UNSAFE_URL", detail: bundle.url });
      continue;
    }
    const absolute = new URL(bundle.url, origin).toString();
    let bytes: ArrayBuffer;
    try {
      const res = await request(absolute, { credentials: "same-origin" });
      if (!res.ok) {
        problems.push({ key: dto.key, code: "BUNDLE_UNAVAILABLE", detail: `${bundle.path} answered ${String(res.status)}` });
        continue;
      }
      bytes = await res.arrayBuffer();
    } catch (cause) {
      problems.push({ key: dto.key, code: "BUNDLE_UNAVAILABLE", detail: cause instanceof Error ? cause.message : String(cause) });
      continue;
    }
    const seen = await sha256Integrity(bytes);
    if (!sameIntegrity(seen, bundle.integrity)) {
      problems.push({ key: dto.key, code: "INTEGRITY_MISMATCH", detail: `${bundle.path}: expected ${bundle.integrity}, got ${seen}` });
      continue;
    }
    let module: BundleModule;
    try {
      module = (await importBundle(absolute)) as BundleModule;
    } catch (cause) {
      problems.push({ key: dto.key, code: "NO_REGISTER", detail: cause instanceof Error ? cause.message : String(cause) });
      continue;
    }
    if (typeof module.register !== "function") {
      problems.push({ key: dto.key, code: "NO_REGISTER", detail: `${bundle.path} exports no register()` });
      continue;
    }
    // Every read of what register() returns is in here: it is a downloaded bundle's object, typed only by a cast.
    let addOn: AddOn;
    let refusal: ConnectedProblem | null = null;
    try {
      addOn = (module.register as () => AddOn)();
      if (typeof addOn !== "object" || addOn === null || typeof addOn.key !== "string") throw new Error("register() returned something that is not an add-on");
      if (addOn.key !== dto.key) refusal = { key: dto.key, code: "KEY_MISMATCH", detail: `served as "${dto.key}", registered as "${String(addOn.key)}"` };
      else if (addOn.namesCompany === true && !hasDisclaimer(addOn)) refusal = { key: dto.key, code: "NO_DISCLAIMER", detail: "declares namesCompany and ships no notAffiliated line" };
    } catch (cause) {
      problems.push({ key: dto.key, code: "NO_REGISTER", detail: cause instanceof Error ? cause.message : String(cause) });
      continue;
    }
    if (refusal !== null) {
      problems.push(refusal);
      continue;
    }
    // A carrier built on the shared kit takes this app's client for its shipping routes. An older bundle has no such
    // export and stays as it was, so it can never reach a carrier from here.
    if (typeof module.connectEngineCarrier === "function") {
      try {
        const send = engineSend(request, origin, options.csrfToken ?? (() => null));
        (module.connectEngineCarrier as (client: unknown) => void)(createEngineCarrier({ send, appKey, addOnKey: addOn.key }));
      } catch (cause) {
        problems.push({ key: dto.key, code: "NO_ENGINE_CLIENT", detail: cause instanceof Error ? cause.message : String(cause) });
      }
    }
    addOns.push(addOn);
  }
  return { addOns, problems };
}

/** A refusal of a panel's code: the server's status and code, and its words. */
export class PanelRefused extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "PanelRefused";
    this.status = status;
    this.code = code;
  }
}

export interface PanelLoadOptions {
  /** `/api/v1/add-ons/<key>/panels/<id>/bundle?connection=…&table=…&row=…`, built by the door. */
  url: string;
  /** The origin serving this page. */
  origin: string;
  /** The panels' host API (`studio/panels/host.tsx`), published before the module is imported. */
  host: unknown;
  request?: typeof fetch;
  importBundle?: (url: string) => Promise<unknown>;
}

/**
 * A record panel's code, as Adminium serves it for one row to the person
 * signed in, imported: its default export. Adminium answers it only for a row
 * they reach, with a grant on the panel's table and the panel's own
 * permission; a refusal is thrown with its status (403 not theirs, 404 no
 * panel there). The bytes are hashed against the pin the server sends with
 * them (`x-adminium-integrity`), as a slot's bundle is against the list's.
 */
export async function loadPanelModule(options: PanelLoadOptions): Promise<unknown> {
  const request = options.request ?? globalThis.fetch.bind(globalThis);
  const importBundle = options.importBundle ?? ((url: string): Promise<unknown> => import(/* @vite-ignore */ url));
  if (!bundleUrlIsSafe(options.url, options.origin)) throw new PanelRefused(0, "UNSAFE_URL", options.url);
  const absolute = new URL(options.url, options.origin).toString();
  const res = await request(absolute, { credentials: "same-origin" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new PanelRefused(res.status, body?.error?.code ?? "PANEL_UNAVAILABLE", body?.error?.message ?? `the panel answered ${String(res.status)}`);
  }
  const pinned = res.headers.get("x-adminium-integrity");
  const seen = await sha256Integrity(await res.arrayBuffer());
  if (pinned !== null && !sameIntegrity(seen, pinned)) throw new PanelRefused(0, "INTEGRITY_MISMATCH", `expected ${pinned}, got ${seen}`);
  installRuntime(options.host);
  const module = (await importBundle(absolute)) as { default?: unknown } | null;
  return module?.default;
}
