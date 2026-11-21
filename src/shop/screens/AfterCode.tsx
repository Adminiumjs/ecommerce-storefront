/**
 * The e-mailed code, one component for every place that asks for it (N1b-F12):
 * the sign-in page, its sheet over the checkout, Find your order (with the
 * order number kept to land on), and the fresh proof "Delete my details"
 * asks for. The address first ("Send me a code"), then six boxes for the
 * code: digits only, filled at once by a paste or the phone's one-time-code
 * suggestion, left to right in every language. "Send a new code in 0:30",
 * "Wrong code" and "That code has run out" are said the same way everywhere.
 */
import { CircleAlert } from "lucide-react";
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

import { useI18n, type MessageKey } from "../../i18n/index.tsx";
import { backToEmail, checkCode, flowErrors, resendCode, sendCode, typeFlow, useAfter, type CodeKey } from "../after.ts";
import { FieldError, ShopLink } from "../parts.tsx";
import { announce } from "../store.ts";
import { Mono, rich } from "../words.tsx";

const focusSoon = (id: string) => setTimeout(() => document.getElementById(id)?.focus(), 0);

/** The seconds left before another code may be asked for, counted down from each code sent. */
function useResendWait(sends: number, canResend: boolean): number {
  const [wait, setWait] = useState(30);
  useEffect(() => {
    setWait(30);
    const timer = setInterval(() => setWait((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [sends]);
  return canResend ? 0 : Math.max(1, wait);
}

const CODE_ERRORS: Record<string, MessageKey> = {
  short: "after.code.short",
  wrong: "after.code.wrong",
  spent: "after.code.spent",
  locked: "after.code.locked",
  unreachable: "after.err.unreachable",
};

/** The address step's words, by place. */
const WORDS: Record<CodeKey, { sub: MessageKey; send: MessageKey; open: MessageKey }> = {
  signIn: { sub: "after.signIn.sub", send: "after.sendCode", open: "after.signIn.button" },
  sheet: { sub: "after.signIn.sub", send: "after.sendCode", open: "after.signIn.button" },
  find: { sub: "after.find.sub", send: "after.sendCode", open: "after.find.open" },
  confirm: { sub: "after.delete.confirm", send: "after.sendCode", open: "after.delete.yes" },
};

export function CodeFlow({ which, onDone }: { which: CodeKey; onDone?: () => void }) {
  const step = useAfter((s) => s.flows[which].step);
  return step === "code" ? <CodeStep which={which} onDone={onDone} /> : <EmailStep which={which} />;
}

function EmailStep({ which }: { which: CodeKey }) {
  const { t } = useI18n();
  const flow = useAfter((s) => s.flows[which]);
  const errors = flow.tried ? flowErrors(which, flow) : {};
  const id = `nl-code-${which}`;
  const find = which === "find";
  const numberErr = errors.number === undefined ? null : t("after.find.err.number");
  const emailErr = errors.email === undefined ? null : errors.email === "shape" ? t("after.err.emailShape") : t(find ? "after.find.err.email" : "after.err.emailEmpty");
  const whole: MessageKey | null = flow.err === "mismatch" ? "after.find.mismatch" : flow.err === "noMail" ? "after.err.noMail" : flow.err === "unreachable" ? "after.err.unreachable" : null;

  const send = async () => {
    const done = await sendCode(which);
    if (done === "code") {
      announce(find ? t("after.find.sent") : t("after.sentTo", { email: useAfter.getState().flows[which].email }));
      focusSoon(`${id}-box-0`);
    } else if (done === "fix") {
      const e = flowErrors(which, useAfter.getState().flows[which]);
      focusSoon(e.number !== undefined ? `${id}-number` : `${id}-email`);
    }
  };
  const describe = (own: string | null, field: string) => [own === null ? null : `${id}-${field}-err`, whole === null ? null : `${id}-err`].filter(Boolean).join(" ") || undefined;
  return (
    <form
      className="nl-code-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <p className="nl-code-sub">{t(WORDS[which].sub)}</p>
      {find && (
        <div className="nl-field">
          <label htmlFor={`${id}-number`} className="nl-label">
            {t("after.find.number")}
          </label>
          <input
            id={`${id}-number`}
            className="nl-input nl-mono nl-mono-input"
            value={flow.number}
            onChange={(e) => typeFlow(which, { number: e.target.value })}
            autoComplete="off"
            aria-required="true"
            aria-invalid={numberErr !== null || flow.err === "mismatch" ? true : undefined}
            aria-describedby={describe(numberErr, "number")}
          />
          {numberErr !== null && <FieldError id={`${id}-number-err`}>{numberErr}</FieldError>}
        </div>
      )}
      {which !== "confirm" && (
        <div className="nl-field">
          <label htmlFor={`${id}-email`} className="nl-label">
            {t("after.email")}
          </label>
          <input
            id={`${id}-email`}
            type="email"
            className="nl-input"
            value={flow.email}
            onChange={(e) => typeFlow(which, { email: e.target.value })}
            autoComplete="email"
            aria-required="true"
            aria-invalid={emailErr !== null || flow.err === "mismatch" ? true : undefined}
            aria-describedby={describe(emailErr, "email")}
          />
          {emailErr !== null && <FieldError id={`${id}-email-err`}>{emailErr}</FieldError>}
        </div>
      )}
      {whole !== null && (
        <div id={`${id}-err`} role="alert" className="nl-danger-line">
          <CircleAlert size={14} aria-hidden="true" />
          {t(whole)}
        </div>
      )}
      <button type="submit" className="nl-btn nl-btn--accent nl-btn--lg nl-btn--block" aria-busy={flow.busy || undefined}>
        {flow.busy ? t("after.sending") : t(WORDS[which].send)}
      </button>
      {find && (
        <ShopLink to={{ view: "signIn" }} className="nl-code-alt">
          {t("after.find.orSignIn")}
        </ShopLink>
      )}
      {which === "signIn" && (
        <ShopLink to={{ view: "find" }} className="nl-code-alt">
          {t("after.signIn.find")}
        </ShopLink>
      )}
    </form>
  );
}

function CodeStep({ which, onDone }: { which: CodeKey; onDone?: () => void }) {
  const { t, locale } = useI18n();
  const flow = useAfter((s) => s.flows[which]);
  const waitFor = useResendWait(flow.sends, flow.canResend);
  const id = `nl-code-${which}`;
  const first = useRef(false);
  useEffect(() => {
    if (first.current) return;
    first.current = true;
    document.getElementById(`${id}-box-0`)?.focus();
  }, [id]);

  const digits = flow.digits;
  const setDigits = (next: string, focusAt?: number) => {
    typeFlow(which, { digits: next });
    if (focusAt !== undefined) focusSoon(`${id}-box-${Math.max(0, Math.min(5, focusAt))}`);
  };
  const check = async () => {
    const done = await checkCode(which);
    const after = useAfter.getState().flows[which];
    if (done === "fix" && after.codeErr !== null) {
      announce(t(CODE_ERRORS[after.codeErr] ?? "after.code.wrong"));
      focusSoon(`${id}-box-${Math.min(5, after.digits.length)}`);
    } else if (done === "fix" && after.err === "mismatch") {
      announce(t("after.find.mismatch"));
      focusSoon(`${id}-number`);
    } else if (done === "done") {
      if (which !== "find" && which !== "confirm") announce(t("after.signIn.done"));
      onDone?.();
    }
  };
  const resend = async () => {
    if (await resendCode(which)) {
      announce(which === "find" ? t("after.find.sent") : t("after.newCodeSent"));
      focusSoon(`${id}-box-0`);
    }
  };
  const err = flow.codeErr === null ? null : t(CODE_ERRORS[flow.codeErr] ?? "after.code.wrong");
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pasted.length < 2) return;
    e.preventDefault();
    setDigits(pasted, pasted.length);
  };
  const onKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && (digits[i] ?? "") === "" && i > 0) {
      e.preventDefault();
      setDigits(digits.slice(0, i - 1), i - 1);
    } else if (e.key === "ArrowLeft" && i > 0) focusSoon(`${id}-box-${i - 1}`);
    else if (e.key === "ArrowRight" && i < 5) focusSoon(`${id}-box-${i + 1}`);
  };
  const seconds = `${new Intl.NumberFormat(locale).format(0)}:${new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 }).format(waitFor)}`;
  return (
    <form
      className="nl-code-form"
      onSubmit={(e) => {
        e.preventDefault();
        void check();
      }}
    >
      <p className="nl-code-sub" role="status">
        {which === "find" ? t("after.find.sent") : which === "confirm" ? t("after.delete.confirm") : rich(t, "after.sentTo", { email: <span className="nl-code-email">{flow.email}</span> })}
      </p>
      <fieldset className="nl-fieldset">
        <legend className="nl-legend">{t("after.enterCode")}</legend>
        <div className="nl-code-boxes" dir="ltr">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <input
              key={i}
              id={`${id}-box-${i}`}
              className="nl-input nl-code-box nl-mono"
              value={digits[i] ?? ""}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={i === 0 ? 6 : 1}
              aria-label={t("after.digit", { n: i + 1 })}
              aria-invalid={err !== null ? true : undefined}
              aria-describedby={err === null ? undefined : `${id}-code-err`}
              onPaste={onPaste}
              onKeyDown={onKey(i)}
              onChange={(e) => {
                const typed = e.target.value.replace(/\D/g, "");
                // The phone's suggestion fills the first box with the whole code.
                if (typed.length > 1) {
                  setDigits(typed, typed.length);
                  return;
                }
                const chars = digits.padEnd(6, " ").split("");
                chars[i] = typed === "" ? " " : typed;
                const next = chars.join("").replace(/\s+$/, "").replace(/\s/g, "");
                setDigits(next, typed === "" ? undefined : i + 1);
              }}
            />
          ))}
        </div>
      </fieldset>
      {err !== null && (
        <div id={`${id}-code-err`} className="nl-danger-line">
          <CircleAlert size={14} aria-hidden="true" />
          {err}
        </div>
      )}
      <button type="submit" className="nl-btn nl-btn--accent nl-btn--lg nl-btn--block" aria-busy={flow.busy || undefined}>
        {flow.busy ? t("after.checking") : t(WORDS[which].open)}
      </button>
      <button type="button" className={`nl-code-alt ${waitFor > 0 ? "" : "nl-code-alt--on"}`} disabled={waitFor > 0 || flow.busy} onClick={() => void resend()}>
        {waitFor > 0 ? rich(t, "after.newCodeIn", { time: <Mono>{seconds}</Mono> }) : t("after.newCode")}
      </button>
      {which !== "confirm" && (
        <button type="button" className="nl-code-alt" onClick={() => backToEmail(which)}>
          {t("after.useOther")}
        </button>
      )}
    </form>
  );
}
