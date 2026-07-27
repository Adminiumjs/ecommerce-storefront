-- Ecommerce Storefront — PostgreSQL schema (§10.1 contract).
--
-- This is the real database that backs the full self-host stack: the storefront
-- reads it (through Adminium's records API) and the auto-generated Adminium admin
-- dashboard manages it. Applied automatically on first boot of the `shop-db`
-- container via /docker-entrypoint-initdb.d/01-schema.sql, then seeded by
-- 02-seed.sql. The seed catalog mirrors src/data/demo.ts one-for-one (same
-- products, prices, and images) so the shop and the dashboard show the same store.

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

-- Indexes -------------------------------------------------------------------

CREATE INDEX idx_products_status    ON products (status);
CREATE INDEX idx_orders_status      ON orders (status);
CREATE INDEX idx_order_items_order  ON order_items (order_id);
