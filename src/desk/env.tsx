/**
 * What every desk screen reaches through React: the door into Adminium, and
 * the hooks that read the rows and run a write.
 *
 * A write is run the same way everywhere: while it is on, the screen says so;
 * when it is done, the rows are read again (Adminium's figures, never the
 * screen's guess); when it is refused, the refusal is said in a toast in the
 * reader's words, and the rows are read again too, so the screen shows what
 * is true now.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import type { DeskData, DeskDoor } from "./door.ts";
import { toast, useDesk } from "./store.ts";
import { isApiError } from "./wire.ts";
import { useT, type TFunction } from "../i18n/index.tsx";

export interface DeskEnv {
  door: DeskDoor;
  /** Where the desk goes once its person signed out. */
  leave?: () => void;
}

const Ctx = createContext<DeskEnv | null>(null);

export function DeskProvider({ env, children }: { env: DeskEnv; children: ReactNode }) {
  return <Ctx.Provider value={env}>{children}</Ctx.Provider>;
}

export function useEnv(): DeskEnv {
  const env = useContext(Ctx);
  if (env === null) throw new Error("useEnv() outside <DeskProvider>");
  return env;
}

/** The rows last read. The shell renders the screens only once there are some. */
export function useData(): DeskData {
  const data = useDesk((s) => s.data);
  if (data === null) throw new Error("useData() before the first read");
  return data;
}

/** Read every row again, and keep them. */
export async function reload(door: DeskDoor): Promise<void> {
  try {
    const data = await door.load();
    useDesk.setState({ data, failure: null });
  } catch (error) {
    useDesk.setState({ failure: error instanceof Error ? error.message : String(error) });
  }
}

/** A refusal, in the reader's words: by its code, never its message, except as the last resort. */
export function refusalWords(t: TFunction, error: unknown): { text: string; tone: "warn" | "danger" } {
  if (isApiError(error)) {
    const reason = String(error.params["reason"] ?? error.params["code"] ?? "");
    // Offers' recall: the gift card was spent, so the shop cannot take it back.
    if (/spent|used-up|USED_UP|SPENT/i.test(`${reason} ${error.code} ${error.message}`) && /recall|card/i.test(`${reason} ${error.code} ${error.message}`)) return { text: t("desk.err.cardSpent"), tone: "warn" };
    if (error.code === "ROW_CHANGED" || error.code === "WRITE_CONFLICT" || error.code === "STATE_MOVE_REFUSED") return { text: t("desk.err.moved"), tone: "warn" };
    if (error.status === 403) return { text: t("desk.err.notAllowed"), tone: "danger" };
    if (reason === "BALANCE_EXCEEDED" || /cap|exceed/i.test(error.code)) return { text: t("desk.err.tooMuch"), tone: "warn" };
  }
  return { text: t("desk.err.refused", { why: error instanceof Error ? error.message : String(error) }), tone: "danger" };
}

/**
 * A write as a screen runs it: `busy` while it is on, the rows read again
 * after, a refusal said in a toast. The work returns the toast to say when it
 * went (or nothing).
 */
export function useRun(): { busy: boolean; run: (work: (door: DeskDoor, data: DeskData) => Promise<string | null | undefined | void>) => Promise<boolean> } {
  const { door } = useEnv();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (work: (door: DeskDoor, data: DeskData) => Promise<string | null | undefined | void>) => {
      const data = useDesk.getState().data;
      if (data === null) return false;
      setBusy(true);
      try {
        const said = await work(door, data);
        if (typeof said === "string") toast(said, "pos");
        return true;
      } catch (error) {
        const words = refusalWords(t, error);
        toast(words.text, words.tone);
        return false;
      } finally {
        await reload(door);
        setBusy(false);
      }
    },
    [door, t],
  );
  return { busy, run };
}
