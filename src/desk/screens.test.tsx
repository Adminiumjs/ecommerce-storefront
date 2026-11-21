/**
 * @vitest-environment jsdom
 *
 * EVERY SCREEN AND SHEET OF THE DESK, FOR THE OWNER AND FOR A PACKER.
 *
 * The whole desk is mounted on a stand-in door (`testing/fakeDoor.ts`) with
 * Northline's figures as Adminium stores them, and driven as a person drives
 * it: what each screen says, the moves it offers each role, and the writes a
 * press makes. The packer's screens carry no money, and offer no refund, no
 * cancel and no "Mark as paid".
 */
import { afterEach, describe, expect, it } from "vitest";

import { FakeDoor } from "./testing/fakeDoor.ts";
import { $, $$, all, button, clickEl, confirm, key, main, mount, press, type, unmount } from "./testing/mount.tsx";
import { ownerData } from "./testing/fixture.ts";

afterEach(unmount);

const tileNum = (key: string) => $(`[data-tile="${key}"] .dk-tile-num`)?.textContent;
const tileSub = (key: string) => $(`[data-tile="${key}"] .dk-tile-sub`)?.textContent;
const dialog = () => $("[role=dialog], [role=alertdialog]");
const field = (id: string) => document.getElementById(id) as HTMLInputElement;
const MONEY = /\$\s?\d/;

describe("the owner's desk", () => {
  it("draws Today: each tile's count is the length of the list it opens, and the orders to ship", async () => {
    await mount(new FakeDoor("owner"));
    expect(tileNum("pack")).toBe("2");
    expect(tileNum("packed")).toBe("1");
    expect(tileSub("packed")).toContain("NL-1059");
    expect(tileNum("waiting")).toBe("2");
    expect(tileSub("waiting")).toContain("cancelled Tue 25 Aug if unpaid");
    expect(tileNum("returns")).toBe("3");
    expect(tileSub("returns")).toBe("1 to decide · 1 to refund · 1 on its way back");
    expect([tileNum("stock"), tileSub("stock")]).toEqual(["1", "2 sold out"]);
    expect([tileNum("reviews"), tileSub("reviews")]).toEqual(["1", "1 waiting"]);
    expect($("[data-tile=packed] .dk-tile-label")?.textContent).toBe("Packed, ready to ship");
    const rows = $$("#ship-today-h ~ * tbody tr, section[aria-labelledby=ship-today-h] tbody tr");
    expect(rows.map((r) => r.querySelector("td")?.textContent)).toEqual(["NL-1061", "NL-1065"]);
    // The tile opens the list it counts.
    await clickEl($("[data-tile=pack]")!);
    expect($("h1")?.textContent).toBe("Ship today");
  });

  it("names DHL's cut-off on the packed tile when DHL is on, and says when the shop has no e-mail", async () => {
    const data = ownerData();
    data.settings!["email"] = null;
    await mount(new FakeDoor("owner", { data, addOns: ["inventory", "shipping-dhl"], addOnSettings: { "shipping-dhl": { collection_cutoff: "15:00" } } }));
    expect($("[data-tile=packed] .dk-tile-label")?.textContent).toBe("Packed · DHL cut-off 15:00");
    expect(main()).toContain("No shop e-mail: staff e-mails are not sent.");
  });

  it("lists the orders with how each was paid, and filters them", async () => {
    await mount(new FakeDoor("owner"), { view: "orders" });
    expect(main()).toContain("9 orders, newest first");
    const row = (n: string) => $$("tbody tr").find((r) => r.textContent?.includes(n))!;
    expect(row("NL-1065").textContent).toContain("$216.25");
    expect(row("NL-1065").textContent).toContain("Paid · Online · Stripe");
    expect(row("NL-1059").textContent).toContain("Online · PayPal");
    expect(row("NL-1066").textContent).toContain("Not paid");
    // An order that never ships by parcel has no ship-by.
    expect(row("NL-1013").querySelectorAll("td")[6]?.textContent).toBe("—");
    expect(row("NL-1058").querySelectorAll("td")[6]?.textContent).toBe("—");
    await type(field("of-paid"), "unpaid");
    expect($$("tbody tr").map((r) => r.querySelector("td")?.textContent)).toEqual(["NL-1070", "NL-1066", "NL-1058"]);
    expect(main()).toContain("3 of 9 orders");
    await press("Clear filters");
    expect($$("tbody tr").length).toBe(9);
  });

  it("shows an order's lines, its stored figures, its payment, and the moves the owner may make", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "order", orderId: 65 });
    const text = main();
    for (const words of ["Cascade 45 Trekking Pack", "Moss · M/L", "NL-CAS45-MOS-ML", "Discount · TRAIL15", "−$32.85", "Shipping · Express", "$18.00", "Tax · WA 6.5%", "$12.10", "$216.25", "Figures as Adminium stored them when the order was paid.", "Paid · Online · Stripe", "marcus.h@example.com", "4791 Spruce Way", "Order confirmed"]) {
      expect(text, words).toContain(words);
    }
    for (const label of ["Packed", "Cancel", "Refund", "Resend the confirmation"]) expect(button(label), label).toBeDefined();
    expect(button("Mark as paid")).toBeUndefined();
    await press("Packed");
    expect(door.ops("moveOrder")).toEqual([["NL-1065", "packed", {}]]);
    expect(all()).toContain("NL-1065 is packed.");
  });

  it("offers no cancel while the customer is paying (R3), and says a never-paid order's figures are as placed", async () => {
    await mount(new FakeDoor("owner"), { view: "order", orderId: 66 });
    expect(button("Cancel")).toBeUndefined();
    expect(button("Refund")).toBeUndefined();
    expect(main()).toContain("Figures as Adminium stored them when the order was placed.");
    expect(main()).toContain("Cancels at 12:01 if unpaid");
  });

  it("says why an unpaid order was cancelled, and a gift card order has nothing to pack", async () => {
    await mount(new FakeDoor("owner"), { view: "order", orderId: 58 });
    expect(main()).toContain("This order was cancelled because it wasn’t paid within 30 minutes. Nothing was taken.");
    await unmount();
    await mount(new FakeDoor("owner"), { view: "order", orderId: 13 });
    expect(main()).toContain("Gift card $100.00 · to Hana Sato");
    expect(main()).toContain("Nothing to pack. The gift card goes by e-mail.");
    expect(button("Cancel")).toBeDefined();
  });

  it("records a bank transfer: Mark as paid writes the payment, then the order is paid", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "order", orderId: 70 });
    expect(main()).toContain("Waiting for a bank transfer");
    await press("Mark as paid");
    expect(dialog()?.textContent).toContain("Mark NL-1070 as paid");
    expect(field("paid-amount").value).toBe("75.00");
    expect(field("paid-day").value).toBe("2026-08-18");
    await type(field("paid-note"), "Ref 4471");
    await press("Record the payment");
    expect(door.ops("recordTransfer")).toEqual([["NL-1070", "75.00", "2026-08-18", "Ref 4471"]]);
    expect(door.ops("moveOrder")).toEqual([["NL-1070", "paid", {}]]);
    expect(dialog()).toBeNull();
  });

  it("cancels a paid order in one restating sheet, with the shop's reason", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "order", orderId: 65 });
    await press("Cancel");
    expect($("[role=alertdialog]")?.textContent).toContain("This cancels NL-1065, refunds $216.25 and puts 1 item back in stock. This can’t be undone.");
    await type(field("cancel-reason"), "stock");
    await press("Cancel the order");
    expect(door.ops("moveOrder")).toEqual([["NL-1065", "cancelled", { cancel_reason: "stock" }]]);
  });

  it("refunds in two steps: the amount and reason, then the restated refund", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "order", orderId: 65 });
    await press("Refund");
    expect(dialog()?.textContent).toContain("Refund · step 1 of 2");
    expect(field("refund-amount").value).toBe("216.25");
    await press("Next");
    expect(dialog()?.textContent).toContain("Write a reason.");
    await type(field("refund-amount"), "300.00");
    await type(field("refund-reason"), "Arrived late");
    await press("Next");
    expect(dialog()?.textContent).toContain("That is more than $216.25.");
    await type(field("refund-amount"), "50.00");
    await press("Next");
    const step2 = $("[role=alertdialog]")!;
    expect(step2.textContent).toContain("Refund $50.00 to Marcus Hale by Online · Stripe for NL-1065. Reason: Arrived late.");
    // Go back keeps the figures.
    await press("Go back");
    expect(field("refund-amount").value).toBe("50.00");
    await press("Next");
    await press("Refund $50.00");
    expect(door.ops("refund")).toEqual([[1, "50.00", "Arrived late", null]]);
  });

  it("closes a sheet on Escape and puts focus back on what opened it", async () => {
    await mount(new FakeDoor("owner"), { view: "order", orderId: 65 });
    const opener = button("Cancel")!;
    opener.focus();
    await clickEl(opener);
    expect(dialog()).not.toBeNull();
    await key(dialog()!, "Escape");
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("packs from one pick list by SKU, says what to count, prints the slips in one job, and ships", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "packing" });
    const picks = $$(".dk-pick");
    expect(picks.map((p) => p.querySelector(".dk-fig")?.textContent)).toEqual(["NL-BSH-SLA-M", "NL-CAS45-MOS-ML"]);
    expect(picks[1]!.textContent).toContain("Count this — Inventory is short");
    expect(picks[1]!.textContent).toContain("2");
    expect(picks[0]!.textContent).not.toContain("Count this");
    expect(picks[0]!.textContent).toContain("Stockroom");
    await press("Print 2 packing slips");
    expect(door.ops("render")).toEqual([
      ["packing-slip", "orders", 61],
      ["packing-slip", "orders", 65],
    ]);
    expect(door.ops("printAll")).toEqual([[["/doc/61/print", "/doc/65/print"]]]);
    await clickEl($("input[aria-label='Packed · NL-1061']")!);
    expect(door.ops("moveOrder")).toEqual([["NL-1061", "packed", {}]]);
    await press("Mark shipped");
    expect(main()).toContain("Enter the carrier.");
    expect(main()).toContain("Enter the tracking number from the label.");
    await type(field("pk-carrier"), "USPS");
    await type(field("pk-track-59"), "9400111202555842761234");
    await press("Mark shipped");
    expect(door.ops("moveOrder").at(-1)).toEqual(["NL-1059", "shipped", { carrier: "USPS", tracking: "9400111202555842761234" }]);
  });

  it("ships one order from its sheet, the carrier and tracking number typed", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "order", orderId: 59 });
    await press("Shipped");
    await press("Mark shipped");
    expect(dialog()?.textContent).toContain("Enter the carrier.");
    await type(field("ship-carrier"), "UPS");
    await type(field("ship-track"), "1Z999");
    await press("Mark shipped");
    expect(door.ops("moveOrder")).toEqual([["NL-1059", "shipped", { carrier: "UPS", tracking: "1Z999" }]]);
  });

  it("works the returns queue: approve, decline with a reason, receive with restock, refund in two steps", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "returns" });
    expect(main()).toContain("RT-1004");
    expect(main()).toContain("Refund owed");
    await press("Decline");
    await confirm("Decline the return");
    expect(dialog()?.textContent).toContain("Write a reason the customer will read.");
    await type(field("decline-why"), "It was worn.");
    await confirm("Decline the return");
    expect(door.ops("saveReturnLine")[0]![0]).toBe(41);
    expect(door.ops("moveReturn").at(-1)).toEqual(["RT-1004", "declined", { staff_reason: "It was worn." }]);
    // A faulty piece: "Put back in stock" starts unticked.
    await press("Mark received");
    const tick = dialog()!.querySelector<HTMLInputElement>("input[type=checkbox]")!;
    expect(tick.checked).toBe(false);
    expect(dialog()?.textContent).toContain("Unticked because it’s faulty.");
    await confirm("Mark received");
    expect(door.ops("moveReturn").at(-1)).toEqual(["RT-1003", "received", {}]);
    await press("Refund $202.70");
    expect(field("refund-reason").value).toBe("Not what I expected");
    await confirm("Next");
    expect($("[role=alertdialog]")?.textContent).toContain("Refund $202.70 to Zoe Carter by Online · PayPal for RT-1002 (NL-1005). Reason: Not what I expected.");
    await confirm("Refund $202.70");
    expect(door.ops("refund")).toEqual([[5, "202.70", "Not what I expected", 2]]);
  });

  it("approves a return the customer asked for", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "returns" });
    await press("Approve");
    expect(door.ops("moveReturn")).toEqual([["RT-1004", "approved", {}]]);
    expect(all()).toContain("RT-1004 approved.");
  });

  it("lists the products with their stock, and the variants that are low or sold out", async () => {
    await mount(new FakeDoor("owner"), { view: "products" });
    const basalt = $$("tbody tr").find((r) => r.textContent?.includes("Basalt"))!;
    expect(basalt.textContent).toContain("$189.00");
    expect(basalt.textContent).toContain("1 sold out");
    expect(basalt.textContent).toContain("1 low");
    await press("Sold out2");
    expect($$("tbody tr").map((r) => r.querySelector("td")?.textContent)).toEqual(["NL-BSH-SLA-XL", "NL-CAS45-MOS-ML"]);
  });

  it("draws the variants grid with a hole to make, and makes it switched off", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "product", productId: 1 });
    const rows = $$("tbody tr");
    expect(rows.length).toBe(10);
    const hole = rows.find((r) => r.textContent?.includes("Not made"))!;
    expect(hole.textContent).toContain("Ember");
    expect(hole.textContent).toContain("XS");
    const xl = rows.find((r) => r.textContent?.includes("NL-BSH-SLA-XL"))!;
    expect(xl.textContent).toContain("+$10.00");
    expect(xl.textContent).toContain("Sold out");
    await press("Make Ember / XS");
    expect(door.ops("createVariant")).toEqual([[{ product_id: 1, colour_id: 12, size_id: 20, sku: "NL-BSH-EMB-XS", active: false, weight_g: 380 }]]);
  });

  it("shows a Sold out switch per variant when Inventory is off, and a variant nothing counts", async () => {
    const data = ownerData();
    data.stock = null;
    await mount(new FakeDoor("owner", { data, addOns: [] }), { view: "product", productId: 1 });
    expect($$("button[role=switch][aria-label$='sold out']").length).toBe(9);
    await unmount();
    const counted = ownerData();
    counted.stock!.links = counted.stock!.links.filter((l) => l["source_row"] !== 100);
    await mount(new FakeDoor("owner", { data: counted }), { view: "product", productId: 1 });
    expect(main()).toContain("Not counted — link it in Inventory");
  });

  it("saves a product's details, and refuses a price that is not one", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "product", productId: 1 });
    await type(field("pd-price"), "19x");
    await press("Save");
    expect(main()).toContain("Enter a price, like 189.00.");
    await type(field("pd-price"), "195.00");
    await press("Save");
    expect((door.ops("saveProduct")[0]![1] as Record<string, unknown>)["price"]).toBe("195.00");
  });

  it("moderates reviews: publish, hide with a reason, reply, and Escape returns to Reply", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "reviews" });
    expect(main()).toContain("Exactly right");
    expect(main()).toContain("Average 3 from 1 published review");
    await press("Publish");
    expect(door.ops("saveReview")).toEqual([[1, { state: "published" }]]);
    await press("Hide");
    await press("Hide the review");
    expect(dialog()?.textContent).toContain("Choose a reason.");
    await clickEl(dialog()!.querySelector<HTMLInputElement>("input[value=looks-fake]")!);
    await press("Hide the review");
    expect(door.ops("saveReview").at(-1)).toEqual([1, { state: "hidden", hide_reason: "looks-fake" }]);
    const reply = button("Reply")!;
    await clickEl(reply);
    const box = $("textarea[id^=rv-reply]")!;
    await key(box, "Escape");
    expect($("textarea[id^=rv-reply]")).toBeNull();
    expect(document.activeElement).toBe(button("Reply"));
  });

  it("shows the customers, and one with their news consent read-only", async () => {
    await mount(new FakeDoor("owner"), { view: "customers" });
    expect(main()).toContain("Priya Raman");
    await clickEl($$("tbody a")[0]!);
    expect(main()).toContain("News: on");
    expect(main()).toContain("Agreed to news on");
    expect(main()).toContain("Only the customer can change this");
    expect(main()).toContain("NL-1066");
  });

  it("keeps the settings: the shop e-mail required, the review link https, payments shown and never switched", async () => {
    const door = new FakeDoor("owner");
    await mount(door, { view: "settings" });
    expect(main()).toContain("$7.00 · free from $100.00");
    expect(main()).toContain("Labor Day");
    expect(main()).toContain("Orders paid before 14:00 on a shipping day ship that day.");
    expect(main()).toContain("Turn bank transfer off once you take payments online.");
    expect($$("a[href='/p/ecommerce-shipping-services']").length).toBe(1);
    await type(field("set-email"), "");
    await type(field("set-review_link"), "http://g.page/northline");
    await press("Save");
    expect(main()).toContain("Enter the shop’s e-mail: staff e-mails go there.");
    expect(main()).toContain("Use an address that starts with https://");
    await type(field("set-email"), "hello@northline.example");
    await type(field("set-review_link"), "https://g.page/northline");
    await press("Save");
    expect(door.ops("saveSettings")).toEqual([[{ email: "hello@northline.example", review_link: "https://g.page/northline" }]]);
  });

  it("searches orders, customers and SKUs from the top bar", async () => {
    await mount(new FakeDoor("owner"));
    await type(field("desk-search"), "hale");
    expect($("#desk-search-res")?.textContent).toContain("NL-1065");
    await clickEl($$("#desk-search-res a")[0]!);
    expect($("h1")?.textContent).toBe("NL-1065");
  });
});

describe("the packer's desk", () => {
  it("shows the packer's sections only, and Today with no money", async () => {
    await mount(new FakeDoor("packer"));
    const nav = $$(".dk-nav-link").map((a) => a.getAttribute("title"));
    expect(nav).toEqual(["Today", "Orders", "Packing", "Returns", "Products"]);
    expect(tileNum("returns")).toBe("2");
    expect(tileSub("returns")).toBe("1 on its way back · 1 received");
    expect($("[data-tile=reviews]")).toBeNull();
    expect(all()).not.toMatch(MONEY);
    expect(all()).toContain("Casey Moll");
  });

  it("lists the orders with no total and no pay chip", async () => {
    await mount(new FakeDoor("packer"), { view: "orders" });
    expect($$("th").map((th) => th.textContent)).not.toContain("Total");
    expect($("#of-paid")).toBeNull();
    expect(all()).not.toMatch(MONEY);
  });

  it("offers the packer Packed, never Refund, Cancel, Mark as paid or Resend, and no figures", async () => {
    await mount(new FakeDoor("packer"), { view: "order", orderId: 65 });
    expect(button("Packed")).toBeDefined();
    for (const label of ["Refund", "Cancel", "Mark as paid", "Resend the confirmation"]) expect(button(label), label).toBeUndefined();
    expect(main()).not.toContain("Payment");
    expect(main()).not.toContain("marcus.h@example.com");
    expect(all()).not.toMatch(MONEY);
    await unmount();
    await mount(new FakeDoor("packer"), { view: "order", orderId: 70 });
    expect(button("Mark as paid")).toBeUndefined();
    expect(button("Cancel")).toBeUndefined();
  });

  it("packs and ships with no money on the packing screen", async () => {
    const door = new FakeDoor("packer");
    await mount(door, { view: "packing" });
    expect(all()).not.toMatch(MONEY);
    await clickEl($("input[aria-label='Packed · NL-1065']")!);
    expect(door.ops("moveOrder")).toEqual([["NL-1065", "packed", {}]]);
  });

  it("receives a return, and leaves deciding and refunding to the owner", async () => {
    const door = new FakeDoor("packer");
    await mount(door, { view: "returns" });
    expect(button("Approve")).toBeUndefined();
    expect(button("Decline")).toBeUndefined();
    expect($$("button").some((b) => b.textContent?.startsWith("Refund"))).toBe(false);
    expect(main()).toContain("Received. The owner refunds it.");
    expect(all()).not.toMatch(MONEY);
    await press("Mark received");
    await confirm("Mark received");
    expect(door.ops("moveReturn")).toEqual([["RT-1003", "received", {}]]);
  });

  it("reads a product and changes nothing", async () => {
    await mount(new FakeDoor("packer"), { view: "product", productId: 1 });
    expect(button("Save")).toBeUndefined();
    expect(button("Make Ember / XS")).toBeUndefined();
    expect(field("pd-name").readOnly).toBe(true);
    expect($$("button[role=switch]").every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it("refuses the packer the owner's screens by address", async () => {
    for (const view of ["settings", "reviews", "customers"] as const) {
      await mount(new FakeDoor("packer"), { view });
      expect(main(), view).toContain("Only the owner can open this.");
      await unmount();
    }
  });
});

describe("the desk in Arabic", () => {
  it("mirrors the page and keeps figures and numbers whole", async () => {
    await mount(new FakeDoor("owner"), { view: "order", orderId: 65 }, "ar-EG");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    const figs = $$("bdi.dk-fig");
    expect(figs.length).toBeGreaterThan(5);
    expect(figs.every((f) => f.getAttribute("dir") === "ltr")).toBe(true);
    expect(main()).not.toContain("Refund · step");
  });
});
