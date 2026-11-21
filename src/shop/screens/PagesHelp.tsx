/**
 * S16 the help pages: shipping and returns, the size guides, a message to the
 * shop, and the shop's own About, Privacy and Terms.
 *
 * Every fact here is the shop's, as Adminium serves it: the services and
 * their prices to each zone (`shipping_offers`, with the goods each is free
 * from), the days it is closed, each state's tax rate, the days it gives for
 * returns, its size guides with its own columns, and its own texts. The page
 * only lays them out and words them. The time an order must be paid by to
 * ship the same day is an app setting the public settings read does not
 * carry, so it is left out (see the report's departures).
 */
import { CircleCheck } from "lucide-react";
import { newClientKey } from "@adminiumjs/public-client";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

import { useI18n, type MessageKey } from "../../i18n/index.tsx";
import { documentLanguage } from "../door.ts";
import { dayRange, dayShort, money, percent } from "../format.ts";
import { Field, FieldError, looksLikeEmail, Spinner } from "../parts.tsx";
import type { ShippingOffer, ShopBase } from "../port.ts";
import type { ShopView } from "../route.ts";
import { announce, NONE, today, useShop } from "../store.ts";
import { Mono, rich } from "../words.tsx";
import { ArrowLink, HelpFrame, refusalWords, refusedColumn, useShopAddress, useShopName } from "./PagesParts.tsx";

// ── shipping & returns ────────────────────────────────────────────────────

/** "3–5 business days", "2 business days", "1 business day": a service's days after it ships. */
function Days({ min, max }: { min: number | null; max: number | null }) {
  const { t, locale } = useI18n();
  const n = (v: number) => <Mono>{new Intl.NumberFormat(locale).format(v)}</Mono>;
  const low = min ?? max;
  const high = max ?? min;
  if (low === null || high === null) return null;
  if (low === high) return <>{rich(t, "pages.ship.days", { n: n(low) }, low)}</>;
  return <>{rich(t, "pages.ship.range", { from: n(low), to: n(high) })}</>;
}

/** One service to one zone: "Free from $100.00 · $7.00", "$18.00", or "Not offered". */
function OfferCell({ offer }: { offer: ShippingOffer | undefined }) {
  const { t, locale } = useI18n();
  const currency = useShop((s) => s.config.currency);
  if (offer === undefined) return <span className="nl-muted">{t("pages.ship.notOffered")}</span>;
  const price = <Mono>{money(offer.price, currency, locale)}</Mono>;
  if (offer.freeFrom === null) return price;
  return (
    <>
      {rich(t, "pages.ship.freeFrom", { amount: <Mono>{money(offer.freeFrom, currency, locale)}</Mono> })}
      {" · "}
      {price}
    </>
  );
}

function ShippingTable({ base }: { base: ShopBase }) {
  const { t } = useI18n();
  const services = [...base.services].sort((a, b) => a.position - b.position);
  const offerOf = (serviceId: unknown, zoneId: unknown) => base.offers.find((o) => String(o.serviceId) === String(serviceId) && String(o.zoneId) === String(zoneId));
  return (
    <div className="nl-table-wrap">
      <table className="nl-table nl-ship-table">
        <thead>
          <tr>
            <th scope="col">{t("pages.ship.service")}</th>
            <th scope="col">{t("pages.ship.after")}</th>
            {base.zones.map((z) => (
              <th key={String(z.id)} scope="col" className="nl-end">
                {z.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={String(s.id)}>
              <th scope="row">{s.label}</th>
              <td className="nl-muted">
                <Days min={s.transitMin} max={s.transitMax} />
              </td>
              {base.zones.map((z) => (
                <td key={String(z.id)} className="nl-end">
                  <OfferCell offer={offerOf(s.id, z.id)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="nl-prose">{children}</p>;
}

export function HelpShippingScreen() {
  const { t, locale } = useI18n();
  const base = useShop((s) => s.base);
  const currency = useShop((s) => s.config.currency);
  if (base === null) return <HelpFrame view="helpShipping">{null}</HelpFrame>;
  const day = today();
  const closures = base.closures.filter((c) => day === null || c.to >= day).sort((a, b) => a.from.localeCompare(b.from));
  const taxed = base.regions.filter((r) => Number(r.taxRate) > 0).sort((a, b) => a.name.localeCompare(b.name, locale));
  const free = base.offers.filter((o) => o.freeFrom !== null);
  const { returnDays, refundShippingFaulty } = base.settings;
  const serviceOf = (o: ShippingOffer) => base.services.find((s) => String(s.id) === String(o.serviceId))?.label ?? o.serviceLabel;
  const zoneOf = (o: ShippingOffer) => base.zones.find((z) => String(z.id) === String(o.zoneId))?.label ?? "";
  return (
    <HelpFrame view="helpShipping">
      <ShippingTable base={base} />
      {free.map((o) => (
        <P key={String(o.id)}>{rich(t, "pages.ship.free", { service: serviceOf(o), zone: zoneOf(o), amount: <Mono>{money(o.freeFrom, currency, locale)}</Mono> })}</P>
      ))}
      <P>{t("pages.ship.when")}</P>
      {closures.length > 0 && (
        <div className="nl-prose">
          {t("pages.ship.closed")}
          <ul className="nl-closures">
            {closures.map((c) => (
              <li key={String(c.id)}>
                {c.reason !== null && c.reason !== "" && <>{c.reason} · </>}
                <Mono>{c.from === c.to ? dayShort(c.from, locale) : dayRange(c.from, c.to, locale)}</Mono>
              </li>
            ))}
          </ul>
        </div>
      )}
      <P>{t("pages.ship.where")}</P>
      <P>{t("pages.ship.tax")}</P>
      <P>
        {taxed.length === 0
          ? t("pages.ship.taxNone")
          : taxed.map((r) => (
              <Fragment key={String(r.id)}>
                {r.name} <Mono>{percent(r.taxRate, locale)}</Mono>
                {" · "}
              </Fragment>
            ))}
        {taxed.length > 0 && rich(t, "pages.ship.taxOther", { rate: <Mono>{percent(0, locale)}</Mono> })}
      </P>
      <h2 className="nl-h4 nl-help-h2">{t("pages.ret.title")}</h2>
      {returnDays !== null && <P>{rich(t, "pages.ret.days", { n: <Mono>{new Intl.NumberFormat(locale).format(returnDays)}</Mono> }, returnDays)}</P>}
      <P>{t(refundShippingFaulty ? "pages.ret.refund" : "pages.ret.refundNoShip")}</P>
      <P>{t("pages.ret.look")}</P>
    </HelpFrame>
  );
}

// ── size guides ───────────────────────────────────────────────────────────

export function HelpSizesScreen() {
  const { t } = useI18n();
  const guides = useShop((s) => s.base?.sizeGuides ?? NONE);
  return (
    <HelpFrame view="helpSizes">
      {guides.length === 0 && <P>{t("pages.sizes.none")}</P>}
      {guides.map((g) => (
        <section key={String(g.id)} className="nl-guide" aria-labelledby={`guide-${String(g.id)}`}>
          <h2 id={`guide-${String(g.id)}`} className="nl-h4">
            {g.name}
          </h2>
          <div className="nl-table-wrap">
            <table className="nl-table">
              <thead>
                <tr>
                  {g.columns.map((c, i) => (
                    <th key={i} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, i) =>
                      i === 0 ? (
                        <th key={i} scope="row">
                          {cell}
                        </th>
                      ) : (
                        <td key={i}>
                          <Mono>{cell}</Mono>
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {g.note !== null && g.note !== "" && <p className="nl-small nl-subtle nl-guide-note">{g.note}</p>}
        </section>
      ))}
    </HelpFrame>
  );
}

// ── contact us ────────────────────────────────────────────────────────────

/** The `enquiries` table's topics, in the comp's order. */
const TOPICS: [string, MessageKey][] = [
  ["order", "pages.contact.order"],
  ["returns", "pages.contact.returns"],
  ["product", "pages.contact.product"],
  ["other", "pages.contact.other"],
];
/** The `message` column's length; the order number's, as the shop numbers them. */
const MESSAGE_MAX = 1000;
const ORDER_MAX = 16;

interface ContactErrors {
  topic?: string;
  message?: string;
  name?: string;
  email?: string;
  form?: string;
}

/** Under the form: where the shop is and its e-mail, as its settings give them. */
function ShopLine() {
  const name = useShopName();
  const { address, email } = useShopAddress();
  return (
    <p className="nl-small nl-muted nl-shop-line">
      {[name, address].filter(Boolean).join(" · ")}
      {email !== null && (
        <>
          {" · "}
          <a href={`mailto:${email}`} className="nl-pages-mail">
            {email}
          </a>
        </>
      )}
    </p>
  );
}

export function HelpContactScreen() {
  const { t } = useI18n();
  const customer = useShop((s) => s.customer);
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState("");
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [errors, setErrors] = useState<ContactErrors>({});
  const [step, setStep] = useState<"form" | "busy" | "sent">("form");
  const key = useRef<string | null>(null);
  const focusNext = useRef<string | null>(null);

  useEffect(() => {
    if (focusNext.current === null) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });

  /** A change is a new attempt: the next send gets a new retry key. */
  const edit = (field: keyof ContactErrors, apply: () => void) => {
    apply();
    key.current = null;
    if (errors[field] !== undefined || errors.form !== undefined) setErrors({ ...errors, [field]: undefined, form: undefined });
  };

  const submit = async () => {
    const found: ContactErrors = {};
    if (topic === "") found.topic = t("pages.contact.needTopic");
    if (message.trim() === "") found.message = t("pages.contact.needMessage");
    if (name.trim() === "") found.name = t("pages.contact.needName");
    if (!looksLikeEmail(email)) found.email = t("pages.emailBad");
    setErrors(found);
    const first = (["topic", "message", "name", "email"] as const).find((k) => found[k] !== undefined);
    if (first !== undefined) {
      focusNext.current = first === "topic" ? "ct-topic" : first === "message" ? "ct-msg" : `ct-${first}`;
      return;
    }
    const port = useShop.getState().port;
    if (port === null) return;
    key.current ??= newClientKey();
    setStep("busy");
    try {
      await port.enquiry(
        { name: name.trim(), email: email.trim(), topic, message: message.trim(), ...(order.trim() === "" ? {} : { order_number: order.trim().toUpperCase() }), language: documentLanguage() },
        key.current,
      );
      key.current = null;
      setStep("sent");
      announce(t("pages.contact.sent"));
    } catch (error) {
      setStep("form");
      if (refusedColumn(error, "email")) {
        setErrors({ email: t("pages.emailBad") });
        focusNext.current = "ct-email";
      } else if (refusedColumn(error, "message")) {
        setErrors({ message: t("pages.contact.badMessage") });
        focusNext.current = "ct-msg";
      } else {
        const words = refusalWords(t, error);
        setErrors({ form: words });
        announce(words);
      }
    }
  };

  const tied = (id: string, error: string | undefined) => ({ "aria-invalid": error === undefined ? undefined : true, "aria-describedby": error === undefined ? undefined : `${id}-err` });
  return (
    <HelpFrame view="helpContact">
      {step === "sent" ? (
        <div className="nl-done">
          <CircleCheck size={18} aria-hidden="true" />
          <span>{t("pages.contact.sent")}</span>
        </div>
      ) : (
        <form
          noValidate
          className="nl-panel nl-pages-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="nl-field">
            <label htmlFor="ct-topic" className="nl-label">
              {t("pages.contact.topic")}
            </label>
            <select id="ct-topic" className="nl-select nl-pages-select" value={topic} onChange={(e) => edit("topic", () => setTopic(e.target.value))} {...tied("ct-topic", errors.topic)}>
              <option value="">{t("pages.contact.choose")}</option>
              {TOPICS.map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
            {errors.topic !== undefined && <FieldError id="ct-topic-err">{errors.topic}</FieldError>}
          </div>
          <div className="nl-field">
            <label htmlFor="ct-msg" className="nl-label">
              {t("pages.contact.message")}
            </label>
            <textarea id="ct-msg" rows={4} maxLength={MESSAGE_MAX} className="nl-textarea" value={message} onChange={(e) => edit("message", () => setMessage(e.target.value))} {...tied("ct-msg", errors.message)} />
            {errors.message !== undefined && <FieldError id="ct-msg-err">{errors.message}</FieldError>}
          </div>
          <Field id="ct-order" label={t("pages.contact.orderNumber")} autoComplete="off" spellCheck={false} maxLength={ORDER_MAX} className="nl-field--mono" value={order} onChange={(e) => edit("form", () => setOrder(e.target.value))} />
          <Field id="ct-name" label={t("pages.contact.name")} autoComplete="name" maxLength={80} value={name} error={errors.name ?? null} onChange={(e) => edit("name", () => setName(e.target.value))} />
          <Field id="ct-email" type="email" label={t("pages.contact.email")} autoComplete="email" maxLength={254} value={email} error={errors.email ?? null} onChange={(e) => edit("email", () => setEmail(e.target.value))} />
          <button type="submit" className="nl-btn nl-btn--accent nl-btn--lg nl-pages-submit" disabled={step === "busy"}>
            {step === "busy" && <Spinner />}
            {t(step === "busy" ? "pages.busy" : "pages.contact.send")}
          </button>
          {errors.form !== undefined && <FieldError id="ct-err">{errors.form}</FieldError>}
        </form>
      )}
      <ShopLine />
    </HelpFrame>
  );
}

// ── the shop's own texts ──────────────────────────────────────────────────

/** About, Privacy and Terms: the shop's own words, a blank line between paragraphs. */
function TextPage({ view, text }: { view: ShopView; text: string | null }) {
  const { t } = useI18n();
  const paragraphs = (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  return (
    <HelpFrame view={view}>
      {paragraphs.length === 0 ? <P>{t("pages.text.empty")}</P> : paragraphs.map((p, i) => <p key={i} className="nl-prose nl-prose--text">{p}</p>)}
      <ArrowLink to={{ view: "home" }}>{t("pages.back")}</ArrowLink>
    </HelpFrame>
  );
}

export function AboutScreen() {
  return <TextPage view="about" text={useShop((s) => s.base?.settings.about ?? null)} />;
}
export function PrivacyScreen() {
  return <TextPage view="privacy" text={useShop((s) => s.base?.settings.privacy ?? null)} />;
}
export function TermsScreen() {
  return <TextPage view="terms" text={useShop((s) => s.base?.settings.terms ?? null)} />;
}
