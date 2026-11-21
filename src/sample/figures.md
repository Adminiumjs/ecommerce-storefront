# Northline sample — the figures (written by gen.py; do not edit)

| Figure | Value |
|---|---|
| Clock | Tue 18 Aug 2026, 11:40 (America/Los_Angeles) |
| Products / variants | 20 / 83 |
| Orders in the sample | 66 (NL-1001 … NL-1066); next is NL-1067 |
|   state paying | 1 |
|   state paid | 5 |
|   state packed | 2 |
|   state shipped | 52 |
|   state gift_sent | 3 |
|   state cancelled_unpaid | 1 |
|   state cancelled_customer | 1 |
|   state cancelled_staff | 1 |
| To pack now (paid, not packed) | 5 |
| Packed, waiting for the 15:00 pickup | 2 |
| Waiting for payment (paying) | 1 |
| Returns: asked / approved / received / refunded | 1 / 1 / 1 / 1 |
| Reviews: published / waiting | 22 / 3 |
| Variants low / out | 6 / 4 |
| Sales, last 28 days (goods after discounts, paid orders, before refunds) | $12297.40 |
| Orders, last 28 days (paid) | 58 |
| Average order, last 28 days (sales ÷ orders) | $212.02 |
| Refunded, last 28 days (returns + cancellations) | $640.45 |
|   sales week 1 (from Tue 21 Jul) | $2101.00 |
|   sales week 2 (from Tue 28 Jul) | $3143.40 |
|   sales week 3 (from Tue 04 Aug) | $3253.75 |
|   sales week 4 (from Tue 11 Aug) | $3300.10 |
|   sales week 5 (from Tue 18 Aug) | $499.15 |
| Top 5 by units, last 28 days | Merino Base Layer Crew 12, Ridge Mid Hiking Boot 11, Basalt Rain Shell 10, Talus Trail Runner 10, Fir Fleece Pullover 9 |
| Gift cards: sold online / outstanding balance (not counted in sales) | 3 / $175.00 |
| Codes used: TRAIL15 / WELCOME10 | 7 / 3 |

## Every order that isn't simply shipped

| Number | Placed | Customer | State | Lines | Service | Code | Goods | Discount | Shipping | Tax | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| NL-1013 | Mon 27 Jul 19:12 | Leo Fischer (WA) | gift_sent | gift card 100.00 to Hana Sato | — | — | 0.00 | 0.00 | 0.00 | 0.00 | 100.00 |
| NL-1022 | Fri 31 Jul 04:35 | Noor Haddad (NY) | cancelled_customer | NL-TAL-10 ×1 | standard | — | 139.00 | 0.00 | 0.00 | 5.56 | 144.56 |
| NL-1029 | Mon 03 Aug 08:47 | Ella Brooks (OR) | gift_sent | gift card 50.00 to Theo Brandt | — | — | 0.00 | 0.00 | 0.00 | 0.00 | 50.00 |
| NL-1040 | Sun 09 Aug 13:02 | Ravi Menon (NY) | cancelled_staff | NL-TAL-8 ×1; NL-FIR-SAN-M ×1; NL-BSH-SLA-L ×1 | standard | — | 417.00 | 0.00 | 0.00 | 16.68 | 433.68 |
| NL-1054 | Fri 14 Aug 20:05 | Noor Haddad (NY) | gift_sent | gift card 25.00 to Ravi Menon | — | — | 0.00 | 0.00 | 0.00 | 0.00 | 25.00 |
| NL-1058 | Mon 17 Aug 09:40 | Sam Whitaker (OR) | cancelled_unpaid | NL-DUF60-SLA ×1 | standard | — | 149.00 | 0.00 | 0.00 | 0.00 | 149.00 |
| NL-1059 | Mon 17 Aug 14:40 | Ines Duarte (CO) | packed | NL-RDG28-SLA ×1; NL-LMP ×1 | express | TRAIL15 | 168.00 | 19.35 | 18.00 | 0.00 | 166.65 |
| NL-1060 | Mon 17 Aug 15:40 | Owen Price (OR) | packed | NL-BTL-GLA ×2 | standard | — | 68.00 | 0.00 | 7.00 | 0.00 | 75.00 |
| NL-1061 | Mon 17 Aug 16:40 | Ruth Ellison (AK) | paid | NL-FIR-SLA-L ×1 | standard | — | 89.00 | 0.00 | 16.00 | 0.00 | 105.00 |
| NL-1062 | Mon 17 Aug 17:40 | Lena Ortiz (CA) | paid | NL-EMB2 ×1; NL-STV ×1; NL-MUG-EMB ×2 | standard | — | 442.00 | 0.00 | 0.00 | 32.05 | 474.05 |
| NL-1063 | Tue 18 Aug 08:30 | Grace Okafor (CA) | paid | NL-TAL-9 ×1 | overnight | — | 139.00 | 0.00 | 35.00 | 10.08 | 184.08 |
| NL-1064 | Tue 18 Aug 09:30 | Noor Haddad (NY) | paid | NL-MER-GLA-M ×2; NL-SOX-SM ×1 | standard | — | 174.00 | 0.00 | 0.00 | 6.96 | 180.96 |
| NL-1065 | Tue 18 Aug 10:05 | Marcus Hale (WA) | paid | NL-CAS45-MOS-ML ×1 | express | TRAIL15 | 219.00 | 32.85 | 18.00 | 12.10 | 216.25 |
| NL-1066 | Tue 18 Aug 11:31 | Priya Raman (OR) | paying | NL-BSH-EMB-M ×1; NL-BEA-MOS ×1 | standard | — | 217.00 | 0.00 | 0.00 | 0.00 | 217.00 |

## Returns

| Return | Order | SKU | Reason | Step | Refund |
|---|---|---|---|---|---|
| RT-1001 | NL-1004 | NL-TSH-SLA-36 | Doesn't fit | refunded | 62.21 |
| RT-1002 | NL-1005 | NL-BSH-EMB-S | Not what I expected | received | 202.70 |
| RT-1003 | NL-1008 | NL-TSH-SLA-32 | Faulty | approved | 62.21 |
| RT-1004 | NL-1009 | NL-BEA-SLA | Changed my mind | asked | 29.12 |

## Low and out of stock at the clock

| SKU | On hand | Held | Available | Words |
|---|---|---|---|---|
| NL-RDG28-EMB | 4 | 0 | 4 | low |
| NL-CAS45-MOS-ML | 5 | 1 | 4 | low |
| NL-BSH-EMB-M | 4 | 1 | 3 | low |
| NL-TSH-SAN-30 | 1 | 0 | 1 | low |
| NL-TAL-9 | 3 | 1 | 2 | low |
| NL-EMB2 | 3 | 1 | 2 | low |
| NL-BSH-SLA-XL | 0 | 0 | 0 | out |
| NL-FIR-SAN-S | 0 | 0 | 0 | out |
| NL-TAL-11 | 0 | 0 | 0 | out |
| NL-BTL-MOS | 0 | 0 | 0 | out |
