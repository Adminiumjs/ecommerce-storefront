/**
 * The owner's return label, on an approved return (plan 79, D12).
 *
 * It comes only from the real carrier add-on. DHL's demo also fills
 * `record.actions`, and an approved return must not grow a demo label: the
 * customer otherwise posts it with any carrier (ADD-5). Adminium itself checks
 * again that this is the owner and that the return is approved.
 */
import type { RecordActionsPayload } from "../add-ons/payloads.ts";
import { shopClock, useRegistry } from "./dispatch.tsx";
import { useEnv } from "./env.tsx";
import type { Row } from "./wire.ts";

/** The add-on that sells real return labels. */
export const RETURN_LABEL_ADD_ON = "shipping-shippo";

export function returnLabelPayload(ret: Row, order: Row, now: number, zone: string): RecordActionsPayload & { order: { table: string; id: string } } {
  return { entity: "return", recordId: String(ret.id), record: ret, now: shopClock(now, zone), order: { table: "orders", id: String(order.id) } };
}

export function ReturnLabelFill({ ret, order }: { ret: Row; order: Row }) {
  const { door } = useEnv();
  const facts = door.facts();
  const on = facts.addOns.includes(RETURN_LABEL_ADD_ON);
  const registry = useRegistry(on);
  if (!on || registry === null) return null;
  const fills = registry.fillsFor("record.actions", new Set(facts.addOns), RETURN_LABEL_ADD_ON);
  if (fills.length === 0) return null;
  const payload = returnLabelPayload(ret, order, door.now(), facts.zone);
  const settings = facts.addOnSettings[RETURN_LABEL_ADD_ON] ?? {};
  return (
    <div className="dk-fill" data-add-on-slot="record.actions">
      {fills.map((entry) => (
        <div key={entry.addOn}>{entry.fill.render({ ...payload, settings })}</div>
      ))}
    </div>
  );
}
