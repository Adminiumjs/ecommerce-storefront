/**
 * S9–S14 after the order: Your order, Find your order, Sign in (the page and
 * its sheet over the checkout), Your account, Send something back and the
 * review dialog. The screens themselves are in `After*.tsx`; the sign-in's
 * two places and Find your order are here, all three on the one code
 * component.
 */
import { X } from "lucide-react";
import { useEffect } from "react";

import { useI18n } from "../../i18n/index.tsx";
import { continueSignIn, peekSignIn, restoreSignIn, signInTokenInAddress, useAfter } from "../after.ts";
import { ShopLink, useDialog } from "../parts.tsx";
import { openSignIn, useShop } from "../store.ts";
import { CodeFlow } from "./AfterCode.tsx";

export { AccountScreen } from "./AfterAccount.tsx";
export { OrderScreen } from "./AfterOrder.tsx";
export { OrderReturnScreen } from "./AfterReturn.tsx";

/** S10 Find your order: the e-mail sign-in, with the order number kept to land on that order (LIFE-12). */
export function FindScreen() {
  const { t } = useI18n();
  return (
    <main id="main" className="nl-page nl-after nl-after--narrow">
      <div className="nl-panel nl-code-card">
        <h1 className="nl-h2">{t("after.find.title")}</h1>
        <CodeFlow which="find" />
      </div>
    </main>
  );
}

/** S11 Sign in: an e-mail, then a code; no password. A sign-in link from the e-mail (`#…`) is continued here too. */
export function SignInScreen() {
  const { t } = useI18n();
  const link = useAfter((s) => s.signInLink);
  const port = useShop((s) => s.port);
  const signedIn = useShop((s) => s.customer !== null);
  useEffect(() => {
    if (port === null) return;
    const token = signInTokenInAddress();
    if (token !== null) void peekSignIn(token);
  }, [port]);
  return (
    <main id="main" className="nl-page nl-after nl-after--narrow">
      <div className="nl-panel nl-code-card">
        {link.state === "ready" || link.state === "opening" ? (
          <>
            <h1 className="nl-h2">{link.name === null ? t("after.signIn.title") : t("after.account.hello", { name: link.name })}</h1>
            <p className="nl-code-sub">{t("after.signIn.link.sub")}</p>
            <button type="button" className="nl-btn nl-btn--accent nl-btn--lg nl-btn--block" onClick={() => void continueSignIn()} aria-busy={link.state === "opening" || undefined}>
              {t("after.signIn.link.continue")}
            </button>
          </>
        ) : signedIn ? (
          <>
            <h1 className="nl-h2">{t("after.signIn.title")}</h1>
            <p className="nl-code-sub">{t("after.signIn.done")}</p>
            <ShopLink to={{ view: "account" }} className="nl-btn nl-btn--accent nl-btn--lg nl-btn--block">
              {t("after.account.title")}
            </ShopLink>
          </>
        ) : (
          <>
            <h1 className="nl-h2">{t("after.signIn.title")}</h1>
            {link.state === "used" && (
              <p role="alert" className="nl-danger-line">
                {t("after.signIn.link.used")}
              </p>
            )}
            <CodeFlow which="signIn" />
          </>
        )}
      </div>
    </main>
  );
}

/**
 * The sign-in as a sheet over the screen it was opened from (the checkout's
 * "Sign in for a faster checkout"): the same flow, and the screen stays once
 * signed in, its basket priced again for the customer. Always mounted, so it
 * also shows a customer signed in again after a reload.
 */
export function SignInSheet() {
  const { t } = useI18n();
  const open = useShop((s) => s.signInSheet);
  const loaded = useShop((s) => s.loading === "ok");
  const close = () => openSignIn(false);
  const ref = useDialog(open, close);
  useEffect(() => {
    if (loaded) void restoreSignIn();
  }, [loaded]);
  if (!open) return null;
  return (
    <div className="nl-scrim nl-scrim--center" onClick={close}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="nl-si-sheet-title" className="nl-dialog nl-code-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="nl-dialog-head">
          <h2 id="nl-si-sheet-title" className="nl-dialog-title">
            {t("after.signIn.title")}
          </h2>
          <button type="button" className="nl-icon-btn" aria-label={t("shop.close")} onClick={close}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="nl-dialog-body">
          <CodeFlow which="sheet" />
        </div>
      </div>
    </div>
  );
}
