/**
 * The shop's own settings (the manifest's `settings`, on the app's settings
 * page): the days it ships and the time of day a paid order still ships that
 * day. Adminium reads both when it dates an order's ships-by and its arrival
 * window (`addWorkingDays`); the shop's closures are a table of their own.
 *
 * A week is a comma list of the days, Monday first: Northline ships Monday to
 * Friday. The cut-off is a 24-hour time on the shop's clock: an order paid
 * before two o'clock on a shipping day ships that day, one paid after ships
 * the next.
 */
export const SHIP_DAYS = "ship_days";
export const CUTOFF = "cutoff";

export const SETTINGS = [
  {
    key: SHIP_DAYS,
    type: "string",
    default: "mon,tue,wed,thu,fri",
    label: { key: "mft.ecommerce.setting.shipDays", fallback: "Shipping days" },
    help: { key: "mft.ecommerce.setting.shipDays.help", fallback: "The days the shop packs and ships, as a comma list: mon,tue,wed,thu,fri,sat,sun." },
  },
  {
    key: CUTOFF,
    type: "string",
    default: "14:00",
    label: { key: "mft.ecommerce.setting.cutoff", fallback: "Orders ship the same day if paid before" },
    help: { key: "mft.ecommerce.setting.cutoff.help", fallback: "A time on a 24-hour clock. An order paid after it ships on the next shipping day." },
  },
];
