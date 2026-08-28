-- Ecommerce Storefront — PostgreSQL schema (§10.1 contract).
--
-- This is the real database that backs the full self-host stack: the storefront
-- reads it (through Adminium's records API) and the auto-generated Adminium admin
-- dashboard manages it. Applied automatically on first boot of the `shop-db`
-- container via /docker-entrypoint-initdb.d/01-schema.sql, then seeded by
-- 02-seed.sql. The seed catalog mirrors src/data/demo.ts one-for-one (same
-- products, prices, and images) so the shop and the dashboard show the same store.

DROP TABLE IF EXISTS shop_settings CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Catalog -------------------------------------------------------------------

CREATE TABLE products (
  id         serial PRIMARY KEY,
  title      text NOT NULL,
  sku        text NOT NULL UNIQUE,
  price      numeric(10, 2) NOT NULL,
  image_url  text,
  status     text NOT NULL DEFAULT 'active'
             CHECK (status IN ('draft', 'active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id   serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE
);

CREATE TABLE product_categories (
  product_id  integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- Customers & orders --------------------------------------------------------

CREATE TABLE customers (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id          serial PRIMARY KEY,
  number      text NOT NULL UNIQUE,
  customer_id integer NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
  total       numeric(10, 2) NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'paid', 'shipped', 'refunded')),
  placed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id         serial PRIMARY KEY,
  order_id   integer NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products (id),
  qty        integer NOT NULL,
  unit_price numeric(10, 2) NOT NULL
);

-- The merchant, as a merchant -----------------------------------------------

-- WHERE THE SHOP POSTS FROM, and the first row in this schema that is about the
-- SHOP rather than about what it sells.
--
-- Everything else here is catalogue, customers and orders. The shop's own
-- commerce policy — its tax rate, its free-shipping threshold, its promo code,
-- what each delivery band costs — has never had a column, which is recorded at
-- length as WS-I G-1 in `src/data/adminiumSource.ts`: a connected storefront
-- shows zeroes there rather than the demo's numbers, because a wrong number in
-- that position is money. This table is the first of those settings to get a
-- home, and it got one because an address is the one of them that CANNOT be
-- shown as a plausible zero: a parcel posted from the wrong city is posted from
-- the wrong city, and nothing on the screen would say so.
--
-- ONE ROW, enforced. `id` is fixed at 1 by a CHECK rather than left to a
-- sequence, because a settings table with two rows has no answer to "which
-- one", and the failure mode of guessing (`ORDER BY id LIMIT 1`) is a shop
-- whose address changes when somebody inserts a second draft.
--
-- EVERY COLUMN IS NULLABLE and every one has a DEFAULT of the empty string.
-- The two together are the shape of a settings row: it exists from the moment
-- the schema is applied, so nothing has to create it before the shop can be
-- read, and an operator filling in four of the six fields gets four fields
-- rather than an error. `src/data/adminiumSource.ts` carries the half-filled
-- case through to the screen instead of reading it as "no address", so a gap is
-- visible where somebody can fix it.
--
-- `ship_from_country` IS A CODE — `US`, not "United States". It is the one
-- column here a machine reads: a delivery company checks a postcode against a
-- country. The rest is text for a label.
CREATE TABLE shop_settings (
  id                 serial PRIMARY KEY CHECK (id = 1),
  ship_from_name     text DEFAULT '',
  ship_from_line1    text DEFAULT '',
  ship_from_line2    text DEFAULT '',
  ship_from_city     text DEFAULT '',
  ship_from_postcode text DEFAULT '',
  -- ISO 3166-1 alpha-2.
  ship_from_country  text DEFAULT ''
);

-- Indexes -------------------------------------------------------------------

CREATE INDEX idx_products_status    ON products (status);
CREATE INDEX idx_orders_status      ON orders (status);
CREATE INDEX idx_order_items_order  ON order_items (order_id);
