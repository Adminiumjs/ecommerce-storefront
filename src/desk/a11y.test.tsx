/**
 * @vitest-environment jsdom
 *
 * EVERY SCREEN AND SHEET OF THE DESK UNDER AXE, FOR BOTH ROLES.
 *
 * The desk is mounted whole on the stand-in door, driven into one state, and
 * swept by axe: WCAG 2.0, 2.1 and 2.2 A/AA and axe's best practices. Each
 * screen runs for the owner and the packer (a screen the packer may not open
 * shows its refusal, which is swept too), and the order and Today in Arabic.
 * Two rules are off because jsdom lays nothing out: colour contrast and
 * target size.
 */
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";

import type { Overlay, View } from "./store.ts";
import { FakeDoor } from "./testing/fakeDoor.ts";
import { mount, settle, unmount } from "./testing/mount.tsx";

const AXE: axe.RunOptions = {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
  rules: {
    "color-contrast": { enabled: false },
    "target-size": { enabled: false },
    // The desk is mounted into a page of the test's, not a document of its own.
    "page-has-heading-one": { enabled: false },
    region: { enabled: false },
  },
};

afterEach(unmount);

async function sweep(): Promise<string[]> {
  await settle();
  const result = await axe.run(document.body, AXE);
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
}

const SCREENS: { view: View; more?: Record<string, unknown> }[] = [
  { view: "today" },
  { view: "orders" },
  { view: "order", more: { orderId: 65 } },
  { view: "order", more: { orderId: 70 } },
  { view: "order", more: { orderId: 13 } },
  { view: "packing" },
  { view: "returns" },
  { view: "products" },
  { view: "products", more: { productTab: "low" } },
  { view: "product", more: { productId: 1 } },
  { view: "reviews" },
  { view: "customers" },
  { view: "customer", more: { customerId: 1 } },
  { view: "settings" },
];

const SHEETS: Exclude<Overlay, null>[] = [
  { kind: "ship", orderId: 59 },
  { kind: "cancel", orderId: 65 },
  { kind: "refund", orderId: 65, returnId: null },
  { kind: "refund", orderId: 5, returnId: 2 },
  { kind: "markPaid", orderId: 70 },
  { kind: "decline", returnId: 4 },
  { kind: "receive", returnId: 3 },
  { kind: "hide", reviewId: 1 },
  { kind: "dispatch", orderIds: [59], at: 0 },
];

describe("the desk under axe", () => {
  for (const role of ["owner", "packer"] as const) {
    for (const screen of SCREENS) {
      it(`${role}: ${screen.view} ${JSON.stringify(screen.more ?? {})}`, async () => {
        await mount(new FakeDoor(role, { addOns: ["inventory", "offers", "invoices", "forms", "shipping-dhl"] }), { view: screen.view, ...screen.more });
        expect(await sweep()).toEqual([]);
      });
    }
  }
  for (const sheet of SHEETS) {
    it(`owner: the ${sheet.kind} sheet`, async () => {
      await mount(new FakeDoor("owner", { addOns: ["inventory", "offers", "invoices", "forms", "shipping-dhl"] }), { view: "today", overlay: sheet });
      expect(document.querySelector("[role=dialog], [role=alertdialog]")).not.toBeNull();
      expect(await sweep()).toEqual([]);
    });
  }
  for (const view of ["today", "order"] as const) {
    it(`owner, in Arabic: ${view}`, async () => {
      await mount(new FakeDoor("owner"), { view, orderId: 65 }, "ar-EG");
      expect(await sweep()).toEqual([]);
    });
  }
});
