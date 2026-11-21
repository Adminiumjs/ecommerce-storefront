/**
 * `manifest.json`, assembled from the modules beside this file.
 *
 * The manifest is what Adminium installs: the tables and their rules, the
 * pages, the roles, the shop's doors, the e-mails, the add-ons. It is written
 * from typed modules rather than by hand because it is long and says many
 * things more than once; the modules say each thing once. The file itself is
 * still the product's input, checked in, and `manifest-drift.test.ts` fails
 * when it and the modules disagree (`npm run manifest` writes it again).
 */
import { ADD_ONS } from "./add-ons.ts";
import { AUTOMATIONS } from "./automations.ts";
import { DOCUMENTS } from "./documents.ts";
import { emailTemplates } from "./emails.ts";
import { OUTBOX } from "./outbox.ts";
import { NAV_GROUPS, pages } from "./pages.ts";
import { PAYMENTS } from "./payments.ts";
import { PEOPLE } from "./people.ts";
import { PUBLIC_ACCESS, PUBLIC_KEYS } from "./public.ts";
import { ROLES } from "./roles.ts";
import { SETTINGS } from "./settings.ts";
import { TABLES } from "./tables.ts";

export const VERSION = "0.2.0";

/**
 * The Adminium release that first reads everything below: shoppers' filters,
 * search, sort and count on the catalogue and filters through a product's
 * variants; a review taken from a shipped order line and kept by Forms &
 * surveys; a rule's condition that asks Inventory's stock words; and the
 * Payment panel that answers no money to a role whose limits hide it. 0.3.70
 * lets a review word say who proved who they are (an order's own link reviews
 * only an order placed signed in), counts only proved orders toward a first
 * order, lets a returned piece name the variant Adminium copied onto it
 * through the order's own link, filters a catalogue through variants that
 * also answer stock words, and bundles the 1.0.33 add-ons.
 */
export const MIN_ADMINIUM = "0.3.70";

const ENV = {
  VITE_ADMINIUM_API_BASE_URL: { required: false, example: "https://admin.example.com" },
  VITE_ADMINIUM_PUBLISHABLE_KEY: { required: false, example: "adm_pub_..." },
};

/** The desk opens on one address; its screens are its own routes. */
export const STAFF_ROUTES = { desk: "/", orders: "/orders", packing: "/packing", returns: "/returns", reviews: "/reviews" };

/** The shop's side. An order's own link lands on `/o`, its code in the fragment. */
export const CUSTOMER_ROUTES = {
  home: "/",
  shop: "/shop",
  search: "/search",
  product: "/p",
  basket: "/basket",
  checkout: "/checkout",
  order: "/o",
  returns: "/o/return",
  find: "/find",
  signIn: "/sign-in",
  account: "/account",
  giftCards: "/gift-cards",
  // A gift card's balance: the key Offers & gift cards' own e-mail looks for.
  giftCard: "/gift-cards",
  shipping: "/help/shipping",
  sizes: "/help/sizes",
  contact: "/help/contact",
  about: "/about",
  privacy: "/privacy",
  terms: "/terms",
};

export function buildManifest(): Record<string, unknown> {
  return {
    kind: "app",
    manifestVersion: 1,
    key: "ecommerce-shop",
    name: "Online Shop",
    version: VERSION,
    publisher: { id: "adminium", name: "Adminium", url: "https://adminium.dev" },
    license: "AGPL-3.0-only",
    description: {
      key: "mft.ecommerce.desc",
      fallback:
        "An online shop, front and back. Shoppers browse by size and colour, see what is in stock, pay on a secure page and follow their order; the desk packs, ships and takes returns — every price, tax, number and stock figure decided by your own database.",
    },
    categories: ["commerce"],
    compatibility: {
      minAdminiumVersion: MIN_ADMINIUM,
      engines: ["sqlite", "postgres", "mysql"],
    },
    capabilities: ["email-delivery", "file-storage"],
    frontends: [
      { side: "staff", kind: "spa", entry: "index.html", env: ENV, placement: "external", routes: STAFF_ROUTES, instances: true },
      { side: "customer", kind: "spa", entry: "index.html", env: ENV, routes: CUSTOMER_ROUTES, instances: true },
    ],
    settings: SETTINGS,
    addOns: ADD_ONS,
    navGroups: NAV_GROUPS,
    requiredSchema: { prefixed: true, tables: TABLES },
    pages: pages(),
    roles: ROLES,
    publicKeys: PUBLIC_KEYS,
    publicAccess: PUBLIC_ACCESS,
    people: PEOPLE,
    payments: PAYMENTS,
    automations: AUTOMATIONS,
    documents: DOCUMENTS,
    outbox: OUTBOX,
    emailTemplates: emailTemplates(),
    // Northline's Tuesday: the shop's own rows; the stock items, links and opening stock Inventory adds; the codes Offers keeps.
    sampleData: { file: "seeds/ecommerce-shop.sample.json", addOns: { inventory: { file: "seeds/ecommerce-shop.inventory.sample.json" }, offers: { file: "seeds/ecommerce-shop.offers.sample.json" } } },
  };
}

/** The file's text: two-space JSON and a final newline. */
export function manifestText(): string {
  return `${JSON.stringify(buildManifest(), null, 2)}\n`;
}
