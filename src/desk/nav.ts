/** The desk's sections, as Adminium lists them. */
import type { MessageKey } from "../i18n/messages/index.ts";
import type { SurfaceNavEntry } from "../surface-types.ts";

export type DeskNavEntry = SurfaceNavEntry<string> & { labelKey: MessageKey; icon: string };

export const DESK_NAV = [{ id: "today", path: "", view: "today", side: "staff", icon: "layout-grid", labelKey: "nav.desk" }] as const satisfies readonly DeskNavEntry[];
