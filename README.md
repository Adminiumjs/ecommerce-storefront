# Online Shop

An online shop and its desk, installed into [Adminium](https://adminium.dev). Shoppers
browse by size and colour, see what is in stock, pay on a secure page and follow their
order; the desk packs, ships and takes returns. Adminium decides every price, discount,
shipping charge, sales tax, total, order number, stock answer, date and status — the
pages only ask.

The demo is dressed as **Northline**, a fictional outdoor-gear shop in Portland, Oregon,
that sells shells, packs, boots and camp kit in 20 products and 83 size-and-colour
variants. Its clock stands at **Tuesday 18 August 2026, 11:40** — before the two o'clock
cut-off — and the shop ships Monday to Friday.

## What it needs

- Adminium **0.3.70** or later, on SQLite, Postgres or MySQL.
- Nothing else is required: browsing, ordering, paying, packing and shipping work on
  Adminium alone. Eight add-ons are offered at install, four of them ticked:
  - **Inventory** (ticked) — counts each size and colour, holds what is ordered until it
    is packed, and tells shoppers "Only 3 left" and "Sold out". Without it every variant
    sells, and the desk marks one "Sold out" by hand.
  - **Offers & gift cards** (ticked) — discount codes and gift cards at checkout, and
    e-gift cards sold online.
  - **Invoices & Receipts** (ticked) — the customer's receipt, and packing slips for a
    day's orders printed as one job.
  - **Forms & surveys** (ticked) — reviews from customers who bought (published by the
    shop), and a confirmation e-mail for newsletter sign-ups.
  - **Shipping (DHL)** — the dispatch flow on the desk. **This release, DHL is a demo
    carrier:** it books nothing real, and a real shop types the carrier and the tracking
    number on the order.
  - **Barcode labels** — SKU labels for the stockroom.
  - **Live chat** and **Landing pages** — a chat window on the shop; landing pages for a
    season or a sale.

## What it does

**For shoppers** (the app's customer side): the home page, the shop with filters by
category, colour, size, price and "in stock only", search and sort; a product's page with
its colours and sizes (a combination that is not made says so), its stock and its own
price; the basket and the checkout (US addresses in the 50 states and DC, each delivery
service priced for the state, sales tax for the state); paying on Adminium's pay page, or
by bank transfer while the shop takes no payments online; the order's own page by its
private link, with cancel while it is not packed; signing in by a code e-mailed to the
customer, their orders and returns; sending something back within 30 days; a review of
what they bought; e-gift cards; "Tell me when it's back" on a sold-out size; the help
pages, the newsletter box with its consent tick, never ticked for the shopper.

**For the shop** (the app's staff side, the desk): Today, Orders, one order with the
payment panel, Packing (a pick list by SKU, packing slips, packed and shipped), Returns,
Products with their variants grid and stock, Reviews, Customers and Settings. Two roles:
**owner** (everything, refunds, recording a bank transfer) and **packer** (packing,
shipping and receiving returns; never money, never a customer's e-mail address).

**In Adminium's console** (the Online shop section): the Overview, every record, and the
shop's price lists: shipping services and prices, states with their sales tax, closures,
size guides and gift card amounts.

## The rules Adminium keeps

- An order's lines copy each variant's price, SKU and names when it is placed; a code's
  reduction is Offers & gift cards' answer; shipping is the service's price for the zone,
  nothing from its "free from" figure up; sales tax is the state's rate on the goods after
  reductions, worked out once for the order, never on shipping.
- Order numbers run without gaps from the settings' prefix and first number (`NL-1067`).
- An order paid online waits 30 minutes for its payment, its stock held, then cancels
  itself; a bank-transfer order waits five shipping days. A paid order keeps its stock for
  45 days from placing, until it is packed.
- A paid order ships the same day if it was paid before two o'clock on a shipping day, else
  the next; its arrival window counts the service's shipping days from then, skipping the
  shop's closures.
- A return takes back no more pieces than were bought less what other returns hold; its
  refund is what the customer paid for those pieces, their share of reductions and tax
  included, never the shipping unless the shop says the piece was faulty.

## Building it

```bash
npm ci
npm test               # the unit suite
npm run manifest       # write manifest.json from src/manifest/
npm run sample         # write the sample files from src/sample/
npm run build:surface  # both hosted sides
npm run contract       # the contracts, against a built Adminium (see src/contract/)
```

## License

[AGPL-3.0](LICENSE) © 2026. An example app for Adminium. The sample's catalogue, people,
orders and the shop itself are made up.
