/**
 * S17 the newsletter box in the footer, and the page a confirm link lands on.
 *
 * The box asks for an address and a yes: the tick is never ticked for the
 * shopper, and without it nothing is sent (R1). Adminium finds or makes the
 * customer for the address and logs the yes (ACC-10), so the page never asks
 * whether an address is known. With Forms & surveys the shop sends a confirm
 * mail and the box says so; without it the yes counts at once and the box
 * says only "You're on the list" (C13).
 *
 * One retry key per attempt: a second press after a failure reuses it, so a
 * sign-up that reached Adminium but whose answer was lost is not made twice;
 * a new address is a new attempt.
 */
import { newClientKey } from "@adminiumjs/public-client";
import { CircleCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "../../i18n/index.tsx";
import { documentLanguage } from "../door.ts";
import { Field, FieldError, looksLikeEmail, Spinner } from "../parts.tsx";
import { announce, useShop } from "../store.ts";
import { ArrowLink, refusalWords, refusedColumn, useShopName } from "./PagesParts.tsx";

type NewsState = { step: "form" | "busy" } | { step: "done"; confirm: boolean };

export function NewsBox() {
  const { t } = useI18n();
  const shop = useShopName();
  const signedInEmail = useShop((s) => s.customer?.email ?? null);
  const [email, setEmail] = useState("");
  const [tick, setTick] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; tick?: string; form?: string }>({});
  const [state, setState] = useState<NewsState>({ step: "form" });
  const key = useRef<string | null>(null);
  const touched = useRef(false);
  const focusNext = useRef<string | null>(null);

  // A signed-in customer's own address is filled in, until they type another.
  useEffect(() => {
    if (signedInEmail !== null && !touched.current) setEmail(signedInEmail);
  }, [signedInEmail]);

  useEffect(() => {
    if (focusNext.current === null) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });

  const submit = async () => {
    const found: typeof errors = {};
    if (!looksLikeEmail(email)) found.email = t("pages.emailBad");
    if (!tick) found.tick = t("pages.news.needTick");
    setErrors(found);
    if (found.email !== undefined || found.tick !== undefined) {
      focusNext.current = found.email !== undefined ? "nl-news-email" : "nl-news-tick";
      return;
    }
    const port = useShop.getState().port;
    if (port === null) return;
    key.current ??= newClientKey();
    setState({ step: "busy" });
    try {
      await port.newsSignup(email.trim(), documentLanguage(), key.current);
      key.current = null;
      const confirm = port.features().forms;
      setState({ step: "done", confirm });
      announce(t(confirm ? "pages.news.done" : "pages.news.doneNoForms"));
    } catch (error) {
      setState({ step: "form" });
      if (refusedColumn(error, "email")) {
        setErrors({ email: t("pages.emailBad") });
        focusNext.current = "nl-news-email";
        return;
      }
      const words = refusalWords(t, error);
      setErrors({ form: words });
      announce(words);
    }
  };

  const describedBy = ["nl-news-line", errors.tick === undefined ? null : "nl-news-tick-err"].filter(Boolean).join(" ");
  return (
    <section aria-labelledby="nl-news-h" className="nl-news">
      <h2 id="nl-news-h" className="nl-news-title">
        {t("pages.news.title", { shop })}
      </h2>
      <p className="nl-news-sub">{t("pages.news.sub")}</p>
      {state.step === "done" ? (
        <div className="nl-done nl-done--sm">
          <CircleCheck size={17} aria-hidden="true" />
          <span>{t(state.confirm ? "pages.news.done" : "pages.news.doneNoForms")}</span>
        </div>
      ) : (
        <form
          noValidate
          className="nl-news-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field
            id="nl-news-email"
            type="email"
            autoComplete="email"
            label={t("pages.news.email")}
            value={email}
            error={errors.email ?? null}
            maxLength={254}
            onChange={(e) => {
              touched.current = true;
              key.current = null;
              setEmail(e.target.value);
              if (errors.email !== undefined) setErrors({ ...errors, email: undefined });
            }}
          />
          <div className="nl-news-consent">
            <label className="nl-check nl-check--top">
              <input
                id="nl-news-tick"
                type="checkbox"
                checked={tick}
                aria-invalid={errors.tick === undefined ? undefined : true}
                aria-describedby={describedBy}
                onChange={(e) => {
                  setTick(e.target.checked);
                  if (e.target.checked && errors.tick !== undefined) setErrors({ ...errors, tick: undefined });
                }}
              />
              <span>{t("pages.news.tick", { shop })}</span>
            </label>
            <div id="nl-news-line" className="nl-news-line">
              {t("pages.news.line")}
            </div>
            {errors.tick !== undefined && (
              <div className="nl-news-indent">
                <FieldError id="nl-news-tick-err">{errors.tick}</FieldError>
              </div>
            )}
          </div>
          <button type="submit" className="nl-btn nl-btn--accent nl-pages-submit" disabled={state.step === "busy"}>
            {state.step === "busy" && <Spinner />}
            {t("pages.news.submit")}
          </button>
          {errors.form !== undefined && <FieldError id="nl-news-err">{errors.form}</FieldError>}
        </form>
      )}
    </section>
  );
}

/** Where a news confirm link lands: the yes is in, and how to take it back. */
export function NewsThanksScreen() {
  const { t } = useI18n();
  const shop = useShopName();
  return (
    <main id="main" className="nl-page nl-plain nl-fade">
      <div className="nl-done nl-done--icon" aria-hidden="true">
        <CircleCheck size={28} />
      </div>
      <h1 className="nl-h1">{t("pages.thanks.title")}</h1>
      <p className="nl-prose">{t("pages.thanks.body", { shop })}</p>
      <ArrowLink to={{ view: "home" }} className="nl-btn nl-btn--accent">
        {t("pages.back")}
      </ArrowLink>
    </main>
  );
}
