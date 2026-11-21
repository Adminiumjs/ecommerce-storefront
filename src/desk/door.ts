/**
 * The desk's door into Adminium: what the staff screens read and the writes
 * they make, whichever Adminium answers (the real one over the signed-in
 * person's session, or a test's stand-in). Screens never reach past it.
 *
 * Every figure the screens show is a stored column Adminium worked out: an
 * order's goods, discount, shipping, tax and total, what was paid and given
 * back, a return's refund, a variant's price, a stock point's on-hand. The
 * door hands rows back as the API answers them and never adds a figure of
 * its own.
 */
import type { Id, Row } from "./wire.ts";
import type { AddOnRegistry } from "../add-ons/host.ts";

/** The app's tables, by the names the manifest gives them. */
export type Table =
  | "settings"
  | "categories"
  | "size_guides"
  | "products"
  | "option_values"
  | "product_pictures"
  | "variants"
  | "zones"
  | "regions"
  | "shipping_services"
  | "shipping_offers"
  | "closures"
  | "customers"
  | "orders"
  | "order_lines"
  | "gift_lines"
  | "order_codes"
  | "payments"
  | "payment_refunds"
  | "returns"
  | "return_lines"
  | "messages";

export type Action = "read" | "create" | "update" | "delete";

/** The person signed in: their name, and what the app's roles let them do. */
export interface Person {
  name: string;
  /** The app's roles they hold, by the manifest's key (`owner`, `packer`). */
  roles: string[];
  /** Whether they may do this to the app's table; true when the server does not say. */
  can(table: Table, action: Action): boolean;
}

/** Whether the app takes payments, and what this person may do with them (the staff config's `payments`). */
export interface StaffPayments {
  on: boolean;
  online: boolean;
  test: boolean;
  refund: boolean;
}

/** Inventory's rows for the shop's variants, read as the person's role may; null when Inventory is not on or not readable. */
export interface StockRows {
  items: Row[];
  links: Row[];
  places: Row[];
  points: Row[];
}

/** Forms & surveys' reviews of the shop's lines, read through the owner's grant; null for anyone else or without Forms. */
export interface ReviewRows {
  reviews: Row[];
  totals: Row[];
}

/** Everything the desk's screens read, at one moment. */
export interface DeskData {
  settings: Row | null;
  categories: Row[];
  sizeGuides: Row[];
  products: Row[];
  optionValues: Row[];
  pictures: Row[];
  variants: Row[];
  zones: Row[];
  regions: Row[];
  services: Row[];
  offers: Row[];
  closures: Row[];
  /** Empty for a role that reads none (the packer). */
  customers: Row[];
  orders: Row[];
  lines: Row[];
  giftLines: Row[];
  codes: Row[];
  payments: Row[];
  refunds: Row[];
  returns: Row[];
  returnLines: Row[];
  messages: Row[];
  stock: StockRows | null;
  reviews: ReviewRows | null;
}

/** The desk's facts that are not rows: its zone, money, add-ons and the app's own settings. */
export interface DeskFacts {
  zone: string;
  currency: string;
  /** The add-ons attached and switched on, by key. */
  addOns: string[];
  /** Each attached add-on's settings that Adminium hands a browser (never a secret), by key. */
  addOnSettings: Record<string, Record<string, unknown>>;
  /** The app's own settings (`ship_days`, `cutoff`), as the staff config says them. */
  appSettings: Record<string, unknown>;
  /** The connection the app's tables are in. */
  connectionId: string | null;
}

/** One online payment as Adminium's Payment panel shows it to this person. */
export interface PanelPayment {
  amount: string;
  method: string;
  provider: string | null;
  test: boolean;
  paidOn: string;
  /** What may still be refunded online. */
  refundable: string;
  refundRefusal: string | null;
}

/** An order's Payment panel (plan 72), as Adminium answers it to this person; null when it shows none (the packer). */
export interface PaymentPanel {
  currency: string;
  total: string;
  due: string;
  paid: string;
  /** May refund online payments: a signed-in person holding the refund right. Read, never the role's name. */
  mayRefund: boolean;
  /** A payment can be recorded by hand now. */
  mayRecord: boolean;
  /** A payment on its way (the customer is on the pay page). */
  waiting: boolean;
  payments: PanelPayment[];
}

/** A document drawn for one of the app's rows: where its print copy is. */
export interface Drawn {
  contentUrl: string;
  printUrl: string | null;
}

export interface DeskDoor {
  who(): Person;
  facts(): DeskFacts;
  /** The server's clock, as epoch ms. */
  now(): number;
  payments(): StaffPayments | null;
  /** The add-ons' client halves the desk's slots draw (DHL's dispatch flow). Asked only once a screen needs one. */
  addOnRegistry(): Promise<AddOnRegistry>;
  signOut?(): Promise<void>;
  load(): Promise<DeskData>;

  /** An order along its states, from the one the screen saw: a row that moved on since is refused. */
  moveOrder(order: Row, to: string, values?: Record<string, unknown>): Promise<Row>;
  /** An order's own columns that are not its state: the staff note, the carrier and tracking. */
  saveOrder(order: Row, values: Record<string, unknown>): Promise<Row>;
  /** The order's Payment panel as Adminium answers it to this person. */
  panel(order: Row): Promise<PaymentPanel | null>;
  /** "Mark as paid": a bank transfer the owner records, as a `payments` row of method `transfer`. */
  recordTransfer(input: { order: Row; amount: string; paidOn: string; note: string | null; key: string }): Promise<Row>;
  /** Money given back for one payment: a `payment_refunds` row Adminium sends through the way it came. */
  refund(input: { payment: Row; amount: string; reason: string; returnId?: Id | null; key: string }): Promise<Row>;
  /** An e-mail the outbox sent, queued again (the outbox's own "send it again"). */
  resend(message: Row): Promise<Row>;

  /** A return along its states, from the one the screen saw. */
  moveReturn(ret: Row, to: string, values?: Record<string, unknown>): Promise<Row>;
  /** A return's own columns that are not its state: the shipping it gives back. */
  saveReturn(ret: Row, values: Record<string, unknown>): Promise<Row>;
  /** A returned piece's own columns: whether it goes back in stock, freed by a decline. */
  saveReturnLine(line: Row, values: Record<string, unknown>): Promise<Row>;

  saveProduct(product: Row, values: Record<string, unknown>): Promise<Row>;
  /** A colour or a size of a product. */
  createOption(values: Record<string, unknown>): Promise<Row>;
  createVariant(values: Record<string, unknown>): Promise<Row>;
  saveVariant(variant: Row, values: Record<string, unknown>): Promise<Row>;

  /** A review of Forms & surveys, moderated: published, hidden with a reason, or replied to. */
  saveReview(review: Row, values: Record<string, unknown>): Promise<Row>;

  saveSettings(settings: Row, values: Record<string, unknown>): Promise<Row>;

  /** A document of a row the app declares (a packing slip), drawn by the add-on that draws it. */
  render(input: { kind: string; ref: Table; pk: Id }): Promise<Drawn>;
  /** Many print copies printed as one print job; false where this browser cannot. */
  printAll(urls: string[]): Promise<boolean>;
  /** A sign-in link e-mailed to a customer (Adminium's own e-mail-code sign-in). */
  sendSignInLink?(customer: Row): Promise<void>;
}
