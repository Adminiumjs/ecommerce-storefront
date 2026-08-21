// Money + misc formatting helpers.

import { money as fmtMoney } from "../i18n/ambient";

/**
 * The one price formatter — every figure a shopper reads goes through here.
 *
 * Was `"$" + n.toLocaleString("en-US", …)`, which hard-coded three separate
 * en-US decisions: the symbol, the grouping comma, and the symbol going in
 * front. Those are properties of the READER, not of the price. The currency is
 * the opposite — it is a property of the transaction, so it stays USD in every
 * locale; only its presentation moves. de-DE renders `1.234,56 $`, fr-FR
 * `1 234,56 $US`, ar-EG `١٬٢٣٤٫٥٦ US$` with the whole line laid out RTL.
 *
 * `Intl` also fixes a bug the old helper had for free: it emitted `$-5.00` for
 * a negative amount, where every locale's own convention (`-$5.00` in en-US)
 * comes out of `style: 'currency'` correctly.
 *
 * The locale comes from `i18n/ambient`, which `<App>` keeps pointed at the
 * provider's formatters, so this stays callable from the store, from `lib/`,
 * and from unit tests — none of which can hold a hook. Before the provider
 * mounts, ambient falls back to en-US, so test output is unchanged.
 */
export function money(n: number, currency = "USD"): string {
  return fmtMoney(Number(n) || 0, currency);
}

/** Stable 32-bit hash of an id — used to pick deterministic sample reviews. */
export function hashId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n;
}
