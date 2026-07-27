-- Ecommerce Storefront — seed data.
--
-- Mirrors src/data/demo.ts exactly: the same 16 products (title, sku, price, and
-- the same real Unsplash image_url), the 4 categories, plus a realistic slice of
-- customers and orders. The storefront demo catalog and this seed MUST stay in
-- sync so the frontend and the auto-generated Adminium dashboard show one shop.
--
-- Ids are assigned explicitly for readable foreign-key references; the serial
-- sequences are advanced at the end so future inserts continue cleanly.

-- Categories ----------------------------------------------------------------

INSERT INTO categories (id, name, slug) VALUES
  (1, 'Gear',        'gear'),
  (2, 'Apparel',     'apparel'),
  (3, 'Home',        'home'),
  (4, 'Accessories', 'accessories');

-- Products (all 'active'; storefront stock levels live on the frontend) ------

INSERT INTO products (id, title, sku, price, image_url, status) VALUES
  (1,  'Ergo Keyboard K2',     'JKY-KB-K2',  129.00, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=75&auto=format&fit=crop', 'active'),
  (2,  'Aluminum Laptop Stand','JKY-ST-AL',   59.00, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=75&auto=format&fit=crop', 'active'),
  (3,  'Desk Mat XL',          'JKY-DM-XL',   49.00, 'https://images.unsplash.com/photo-1593642532744-d377ab507dc8?w=800&q=75&auto=format&fit=crop', 'active'),
  (4,  'Wireless Mouse M1',    'JKY-MO-M1',   45.00, 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800&q=75&auto=format&fit=crop', 'active'),
  (5,  'Trail Runner GTX',     'JKY-SH-GTX', 189.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=75&auto=format&fit=crop',  'active'),
  (6,  'Tech Fleece Hoodie',   'JKY-HD-TF',   89.00, 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=75&auto=format&fit=crop',  'active'),
  (7,  'Merino Beanie',        'JKY-BN-MR',   34.00, 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=75&auto=format&fit=crop', 'active'),
  (8,  'Everyday Tee',         'JKY-TE-ED',   28.00, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=75&auto=format&fit=crop', 'active'),
  (9,  'Wool Socks 3-Pack',    'JKY-SK-W3',   24.00, 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&q=75&auto=format&fit=crop', 'active'),
  (10, 'Steel Bottle 750',     'JKY-BT-750',  29.00, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=75&auto=format&fit=crop', 'active'),
  (11, 'Ceramic Pour-Over',    'JKY-PO-CR',   54.00, 'https://images.unsplash.com/photo-1607681034540-2c46cc71896d?w=800&q=75&auto=format&fit=crop', 'active'),
  (12, 'Linen Throw',          'JKY-TH-LN',   79.00, 'https://images.unsplash.com/photo-1600369671236-e74521d4b6ad?w=800&q=75&auto=format&fit=crop', 'active'),
  (13, 'Soy Candle No.4',      'JKY-CN-04',   32.00, 'https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?w=800&q=75&auto=format&fit=crop', 'active'),
  (14, 'Canvas Tote L',        'JKY-TO-L',    39.00, 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&q=75&auto=format&fit=crop', 'active'),
  (15, 'Leather Card Wallet',  'JKY-WL-LC',   45.00, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=75&auto=format&fit=crop', 'active'),
  (16, 'Cable Roll Kit',       'JKY-CB-RK',   19.00, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=75&auto=format&fit=crop',  'active');

-- Product ↔ category links --------------------------------------------------

INSERT INTO product_categories (product_id, category_id) VALUES
  (1, 1), (2, 1), (3, 1), (4, 1),                 -- Gear
  (5, 2), (6, 2), (7, 2), (8, 2), (9, 2),         -- Apparel
  (10, 3), (11, 3), (12, 3), (13, 3),             -- Home
  (14, 4), (15, 4), (16, 4);                      -- Accessories

-- Customers -----------------------------------------------------------------

INSERT INTO customers (id, name, email) VALUES
  (1, 'Ava Reyes',     'ava@example.com'),
  (2, 'Liam Chen',     'liam.chen@example.com'),
  (3, 'Noah Williams', 'noah.w@example.com'),
  (4, 'Maya Kapoor',   'maya.kapoor@example.com'),
  (5, 'Sofia Diaz',    'sofia.diaz@example.com'),
  (6, 'Ethan Brooks',  'ethan.brooks@example.com'),
  (7, 'Olivia Martin', 'olivia.martin@example.com'),
  (8, 'Lucas Nguyen',  'lucas.nguyen@example.com');

-- Orders (total = sum of line items; mixed statuses across 2026) -------------

INSERT INTO orders (id, number, customer_id, total, status, placed_at) VALUES
  (1,  '1039', 1, 171.00, 'shipped',  '2026-07-14 10:24:00+00'),
  (2,  '1031', 1,  94.00, 'paid',     '2026-06-30 15:08:00+00'),
  (3,  '1024', 1,  71.00, 'refunded', '2026-06-12 09:41:00+00'),
  (4,  '1042', 2, 174.00, 'pending',  '2026-07-21 18:52:00+00'),
  (5,  '1040', 3, 189.00, 'paid',     '2026-07-16 12:15:00+00'),
  (6,  '1038', 4, 112.00, 'shipped',  '2026-07-11 08:30:00+00'),
  (7,  '1035', 5,  84.00, 'shipped',  '2026-07-05 20:03:00+00'),
  (8,  '1033', 6, 127.00, 'paid',     '2026-07-02 11:47:00+00'),
  (9,  '1029', 7,  84.00, 'shipped',  '2026-06-24 14:19:00+00'),
  (10, '1026', 8,  79.00, 'refunded', '2026-06-15 16:55:00+00'),
  (11, '1021', 4,  58.00, 'paid',     '2026-05-28 13:12:00+00'),
  (12, '1018', 2, 129.00, 'shipped',  '2026-05-19 09:07:00+00');

-- Order line items ----------------------------------------------------------

INSERT INTO order_items (order_id, product_id, qty, unit_price) VALUES
  (1,  6,  1,  89.00),
  (1,  7,  1,  34.00),
  (1,  9,  2,  24.00),
  (2,  3,  1,  49.00),
  (2,  4,  1,  45.00),
  (3,  13, 1,  32.00),
  (3,  14, 1,  39.00),
  (4,  1,  1, 129.00),
  (4,  4,  1,  45.00),
  (5,  5,  1, 189.00),
  (6,  10, 2,  29.00),
  (6,  11, 1,  54.00),
  (7,  8,  3,  28.00),
  (8,  2,  1,  59.00),
  (8,  3,  1,  49.00),
  (8,  16, 1,  19.00),
  (9,  15, 1,  45.00),
  (9,  14, 1,  39.00),
  (10, 12, 1,  79.00),
  (11, 9,  1,  24.00),
  (11, 7,  1,  34.00),
  (12, 1,  1, 129.00);

-- Advance serial sequences past the explicit ids above ----------------------

SELECT setval('categories_id_seq', (SELECT max(id) FROM categories));
SELECT setval('products_id_seq',   (SELECT max(id) FROM products));
SELECT setval('customers_id_seq',  (SELECT max(id) FROM customers));
SELECT setval('orders_id_seq',     (SELECT max(id) FROM orders));
SELECT setval('order_items_id_seq',(SELECT max(id) FROM order_items));
