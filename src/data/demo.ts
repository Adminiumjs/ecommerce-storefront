// The demo catalog — ported verbatim from the design comp. A real deployment
// would swap this out behind the DataSource contract (see source.ts) for a
// live backend; the shapes are identical.

import type {
  Category,
  Order,
  PostalAddress,
  Product,
  RatingSeed,
  Review,
} from "./types.ts";

/** The shop's name. A proper noun — never translated, but substituted into
 * messages as `{brand}` so a translator controls where it lands in a sentence. */
export const BRAND = "Northline";

export const FREE_SHIP = 75;
export const PROMO_CODE = "WELCOME10";
export const PROMO_RATE = 0.1;
export const TAX_RATE = 0.085;
export const BUNDLE_OFF = 0.15;
export const SHIP_EXPRESS = 12;
export const SHIP_OVERNIGHT = 28;
export const SHIP_STANDARD = 6;

/**
 * WHERE THE SHOP POSTS FROM.
 *
 * ── AN INVENTED STREET IN A REAL CITY, AND WHY THAT IS THE RIGHT MIX ───────
 *
 * The city and the postcode are real Portland ones because a delivery estimate
 * is arithmetic on a route, and a route between two places that do not exist
 * cannot be sanity-checked by anybody reading the screen. The street is
 * invented and belongs to no real firm — the same rule the review names and the
 * customer names in this file already follow.
 *
 * `US` and not "United States": the postcode is checked AGAINST the country by
 * whatever prices the journey, so this field is machine-read and the rest is
 * label text. See `PostalAddress` in `types.ts`.
 *
 * IT IS SEED DATA, WHICH MEANS IT IS NOT AUTOMATICALLY TRUE OF A REAL SHOP.
 * It reaches screens through `Shop.shipFrom` and never by direct import, for
 * the reason `lib/shop.ts` opens with: a connected storefront that printed
 * NORTHLINE, PORTLAND on somebody else's parcels would look completely correct
 * while being completely wrong. `data/adminiumSource.ts` reads the merchant's
 * own row when the scope exposes one and shows a visible blank when it does
 * not, which is the same trade every other merchant setting here makes.
 */
export const SHIP_FROM: PostalAddress = {
  name: BRAND,
  lines: ["1400 NW Kearney St", "Suite 210"],
  city: "Portland, OR",
  postcode: "97209",
  country: "US",
};

/** Amber used for star glyphs — a brand/demo literal, not a theme token. */

/** Build a verified Unsplash image URL from a photo id. */
const img = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?w=800&q=75&auto=format&fit=crop`;

/** Home lifestyle hero photo. */
export const HERO_IMAGE = img("1472851294608-062f824d29cc");

export const CATS: Category[] = [
  { slug: "gear", name: "Gear", icon: "plug-zap" },
  { slug: "apparel", name: "Apparel", icon: "shirt" },
  { slug: "home", name: "Home", icon: "lamp" },
  { slug: "accessories", name: "Accessories", icon: "shopping-bag" },
];

export const PRODUCTS: Product[] = [
  {
    id: "kb-k2",
    image: img("1587829741301-dc798b83add3"),
    title: "Ergo Keyboard K2",
    price: 129,
    sku: "JKY-KB-K2",
    cat: "gear",
    status: "in",
    icon: "keyboard",
    tint: "#6b7488",
    feat: true,
    blurb: "Split-ergonomic mechanical board with hot-swap switches.",
    desc: "The K2 keeps your wrists neutral with a 6° tented split and a cushioned palm rest. Hot-swappable switches let you retune the typing feel in seconds — no soldering — and it pairs over USB-C or Bluetooth with up to three devices.",
    specs: [
      ["Layout", "75% · split"],
      ["Switches", "Hot-swap tactile"],
      ["Wireless", "USB-C · BT 5.2"],
      ["Battery", "4,000 mAh"],
    ],
    options: [
      {
        key: "sw",
        name: "Switch feel",
        type: "chip",
        values: [
          { id: "tactile", label: "Tactile" },
          { id: "linear", label: "Linear" },
          { id: "clicky", label: "Clicky" },
        ],
      },
    ],
    variants: {
      tactile: { s: "in" },
      linear: { s: "in" },
      clicky: { s: "low", d: 10 },
    },
  },
  {
    id: "stand-al",
    image: img("1527443224154-c4a3942d3acf"),
    title: "Aluminum Laptop Stand",
    price: 59,
    sku: "JKY-ST-AL",
    cat: "gear",
    status: "in",
    icon: "laptop-minimal",
    tint: "#6f8bb0",
    blurb: "Aircraft-aluminum riser that lifts your laptop to eye level.",
    desc: "Machined from a single billet of 6061 aluminum, the stand lifts your screen to a healthier eye level and lets air move freely underneath. Six locking heights and silicone pads keep everything cool and planted.",
    specs: [
      ["Material", "6061 aluminum"],
      ["Heights", "6 levels"],
      ["Fits", 'Up to 16"'],
      ["Weight", "1.0 kg"],
    ],
  },
  {
    id: "deskmat-xl",
    image: img("1593642532744-d377ab507dc8"),
    title: "Desk Mat XL",
    price: 49,
    sku: "JKY-DM-XL",
    cat: "gear",
    status: "low",
    icon: "square",
    tint: "#8a8577",
    feat: true,
    blurb: "Oversized micro-weave mat with a stitched, non-fray edge.",
    desc: "A 900mm micro-weave surface gives your mouse a smooth, consistent glide while the natural-rubber base grips the desk. The edges are heat-sealed and stitched so they never fray or peel.",
    specs: [
      ["Size", "900 × 400 mm"],
      ["Surface", "Micro-weave"],
      ["Base", "Natural rubber"],
      ["Edge", "Stitched"],
    ],
  },
  {
    id: "mouse-m1",
    image: img("1527814050087-3793815479db"),
    title: "Wireless Mouse M1",
    price: 45,
    sku: "JKY-MO-M1",
    cat: "gear",
    status: "in",
    icon: "mouse",
    tint: "#6d7688",
    blurb: "Featherweight 26K-DPI mouse with silent switches.",
    desc: "At just 63 grams, the M1 disappears under your hand while a 26,000-DPI sensor tracks every micro-movement. Silent switches and a 70-hour battery keep it quiet and ready all week.",
    specs: [
      ["Sensor", "26K DPI"],
      ["Buttons", "6 programmable"],
      ["Wireless", "2.4G · BT"],
      ["Battery", "70 hrs"],
    ],
  },
  {
    id: "trail-gtx",
    image: img("1542291026-7eec264c27ff"),
    title: "Trail Runner GTX",
    price: 189,
    sku: "JKY-SH-GTX",
    cat: "apparel",
    status: "low",
    icon: "footprints",
    tint: "#7d9166",
    feat: true,
    blurb: "Waterproof GORE-TEX trail shoe with a grippy lugged sole.",
    desc: "A GORE-TEX bootie seals out water while staying breathable, and the 4mm lugged outsole bites into loose and wet trails. An 8mm drop and responsive foam keep long descents comfortable.",
    specs: [
      ["Upper", "GORE-TEX"],
      ["Drop", "8 mm"],
      ["Weight", "285 g"],
      ["Terrain", "Trail · wet"],
    ],
    options: [
      {
        key: "size",
        name: "US size",
        type: "chip",
        values: [
          { id: "8", label: "8" },
          { id: "9", label: "9" },
          { id: "10", label: "10" },
          { id: "11", label: "11" },
          { id: "12", label: "12" },
        ],
      },
    ],
    variants: {
      "8": { s: "in" },
      "9": { s: "low" },
      "10": { s: "in" },
      "11": { s: "out" },
      "12": { s: "in" },
    },
  },
  {
    id: "hoodie-tf",
    image: img("1556905055-8f358a7a47b2"),
    title: "Tech Fleece Hoodie",
    price: 89,
    sku: "JKY-HD-TF",
    cat: "apparel",
    status: "in",
    icon: "shirt",
    tint: "#b0836a",
    feat: true,
    blurb: "Midweight tech-fleece hoodie that layers without bulk.",
    desc: "Brushed 320g tech-fleece traps warmth without the bulk, so it layers cleanly under a shell. Three zip pockets and a relaxed cut make it as easy on the trail as it is around town.",
    specs: [
      ["Fabric", "Tech fleece 320g"],
      ["Fit", "Relaxed"],
      ["Pockets", "3 zip"],
      ["Care", "Machine wash"],
    ],
    options: [
      {
        key: "color",
        name: "Color",
        type: "swatch",
        values: [
          { id: "charcoal", label: "Charcoal", hex: "#3a3a40" },
          { id: "forest", label: "Forest", hex: "#4a5d4f" },
          { id: "sand", label: "Sand", hex: "#cabfa3" },
        ],
      },
      {
        key: "size",
        name: "Size",
        type: "chip",
        values: [
          { id: "s", label: "S" },
          { id: "m", label: "M" },
          { id: "l", label: "L" },
          { id: "xl", label: "XL" },
        ],
      },
    ],
    variants: {
      "charcoal,s": { s: "in" },
      "charcoal,m": { s: "in" },
      "charcoal,l": { s: "in" },
      "charcoal,xl": { s: "in", d: 6 },
      "forest,s": { s: "in" },
      "forest,m": { s: "in" },
      "forest,l": { s: "low" },
      "forest,xl": { s: "in", d: 6 },
      "sand,s": { s: "out" },
      "sand,m": { s: "in" },
      "sand,l": { s: "in" },
    },
  },
  {
    id: "beanie-mr",
    image: img("1576871337622-98d48d1cf531"),
    title: "Merino Beanie",
    price: 34,
    sku: "JKY-BN-MR",
    cat: "apparel",
    status: "in",
    icon: "shirt",
    tint: "#b1889a",
    blurb: "Fine-gauge merino beanie that breathes and never itches.",
    desc: "Knit from fine-gauge merino, this beanie regulates temperature and resists odor through long days out. The cuffed fit sits close without squeezing.",
    specs: [
      ["Fabric", "Merino wool"],
      ["Fit", "Cuffed"],
      ["Weight", "90 g"],
      ["Care", "Hand wash"],
    ],
    options: [
      {
        key: "color",
        name: "Color",
        type: "swatch",
        values: [
          { id: "oatmeal", label: "Oatmeal", hex: "#d9cbb0" },
          { id: "charcoal", label: "Charcoal", hex: "#3a3a40" },
          { id: "rust", label: "Rust", hex: "#a5603f" },
        ],
      },
    ],
    variants: {
      oatmeal: { s: "in" },
      charcoal: { s: "in" },
      rust: { s: "low" },
    },
  },
  {
    id: "tee-ed",
    image: img("1521572163474-6864f9cf17ab"),
    title: "Everyday Tee",
    price: 28,
    sku: "JKY-TE-ED",
    cat: "apparel",
    status: "in",
    icon: "shirt",
    tint: "#6f8bb0",
    blurb: "The everyday organic-cotton tee, cut for a classic fit.",
    desc: "Cut from mid-weight organic cotton with a classic, non-clingy fit, this is the tee you reach for first. It holds its shape wash after wash.",
    specs: [
      ["Fabric", "Organic cotton"],
      ["Weight", "180 gsm"],
      ["Fit", "Classic"],
      ["Care", "Machine wash"],
    ],
    options: [
      {
        key: "color",
        name: "Color",
        type: "swatch",
        values: [
          { id: "white", label: "White", hex: "#eae7e0" },
          { id: "black", label: "Black", hex: "#2a2a2e" },
          { id: "sage", label: "Sage", hex: "#8a9a7d" },
        ],
      },
      {
        key: "size",
        name: "Size",
        type: "chip",
        values: [
          { id: "s", label: "S" },
          { id: "m", label: "M" },
          { id: "l", label: "L" },
          { id: "xl", label: "XL" },
        ],
      },
    ],
    variants: {
      "white,s": { s: "in" },
      "white,m": { s: "in" },
      "white,l": { s: "in" },
      "white,xl": { s: "low" },
      "black,s": { s: "in" },
      "black,m": { s: "in" },
      "black,l": { s: "out" },
      "black,xl": { s: "in" },
      "sage,m": { s: "in" },
      "sage,l": { s: "low" },
    },
  },
  {
    id: "socks-w3",
    image: img("1586350977771-b3b0abd50c82"),
    title: "Wool Socks 3-Pack",
    price: 24,
    sku: "JKY-SK-W3",
    cat: "apparel",
    status: "in",
    icon: "footprints",
    tint: "#7d9179",
    blurb: "Merino-blend crew socks with light cushioning, three pairs.",
    desc: "A merino blend wicks moisture and cushions the footbed where it counts, with a ribbed cuff that stays up. Comes as a pack of three.",
    specs: [
      ["Fabric", "Merino blend"],
      ["Pack", "3 pairs"],
      ["Cushion", "Light"],
      ["Sizes", "M–L"],
    ],
    options: [
      {
        key: "color",
        name: "Color",
        type: "swatch",
        values: [
          { id: "charcoal", label: "Charcoal", hex: "#3a3a40" },
          { id: "oat", label: "Oat", hex: "#d9cbb0" },
          { id: "forest", label: "Forest", hex: "#4a5d4f" },
        ],
      },
    ],
    variants: {
      charcoal: { s: "in" },
      oat: { s: "in" },
      forest: { s: "low" },
    },
  },
  {
    id: "bottle-750",
    image: img("1602143407151-7111542de6e8"),
    title: "Steel Bottle 750",
    price: 29,
    sku: "JKY-BT-750",
    cat: "home",
    status: "in",
    icon: "cup-soda",
    tint: "#5f9a94",
    feat: true,
    blurb: "Vacuum-sealed steel bottle that holds cold for a full day.",
    desc: "Double-wall 18/8 steel keeps drinks cold for 24 hours or hot for 12, with zero sweat on the outside. The leakproof lid seals tight for a bag or pack.",
    specs: [
      ["Capacity", "750 ml"],
      ["Material", "18/8 steel"],
      ["Keeps", "24h cold · 12h hot"],
      ["Lid", "Leakproof"],
    ],
    options: [
      {
        key: "color",
        name: "Color",
        type: "swatch",
        values: [
          { id: "steel", label: "Steel", hex: "#b7bcc2" },
          { id: "black", label: "Black", hex: "#2a2a2e" },
          { id: "coral", label: "Coral", hex: "#d98a72" },
        ],
      },
    ],
    variants: {
      steel: { s: "in" },
      black: { s: "in" },
      coral: { s: "low" },
    },
    custom: {
      mode: "engrave",
      label: "Add engraving",
      verb: "Engraved",
      fee: 8,
      max: 12,
      ph: "e.g. AVA",
    },
  },
  {
    id: "pourover-cr",
    image: img("1607681034540-2c46cc71896d"),
    title: "Ceramic Pour-Over",
    price: 54,
    sku: "JKY-PO-CR",
    cat: "home",
    status: "in",
    icon: "coffee",
    tint: "#b08968",
    blurb: "Single-serve stoneware pour-over for a clean, bright cup.",
    desc: "Glazed stoneware holds heat while a tall cone and #2 paper filter pull a clean, bright single serving. It sits neatly on most mugs and is dishwasher safe.",
    specs: [
      ["Material", "Stoneware"],
      ["Serves", "1–2 cups"],
      ["Filter", "#2 paper"],
      ["Care", "Dishwasher safe"],
    ],
  },
  {
    id: "throw-ln",
    image: img("1600369671236-e74521d4b6ad"),
    title: "Linen Throw",
    price: 79,
    sku: "JKY-TH-LN",
    cat: "home",
    status: "low",
    icon: "layers",
    tint: "#b8a06a",
    blurb: "Stonewashed pure-linen throw that softens with every wash.",
    desc: "Woven from pure European flax and stonewashed for softness, this throw only gets better with age. It’s breathable year-round and machine washable.",
    specs: [
      ["Material", "100% linen"],
      ["Size", "130 × 170 cm"],
      ["Weight", "900 g"],
      ["Care", "Machine wash"],
    ],
  },
  {
    id: "candle-04",
    image: img("1602874801007-bd458bb1b8b6"),
    title: "Soy Candle No.4",
    price: 32,
    sku: "JKY-CN-04",
    cat: "home",
    status: "in",
    icon: "flame",
    tint: "#c19a5b",
    blurb: "Soy-blend candle with a warm cedar-and-fig scent, No.4.",
    desc: "A soy-blend wax and cotton wick burn evenly for about 45 hours, filling a room with warm cedar and ripe fig. Hand-poured in small batches.",
    specs: [
      ["Wax", "Soy blend"],
      ["Burn", "45 hrs"],
      ["Scent", "Cedar · fig"],
      ["Wick", "Cotton"],
    ],
  },
  {
    id: "tote-l",
    image: img("1591561954557-26941169b49e"),
    title: "Canvas Tote L",
    price: 39,
    sku: "JKY-TO-L",
    cat: "accessories",
    status: "in",
    icon: "shopping-bag",
    tint: "#869162",
    feat: true,
    blurb: "Heavyweight 16oz canvas tote with a zip interior pocket.",
    desc: "Structured 16oz canvas stands up on its own and carries a laptop, groceries, or a weekend’s worth of gear. A zip interior pocket keeps small things from wandering.",
    specs: [
      ["Material", "16oz canvas"],
      ["Size", "38 × 42 cm"],
      ["Pocket", "Interior zip"],
      ["Strap", "Reinforced"],
    ],
    options: [
      {
        key: "color",
        name: "Color",
        type: "swatch",
        values: [
          { id: "natural", label: "Natural", hex: "#d8cbb0" },
          { id: "black", label: "Black", hex: "#2a2a2e" },
          { id: "olive", label: "Olive", hex: "#6b6f4e" },
        ],
      },
    ],
    variants: {
      natural: { s: "in" },
      black: { s: "in" },
      olive: { s: "low" },
    },
    custom: {
      mode: "print",
      label: "Add printing",
      verb: "Printed",
      fee: 12,
      max: 16,
      ph: "Name or initials",
      logo: true,
      logoFee: 0,
    },
  },
  {
    id: "wallet-lc",
    image: img("1627123424574-724758594e93"),
    title: "Leather Card Wallet",
    price: 45,
    sku: "JKY-WL-LC",
    cat: "accessories",
    status: "in",
    icon: "wallet",
    tint: "#9a7a63",
    blurb: "Slim full-grain leather cardholder with RFID blocking.",
    desc: "Full-grain leather holds up to six cards in a slim profile that softens beautifully over time. A built-in RFID layer keeps contactless cards from being skimmed.",
    specs: [
      ["Material", "Full-grain leather"],
      ["Cards", "Holds 6"],
      ["RFID", "Blocking"],
      ["Size", "10 × 7 cm"],
    ],
    options: [
      {
        key: "color",
        name: "Leather",
        type: "swatch",
        values: [
          { id: "cognac", label: "Cognac", hex: "#9a5f38" },
          { id: "black", label: "Black", hex: "#2a2a2e" },
        ],
      },
    ],
    variants: {
      cognac: { s: "in" },
      black: { s: "in" },
    },
    custom: {
      mode: "engrave",
      label: "Add monogram",
      verb: "Monogram",
      fee: 10,
      max: 3,
      ph: "Up to 3 initials",
    },
  },
  {
    id: "cable-rk",
    image: img("1558618666-fcd25c85cd64"),
    title: "Cable Roll Kit",
    price: 19,
    sku: "JKY-CB-RK",
    cat: "accessories",
    status: "out",
    icon: "cable",
    tint: "#6d7688",
    blurb: "Zip-roll kit with four everyday charging cables.",
    desc: "Four braided cables — USB-C, USB-C to Lightning, and more — roll into a compact zip case so your bag stays tangle-free. Every cable is a full meter long.",
    specs: [
      ["Includes", "4 cables"],
      ["Types", "USB-C · Lightning"],
      ["Case", "Zip roll"],
      ["Length", "1 m"],
    ],
  },
];

/* `placed` is an ISO date, not a display string. It used to read "Jul 14, 2026",
 * which is an en-US rendering baked into the seed — the month name, the comma,
 * and the month-before-day order are all the reader's conventions, not the
 * order's. The screens format it through the runtime's `date()`, so cs-CZ gets
 * "14. 7. 2026" and ar-EG "١٤‏/٧‏/٢٠٢٦" from the same data. */
export const ORDERS: Order[] = [
  {
    number: "1039",
    total: 167.44,
    status: "shipped",
    placed: "2026-07-14",
    items: [
      ["hoodie-tf", 1],
      ["beanie-mr", 1],
      ["socks-w3", 2],
    ],
  },
  {
    number: "1031",
    total: 83.62,
    status: "paid",
    placed: "2026-06-30",
    items: [
      ["deskmat-xl", 1],
      ["mouse-m1", 1],
    ],
  },
  {
    number: "1024",
    total: 57.53,
    status: "refunded",
    placed: "2026-06-12",
    items: [
      ["candle-04", 1],
      ["tote-l", 1],
    ],
  },
];

export const RATINGS: Record<string, RatingSeed> = {
  "kb-k2": [4.8, 214],
  "stand-al": [4.6, 88],
  "deskmat-xl": [4.7, 152],
  "mouse-m1": [4.5, 73],
  "trail-gtx": [4.4, 131],
  "hoodie-tf": [4.8, 96],
  "beanie-mr": [4.6, 54],
  "tee-ed": [4.3, 61],
  "socks-w3": [4.7, 120],
  "bottle-750": [4.9, 340],
  "pourover-cr": [4.5, 47],
  "throw-ln": [4.6, 38],
  "candle-04": [4.8, 89],
  "tote-l": [4.7, 205],
  "wallet-lc": [4.6, 64],
  "cable-rk": [4.2, 29],
};

export const REVIEWPOOL: Review[] = [
  {
    name: "Maya K.",
    initials: "MK",
    ago: [-2, "week"],
    verified: true,
    rating: 5,
    title: "Exactly what I hoped for",
    body: "Shipped fast and the quality is genuinely better than I expected at this price. Would buy again in a heartbeat.",
  },
  {
    name: "Devin R.",
    initials: "DR",
    ago: [-1, "month"],
    verified: true,
    rating: 5,
    title: "My new daily driver",
    body: "I have used this every single day for a month and it still feels brand new. Zero complaints so far.",
  },
  {
    name: "Priya S.",
    initials: "PS",
    ago: [-3, "week"],
    verified: true,
    rating: 4,
    title: "Great, with one small nit",
    body: "Really well made. Knocked off a star only because I wish it came in a couple more colors.",
  },
  {
    name: "Tom B.",
    initials: "TB",
    ago: [-2, "month"],
    verified: true,
    rating: 5,
    title: "Worth every dollar",
    body: "Was on the fence about the price, but it is clearly built to last. Feels properly premium in the hand.",
  },
  {
    name: "Lena M.",
    initials: "LM",
    ago: [-5, "day"],
    verified: false,
    rating: 4,
    title: "Solid buy",
    body: "Does exactly what it says. Packaging was minimal and recyclable, which I really appreciated.",
  },
  {
    name: "Chris A.",
    initials: "CA",
    ago: [-6, "week"],
    verified: true,
    rating: 5,
    title: "Genuinely impressed",
    body: "Better than the big-brand version I returned last month. Northline nailed the little details.",
  },
  {
    name: "Sofia D.",
    initials: "SD",
    ago: [-1, "week"],
    verified: true,
    rating: 3,
    title: "Good, runs a touch small",
    body: "Quality is there — just double-check the sizing guide before you order and you will be happy.",
  },
  {
    name: "Noah W.",
    initials: "NW",
    ago: [-3, "month"],
    verified: true,
    rating: 5,
    title: "Gift-worthy",
    body: "Bought one for myself and immediately ordered two more as gifts. Everyone loved them.",
  },
];

export const CUSTOMER = {
  name: "Ava Reyes",
  email: "ava@example.com",
  initials: "AR",
};
